export type DeletionJob = {
  id: string;
  status: 'pending' | 'awaiting_apple' | 'processing' | 'retrying' | 'completed' | 'cancelled';
  phase: string;
  canCancel: boolean;
  retryable: boolean;
};

export type DeletionRecord = {
  uid: string;
  idempotencyKey: string;
  statusReceipt: string;
  receiptExpiresAt?: string;
  deletion: DeletionJob | null;
};

export type DeletionSession = {
  uid: string;
  isCurrent: () => boolean;
  finish: () => Promise<void>;
};
export type DeletionAuthorization = { token: string; appleAuthorizationCode?: string };
export type AuthenticateDeletion = (session: DeletionSession) => Promise<DeletionAuthorization>;
type DeletionReply = { deletion: DeletionJob; receiptExpiresAt?: string };
type Dependencies = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  session: () => DeletionSession;
  uuid: () => string;
  receipt: () => string;
  capability: () => Promise<{ available: boolean }>;
  request: (record: DeletionRecord, authorization: DeletionAuthorization) => Promise<DeletionReply>;
  status: (record: DeletionRecord) => Promise<{ deletion: DeletionJob | null }>;
  cancel: (record: DeletionRecord, authorization: DeletionAuthorization) => Promise<DeletionReply>;
};
export type DeletionSnapshot = {
  open: boolean;
  busy: boolean;
  available: boolean | null;
  record: DeletionRecord | null;
  error: string | null;
};

function failure(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

export class AccountDeletion {
  private records: Record<string, DeletionRecord> = {};
  private account: string | null = null;
  private loaded = false;
  private loading: Promise<void> | null = null;
  private viewRevision = 0;
  private listeners = new Set<() => void>();
  private persistence: Promise<void> = Promise.resolve();
  private snapshot: DeletionSnapshot = {
    open: false,
    busy: false,
    available: null,
    record: null,
    error: null,
  };

  constructor(private dependencies: Dependencies) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<DeletionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private current(session: DeletionSession) {
    if (!session.isCurrent()) throw failure('account_changed');
  }
  private async save(record: DeletionRecord) {
    this.records[record.uid] = record;
    const contents = JSON.stringify(this.records);
    const operation = this.persistence
      .catch(() => {})
      .then(() => this.dependencies.write(contents));
    this.persistence = operation;
    try {
      await operation;
    } catch {
      throw failure('deletion_storage_failed');
    }
  }
  private showRecord(record: DeletionRecord) {
    if (
      this.account === record.uid ||
      (!this.account && this.snapshot.record?.uid === record.uid)
    ) {
      this.update({ record });
    }
  }
  initialize = async (account: string | null) => {
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const raw = await this.dependencies.read();
          const records = raw ? JSON.parse(raw) : {};
          for (const [uid, value] of Object.entries(records)) {
            const record = value as DeletionRecord;
            if (
              record.uid === uid &&
              typeof record.idempotencyKey === 'string' &&
              /^[a-f0-9]{64}$/.test(record.statusReceipt)
            )
              this.records[uid] = record;
          }
          this.loaded = true;
        } catch {
          this.update({ error: 'deletion_storage_failed' });
        }
      })();
    }
    await this.loading;
    this.setAccount(account);
  };
  setAccount = (account: string | null) => {
    if (this.account === account && (account || this.snapshot.record)) return;
    this.account = account;
    this.viewRevision++;
    const savedRecords = Object.values(this.records);
    const record = account
      ? this.records[account]
      : this.snapshot.record || savedRecords[savedRecords.length - 1] || null;
    this.update({
      record: record || null,
      open: !!record,
      busy: false,
      error: null,
      available: null,
    });
  };
  suspendView = () => {
    this.viewRevision++;
    this.account = null;
    this.update({ record: null, open: false, busy: false, available: null, error: null });
  };
  open = async () => {
    this.update({ open: true, error: null });
    if (
      this.snapshot.record?.deletion &&
      !['completed', 'cancelled'].includes(this.snapshot.record.deletion.status)
    ) {
      await this.refresh();
      return;
    }
    const view = this.viewRevision;
    this.update({ busy: true });
    try {
      const result = await this.dependencies.capability();
      if (view === this.viewRevision)
        this.update({
          available: result.available,
          error: result.available ? null : 'deletion_unavailable',
        });
    } catch {
      if (view === this.viewRevision)
        this.update({ available: false, error: 'deletion_unavailable' });
    } finally {
      if (view === this.viewRevision) this.update({ busy: false });
    }
  };
  close = async () => {
    if (this.snapshot.busy) return;
    const view = this.viewRevision;
    const record = this.snapshot.record;
    if (
      record &&
      (['completed', 'cancelled'].includes(record.deletion?.status || '') ||
        (!!record.receiptExpiresAt && Date.parse(record.receiptExpiresAt) < Date.now()))
    ) {
      delete this.records[record.uid];
      const contents = JSON.stringify(this.records);
      const saving = this.persistence.catch(() => {}).then(() => this.dependencies.write(contents));
      this.persistence = saving;
      try {
        await saving;
      } catch {
        return;
      }
      if (view !== this.viewRevision || this.snapshot.record?.uid !== record.uid) return;
      this.update({ record: null });
    }
    this.update({ open: false });
  };

  request = async (authenticate: AuthenticateDeletion) => {
    if (this.snapshot.busy) return;
    const view = this.viewRevision;
    this.update({ busy: true, error: null });
    let submitted = false;
    try {
      if (!this.loaded) throw failure('deletion_storage_failed');
      const session = this.dependencies.session();
      const saved = this.records[session.uid];
      // A lost first response is checked with the saved receipt before any retry.
      if (saved && !saved.deletion) {
        try {
          const status = await this.dependencies.status(saved);
          this.current(session);
          if (status.deletion) {
            const recovered = { ...saved, deletion: status.deletion };
            await this.save(recovered);
            this.current(session);
            this.showRecord(recovered);
            if (status.deletion.status === 'completed') await session.finish();
            if (status.deletion.status !== 'awaiting_apple') return;
          }
        } catch (error: any) {
          this.current(session);
          // This means unknown OR expired, never proof that the account was deleted.
          if (error?.code !== 'deletion_receipt_unavailable')
            throw failure('deletion_status_failed');
          if (saved.receiptExpiresAt && Date.parse(saved.receiptExpiresAt) < Date.now()) {
            throw failure('deletion_expired');
          }
        }
      }
      const capability = await this.dependencies.capability();
      this.current(session);
      if (!capability.available) throw failure('deletion_unavailable');
      const authorization = await authenticate(session);
      this.current(session);
      const previous = this.records[session.uid];
      const record: DeletionRecord =
        previous && previous.deletion?.status !== 'cancelled'
          ? previous
          : {
              uid: session.uid,
              idempotencyKey: this.dependencies.uuid(),
              statusReceipt: this.dependencies.receipt(),
              receiptExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              deletion: null,
            };
      // Persist the read-only recovery credential BEFORE sending a destructive request.
      await this.save(record);
      this.current(session);
      this.showRecord(record);
      submitted = true;
      const reply = await this.dependencies.request(record, authorization);
      const accepted = { ...record, ...reply };
      await this.save(accepted);
      this.showRecord(accepted);
      if (reply.deletion.status === 'completed' && session.isCurrent()) await session.finish();
    } catch (error: any) {
      if (view === this.viewRevision)
        this.update({
          error:
            error?.code === 'ERR_REQUEST_CANCELED'
              ? null
              : error?.outcomeUnknown ||
                  (submitted && (!error?.code || error?.code === 'deletion_storage_failed'))
                ? 'deletion_unknown'
                : error?.code || 'deletion_reauth_failed',
        });
    } finally {
      if (view === this.viewRevision) this.update({ busy: false });
    }
  };

  refresh = async () => {
    const record = this.snapshot.record;
    if (!record || this.snapshot.busy) return;
    const view = this.viewRevision;
    this.update({ busy: true, error: null });
    let session: DeletionSession | null = null;
    try {
      session = this.dependencies.session();
    } catch {}
    try {
      const reply = await this.dependencies.status(record);
      if (!reply.deletion) throw failure('deletion_record_missing');
      const updated = { ...record, deletion: reply.deletion };
      await this.save(updated);
      this.showRecord(updated);
      if (
        reply.deletion.status === 'completed' &&
        session?.uid === record.uid &&
        session.isCurrent()
      ) {
        await session.finish();
      }
    } catch (error: any) {
      if (view === this.viewRevision)
        this.update({
          error:
            record.receiptExpiresAt && Date.parse(record.receiptExpiresAt) < Date.now()
              ? 'deletion_expired'
              : error?.code === 'deletion_record_missing'
                ? error.code
                : 'deletion_status_failed',
        });
    } finally {
      if (view === this.viewRevision) this.update({ busy: false });
    }
  };

  cancel = async (authenticate: AuthenticateDeletion) => {
    const record = this.snapshot.record;
    if (!record?.deletion?.canCancel || this.snapshot.busy) return;
    const view = this.viewRevision;
    this.update({ busy: true, error: null });
    try {
      const session = this.dependencies.session();
      if (session.uid !== record.uid) throw failure('account_changed');
      const authorization = await authenticate(session);
      this.current(session);
      const reply = await this.dependencies.cancel(record, authorization);
      const updated = { ...record, ...reply };
      await this.save(updated);
      this.showRecord(updated);
    } catch (error: any) {
      if (view === this.viewRevision)
        this.update({
          error:
            error?.code === 'ERR_REQUEST_CANCELED'
              ? null
              : error?.outcomeUnknown
                ? 'deletion_unknown'
                : error?.code || 'deletion_reauth_failed',
        });
    } finally {
      if (view === this.viewRevision) this.update({ busy: false });
    }
  };
}

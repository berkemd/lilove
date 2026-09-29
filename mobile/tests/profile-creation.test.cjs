const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

function setup(options = {}) {
  const user = {
    uid: 'profile-fixture',
    email: 'profile@example.invalid',
    displayName: 'Fixture',
    photoURL: null,
    ...options.user,
  };
  const credential = { user };
  const state = { record: options.record, events: [], writes: 0, transactions: 0 };
  const snapshot = (data) => ({ exists: () => data !== undefined, data: () => data });
  const write = (data) => {
    if (options.writeError) throw options.writeError;
    state.record = structuredClone(data);
    state.writes++;
    state.events.push('profile');
  };
  const imports = {
    'firebase/app': { getApps: () => [], initializeApp: () => ({}) },
    './firebaseAuth': { initializeAppAuth: () => ({}) },
    'firebase/auth': {
      createUserWithEmailAndPassword: async () => credential,
      signInWithEmailAndPassword: async () => {
        if (options.signInError) throw options.signInError;
        return credential;
      },
      signInWithCredential: async () => credential,
      getAdditionalUserInfo: () =>
        options.unknownUserInfo ? null : { isNewUser: options.isNewUser ?? true },
      GoogleAuthProvider: { credential: () => ({}) },
      OAuthProvider: class {
        credential() {
          return {};
        }
      },
      updateProfile: async () => {
        state.events.push('account-name');
        if (options.metadataError) throw options.metadataError;
      },
      sendEmailVerification: async () => {
        state.events.push('verification');
        if (options.verificationError) throw options.verificationError;
      },
    },
    'firebase/firestore': {
      getFirestore: () => ({}),
      doc: (_db, collection, uid) => ({ collection, uid }),
      serverTimestamp: () => 'server-timestamp',
      getDoc: async () => {
        const read = snapshot(state.record);
        if (options.concurrentRecord) state.record = options.concurrentRecord;
        return read;
      },
      setDoc: async (_ref, data) => write(data),
      updateDoc: async (_ref, data) => write({ ...state.record, ...data }),
      runTransaction: async (_db, operation) => {
        state.transactions++;
        let queued;
        const transaction = {
          get: async () => snapshot(state.record),
          set: (_ref, data) => {
            queued = data;
          },
          update: (_ref, data) => {
            queued = { ...state.record, ...data };
          },
        };
        await operation(transaction);
        if (options.concurrentRecord) {
          // Model Firestore's retry after another writer wins the first attempt.
          state.record = options.concurrentRecord;
          queued = undefined;
          await operation(transaction);
        }
        if (queued !== undefined) write(queued);
      },
    },
    'expo-constants': { default: { expoConfig: { extra: { firebase: {} } } } },
    '../i18n': { t: (key) => key },
  };
  const filename = path.join(__dirname, '../src/lib/firebase.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      assert(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
    module,
    module.exports
  );
  return { firebase: module.exports, state, credential };
}

test('verification delivery failure preserves the created profile and reports its distinct outcome', async () => {
  const h = setup({ verificationError: new Error('mail delivery unavailable') });
  await assert.rejects(
    h.firebase.signUpWithEmail('profile@example.invalid', 'fixture-only', 'Fixture'),
    (error) =>
      error.code === 'auth/account-setup-incomplete' &&
      error.failures.join(',') === 'verification-email'
  );
  assert.equal(h.state.record.uid, 'profile-fixture');
  assert.deepEqual(h.state.events, ['profile', 'account-name', 'verification']);
});

test('successful signup persists its profile before requesting verification delivery', async () => {
  const h = setup();
  assert.equal(
    await h.firebase.signUpWithEmail('profile@example.invalid', 'fixture-only', 'Fixture'),
    h.credential
  );
  assert.deepEqual(h.state.events, ['profile', 'account-name', 'verification']);
});

test('an existing profile retains every field except the intended login timestamps', async () => {
  const record = { uid: 'profile-fixture', coinBalance: 7, notes: ['keep'], custom: { v: 1 } };
  const h = setup({ record });
  await h.firebase.signInWithGoogleCredential('fixture-only');
  assert.deepEqual(h.state.record, {
    ...record,
    lastLoginAt: 'server-timestamp',
    updatedAt: 'server-timestamp',
  });
  assert.equal(h.state.writes, 1);
});

test('a concurrent profile creator wins without this client replacing its data', async () => {
  const record = { uid: 'profile-fixture', coinBalance: 3, notes: ['concurrent'] };
  const h = setup({ concurrentRecord: record });
  await h.firebase.signInWithGoogleCredential('fixture-only');
  assert.deepEqual(h.state.record, {
    ...record,
    lastLoginAt: 'server-timestamp',
    updatedAt: 'server-timestamp',
  });
  assert.equal(h.state.writes, 1);
  assert.equal(h.state.transactions, 1);
});

test('profile persistence failure propagates and does not send a verification success signal', async () => {
  const failure = new Error('profile write denied');
  const h = setup({ writeError: failure });
  await assert.rejects(
    h.firebase.signUpWithEmail('profile@example.invalid', 'fixture-only', 'Fixture'),
    (error) => error === failure
  );
  assert.equal(h.state.record, undefined);
  assert.deepEqual(h.state.events, []);
});

for (const method of ['signInWithGoogleCredential', 'signInWithAppleCredential']) {
  test(`${method}: a failed first profile write can be retried when Firebase no longer marks the account new`, async () => {
    const options = { writeError: new Error('temporary write failure'), isNewUser: true };
    const h = setup(options);
    await assert.rejects(h.firebase[method]('fixture-only', 'fixture-nonce'));
    assert.equal(h.state.record, undefined);
    options.writeError = undefined;
    options.isNewUser = false;
    assert.equal(await h.firebase[method]('fixture-only', 'fixture-nonce'), h.credential);
    assert.equal(h.state.record.uid, 'profile-fixture');
    assert.equal(h.state.writes, 1);
  });
}

test('email sign-in recovers a profile after signup authenticated but its profile write failed', async () => {
  const options = { writeError: new Error('temporary profile write failure') };
  const h = setup(options);
  await assert.rejects(
    h.firebase.signUpWithEmail('profile@example.invalid', 'fixture-only', 'Fixture'),
    (error) => error === options.writeError
  );
  assert.equal(h.state.record, undefined);

  options.writeError = undefined;
  assert.equal(
    await h.firebase.signInWithEmail('profile@example.invalid', 'fixture-only'),
    h.credential
  );
  assert.equal(h.state.record.uid, h.credential.user.uid);
  assert.equal(h.state.record.email, h.credential.user.email);
  assert.equal(h.state.record.displayName, h.credential.user.displayName);
  assert.equal(h.state.transactions, 2);
  assert.equal(h.state.writes, 1);
  assert.deepEqual(h.state.events, ['profile']);
});

test('email sign-in propagates a profile write failure and permits a later retry', async () => {
  const options = { writeError: new Error('profile write unavailable') };
  const h = setup(options);
  await assert.rejects(
    h.firebase.signInWithEmail('profile@example.invalid', 'fixture-only'),
    (error) => error === options.writeError
  );
  assert.equal(h.state.record, undefined);
  assert.equal(h.state.writes, 0);

  options.writeError = undefined;
  assert.equal(
    await h.firebase.signInWithEmail('profile@example.invalid', 'fixture-only'),
    h.credential
  );
  assert.equal(h.state.record.uid, h.credential.user.uid);
  assert.equal(h.state.transactions, 2);
  assert.equal(h.state.writes, 1);
});

for (const existingState of ['record', 'concurrentRecord']) {
  test(`email sign-in preserves ${existingState} fields and changes only login timestamps`, async () => {
    const record = {
      uid: 'profile-fixture',
      displayName: 'Saved name',
      coinBalance: 7,
      onboardingCompleted: true,
      notes: ['keep'],
      custom: { v: 1 },
    };
    const h = setup({ [existingState]: record });
    await h.firebase.signInWithEmail('profile@example.invalid', 'fixture-only');
    assert.deepEqual(h.state.record, {
      ...record,
      lastLoginAt: 'server-timestamp',
      updatedAt: 'server-timestamp',
    });
    assert.equal(h.state.transactions, 1);
    assert.equal(h.state.writes, 1);
  });
}

test('failed email authentication never reads or writes a profile', async () => {
  const failure = new Error('invalid credentials');
  const h = setup({ signInError: failure });
  await assert.rejects(
    h.firebase.signInWithEmail('profile@example.invalid', 'fixture-only'),
    (error) => error === failure
  );
  assert.equal(h.state.transactions, 0);
  assert.equal(h.state.writes, 0);
  assert.equal(h.state.record, undefined);
});

for (const method of ['signInWithGoogleCredential', 'signInWithAppleCredential']) {
  test(`${method}: a confirmed new account without name or email has no undefined Firestore fields`, async () => {
    const h = setup({ user: { email: null, displayName: null, photoURL: null } });
    await h.firebase[method]('fixture-only', 'fixture-nonce');
    assert.equal(h.state.record.uid, 'profile-fixture');
    assert.equal(h.state.record.email, '');
    assert.equal(h.state.record.displayName, '');
    assert.equal(h.state.record.photoURL, null);
    assert.equal(h.state.record.isPremium, false);
    assert.equal(h.state.record.subscriptionTier, 'free');
    // Preserve the existing default; it does not establish server financial rights.
    assert.equal(h.state.record.coinBalance, 100);
    const checkDefined = (value) => {
      assert.notEqual(value, undefined);
      if (value && typeof value === 'object') Object.values(value).forEach(checkDefined);
    };
    checkDefined(h.state.record);
  });
}

test('account-name update failure cannot prevent the profile or verification request', async () => {
  const h = setup({ metadataError: new Error('metadata unavailable') });
  await assert.rejects(
    h.firebase.signUpWithEmail('profile@example.invalid', 'fixture-only', 'Fixture'),
    (error) =>
      error.code === 'auth/account-setup-incomplete' &&
      error.failures.join(',') === 'account-name' &&
      error.message === 'account_name_update_failed_body'
  );
  assert.equal(h.state.record.uid, 'profile-fixture');
  assert.deepEqual(h.state.events, ['profile', 'account-name', 'verification']);
});

test('both follow-up failures remain distinct after successful profile persistence', async () => {
  const h = setup({
    metadataError: new Error('metadata unavailable'),
    verificationError: new Error('mail unavailable'),
  });
  await assert.rejects(
    h.firebase.signUpWithEmail('profile@example.invalid', 'fixture-only', 'Fixture'),
    (error) =>
      error.code === 'auth/account-setup-incomplete' &&
      error.failures.join(',') === 'account-name,verification-email' &&
      error.message === 'account_name_update_failed_body\n\nverification_email_failed_body'
  );
  assert.equal(h.state.record.uid, 'profile-fixture');
});

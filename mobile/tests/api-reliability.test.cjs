const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText;
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
const response = (status = 200, body = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

function harness(fetchResult, tokens = ['account-A']) {
  const calls = [];
  const timers = new Map();
  const delays = [];
  let timerId = 0;
  let tokenReads = 0;
  const module = { exports: {} };
  const imports = {
    'expo-constants': { default: { expoConfig: { extra: { apiUrl: 'https://test.invalid' } } } },
    '../services/tokenManager': {
      tokenManager: { getToken: async () => tokens[Math.min(tokenReads++, tokens.length - 1)] },
    },
    './demoData': { DEMO_TOKEN: 'demo', demoDisi: () => null, demoCevap: () => ({ demo: true }) },
    '../i18n': { t: (key) => key },
    './habits': { createHabitsApi: () => ({}) },
  };
  new Function(
    'require',
    'module',
    'exports',
    'console',
    'fetch',
    'setTimeout',
    'clearTimeout',
    source
  )(
    (name) => {
      assert(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    { log() {} },
    async (url, options) => {
      calls.push({ url, ...options });
      return fetchResult(options, calls.length);
    },
    (callback, delay) => {
      const id = ++timerId;
      delays.push(delay);
      if (delay === 0) queueMicrotask(callback);
      else timers.set(id, { callback, delay });
      return id;
    },
    (id) => timers.delete(id)
  );
  return {
    ...module.exports,
    calls,
    timers,
    delays,
    tokenReads: () => tokenReads,
    fireTimers() {
      for (const [id, { callback }] of [...timers]) {
        timers.delete(id);
        callback();
      }
    },
  };
}

for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
  test(`${method} never replays a 503 even when callers request retries`, async () => {
    const h = harness(() => response(503));
    await assert.rejects(
      h.apiClient.request(
        method,
        '/api/goals',
        { title: 'One goal' },
        { maxRetries: 5, retryDelay: 0 }
      ),
      (error) =>
        error.status === 503 &&
        error.outcomeUnknown === true &&
        error.message === 'request_outcome_unknown'
    );
    assert.equal(h.calls.length, 1);
    assert.equal(h.timers.size, 0);
  });
}

test('an aborted mutation may already be saved: one send, uncertain result, no retry timer', async () => {
  let writes = 0;
  const h = harness(({ signal }) => {
    writes++;
    return new Promise((_, reject) =>
      signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      )
    );
  });
  const result = h.api.createGoal({ title: 'Saved before the response was lost' });
  const rejected = assert.rejects(
    result,
    (error) =>
      error.code === 'TIMEOUT' &&
      error.outcomeUnknown === true &&
      error.message === 'request_outcome_unknown'
  );
  await flush();
  assert.deepEqual(h.delays, [30000]);
  h.fireTimers();
  await flush();
  assert.equal(writes, 1);
  await rejected;
  assert.equal(h.timers.size, 0);
});

test('GET honors its request retry budget and freezes the account token for every attempt', async () => {
  const h = harness(() => response(503), ['account-A', 'account-B']);
  await assert.rejects(
    h.apiClient.get('/api/user', { maxRetries: 5, retryDelay: 0 }),
    (error) => error.status === 503
  );
  assert.equal(h.calls.length, 6);
  assert.equal(h.tokenReads(), 1);
  assert(h.calls.every((call) => call.headers.Authorization === 'Bearer account-A'));
  assert.equal(h.timers.size, 0);
});

test('zero retries remains one read and authorization overrides never read another account token', async () => {
  const h = harness(() => response(503));
  await assert.rejects(
    h.apiClient.get('/api/user', { maxRetries: 0, authorizationToken: 'pinned' })
  );
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].headers.Authorization, 'Bearer pinned');
  assert.equal(h.tokenReads(), 0);
});

test('native fetch TypeError is a network failure, and only the read retries', async () => {
  const read = harness((_, attempt) => {
    if (attempt === 1) throw new TypeError('Network request failed');
    return response(200, { saved: true });
  });
  assert.deepEqual(await read.apiClient.get('/api/goals', { maxRetries: 1, retryDelay: 0 }), {
    saved: true,
  });
  assert.equal(read.calls.length, 2);
  assert.equal(read.timers.size, 0);
  const write = harness(() => {
    throw new TypeError('Network request failed');
  });
  await assert.rejects(
    write.apiClient.post('/api/goals', {}),
    (error) => error.code === 'NETWORK_ERROR' && error.outcomeUnknown === true
  );
  assert.equal(write.calls.length, 1);
  assert.equal(write.timers.size, 0);
});

test('safe reads can recover after a 30-second cold-start timeout without extending the per-attempt budget', async () => {
  const h = harness(({ signal }, attempt) =>
    attempt === 1
      ? new Promise((_, reject) =>
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          )
        )
      : response(200, { ready: true })
  );
  const result = h.apiClient.get('/api/goals', { retryDelay: 0 });
  await flush();
  h.fireTimers();
  assert.deepEqual(await result, { ready: true });
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.delays, [30000, 0, 30000]);
  assert.equal(h.timers.size, 0);
});

test('the deadline remains active while reading a body, and an aborted body never replays a write', async () => {
  const h = harness(({ signal }) => ({
    ...response(),
    json: () =>
      new Promise((_, reject) =>
        signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        )
      ),
  }));
  const result = h.apiClient.patch('/api/goals/one', { status: 'completed' });
  const rejected = assert.rejects(
    result,
    (error) => error.code === 'TIMEOUT' && error.outcomeUnknown === true
  );
  await flush();
  assert.equal(h.timers.size, 1);
  h.fireTimers();
  await rejected;
  assert.equal(h.calls.length, 1);
  assert.equal(h.timers.size, 0);
});

test('401/403 and explicit server codes are preserved without replay', async () => {
  for (const status of [401, 403]) {
    const h = harness(() => response(status, { code: 'AUTH_REQUIRED', message: 'Sign in' }));
    await assert.rejects(
      h.apiClient.get('/api/user'),
      (error) => error.code === 'AUTH_REQUIRED' && !error.outcomeUnknown
    );
    assert.equal(h.calls.length, 1);
    assert.equal(h.timers.size, 0);
  }
  const h = harness(() => response(503, { code: 'AI_UNAVAILABLE' }));
  await assert.rejects(h.api.getCoachResponse('draft'), (error) => error.code === 'AI_UNAVAILABLE');
  assert.equal(h.calls.length, 1);
});

test('HEAD retries safely but never parses an absent response body', async () => {
  const h = harness((_, attempt) =>
    attempt === 1
      ? response(503)
      : {
          ...response(),
          json: async () => {
            throw new Error('HEAD has no body');
          },
        }
  );
  assert.equal(
    await h.apiClient.request('HEAD', '/healthz', undefined, { maxRetries: 1, retryDelay: 0 }),
    undefined
  );
  assert.equal(h.calls.length, 2);
  assert.equal(h.timers.size, 0);
});

test('serialization and invalid success bodies are not mislabeled as fetch network failures', async () => {
  const h = harness(() => response());
  const circular = {};
  circular.self = circular;
  await assert.rejects(
    h.apiClient.post('/api/goals', circular),
    (error) => error.code === 'UNKNOWN_ERROR' && !error.outcomeUnknown
  );
  assert.equal(h.calls.length, 0);
  assert.equal(h.timers.size, 0);
  const malformed = harness(() => ({
    ...response(),
    json: async () => {
      throw new SyntaxError('Invalid JSON');
    },
  }));
  await assert.rejects(
    malformed.apiClient.post('/api/goals', {}),
    (error) => error.code === 'UNKNOWN_ERROR' && error.outcomeUnknown === true
  );
  assert.equal(malformed.calls.length, 1);
  assert.equal(malformed.timers.size, 0);
});

test('demo still resolves locally without tokens, timers or network requests', async () => {
  const h = harness(() => {
    throw new Error('Demo must not fetch');
  }, ['demo']);
  assert.deepEqual(await h.api.createGoal({ title: 'Sample' }), { demo: true });
  assert.equal(h.calls.length, 0);
  assert.equal(h.timers.size, 0);
});

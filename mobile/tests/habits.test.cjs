const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

// Exercise the shipped TypeScript without React Native or a network service.
function loadSource(relative, imports = {}, clock = Date) {
  const filename = path.join(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'Date', source)(
    (name) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    clock
  );
  return module.exports;
}

const { HabitTracker, createHabitsApi } = loadSource('src/lib/habits.ts');
const sample = (values = {}) => ({
  id: 'walk',
  title: 'Walk',
  category: 'health',
  completedToday: false,
  currentStreak: 2,
  longestStreak: 4,
  totalCompletions: 6,
  ...values,
});
const newHabit = {
  title: 'Read',
  description: '',
  category: 'learning',
  icon: 'book',
  color: '#fff',
  frequency: 'daily',
  difficulty: 'medium',
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('completion uses the real /check endpoint, does not retry POST, and unwraps the server response', async () => {
  const calls = [];
  const api = createHabitsApi({
    get: async () => [sample()],
    post: async (...args) => {
      calls.push(args);
      return { completion: { id: 'c1' }, habit: sample({ totalCompletions: 7 }) };
    },
  });
  const result = await api.trackHabit('walk/one');
  assert.deepEqual(calls, [['/api/habits/walk%2Fone/check', undefined, { maxRetries: 0 }]]);
  assert.equal(result.completedToday, true);
  assert.equal(result.totalCompletions, 7);
});

test('malformed reads and writes cannot masquerade as empty records or a successful check-in', async () => {
  for (const result of [null, {}, [{ id: 'walk', title: 'Walk' }]]) {
    const api = createHabitsApi({ get: async () => result, post: async () => ({}) });
    await assert.rejects(api.getHabits());
    await assert.rejects(api.trackHabit('walk'));
  }
});

test('create uses one POST without automatic retries and returns a usable pending habit', async () => {
  const calls = [];
  const api = createHabitsApi({
    get: async () => [],
    post: async (...args) => {
      calls.push(args);
      return { id: 'new', ...newHabit };
    },
  });
  assert.equal((await api.createHabit(newHabit)).completedToday, false);
  assert.deepEqual(calls, [['/api/habits', newHabit, { maxRetries: 0 }]]);
});

test('rapid repeated taps produce one check-in and update the displayed counts', async () => {
  const gate = deferred();
  let posts = 0;
  const tracker = new HabitTracker({
    getHabits: async () => [sample()],
    trackHabit: async () => {
      posts++;
      await gate.promise;
      return sample({ completedToday: true, totalCompletions: 7 });
    },
  });
  await tracker.refresh();
  const first = tracker.check('walk');
  const second = tracker.check('walk');
  await Promise.resolve();
  assert.equal(tracker.getSnapshot().checkingId, 'walk');
  assert.equal(posts, 1);
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(tracker.getSnapshot().habits[0].completedToday, true);
  assert.equal(tracker.getSnapshot().habits[0].totalCompletions, 7);
  assert.equal(tracker.getSnapshot().checkingId, null);
});

test('a second device check-in, paused habit, archived habit or deletion is respected before POST', async () => {
  for (const latest of [
    [sample({ completedToday: true })],
    [sample({ isPaused: true })],
    [sample({ isActive: false })],
    [],
  ]) {
    let posts = 0;
    let records = [sample()];
    const tracker = new HabitTracker({
      getHabits: async () => records,
      trackHabit: async () => {
        posts++;
      },
    });
    await tracker.refresh();
    records = latest;
    await tracker.check('walk');
    assert.equal(posts, 0);
    assert.deepEqual(tracker.getSnapshot().habits, latest);
  }
});

test('the server can reopen a habit on a new day; yesterday’s cached state is not authoritative', async () => {
  let today = false;
  let posts = 0;
  const tracker = new HabitTracker({
    getHabits: async () => [sample({ completedToday: !today })],
    trackHabit: async () => {
      posts++;
      return sample({ completedToday: true });
    },
  });
  await tracker.refresh();
  today = true;
  await tracker.refresh();
  assert.equal(tracker.getSnapshot().habits[0].completedToday, false);
  await tracker.check('walk');
  assert.equal(posts, 1);
});

test('a lost response after a successful check-in reconciles without repeating the POST', async () => {
  let stored = false;
  let posts = 0;
  const tracker = new HabitTracker({
    getHabits: async () => [sample({ completedToday: stored })],
    trackHabit: async () => {
      posts++;
      stored = true;
      throw new Error('Lost response');
    },
  });
  await tracker.refresh();
  await tracker.check('walk');
  assert.equal(posts, 1);
  assert.equal(tracker.getSnapshot().habits[0].completedToday, true);
  assert.equal(tracker.getSnapshot().error, null);
});

test('an uncertain failure keeps records visible and blocks another write until refresh succeeds', async () => {
  let offline = false;
  let posts = 0;
  const tracker = new HabitTracker({
    getHabits: async () => {
      if (offline) throw new Error('Offline');
      return [sample()];
    },
    trackHabit: async () => {
      posts++;
      offline = true;
      throw new Error('Offline');
    },
  });
  await tracker.refresh();
  await tracker.check('walk');
  await tracker.check('walk');
  assert.equal(posts, 1);
  assert.equal(tracker.getSnapshot().habits.length, 1);
  assert.equal(tracker.getSnapshot().error, 'check');
  offline = false;
  await tracker.refresh();
  assert.equal(tracker.getSnapshot().error, null);
});

test('failed initial reads are errors, and explicit retry recovers', async () => {
  let offline = true;
  let posts = 0;
  const tracker = new HabitTracker({
    getHabits: async () => {
      if (offline) throw new Error('Offline');
      return [sample()];
    },
    trackHabit: async () => {
      posts++;
    },
  });
  await tracker.refresh();
  assert.equal(tracker.getSnapshot().error, 'load');
  assert.equal(tracker.getSnapshot().loading, false);
  await tracker.check('walk');
  assert.equal(posts, 0);
  offline = false;
  await tracker.refresh();
  assert.equal(tracker.getSnapshot().habits.length, 1);
  assert.equal(tracker.getSnapshot().error, null);
});

test('creating twice while saving produces one record and exposes its saving state', async () => {
  const gate = deferred();
  let posts = 0;
  const tracker = new HabitTracker({
    getHabits: async () => [],
    createHabit: async () => {
      posts++;
      await gate.promise;
      return sample({ id: 'new' });
    },
  });
  await tracker.refresh();
  const first = tracker.create(newHabit);
  assert.equal(tracker.getSnapshot().saving, true);
  assert.equal(await tracker.create(newHabit), false);
  gate.resolve();
  assert.equal(await first, true);
  assert.equal(posts, 1);
  assert.equal(tracker.getSnapshot().habits.length, 1);
  assert.equal(tracker.getSnapshot().saving, false);
});

test('demo accepts the same contract, counts once, and reset discards the sample changes', async () => {
  const demo = loadSource('src/lib/demoData.ts', { '../i18n': { t: (key) => key } });
  const transport = {
    get: async (route) => demo.demoCevap('GET', route),
    post: async (route, body) => demo.demoCevap('POST', route, body),
  };
  const api = createHabitsApi(transport);
  const baseline = (await api.getHabits()).find((h) => h.id === 'h2');
  await api.trackHabit('h2');
  const twice = await api.trackHabit('h2');
  assert.equal(twice.totalCompletions, baseline.totalCompletions + 1);
  assert.equal(twice.completedToday, true);
  await api.createHabit(newHabit);
  demo.demoSifirla();
  const reset = await api.getHabits();
  assert.equal(reset.length, 3);
  assert.equal(reset.find((h) => h.id === 'h2').completedToday, false);
  assert.match(demo.demoDisi('/api/subscription/verify'), /account/i);
  assert.equal(demo.demoCevap('POST', '/api/habits/h2/track'), undefined);
});

test('a foreground or midnight refresh during a check is performed after the write settles', async () => {
  const gate = deferred();
  let reads = 0;
  const tracker = new HabitTracker({
    getHabits: async () => {
      reads++;
      return [sample()];
    },
    trackHabit: async () => {
      await gate.promise;
      return sample({ completedToday: true });
    },
  });
  await tracker.refresh();
  const check = tracker.check('walk');
  await Promise.resolve();
  await tracker.refresh();
  gate.resolve();
  await check;
  assert.equal(reads, 3);
  assert.equal(tracker.getSnapshot().habits[0].completedToday, false);
});

test('demo completion status rolls over with the device day', async () => {
  let now = new Date('2026-09-26T12:00:00Z');
  class Clock extends Date {
    constructor(value) {
      super(value === undefined ? now : value);
    }
  }
  const demo = loadSource('src/lib/demoData.ts', { '../i18n': { t: (key) => key } }, Clock);
  demo.demoCevap('POST', '/api/habits/h2/check');
  assert.equal(
    demo.demoCevap('GET', '/api/habits').find((habit) => habit.id === 'h2').completedToday,
    true
  );
  now = new Date('2026-09-27T12:00:00Z');
  assert.equal(
    demo.demoCevap('GET', '/api/habits').find((habit) => habit.id === 'h2').completedToday,
    false
  );
});

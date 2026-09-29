const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// Explicit emulator endpoint and demo project prevent accidental production tests.
const endpoint = process.env.FIRESTORE_EMULATOR_HOST;
if (!endpoint || !/^(127\.0\.0\.1|localhost):\d+$/.test(endpoint)) {
  throw new Error('Set FIRESTORE_EMULATOR_HOST to an explicit loopback host:port.');
}
const [host, portText] = endpoint.split(':');
const depsDirectory = process.env.LILOVE_RULES_DEPS_DIR;
if (!depsDirectory || !path.isAbsolute(depsDirectory)) {
  throw new Error('Set LILOVE_RULES_DEPS_DIR to the isolated QA dependency directory.');
}
const deps = createRequire(path.join(depsDirectory, 'package.json'));
const { initializeTestEnvironment, assertSucceeds, assertFails } = deps(
  '@firebase/rules-unit-testing'
);
const sdk = deps('firebase/firestore');
const {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
  writeBatch,
} = sdk;
const ts = require('../node_modules/typescript');
const projectId = 'demo-lilove-0087';
let environment;
let ownerDb;
let otherDb;
let anonymousDb;
const uid = 'owner-fixture';
const email = 'owner@example.invalid';
const ref = (db = ownerDb, id = uid) => doc(db, 'users', id);

function profile(overrides = {}) {
  return {
    uid,
    email,
    displayName: 'Owner',
    photoURL: null,
    isPremium: false,
    subscriptionTier: 'free',
    coinBalance: 100,
    onboardingCompleted: false,
    mood: 'neutral',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: { theme: 'light', notifications: true, language: 'en' },
    stats: {
      totalGoals: 0,
      completedGoals: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalXP: 0,
      level: 1,
    },
    ...overrides,
  };
}

async function seed(overrides = {}) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(ref(context.firestore()), profile(overrides));
  });
}

// The current app adapter runs against the real emulator SDK; only Auth identity,
// display-name/email side effects and Expo/native configuration are mocked.
function appAdapter(db = ownerDb, userOverrides = {}) {
  const user = { uid, email, displayName: 'Owner', photoURL: null, ...userOverrides };
  const imports = {
    'firebase/app': { getApps: () => [], initializeApp: () => ({}) },
    './firebaseAuth': { initializeAppAuth: () => ({}) },
    'firebase/auth': {
      createUserWithEmailAndPassword: async () => ({ user }),
      signInWithEmailAndPassword: async () => ({ user }),
      signInWithCredential: async () => ({ user }),
      updateProfile: async () => {},
      sendEmailVerification: async () => {},
      GoogleAuthProvider: { credential: () => ({}) },
    },
    'firebase/firestore': { ...sdk, getFirestore: () => db },
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
  return module.exports;
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port: Number(portText),
      rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
  ownerDb = environment.authenticatedContext(uid, { email }).firestore();
  otherDb = environment
    .authenticatedContext('other-fixture', { email: 'other@example.invalid' })
    .firestore();
  anonymousDb = environment.unauthenticatedContext().firestore();
});
beforeEach(async () => environment.clearFirestore());
after(async () => environment?.cleanup());

test('actual signup transaction reads a missing own document and creates the exact supported profile', async () => {
  assert.equal((await assertSucceeds(getDoc(ref()))).exists(), false);
  await assertSucceeds(appAdapter().signUpWithEmail(email, 'not-a-real-password', 'Owner'));
  const data = (await assertSucceeds(getDoc(ref()))).data();
  assert.equal(data.uid, uid);
  assert.equal(data.coinBalance, 100);
  assert.equal(data.isPremium, false);
  assert(data.createdAt instanceof Timestamp);
  assert(data.createdAt.isEqual(data.updatedAt));
});

test('actual email sign-in repairs a missing profile through the same owner transaction', async () => {
  await assertSucceeds(appAdapter().signInWithEmail(email, 'not-a-real-password'));
  const first = (await getDoc(ref())).data();
  assert.equal(first.uid, uid);
  await assertSucceeds(appAdapter().signInWithEmail(email, 'not-a-real-password'));
  const second = (await getDoc(ref())).data();
  assert(second.createdAt.isEqual(first.createdAt));
  assert(second.lastLoginAt.isEqual(second.updatedAt));
});

test('actual repeated OAuth login updates only timestamps and preserves stored fields', async () => {
  await seed({ coinBalance: 7, stats: { totalXP: 80 }, trustedServerField: 'retained' });
  const before = (await getDoc(ref())).data();
  await assertSucceeds(appAdapter().signInWithGoogleCredential('not-a-real-token'));
  const after = (await getDoc(ref())).data();
  assert.equal(after.coinBalance, 7);
  assert.deepEqual(after.stats, { totalXP: 80 });
  assert.equal(after.trustedServerField, 'retained');
  assert(after.createdAt.isEqual(before.createdAt));
  assert(after.lastLoginAt.isEqual(after.updatedAt));
});

test('login timestamp updates preserve legacy shapes and paid/server values without demanding creation defaults', async () => {
  await seed({
    coinBalance: 12,
    isPremium: true,
    subscriptionTier: 'legacy-plan',
    settings: { oldPreference: true },
    mood: 'legacy-mood',
    displayName: null,
    stats: { totalXP: 80 },
    trustedServerField: 'retained',
  });
  const before = (await getDoc(ref())).data();
  await assertSucceeds(appAdapter().signInWithGoogleCredential('not-a-real-token'));
  const after = (await getDoc(ref())).data();
  for (const key of Object.keys(before).filter((key) => key !== 'updatedAt')) {
    assert.deepEqual(after[key], before[key]);
  }
  await assertSucceeds(updateDoc(ref(), { mood: 'calm', updatedAt: serverTimestamp() }));
  await assertFails(
    updateDoc(ref(), { settings: { oldPreference: false }, updatedAt: serverTimestamp() })
  );
});

test('actual settings and mood helpers accept supported updates without changing protected fields', async () => {
  await seed();
  await assertSucceeds(
    appAdapter().updateUserProfile(uid, {
      settings: { theme: 'dark', notifications: false, language: 'tr' },
    })
  );
  for (const mood of [
    'energized',
    'happy',
    'peaceful',
    'focused',
    'motivated',
    'grateful',
    'neutral',
    'tired',
    'calm',
  ]) {
    await assertSucceeds(appAdapter().updateUserMood(uid, mood));
  }
  const data = (await getDoc(ref())).data();
  assert.deepEqual(data.settings, { theme: 'dark', notifications: false, language: 'tr' });
  assert.equal(data.coinBalance, 100);
});

test('legitimate name, photo, onboarding and seven supported language changes are allowed', async () => {
  await seed();
  for (const photoURL of [
    null,
    'https://example.invalid/photo.png',
    '/uploads/profile-pictures/fixture.webp',
  ]) {
    await assertSucceeds(
      updateDoc(ref(), {
        displayName: 'Updated',
        photoURL,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      })
    );
  }
  for (const language of ['en', 'tr', 'de', 'es', 'fr', 'it', 'ja']) {
    await assertSucceeds(
      updateDoc(ref(), { 'settings.language': language, updatedAt: serverTimestamp() })
    );
  }
});

test('an account without an email claim can create only its empty-email profile', async () => {
  const db = environment.authenticatedContext(uid).firestore();
  await assertFails(setDoc(ref(db), profile()));
  await assertSucceeds(
    appAdapter(db, { email: null, displayName: null }).signInWithGoogleCredential('fixture')
  );
  assert.equal((await getDoc(ref(db))).data().email, '');
});

test('unauthenticated and other-user reads/creates/updates are denied', async () => {
  await seed();
  for (const db of [anonymousDb, otherDb]) {
    await assertFails(getDoc(ref(db)));
    await assertFails(updateDoc(ref(db), { mood: 'happy', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref(db, 'unrelated-fixture'), profile({ uid: 'unrelated-fixture' })));
  }
});

test('owner list/query, deletes, nested documents and every unrelated collection remain denied', async () => {
  await seed();
  await assertFails(getDocs(collection(ownerDb, 'users')));
  await assertFails(getDocs(query(collection(ownerDb, 'users'), where('uid', '==', uid))));
  await assertFails(deleteDoc(ref()));
  for (const route of [
    `users/${uid}/private/note`,
    'goals/fixture',
    'messages/fixture',
    'connections/fixture',
  ]) {
    await assertFails(setDoc(doc(ownerDb, route), { userId: uid }));
    await assertFails(getDoc(doc(ownerDb, route)));
  }
});

test('creation requires all supported fields and refuses unknown fields', async () => {
  for (const key of Object.keys(profile())) {
    const value = profile();
    delete value[key];
    await assertFails(setDoc(ref(), value));
  }
  await assertFails(setDoc(ref(), profile({ role: 'admin' })));
  await assertFails(setDoc(ref(), profile({ lastLoginAt: serverTimestamp() })));
});

test('creation refuses identity spoofing, privileged defaults, stats changes and fabricated timestamps', async () => {
  for (const patch of [
    { uid: 'other-fixture' },
    { email: 'spoof@example.invalid' },
    { email: null },
    { isPremium: true },
    { subscriptionTier: 'premium' },
    { coinBalance: 101 },
    { coinBalance: '100' },
    { onboardingCompleted: true },
    { mood: 'happy' },
    { stats: { ...profile().stats, totalXP: 1 } },
    { stats: { ...profile().stats, level: '1' } },
    { stats: { ...profile().stats, role: 'admin' } },
    { settings: { theme: 'dark', notifications: true, language: 'en' } },
    { createdAt: Timestamp.fromMillis(0) },
    { updatedAt: Timestamp.fromMillis(0) },
  ])
    await assertFails(setDoc(ref(), profile(patch)));
});

test('mutable values reject wrong types, unsupported values and oversized text', async () => {
  await seed();
  for (const patch of [
    { displayName: null },
    { displayName: 7 },
    { displayName: 'x'.repeat(101) },
    { photoURL: {} },
    { photoURL: 'https://example.invalid/' + 'x'.repeat(2048) },
    { photoURL: 'javascript:alert(1)' },
    { photoURL: 'http://example.invalid/photo' },
    { onboardingCompleted: 'true' },
    { mood: 'unsupported' },
    { mood: {} },
    { settings: null },
    { settings: { theme: 'light', notifications: 'true', language: 'en' } },
    { settings: { theme: 'light', notifications: true, language: 'unsupported' } },
    { settings: { theme: 'system', notifications: true, language: 'en' } },
    { settings: { theme: 'light', notifications: true, language: 'en', isPremium: true } },
    { settings: { theme: 'light', notifications: true } },
  ])
    await assertFails(updateDoc(ref(), { ...patch, updatedAt: serverTimestamp() }));
});

test('updates cannot change or remove identity, balance, entitlement, stats, creation time or unknown fields', async () => {
  await seed();
  for (const patch of [
    { uid: 'other' },
    { email: 'other@example.invalid' },
    { coinBalance: 999 },
    { isPremium: true },
    { subscriptionTier: 'premium' },
    { 'stats.totalXP': 1 },
    { createdAt: serverTimestamp() },
    { role: 'admin' },
    { coinBalance: deleteField() },
    { uid: deleteField() },
    { stats: deleteField() },
    { settings: deleteField() },
  ])
    await assertFails(updateDoc(ref(), { ...patch, updatedAt: serverTimestamp() }));
});

test('all update timestamps must use the server request time', async () => {
  await seed();
  await assertFails(updateDoc(ref(), { mood: 'happy' }));
  await assertFails(updateDoc(ref(), { updatedAt: Timestamp.fromMillis(0) }));
  await assertFails(
    updateDoc(ref(), { lastLoginAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() })
  );
  await assertSucceeds(
    updateDoc(ref(), { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() })
  );
  await assertFails(updateDoc(ref(), { lastLoginAt: deleteField(), updatedAt: serverTimestamp() }));
});

test('a mixed authorized/unauthorized atomic batch commits neither change', async () => {
  await seed();
  const batch = writeBatch(ownerDb);
  batch.update(ref(), { displayName: 'Must not persist', updatedAt: serverTimestamp() });
  batch.set(ref(ownerDb, 'other-fixture'), profile({ uid: 'other-fixture' }));
  await assertFails(batch.commit());
  assert.equal((await getDoc(ref())).data().displayName, 'Owner');
});

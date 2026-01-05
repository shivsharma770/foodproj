const admin = require('firebase-admin');

let _initialized = false;
let _demo = false;

function initFirebaseAdmin() {
  if (_initialized) return;
  _initialized = true;

  // Demo mode: allow backend to run without Firebase credentials.
  // If you want non-demo mode, set one of:
  // - FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string)
  // - FIREBASE_SERVICE_ACCOUNT_PATH (path to json file)
  // plus optionally FIREBASE_PROJECT_ID.
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  try {
    if (json) {
      const serviceAccount = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      _demo = false;
      // eslint-disable-next-line no-console
      console.log('✅ Firebase Admin SDK initialized');
      return;
    }

    if (path) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const serviceAccount = require(path);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      _demo = false;
      // eslint-disable-next-line no-console
      console.log('✅ Firebase Admin SDK initialized');
      return;
    }

    _demo = true;
    // eslint-disable-next-line no-console
    console.warn('⚠️ Firebase Admin credentials not found. Running in DEMO mode.');
  } catch (e) {
    _demo = true;
    // eslint-disable-next-line no-console
    console.warn('⚠️ Failed to initialize Firebase Admin. Running in DEMO mode.', e?.message || e);
  }
}

function isDemo() {
  initFirebaseAdmin();
  return _demo;
}

function getFirestore() {
  initFirebaseAdmin();
  if (_demo) {
    throw new Error('Firestore is not available in demo mode');
  }
  return admin.firestore();
}

function getAuth() {
  initFirebaseAdmin();
  if (_demo) {
    throw new Error('Auth is not available in demo mode');
  }
  return admin.auth();
}

module.exports = {
  isDemo,
  getFirestore,
  getAuth,
};











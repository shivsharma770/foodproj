const { getAuth, isDemo } = require('../config/firebase');

/**
 * Auth middleware using Firebase ID tokens.
 * - Normal mode: expects Authorization: Bearer <firebase-id-token>
 * - Demo mode: accepts Authorization: Bearer demo-<uid> or just "Bearer demo"
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing Authorization header' });
    }

    // Demo mode shortcut
    if (isDemo()) {
      let demoUid = 'demo-user';
      // Handle "demo-token-{uid}" format from frontend
      if (token.startsWith('demo-token-')) {
        demoUid = token.slice('demo-token-'.length);
      } else if (token.startsWith('demo-')) {
        demoUid = token.slice('demo-'.length);
      }
      req.user = { uid: demoUid, isDemo: true };
      return next();
    }

    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, isDemo: false };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  if (isDemo()) {
    let demoUid = 'demo-user';
    if (token.startsWith('demo-token-')) {
      demoUid = token.slice('demo-token-'.length);
    } else if (token.startsWith('demo-')) {
      demoUid = token.slice('demo-'.length);
    }
    req.user = { uid: demoUid, isDemo: true };
    return next();
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, isDemo: false };
    return next();
  } catch (_e) {
    req.user = null;
    return next();
  }
}

module.exports = {
  authMiddleware,
  optionalAuth,
};




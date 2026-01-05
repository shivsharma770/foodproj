const express = require('express');
const router = express.Router();

const { getFirestore, isDemo } = require('../config/firebase');
const { authMiddleware } = require('../middleware/auth');
const { COLLECTIONS, MESSAGE_TYPE } = require('../../shared/types');
const demoStore = require('../demoStore');

function normalizeMessage(docOrObj) {
  const m = docOrObj?.data ? { id: docOrObj.id, ...docOrObj.data() } : docOrObj;
  if (!m) return null;
  // Some older clients used `text`
  if (!m.content && m.text) m.content = m.text;
  return m;
}

/**
 * GET /messages/conversation/:pickupId
 * Returns messages ordered by createdAt ASC (sorted in memory to avoid index needs)
 */
router.get('/conversation/:pickupId', authMiddleware, async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { isDemo: isDemoUser } = req.user;

    if (isDemo() || isDemoUser) {
      // Get messages for this pickup from demoStore
      const allMessages = Object.values(demoStore.messages).filter(m => m.pickupId === pickupId);
      const messages = allMessages.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      // Also get pickup status for the frontend
      const pickup = demoStore.pickups[pickupId] || null;
      return res.json({ messages, pickup });
    }

    const db = getFirestore();
    const snap = await db.collection(COLLECTIONS.MESSAGES).where('pickupId', '==', pickupId).get();
    const messages = snap.docs.map(normalizeMessage).filter(Boolean).sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    return res.json({ messages });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch messages' });
  }
});

/**
 * POST /messages/send
 * Body: { pickupId, content }
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { pickupId, content } = req.body || {};

    if (!pickupId || !String(pickupId).trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'pickupId is required' });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'content is required' });
    }

    const now = new Date().toISOString();
    const message = {
      pickupId: String(pickupId).trim(),
      senderId: uid,
      senderRole: 'user',
      senderName: 'User',
      content: String(content).trim(),
      type: MESSAGE_TYPE.TEXT,
      createdAt: now,
    };

    if (isDemo() || isDemoUser) {
      // Get user info for sender name
      const demoUser = demoStore.users[uid];
      const senderName = demoUser?.name || 'User';
      const senderRole = demoUser?.role || 'user';
      
      const msgId = `msg-${Date.now()}`;
      const fullMessage = {
        id: msgId,
        ...message,
        senderId: demoUser?.profileId || uid,
        senderName,
        senderRole
      };
      demoStore.messages[msgId] = fullMessage;
      return res.status(201).json({ message: fullMessage });
    }

    const db = getFirestore();
    const ref = await db.collection(COLLECTIONS.MESSAGES).add(message);
    return res.status(201).json({ message: { id: ref.id, ...message } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to send message' });
  }
});

// ---- Compatibility routes for older frontend code ----
// GET /messages/:pickupId - alias for conversation
router.get('/:pickupId', authMiddleware, async (req, res) => {
  const { pickupId } = req.params;
  const { uid, isDemo: isDemoUser } = req.user;

  try {
    if (isDemo() || isDemoUser) {
      const allMessages = Object.values(demoStore.messages).filter(m => m.pickupId === pickupId);
      const messages = allMessages.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const pickup = demoStore.pickups[pickupId] || null;
      return res.json({ messages, pickup });
    }

    const db = getFirestore();
    const snap = await db.collection(COLLECTIONS.MESSAGES).where('pickupId', '==', pickupId).get();
    const messages = snap.docs.map(normalizeMessage).filter(Boolean).sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    return res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch messages' });
  }
});

// POST /messages/:pickupId - alias for send
router.post('/:pickupId', authMiddleware, async (req, res) => {
  const { pickupId } = req.params;
  const { uid, isDemo: isDemoUser } = req.user;
  const { content } = req.body || {};

  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'content is required' });
  }

  try {
    const now = new Date().toISOString();

    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      const msgId = `msg-${Date.now()}`;
      const message = {
        id: msgId,
        pickupId,
        senderId: demoUser?.profileId || uid,
        senderRole: demoUser?.role || 'user',
        senderName: demoUser?.name || 'User',
        content: String(content).trim(),
        type: MESSAGE_TYPE.TEXT,
        createdAt: now
      };
      demoStore.messages[msgId] = message;
      return res.status(201).json({ message });
    }

    const db = getFirestore();
    const message = {
      pickupId,
      senderId: uid,
      senderRole: 'user',
      senderName: 'User',
      content: String(content).trim(),
      type: MESSAGE_TYPE.TEXT,
      createdAt: now
    };
    const ref = await db.collection(COLLECTIONS.MESSAGES).add(message);
    return res.status(201).json({ message: { id: ref.id, ...message } });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to send message' });
  }
});

module.exports = router;



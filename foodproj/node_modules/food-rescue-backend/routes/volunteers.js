/**
 * Volunteers Routes
 * Handles volunteer availability and nearby search
 */
const express = require('express');
const router = express.Router();
const { getFirestore, isDemo } = require('../config/firebase');
const { authMiddleware } = require('../middleware/auth');
const { COLLECTIONS, USER_ROLES } = require('../shared/types');
const demoStore = require('../demoStore');

/**
 * POST /volunteers/availability
 * Update volunteer availability status
 */
router.post('/availability', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { available, location } = req.body;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only volunteers can update availability' });
      }
      demoStore.volunteers[demoUser.profileId] = {
        id: demoUser.profileId,
        name: demoUser.name,
        available: !!available,
        location: location || null,
        updatedAt: new Date().toISOString()
      };
      return res.json({
        message: 'Availability updated successfully',
        volunteer: demoStore.volunteers[demoUser.profileId]
      });
    }

    const db = getFirestore();

    // Get user and verify volunteer role
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.VOLUNTEER) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only volunteers can update availability'
      });
    }

    const volunteerId = userDoc.data().profileId;

    // Update volunteer document
    await db.collection(COLLECTIONS.VOLUNTEERS).doc(volunteerId).update({
      available: !!available,
      location: location || null,
      lastAvailabilityUpdate: new Date().toISOString()
    });

    res.json({
      message: 'Availability updated successfully',
      volunteer: {
        id: volunteerId,
        available: !!available
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update availability'
    });
  }
});

/**
 * GET /volunteers/available-count
 * Get count of available volunteers (for restaurants to see)
 */
router.get('/available-count', authMiddleware, async (req, res) => {
  try {
    // Demo mode
    if (isDemo()) {
      const availableCount = Object.values(demoStore.volunteers).filter(v => v.available).length;
      return res.json({ count: availableCount });
    }

    const db = getFirestore();
    const snapshot = await db.collection(COLLECTIONS.VOLUNTEERS)
      .where('available', '==', true)
      .get();

    res.json({ count: snapshot.size });
  } catch (error) {
    console.error('Get available count error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch available volunteer count'
    });
  }
});

/**
 * GET /volunteers/nearby
 * Get nearby available volunteers (for restaurants)
 */
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { lat, lng, radius = 10 } = req.query;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const volunteers = Object.values(demoStore.volunteers).filter(v => v.available);
      return res.json({ volunteers });
    }

    const db = getFirestore();

    // For MVP, just return all available volunteers
    // In production, you'd use GeoFirestore or similar for geo queries
    const snapshot = await db.collection(COLLECTIONS.VOLUNTEERS)
      .where('available', '==', true)
      .limit(50)
      .get();

    const volunteers = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      available: doc.data().available,
      // Don't expose exact location for privacy
      hasLocation: !!doc.data().location
    }));

    res.json({ volunteers });
  } catch (error) {
    console.error('Get nearby volunteers error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch nearby volunteers'
    });
  }
});

/**
 * GET /volunteers/me
 * Get current volunteer's profile
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({ error: 'Forbidden', message: 'User is not a volunteer' });
      }
      const volunteer = demoStore.volunteers[demoUser.profileId] || {
        id: demoUser.profileId,
        name: demoUser.name,
        available: false
      };
      return res.json({ volunteer });
    }

    const db = getFirestore();

    // Get user
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.VOLUNTEER) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not a volunteer'
      });
    }

    const volunteerId = userDoc.data().profileId;

    // Get volunteer profile
    const volunteerDoc = await db.collection(COLLECTIONS.VOLUNTEERS).doc(volunteerId).get();
    if (!volunteerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Volunteer profile not found'
      });
    }

    res.json({
      volunteer: {
        id: volunteerDoc.id,
        ...volunteerDoc.data()
      }
    });
  } catch (error) {
    console.error('Get volunteer profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch volunteer profile'
    });
  }
});

module.exports = router;


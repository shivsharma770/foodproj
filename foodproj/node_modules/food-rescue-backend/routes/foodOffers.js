/**
 * Food Offers Routes
 * Handles creating, retrieving, and managing food offers
 */
const express = require('express');
const router = express.Router();
const { getFirestore, isDemo } = require('../config/firebase');
const { authMiddleware } = require('../middleware/auth');
const { COLLECTIONS, OFFER_STATUS, PICKUP_STATUS, USER_ROLES, MESSAGE_TYPE } = require('../shared/types');
const demoStore = require('../demoStore');

/**
 * GET /food_offers
 * Get food offers (optionally filtered by status/restaurant)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, restaurantId, claimedBy, limit = 50 } = req.query;
    const { uid, isDemo: isDemoUser } = req.user;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const offers = Object.values(demoStore.offers).filter((o) => {
        if (status && o.status !== status) return false;
        if (restaurantId && o.restaurantId !== restaurantId) return false;
        if (claimedBy && o.claimedBy !== claimedBy) return false;
        return true;
      });
      // Sort by createdAt descending
      offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ offers });
    }

    const db = getFirestore();

    // Build query - avoid composite indexes by fetching and filtering in memory
    let query = db.collection(COLLECTIONS.FOOD_OFFERS);

    // If filtering by restaurantId (restaurant dashboard), fetch all their offers
    if (restaurantId) {
      query = query.where('restaurantId', '==', restaurantId);
    }

    const snapshot = await query.limit(Number(limit) || 50).get();

    let offers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by status in memory (to avoid composite index requirement)
    if (status) {
      offers = offers.filter((o) => o.status === status);
    }

    // Filter by claimedBy (for volunteer's "my pickups")
    if (claimedBy) {
      offers = offers.filter((o) => o.claimedBy === claimedBy);
    }

    // Sort by createdAt descending
    offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ offers });
  } catch (error) {
    console.error('Get food offers error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch food offers'
    });
  }
});

/**
 * GET /food_offers/:id
 * Get a single food offer by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isDemo: isDemoUser } = req.user;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Food offer not found'
        });
      }
      // Add pickup info if claimed
      if (offer.pickupId && demoStore.pickups[offer.pickupId]) {
        offer.pickup = demoStore.pickups[offer.pickupId];
      }
      return res.json({ offer });
    }

    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.FOOD_OFFERS).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    const offer = { id: doc.id, ...doc.data() };

    // Get restaurant details
    if (offer.restaurantId) {
      const restaurantDoc = await db.collection(COLLECTIONS.RESTAURANTS).doc(offer.restaurantId).get();
      if (restaurantDoc.exists) {
        offer.restaurant = { id: restaurantDoc.id, ...restaurantDoc.data() };
      }
    }

    // Get volunteer details if claimed
    if (offer.claimedBy) {
      const volunteerDoc = await db.collection(COLLECTIONS.VOLUNTEERS).doc(offer.claimedBy).get();
      if (volunteerDoc.exists) {
        offer.volunteer = { id: volunteerDoc.id, ...volunteerDoc.data() };
      }
    }

    // Get pickup info if exists
    if (offer.status === OFFER_STATUS.CLAIMED || offer.status === OFFER_STATUS.COMPLETED) {
      const pickupsSnapshot = await db.collection(COLLECTIONS.PICKUPS)
        .where('foodOfferId', '==', id)
        .limit(1)
        .get();

      if (!pickupsSnapshot.empty) {
        const pickupDoc = pickupsSnapshot.docs[0];
        offer.pickup = { id: pickupDoc.id, ...pickupDoc.data() };
      }
    }

    res.json({ offer });
  } catch (error) {
    console.error('Get food offer error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch food offer'
    });
  }
});

/**
 * POST /food_offers
 * Create a new food offer (restaurant only)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { title, description, quantity, expirationTime, foodType, dietaryInfo } = req.body;

    // Basic validation
    if (!title || !quantity) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Title and quantity are required'
      });
    }

    // Demo mode
    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only restaurants can create food offers'
        });
      }
      const offer = {
        id: `offer-${Date.now()}`,
        title,
        description: description || '',
        quantity: Number(quantity),
        expirationTime: expirationTime || null,
        foodType: foodType || null,
        dietaryInfo: dietaryInfo || [],
        restaurantId: demoUser.profileId,
        restaurantName: demoUser.name,
        restaurantAddress: demoUser.address || '',
        status: OFFER_STATUS.OPEN,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      demoStore.offers[offer.id] = offer;
      return res.status(201).json({ offer, message: 'Food offer created successfully' });
    }

    const db = getFirestore();

    // Get user and verify restaurant role
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.RESTAURANT) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only restaurants can create food offers'
      });
    }

    const userData = userDoc.data();

    // Get restaurant details
    const restaurantDoc = await db.collection(COLLECTIONS.RESTAURANTS).doc(userData.profileId).get();
    const restaurantData = restaurantDoc.exists ? restaurantDoc.data() : {};

    const offerData = {
      title,
      description: description || '',
      quantity: Number(quantity),
      expirationTime: expirationTime || null,
      foodType: foodType || null,
      dietaryInfo: dietaryInfo || [],
      restaurantId: userData.profileId,
      restaurantName: restaurantData.name || 'Unknown Restaurant',
      restaurantAddress: restaurantData.address || '',
      status: OFFER_STATUS.OPEN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection(COLLECTIONS.FOOD_OFFERS).add(offerData);

    res.status(201).json({
      offer: { id: docRef.id, ...offerData },
      message: 'Food offer created successfully'
    });
  } catch (error) {
    console.error('Create food offer error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to create food offer'
    });
  }
});

/**
 * POST /food_offers/:id/claim
 * Volunteer claims a food offer
 */
router.post('/:id/claim', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, isDemo: isDemoUser } = req.user;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      console.log(`[CLAIM] uid=${uid}, demoUser=${JSON.stringify(demoUser)}, allUsers=${JSON.stringify(Object.keys(demoStore.users))}`);
      if (!demoUser) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'User not found. Please log out and register again.'
        });
      }
      if (demoUser.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Only volunteers can claim food offers. Your role is: ${demoUser.role}`
        });
      }
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({ error: 'Not Found', message: 'Food offer not found' });
      }
      if (offer.status !== OFFER_STATUS.OPEN) {
        return res.status(409).json({ error: 'Conflict', message: 'This offer is no longer available' });
      }
      const now = new Date().toISOString();
      const pickupId = `pickup-${Date.now()}`;
      // Create pickup
      demoStore.pickups[pickupId] = {
        id: pickupId,
        foodOfferId: id,
        volunteerId: demoUser.profileId,
        volunteerName: demoUser.name,
        restaurantId: offer.restaurantId,
        status: PICKUP_STATUS.PENDING,
        createdAt: now
      };
      // Update offer
      offer.status = OFFER_STATUS.CLAIMED;
      offer.claimedBy = demoUser.profileId;
      offer.claimedAt = now;
      offer.pickupId = pickupId;
      offer.updatedAt = now;
      // System message
      const msgId = `msg-${Date.now()}`;
      demoStore.messages[msgId] = {
        id: msgId,
        pickupId,
        senderId: 'system',
        senderRole: 'system',
        senderName: 'System',
        content: `${demoUser.name} has claimed this food offer. Awaiting restaurant confirmation.`,
        type: MESSAGE_TYPE.SYSTEM,
        createdAt: now
      };
      return res.json({
        message: 'Offer claimed successfully!',
        offer,
        pickup: demoStore.pickups[pickupId]
      });
    }

    const db = getFirestore();

    // Verify user is a volunteer
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.VOLUNTEER) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only volunteers can claim food offers'
      });
    }

    const userData = userDoc.data();
    const volunteerId = userData.profileId;

    // Get volunteer name
    const volunteerDoc = await db.collection(COLLECTIONS.VOLUNTEERS).doc(volunteerId).get();
    const volunteerName = volunteerDoc.exists ? volunteerDoc.data().name : 'Volunteer';

    // Get the offer
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    const offerData = offerDoc.data();

    if (offerData.status !== OFFER_STATUS.OPEN) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This offer is no longer available'
      });
    }

    const now = new Date().toISOString();

    // Create pickup record
    const pickupData = {
      foodOfferId: id,
      volunteerId,
      volunteerUserId: uid,
      volunteerName,
      restaurantId: offerData.restaurantId,
      status: PICKUP_STATUS.PENDING,
      createdAt: now
    };

    const pickupRef = await db.collection(COLLECTIONS.PICKUPS).add(pickupData);

    // Update offer
    await offerRef.update({
      status: OFFER_STATUS.CLAIMED,
      claimedBy: volunteerId,
      claimedAt: now,
      pickupId: pickupRef.id,
      updatedAt: now
    });

    // Create system message
    await db.collection(COLLECTIONS.MESSAGES).add({
      pickupId: pickupRef.id,
      senderId: 'system',
      senderRole: 'system',
      senderName: 'System',
      content: `${volunteerName} has claimed this food offer. Awaiting restaurant confirmation.`,
      type: MESSAGE_TYPE.SYSTEM,
      createdAt: now
    });

    res.json({
      message: 'Offer claimed successfully! The restaurant will be notified.',
      offer: { id, ...offerData, status: OFFER_STATUS.CLAIMED, claimedBy: volunteerId },
      pickup: { id: pickupRef.id, ...pickupData }
    });
  } catch (error) {
    console.error('Claim offer error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to claim offer'
    });
  }
});

/**
 * POST /food_offers/:id/cancel
 * Restaurant cancels/removes an open offer
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, isDemo: isDemoUser } = req.user;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only restaurants can cancel offers' });
      }
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({ error: 'Not Found', message: 'Food offer not found' });
      }
      if (offer.restaurantId !== demoUser.profileId) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only cancel your own offers' });
      }
      if (offer.status !== OFFER_STATUS.OPEN) {
        return res.status(409).json({ error: 'Conflict', message: 'Only open offers can be cancelled' });
      }
      offer.status = OFFER_STATUS.CANCELLED;
      offer.cancelledAt = new Date().toISOString();
      offer.updatedAt = new Date().toISOString();
      return res.json({
        message: 'Offer removed successfully',
        offer: { id, status: OFFER_STATUS.CANCELLED }
      });
    }

    const db = getFirestore();

    // Verify user is a restaurant
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.RESTAURANT) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only restaurants can cancel offers'
      });
    }

    const restaurantId = userDoc.data().profileId;

    // Get the offer
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    const offerData = offerDoc.data();

    // Verify ownership
    if (offerData.restaurantId !== restaurantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only cancel your own offers'
      });
    }

    // Only allow cancelling open offers
    if (offerData.status !== OFFER_STATUS.OPEN) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Only open offers can be cancelled. Use reject for claimed offers.'
      });
    }

    const now = new Date().toISOString();

    await offerRef.update({
      status: OFFER_STATUS.CANCELLED,
      cancelledAt: now,
      updatedAt: now
    });

    res.json({
      message: 'Offer removed successfully',
      offer: { id, status: OFFER_STATUS.CANCELLED }
    });
  } catch (error) {
    console.error('Cancel offer error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to cancel offer'
    });
  }
});

/**
 * POST /food_offers/:id/cancel_pickup
 * Volunteer cancels their claim (24-hour rule)
 */
router.post('/:id/cancel_pickup', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, isDemo: isDemoUser } = req.user;
    const { reason } = req.body;

    // Demo mode
    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only volunteers can cancel pickups' });
      }
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({ error: 'Not Found', message: 'Food offer not found' });
      }
      if (offer.status !== OFFER_STATUS.CLAIMED || offer.claimedBy !== demoUser.profileId) {
        return res.status(409).json({ error: 'Conflict', message: 'You can only cancel a pickup you have claimed' });
      }
      // 24 hour rule
      if (offer.expirationTime) {
        const pickupTime = new Date(offer.expirationTime);
        const msUntilPickup = pickupTime.getTime() - Date.now();
        const MS_24H = 24 * 60 * 60 * 1000;
        if (msUntilPickup < MS_24H) {
          return res.status(403).json({ error: 'Forbidden', message: 'You can only cancel at least 24 hours before pickup time' });
        }
      }
      const now = new Date().toISOString();
      // Cancel pickup
      if (offer.pickupId && demoStore.pickups[offer.pickupId]) {
        demoStore.pickups[offer.pickupId].status = PICKUP_STATUS.CANCELLED;
        demoStore.pickups[offer.pickupId].cancelledAt = now;
        // System message
        const msgId = `msg-${Date.now()}`;
        demoStore.messages[msgId] = {
          id: msgId,
          pickupId: offer.pickupId,
          senderId: 'system',
          senderRole: 'system',
          senderName: 'System',
          content: `Volunteer cancelled the pickup.${reason ? ` Reason: ${reason}` : ''}`,
          type: MESSAGE_TYPE.SYSTEM,
          createdAt: now
        };
      }
      // Re-open offer
      offer.status = OFFER_STATUS.OPEN;
      offer.claimedBy = null;
      offer.claimedAt = null;
      offer.pickupId = null;
      offer.updatedAt = now;
      return res.json({
        message: 'Pickup cancelled. Offer is now available again.',
        offer: { id, status: OFFER_STATUS.OPEN }
      });
    }

    const db = getFirestore();

    // Verify user is a volunteer
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.VOLUNTEER) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only volunteers can cancel pickups'
      });
    }

    const volunteerId = userDoc.data().profileId;

    // Get the offer
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    const offerData = offerDoc.data();

    // Must be claimed by THIS volunteer
    if (offerData.status !== OFFER_STATUS.CLAIMED || offerData.claimedBy !== volunteerId) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'You can only cancel a pickup you have claimed.'
      });
    }

    // 24 hour rule based on expiration time
    if (offerData.expirationTime) {
      const pickupTime = new Date(offerData.expirationTime);
      if (!Number.isNaN(pickupTime.getTime())) {
        const nowMs = Date.now();
        const msUntilPickup = pickupTime.getTime() - nowMs;
        const MS_24H = 24 * 60 * 60 * 1000;

        if (msUntilPickup < MS_24H) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only cancel at least 24 hours before the pickup time.'
          });
        }
      }
    }

    // Find the pickup
    const pickupsSnapshot = await db.collection(COLLECTIONS.PICKUPS)
      .where('foodOfferId', '==', id)
      .get();

    let pickupDocToCancel = null;
    pickupsSnapshot.forEach((doc) => {
      const p = doc.data();
      const active = p && (p.status === PICKUP_STATUS.PENDING || p.status === PICKUP_STATUS.CONFIRMED);
      if (active && p.volunteerId === volunteerId) {
        pickupDocToCancel = doc;
      }
    });

    const now = new Date().toISOString();

    if (pickupDocToCancel) {
      await pickupDocToCancel.ref.update({
        status: PICKUP_STATUS.CANCELLED,
        cancelledAt: now,
        cancelledBy: USER_ROLES.VOLUNTEER,
        cancellationReason: reason ? String(reason).trim() : null
      });

      // System message
      await db.collection(COLLECTIONS.MESSAGES).add({
        pickupId: pickupDocToCancel.id,
        senderId: 'system',
        senderRole: 'system',
        senderName: 'System',
        content: `Volunteer cancelled the pickup.${reason ? ` Reason: ${String(reason).trim()}` : ''}`,
        type: MESSAGE_TYPE.SYSTEM,
        createdAt: now
      });
    }

    // Re-open the offer
    await offerRef.update({
      status: OFFER_STATUS.OPEN,
      claimedBy: null,
      claimedAt: null,
      pickupId: null,
      updatedAt: now
    });

    return res.json({
      message: 'Pickup cancelled. Offer is now available again.',
      offer: { id, status: OFFER_STATUS.OPEN }
    });
  } catch (error) {
    console.error('Volunteer cancel pickup error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to cancel pickup'
    });
  }
});

/**
 * POST /food_offers/:id/confirm
 * Restaurant confirms volunteer's claim
 */
router.post('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, isDemo: isDemoUser } = req.user;

    console.log('[CONFIRM] uid:', uid);
    console.log('[CONFIRM] All users:', Object.keys(demoStore.users));

    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      console.log('[CONFIRM] Found user:', demoUser?.email, 'role:', demoUser?.role);
      if (!demoUser || demoUser.role !== USER_ROLES.RESTAURANT) {
        console.log('[CONFIRM] REJECTED - not a restaurant');
        return res.status(403).json({ error: 'Forbidden', message: 'Only restaurants can confirm pickups' });
      }
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({ error: 'Not Found', message: 'Food offer not found' });
      }
      if (offer.restaurantId !== demoUser.profileId) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only confirm pickups for your own offers' });
      }
      const now = new Date().toISOString();
      if (offer.pickupId && demoStore.pickups[offer.pickupId]) {
        demoStore.pickups[offer.pickupId].status = PICKUP_STATUS.CONFIRMED;
        demoStore.pickups[offer.pickupId].confirmedAt = now;
        // System message
        const msgId = `msg-${Date.now()}`;
        demoStore.messages[msgId] = {
          id: msgId,
          pickupId: offer.pickupId,
          senderId: 'system',
          senderRole: 'system',
          senderName: 'System',
          content: '✅ Restaurant has confirmed the pickup. You can now proceed!',
          type: MESSAGE_TYPE.SYSTEM,
          createdAt: now
        };
      }
      // Update offer status to CONFIRMED
      offer.status = OFFER_STATUS.CONFIRMED;
      offer.confirmedAt = now;
      offer.updatedAt = now;
      return res.json({
        message: 'Pickup confirmed successfully',
        offer: { id, status: OFFER_STATUS.CONFIRMED }
      });
    }

    const db = getFirestore();

    // Verify user is a restaurant
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.RESTAURANT) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only restaurants can confirm pickups'
      });
    }

    const restaurantId = userDoc.data().profileId;

    // Get the offer
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    const offerData = offerDoc.data();

    if (offerData.restaurantId !== restaurantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only confirm pickups for your own offers'
      });
    }

    // Find pickup
    const pickupsSnapshot = await db.collection(COLLECTIONS.PICKUPS)
      .where('foodOfferId', '==', id)
      .get();

    const now = new Date().toISOString();

    if (!pickupsSnapshot.empty) {
      const pickupDoc = pickupsSnapshot.docs[0];

      await pickupDoc.ref.update({
        status: PICKUP_STATUS.CONFIRMED,
        confirmedAt: now
      });

      // System message
      await db.collection(COLLECTIONS.MESSAGES).add({
        pickupId: pickupDoc.id,
        senderId: 'system',
        senderRole: 'system',
        senderName: 'System',
        content: '✅ Restaurant has confirmed the pickup. You can now proceed with the pickup!',
        type: MESSAGE_TYPE.SYSTEM,
        createdAt: now
      });
    }

    // Update offer status to CONFIRMED
    await offerRef.update({
      status: OFFER_STATUS.CONFIRMED,
      confirmedAt: now,
      updatedAt: now
    });

    res.json({
      message: 'Pickup confirmed successfully',
      offer: { id, status: OFFER_STATUS.CONFIRMED }
    });
  } catch (error) {
    console.error('Confirm pickup error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to confirm pickup'
    });
  }
});

/**
 * POST /food_offers/:id/reject
 * Restaurant rejects/overrides a volunteer's claim
 */
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, isDemo: isDemoUser } = req.user;
    const { reason } = req.body;

    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only restaurants can reject pickups' });
      }
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({ error: 'Not Found', message: 'Food offer not found' });
      }
      if (offer.restaurantId !== demoUser.profileId) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only reject pickups for your own offers' });
      }
      const now = new Date().toISOString();
      if (offer.pickupId && demoStore.pickups[offer.pickupId]) {
        demoStore.pickups[offer.pickupId].status = PICKUP_STATUS.REJECTED;
        demoStore.pickups[offer.pickupId].rejectedAt = now;
        demoStore.pickups[offer.pickupId].rejectionReason = reason || 'No reason provided';
        // System message
        const msgId = `msg-${Date.now()}`;
        demoStore.messages[msgId] = {
          id: msgId,
          pickupId: offer.pickupId,
          senderId: 'system',
          senderRole: 'system',
          senderName: 'System',
          content: `Pickup was declined by the restaurant.${reason ? ` Reason: ${reason}` : ''}`,
          type: MESSAGE_TYPE.SYSTEM,
          createdAt: now
        };
      }
      // Re-open offer
      offer.status = OFFER_STATUS.OPEN;
      offer.claimedBy = null;
      offer.claimedAt = null;
      offer.pickupId = null;
      offer.updatedAt = now;
      return res.json({
        message: 'Pickup rejected. Offer is now available again.',
        offer: { id, status: OFFER_STATUS.OPEN }
      });
    }

    const db = getFirestore();

    // Verify user is a restaurant
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.RESTAURANT) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only restaurants can reject pickups'
      });
    }

    const restaurantId = userDoc.data().profileId;

    // Get the food offer
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    // Verify this restaurant owns the offer
    if (offerDoc.data().restaurantId !== restaurantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only reject pickups for your own offers'
      });
    }

    // Find the pickup
    const pickupsSnapshot = await db.collection(COLLECTIONS.PICKUPS)
      .where('foodOfferId', '==', id)
      .limit(1)
      .get();

    const now = new Date().toISOString();

    if (!pickupsSnapshot.empty) {
      const pickupDoc = pickupsSnapshot.docs[0];

      await pickupDoc.ref.update({
        status: PICKUP_STATUS.REJECTED,
        rejectedAt: now,
        rejectionReason: reason || 'No reason provided'
      });

      // System message
      await db.collection(COLLECTIONS.MESSAGES).add({
        pickupId: pickupDoc.id,
        senderId: 'system',
        senderRole: 'system',
        senderName: 'System',
        content: `Pickup was declined by the restaurant.${reason ? ` Reason: ${reason}` : ''}`,
        type: MESSAGE_TYPE.SYSTEM,
        createdAt: now
      });
    }

    // Re-open the offer
    await offerRef.update({
      status: OFFER_STATUS.OPEN,
      claimedBy: null,
      claimedAt: null,
      pickupId: null,
      updatedAt: now
    });

    res.json({
      message: 'Pickup rejected. Offer is now available again.',
      offer: { id, status: OFFER_STATUS.OPEN }
    });
  } catch (error) {
    console.error('Reject pickup error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to reject pickup'
    });
  }
});

/**
 * POST /food_offers/:id/complete
 * Mark a pickup as completed
 */
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, isDemo: isDemoUser } = req.user;

    if (isDemo() || isDemoUser) {
      const demoUser = demoStore.users[uid];
      if (!demoUser) {
        return res.status(403).json({ error: 'Forbidden', message: 'User not found' });
      }
      const offer = demoStore.offers[id];
      if (!offer) {
        return res.status(404).json({ error: 'Not Found', message: 'Food offer not found' });
      }
      // Verify user is restaurant owner or volunteer claimer
      const isOwner = demoUser.role === USER_ROLES.RESTAURANT && offer.restaurantId === demoUser.profileId;
      const isClaimer = demoUser.role === USER_ROLES.VOLUNTEER && offer.claimedBy === demoUser.profileId;
      if (!isOwner && !isClaimer) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only the restaurant or volunteer can complete this pickup' });
      }
      const now = new Date().toISOString();
      // Update pickup
      if (offer.pickupId && demoStore.pickups[offer.pickupId]) {
        demoStore.pickups[offer.pickupId].status = PICKUP_STATUS.COMPLETED;
        demoStore.pickups[offer.pickupId].completedAt = now;
        demoStore.pickups[offer.pickupId].completedBy = demoUser.role;
        // System message
        const msgId = `msg-${Date.now()}`;
        demoStore.messages[msgId] = {
          id: msgId,
          pickupId: offer.pickupId,
          senderId: 'system',
          senderRole: 'system',
          senderName: 'System',
          content: '🎉 Pickup completed successfully! Thank you for helping reduce food waste!',
          type: MESSAGE_TYPE.SYSTEM,
          createdAt: now
        };
      }
      // Update offer
      offer.status = OFFER_STATUS.COMPLETED;
      offer.completedAt = now;
      offer.updatedAt = now;
      return res.json({
        message: 'Pickup completed successfully',
        offer: { id, status: OFFER_STATUS.COMPLETED }
      });
    }

    const db = getFirestore();

    // Get user info
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User not found'
      });
    }

    const profileId = userDoc.data().profileId;
    const userRole = userDoc.data().role;

    // Get the offer to verify ownership
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Food offer not found'
      });
    }

    const offerData = offerDoc.data();

    // Find the pickup - fetch all by foodOfferId and filter in memory
    const pickupsSnapshot = await db.collection(COLLECTIONS.PICKUPS)
      .where('foodOfferId', '==', id)
      .get();

    let pickupDoc = null;
    pickupsSnapshot.forEach((doc) => {
      const p = doc.data();
      if (p.status === PICKUP_STATUS.CONFIRMED || p.status === PICKUP_STATUS.PENDING) {
        pickupDoc = doc;
      }
    });

    if (!pickupDoc) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Active pickup not found for this offer'
      });
    }

    const pickupData = pickupDoc.data();

    // Verify user is either the restaurant (offer owner) or the claiming volunteer
    const isRestaurant = userRole === USER_ROLES.RESTAURANT && offerData.restaurantId === profileId;
    const isVolunteer = userRole === USER_ROLES.VOLUNTEER && pickupData.volunteerId === profileId;

    if (!isRestaurant && !isVolunteer) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the restaurant or volunteer can complete this pickup'
      });
    }

    const now = new Date().toISOString();

    // Update pickup status
    await pickupDoc.ref.update({
      status: PICKUP_STATUS.COMPLETED,
      completedAt: now,
      completedBy: userRole
    });

    // Update offer status
    await offerRef.update({
      status: OFFER_STATUS.COMPLETED,
      completedAt: now,
      updatedAt: now
    });

    // System message
    await db.collection(COLLECTIONS.MESSAGES).add({
      pickupId: pickupDoc.id,
      senderId: 'system',
      senderRole: 'system',
      senderName: 'System',
      content: '🎉 Pickup completed successfully! Thank you for helping reduce food waste!',
      type: MESSAGE_TYPE.SYSTEM,
      createdAt: now
    });

    res.json({
      message: 'Pickup completed successfully',
      offer: { id, status: OFFER_STATUS.COMPLETED }
    });
  } catch (error) {
    console.error('Complete pickup error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to complete pickup'
    });
  }
});

module.exports = router;


/**
 * Pickups Routes
 * Handles pickup claiming, completion, and cancellation
 */
const express = require('express');
const router = express.Router();
const { getFirestore, isDemo } = require('../config/firebase');
const { authMiddleware } = require('../middleware/auth');
const { COLLECTIONS, OFFER_STATUS, PICKUP_STATUS, USER_ROLES } = require('../shared/types');
const demoStore = require('../demoStore');

/**
 * POST /pickups/claim/:offerId
 * Volunteer claims a food offer
 */
router.post('/claim/:offerId', authMiddleware, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { uid } = req.user;

    // Demo mode
    if (isDemo()) {
      const demoUser = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({ error: 'Only volunteers can claim offers' });
      }
      const offer = demoStore.offers[offerId];
      if (!offer) {
        return res.status(404).json({ error: 'Offer not found' });
      }
      if (offer.status !== OFFER_STATUS.OPEN) {
        return res.status(400).json({ error: 'Offer is no longer available' });
      }
      const now = new Date().toISOString();
      
      // Build volunteer display name with organization
      const volunteerDisplayName = demoUser.organizationName 
        ? `${demoUser.name} (${demoUser.organizationName})`
        : demoUser.name;
      
      const pickup = {
        id: `pickup-${Date.now()}`,
        foodOfferId: offerId,
        volunteerId: demoUser.profileId,
        volunteerName: volunteerDisplayName,
        volunteerOrganization: demoUser.organizationName || null,
        restaurantId: offer.restaurantId,
        status: PICKUP_STATUS.PENDING,
        createdAt: now
      };
      demoStore.pickups[pickup.id] = pickup;
      // Update offer
      offer.status = OFFER_STATUS.CLAIMED;
      offer.claimedBy = demoUser.profileId;
      offer.claimedByName = volunteerDisplayName;
      offer.claimedByOrganization = demoUser.organizationName || null;
      offer.claimedAt = now;
      offer.pickupId = pickup.id;
      return res.status(201).json({ pickup, message: 'Offer claimed successfully! You can now message the restaurant.' });
    }

    const db = getFirestore();

    // Get user profile
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.VOLUNTEER) {
      return res.status(403).json({ error: 'Only volunteers can claim offers' });
    }

    const userData = userDoc.data();

    // Get volunteer name
    const volunteerDoc = await db.collection(COLLECTIONS.VOLUNTEERS).doc(userData.profileId).get();
    const volunteerName = volunteerDoc.exists ? volunteerDoc.data().name : 'Unknown';

    // Get the offer
    const offerRef = db.collection(COLLECTIONS.FOOD_OFFERS).doc(offerId);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = offerDoc.data();

    if (offer.status !== OFFER_STATUS.OPEN) {
      return res.status(400).json({ error: 'Offer is no longer available' });
    }

    // Create pickup record
    const pickupData = {
      foodOfferId: offerId,
      volunteerId: userData.profileId,
      volunteerUserId: uid,
      volunteerName,
      restaurantId: offer.restaurantId,
      status: PICKUP_STATUS.CLAIMED,
      createdAt: new Date().toISOString()
    };

    const pickupRef = await db.collection(COLLECTIONS.PICKUPS).add(pickupData);

    // Update offer status
    await offerRef.update({
      status: OFFER_STATUS.CLAIMED,
      claimedBy: userData.profileId,
      claimedAt: new Date().toISOString(),
      pickupId: pickupRef.id
    });

    res.status(201).json({
      pickup: { id: pickupRef.id, ...pickupData },
      message: 'Offer claimed successfully! You can now message the restaurant.'
    });
  } catch (error) {
    console.error('Claim offer error:', error);
    res.status(500).json({ error: 'Failed to claim offer' });
  }
});

/**
 * GET /pickups/:pickupId
 * Get pickup details
 */
router.get('/:pickupId', authMiddleware, async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { uid } = req.user;

    // Demo mode
    if (isDemo()) {
      const pickup = demoStore.pickups[pickupId];
      if (!pickup) {
        return res.status(404).json({ error: 'Pickup not found' });
      }
      // Enrich with offer and restaurant data
      const offer = demoStore.offers[pickup.foodOfferId];
      if (offer) {
        pickup.offer = offer;
        // Find restaurant user
        for (const user of Object.values(demoStore.users)) {
          if (user.profileId === offer.restaurantId) {
            pickup.restaurant = { id: user.profileId, name: user.name, address: user.address };
            break;
          }
        }
      }
      // Find volunteer
      const allUsers = { ...demoStore.users, ...demoStore.pendingUsers };
      for (const user of Object.values(allUsers)) {
        if (user.profileId === pickup.volunteerId) {
          const displayName = user.organizationName 
            ? `${user.name} (${user.organizationName})`
            : user.name;
          pickup.volunteer = { 
            id: user.profileId, 
            name: displayName,
            organizationName: user.organizationName || null
          };
          break;
        }
      }
      return res.json({ pickup });
    }

    const db = getFirestore();

    const pickupDoc = await db.collection(COLLECTIONS.PICKUPS).doc(pickupId).get();
    if (!pickupDoc.exists) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    const pickup = { id: pickupDoc.id, ...pickupDoc.data() };

    // Get offer details
    const offerDoc = await db.collection(COLLECTIONS.FOOD_OFFERS).doc(pickup.foodOfferId).get();
    if (offerDoc.exists) {
      pickup.offer = { id: offerDoc.id, ...offerDoc.data() };
      
      // Get restaurant details
      const restaurantDoc = await db.collection(COLLECTIONS.RESTAURANTS).doc(pickup.offer.restaurantId).get();
      if (restaurantDoc.exists) {
        pickup.restaurant = { id: restaurantDoc.id, ...restaurantDoc.data() };
      }
    }

    // Get volunteer details
    if (pickup.volunteerId) {
      const volunteerDoc = await db.collection(COLLECTIONS.VOLUNTEERS).doc(pickup.volunteerId).get();
      if (volunteerDoc.exists) {
        pickup.volunteer = { id: volunteerDoc.id, ...volunteerDoc.data() };
      }
    }

    res.json({ pickup });
  } catch (error) {
    console.error('Get pickup error:', error);
    res.status(500).json({ error: 'Failed to fetch pickup' });
  }
});

/**
 * POST /pickups/:pickupId/complete
 * Restaurant marks pickup as complete (satisfied)
 */
router.post('/:pickupId/complete', authMiddleware, async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { uid } = req.user;

    // Demo mode
    if (isDemo()) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({ error: 'Only restaurants can complete pickups' });
      }
      const pickup = demoStore.pickups[pickupId];
      if (!pickup) {
        return res.status(404).json({ error: 'Pickup not found' });
      }
      if (pickup.restaurantId !== demoUser.profileId) {
        return res.status(403).json({ error: 'Not authorized to complete this pickup' });
      }
      const now = new Date().toISOString();
      pickup.status = PICKUP_STATUS.COMPLETED;
      pickup.completedAt = now;
      // Update offer
      const offer = demoStore.offers[pickup.foodOfferId];
      if (offer) {
        offer.status = OFFER_STATUS.COMPLETED;
        offer.completedAt = now;
      }
      return res.json({ message: 'Pickup completed successfully! Thank you for reducing food waste.', pickup });
    }

    const db = getFirestore();

    // Get user profile
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.RESTAURANT) {
      return res.status(403).json({ error: 'Only restaurants can complete pickups' });
    }

    const userData = userDoc.data();

    // Get pickup
    const pickupRef = db.collection(COLLECTIONS.PICKUPS).doc(pickupId);
    const pickupDoc = await pickupRef.get();

    if (!pickupDoc.exists) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    const pickup = pickupDoc.data();

    // Verify restaurant owns this pickup's offer
    if (pickup.restaurantId !== userData.profileId) {
      return res.status(403).json({ error: 'Not authorized to complete this pickup' });
    }

    if (pickup.status !== PICKUP_STATUS.CLAIMED) {
      return res.status(400).json({ error: 'Pickup cannot be completed in current status' });
    }

    // Update pickup status
    await pickupRef.update({
      status: PICKUP_STATUS.COMPLETED,
      completedAt: new Date().toISOString(),
      completedBy: uid
    });

    // Update offer status
    await db.collection(COLLECTIONS.FOOD_OFFERS).doc(pickup.foodOfferId).update({
      status: OFFER_STATUS.COMPLETED,
      completedAt: new Date().toISOString()
    });

    res.json({
      message: 'Pickup completed successfully! Thank you for reducing food waste.',
      pickup: { id: pickupId, ...pickup, status: PICKUP_STATUS.COMPLETED }
    });
  } catch (error) {
    console.error('Complete pickup error:', error);
    res.status(500).json({ error: 'Failed to complete pickup' });
  }
});

/**
 * POST /pickups/:pickupId/cancel
 * Restaurant cancels/overrides the pickup claim
 */
router.post('/:pickupId/cancel', authMiddleware, async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { reason } = req.body;
    const { uid } = req.user;

    // Demo mode
    if (isDemo()) {
      const demoUser = demoStore.users[uid];
      if (!demoUser || demoUser.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({ error: 'Only restaurants can cancel pickups' });
      }
      const pickup = demoStore.pickups[pickupId];
      if (!pickup) {
        return res.status(404).json({ error: 'Pickup not found' });
      }
      if (pickup.restaurantId !== demoUser.profileId) {
        return res.status(403).json({ error: 'Not authorized to cancel this pickup' });
      }
      const now = new Date().toISOString();
      pickup.status = PICKUP_STATUS.CANCELLED;
      pickup.cancelledAt = now;
      pickup.cancelReason = reason || 'Cancelled by restaurant';
      // Re-open offer
      const offer = demoStore.offers[pickup.foodOfferId];
      if (offer) {
        offer.status = OFFER_STATUS.OPEN;
        offer.claimedBy = null;
        offer.claimedAt = null;
        offer.pickupId = null;
      }
      return res.json({ message: 'Pickup cancelled. The offer is now available for other volunteers.', pickup });
    }

    const db = getFirestore();

    // Get user profile
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== USER_ROLES.RESTAURANT) {
      return res.status(403).json({ error: 'Only restaurants can cancel pickups' });
    }

    const userData = userDoc.data();

    // Get pickup
    const pickupRef = db.collection(COLLECTIONS.PICKUPS).doc(pickupId);
    const pickupDoc = await pickupRef.get();

    if (!pickupDoc.exists) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    const pickup = pickupDoc.data();

    // Verify restaurant owns this pickup's offer
    if (pickup.restaurantId !== userData.profileId) {
      return res.status(403).json({ error: 'Not authorized to cancel this pickup' });
    }

    if (pickup.status !== PICKUP_STATUS.CLAIMED) {
      return res.status(400).json({ error: 'Pickup cannot be cancelled in current status' });
    }

    // Update pickup status
    await pickupRef.update({
      status: PICKUP_STATUS.CANCELLED,
      cancelledAt: new Date().toISOString(),
      cancelledBy: uid,
      cancelReason: reason || 'Cancelled by restaurant'
    });

    // Re-open the offer
    await db.collection(COLLECTIONS.FOOD_OFFERS).doc(pickup.foodOfferId).update({
      status: OFFER_STATUS.OPEN,
      claimedBy: null,
      claimedAt: null,
      pickupId: null
    });

    res.json({
      message: 'Pickup cancelled. The offer is now available for other volunteers.',
      pickup: { id: pickupId, ...pickup, status: PICKUP_STATUS.CANCELLED }
    });
  } catch (error) {
    console.error('Cancel pickup error:', error);
    res.status(500).json({ error: 'Failed to cancel pickup' });
  }
});

module.exports = router;


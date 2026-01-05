/**
 * Reports Routes
 * Generates Excel reports for different user roles
 */
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { getFirestore, isDemo } = require('../config/firebase');
const { authMiddleware } = require('../middleware/auth');
const { COLLECTIONS, USER_ROLES, OFFER_STATUS } = require('../shared/types');
const demoStore = require('../demoStore');

/**
 * Helper: Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Helper: Get volunteer display name with organization
 */
function getVolunteerDisplayName(volunteer, users, pendingUsers) {
  const user = users[volunteer.claimedBy] || pendingUsers?.[volunteer.claimedBy];
  if (!user) return volunteer.claimedByName || 'Unknown Volunteer';
  
  const orgName = user.organizationName;
  const name = user.name || volunteer.claimedByName || 'Unknown';
  return orgName ? `${name} (${orgName})` : name;
}

/**
 * Helper: Style the header row
 */
function styleHeaderRow(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' } // Forest green
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
}

/**
 * Helper: Auto-fit columns
 */
function autoFitColumns(worksheet) {
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const length = cell.value ? String(cell.value).length : 0;
      maxLength = Math.max(maxLength, length);
    });
    column.width = Math.min(maxLength + 2, 50);
  });
}

/**
 * GET /reports/volunteer
 * Download volunteer's own activity report
 */
router.get('/volunteer', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    let user, pickups;

    if (isDemo() || isDemoUser) {
      user = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!user || user.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only volunteers can download this report' });
      }

      // Get all offers where this volunteer claimed
      pickups = Object.values(demoStore.offers).filter(o => 
        o.claimedBy === user.profileId || o.claimedBy === uid
      );
    } else {
      // Firebase implementation
      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      user = userDoc.data();
      
      if (!user || user.role !== USER_ROLES.VOLUNTEER) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only volunteers can download this report' });
      }

      const offersSnap = await db.collection(COLLECTIONS.FOOD_OFFERS)
        .where('claimedBy', '==', user.profileId)
        .get();
      pickups = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Food Rescue Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('My Pickups');

    // Define columns
    worksheet.columns = [
      { header: 'Pickup Date', key: 'pickupDate', width: 20 },
      { header: 'Food Type', key: 'foodType', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Restaurant', key: 'restaurant', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Address', key: 'address', width: 35 }
    ];

    // Add data
    pickups.forEach(pickup => {
      worksheet.addRow({
        pickupDate: formatDate(pickup.completedAt || pickup.claimedAt),
        foodType: pickup.foodType || pickup.title || 'N/A',
        quantity: pickup.quantity || 'N/A',
        restaurant: pickup.restaurantName || 'N/A',
        status: pickup.status?.toUpperCase() || 'N/A',
        address: pickup.address || pickup.restaurantAddress || 'N/A'
      });
    });

    styleHeaderRow(worksheet);
    autoFitColumns(worksheet);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=my-pickups-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Volunteer report error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to generate report' });
  }
});

/**
 * GET /reports/restaurant
 * Download restaurant's own activity report
 */
router.get('/restaurant', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    let user, offers;

    if (isDemo() || isDemoUser) {
      user = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!user || user.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only restaurants can download this report' });
      }

      // Get all offers by this restaurant
      offers = Object.values(demoStore.offers).filter(o => 
        o.restaurantId === user.profileId || o.restaurantId === uid
      );
    } else {
      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      user = userDoc.data();
      
      if (!user || user.role !== USER_ROLES.RESTAURANT) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only restaurants can download this report' });
      }

      const offersSnap = await db.collection(COLLECTIONS.FOOD_OFFERS)
        .where('restaurantId', '==', user.profileId)
        .get();
      offers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Food Rescue Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('My Offers');

    worksheet.columns = [
      { header: 'Order Placed', key: 'createdAt', width: 20 },
      { header: 'Pickup Date', key: 'pickupDate', width: 20 },
      { header: 'Food Type', key: 'foodType', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Claimed By', key: 'claimedBy', width: 30 }
    ];

    // Sort by created date (newest first)
    offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    offers.forEach(offer => {
      let claimedByDisplay = 'Not claimed';
      if (offer.claimedBy) {
        const volunteer = demoStore.users[offer.claimedBy] || demoStore.pendingUsers?.[offer.claimedBy];
        if (volunteer) {
          claimedByDisplay = volunteer.organizationName 
            ? `${volunteer.name} (${volunteer.organizationName})`
            : volunteer.name;
        } else {
          claimedByDisplay = offer.claimedByName || 'Unknown';
        }
      }

      worksheet.addRow({
        createdAt: formatDate(offer.createdAt),
        pickupDate: formatDate(offer.completedAt || offer.claimedAt || offer.pickupTime),
        foodType: offer.foodType || offer.title || 'N/A',
        quantity: offer.quantity || 'N/A',
        status: offer.status?.toUpperCase() || 'N/A',
        claimedBy: claimedByDisplay
      });
    });

    styleHeaderRow(worksheet);
    autoFitColumns(worksheet);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=my-offers-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Restaurant report error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to generate report' });
  }
});

/**
 * GET /reports/org-admin/activity
 * Get org admin's volunteers activity as JSON (for dashboard)
 */
router.get('/org-admin/activity', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    let user, volunteers, allOffers;

    if (isDemo() || isDemoUser) {
      user = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!user || user.role !== USER_ROLES.ORG_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only org admins can access this' });
      }

      // Get all volunteers in this organization
      volunteers = [
        ...Object.values(demoStore.users).filter(u => 
          u.role === USER_ROLES.VOLUNTEER && u.organizationId === user.organizationId
        ),
        ...Object.values(demoStore.pendingUsers).filter(u => 
          u.role === USER_ROLES.VOLUNTEER && u.organizationId === user.organizationId
        )
      ];

      allOffers = Object.values(demoStore.offers);
    } else {
      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      user = userDoc.data();
      
      if (!user || user.role !== USER_ROLES.ORG_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only org admins can access this' });
      }

      const volunteersSnap = await db.collection(COLLECTIONS.USERS)
        .where('role', '==', USER_ROLES.VOLUNTEER)
        .where('organizationId', '==', user.organizationId)
        .get();
      volunteers = volunteersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      const offersSnap = await db.collection(COLLECTIONS.FOOD_OFFERS).get();
      allOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Build activity list
    const activity = [];
    
    volunteers.forEach(volunteer => {
      const volunteerOffers = allOffers.filter(o => 
        o.claimedBy === volunteer.profileId || o.claimedBy === volunteer.uid
      );

      volunteerOffers.forEach(offer => {
        activity.push({
          id: offer.id,
          volunteerName: volunteer.name,
          volunteerId: volunteer.uid || volunteer.profileId,
          offerTitle: offer.title || offer.foodType || 'Food Offer',
          restaurantName: offer.restaurantName || 'Restaurant',
          quantity: offer.quantity,
          status: offer.status,
          claimedAt: offer.claimedAt,
          completedAt: offer.completedAt
        });
      });
    });

    // Sort by date (most recent first)
    activity.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.claimedAt);
      const dateB = new Date(b.completedAt || b.claimedAt);
      return dateB - dateA;
    });

    res.json({ activity });
  } catch (error) {
    console.error('Org admin activity error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch activity' });
  }
});

/**
 * GET /reports/org-admin
 * Download org admin's volunteers activity report
 */
router.get('/org-admin', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    let user, volunteers, allOffers;

    if (isDemo() || isDemoUser) {
      user = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!user || user.role !== USER_ROLES.ORG_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only org admins can download this report' });
      }

      // Get all volunteers in this organization
      volunteers = [
        ...Object.values(demoStore.users).filter(u => 
          u.role === USER_ROLES.VOLUNTEER && u.organizationId === user.organizationId
        ),
        ...Object.values(demoStore.pendingUsers).filter(u => 
          u.role === USER_ROLES.VOLUNTEER && u.organizationId === user.organizationId
        )
      ];

      allOffers = Object.values(demoStore.offers);
    } else {
      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      user = userDoc.data();
      
      if (!user || user.role !== USER_ROLES.ORG_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only org admins can download this report' });
      }

      const volunteersSnap = await db.collection(COLLECTIONS.USERS)
        .where('role', '==', USER_ROLES.VOLUNTEER)
        .where('organizationId', '==', user.organizationId)
        .get();
      volunteers = volunteersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      const offersSnap = await db.collection(COLLECTIONS.FOOD_OFFERS).get();
      allOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Food Rescue Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(`${user.organizationName || 'Organization'} Activity`);

    worksheet.columns = [
      { header: 'Volunteer Name', key: 'volunteerName', width: 25 },
      { header: 'Pickup Date', key: 'pickupDate', width: 20 },
      { header: 'Food Type', key: 'foodType', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Restaurant', key: 'restaurant', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Sort volunteers alphabetically
    volunteers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Build rows grouped by volunteer
    const rows = [];
    volunteers.forEach(volunteer => {
      const volunteerOffers = allOffers.filter(o => 
        o.claimedBy === volunteer.profileId || o.claimedBy === volunteer.uid
      );

      if (volunteerOffers.length === 0) {
        rows.push({
          volunteerName: volunteer.name,
          pickupDate: 'No pickups yet',
          foodType: '-',
          quantity: '-',
          restaurant: '-',
          status: '-'
        });
      } else {
        volunteerOffers.sort((a, b) => new Date(b.claimedAt || b.createdAt) - new Date(a.claimedAt || a.createdAt));
        volunteerOffers.forEach((offer, idx) => {
          rows.push({
            volunteerName: idx === 0 ? volunteer.name : '', // Only show name on first row
            pickupDate: formatDate(offer.completedAt || offer.claimedAt),
            foodType: offer.foodType || offer.title || 'N/A',
            quantity: offer.quantity || 'N/A',
            restaurant: offer.restaurantName || 'N/A',
            status: offer.status?.toUpperCase() || 'N/A'
          });
        });
      }
    });

    rows.forEach(row => worksheet.addRow(row));

    styleHeaderRow(worksheet);
    autoFitColumns(worksheet);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=org-activity-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Org admin report error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to generate report' });
  }
});

/**
 * GET /reports/master-admin
 * Download master admin's full platform report
 */
router.get('/master-admin', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    let user, allUsers, allOffers, organizations;

    if (isDemo() || isDemoUser) {
      user = demoStore.users[uid];
      if (!user || user.role !== USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only master admin can download this report' });
      }

      allUsers = { ...demoStore.users, ...demoStore.pendingUsers };
      allOffers = Object.values(demoStore.offers);
      organizations = demoStore.organizations;
    } else {
      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      user = userDoc.data();
      
      if (!user || user.role !== USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only master admin can download this report' });
      }

      const usersSnap = await db.collection(COLLECTIONS.USERS).get();
      allUsers = {};
      usersSnap.docs.forEach(d => allUsers[d.id] = { uid: d.id, ...d.data() });

      const offersSnap = await db.collection(COLLECTIONS.FOOD_OFFERS).get();
      allOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const orgsSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).get();
      organizations = {};
      orgsSnap.docs.forEach(d => organizations[d.id] = { id: d.id, ...d.data() });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Food Rescue Platform';
    workbook.created = new Date();

    // === VOLUNTEER ACTIVITY SHEET ===
    const volunteerSheet = workbook.addWorksheet('Volunteer Activity');
    volunteerSheet.columns = [
      { header: 'Organization', key: 'organization', width: 25 },
      { header: 'Volunteer Name', key: 'volunteerName', width: 25 },
      { header: 'Pickup Date', key: 'pickupDate', width: 20 },
      { header: 'Food Type', key: 'foodType', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Restaurant', key: 'restaurant', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Get all volunteers and group by organization
    const volunteers = Object.values(allUsers).filter(u => u.role === USER_ROLES.VOLUNTEER);
    
    // Sort by organization name, then by volunteer name
    volunteers.sort((a, b) => {
      const orgCompare = (a.organizationName || 'No Organization').localeCompare(b.organizationName || 'No Organization');
      if (orgCompare !== 0) return orgCompare;
      return (a.name || '').localeCompare(b.name || '');
    });

    let currentOrg = null;
    volunteers.forEach(volunteer => {
      const volunteerOffers = allOffers.filter(o => 
        o.claimedBy === volunteer.profileId || o.claimedBy === volunteer.uid
      );

      const orgName = volunteer.organizationName || 'No Organization';
      const showOrg = currentOrg !== orgName;
      currentOrg = orgName;

      if (volunteerOffers.length === 0) {
        volunteerSheet.addRow({
          organization: showOrg ? orgName : '',
          volunteerName: `${volunteer.name} (${orgName})`,
          pickupDate: 'No pickups yet',
          foodType: '-',
          quantity: '-',
          restaurant: '-',
          status: '-'
        });
      } else {
        volunteerOffers.sort((a, b) => new Date(b.claimedAt || b.createdAt) - new Date(a.claimedAt || a.createdAt));
        volunteerOffers.forEach((offer, idx) => {
          volunteerSheet.addRow({
            organization: showOrg && idx === 0 ? orgName : '',
            volunteerName: idx === 0 ? `${volunteer.name} (${orgName})` : '',
            pickupDate: formatDate(offer.completedAt || offer.claimedAt),
            foodType: offer.foodType || offer.title || 'N/A',
            quantity: offer.quantity || 'N/A',
            restaurant: offer.restaurantName || 'N/A',
            status: offer.status?.toUpperCase() || 'N/A'
          });
        });
      }
    });

    styleHeaderRow(volunteerSheet);
    autoFitColumns(volunteerSheet);

    // === RESTAURANT ACTIVITY SHEET ===
    const restaurantSheet = workbook.addWorksheet('Restaurant Activity');
    restaurantSheet.columns = [
      { header: 'Restaurant Name', key: 'restaurantName', width: 25 },
      { header: 'Order Placed', key: 'orderPlaced', width: 20 },
      { header: 'Pickup Date', key: 'pickupDate', width: 20 },
      { header: 'Food Type', key: 'foodType', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Claimed By', key: 'claimedBy', width: 30 }
    ];

    // Get all restaurants
    const restaurants = Object.values(allUsers).filter(u => u.role === USER_ROLES.RESTAURANT);
    restaurants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    restaurants.forEach(restaurant => {
      const restaurantOffers = allOffers.filter(o => 
        o.restaurantId === restaurant.profileId || o.restaurantId === restaurant.uid
      );

      if (restaurantOffers.length === 0) {
        restaurantSheet.addRow({
          restaurantName: restaurant.name,
          orderPlaced: 'No offers yet',
          pickupDate: '-',
          foodType: '-',
          quantity: '-',
          status: '-',
          claimedBy: '-'
        });
      } else {
        restaurantOffers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        restaurantOffers.forEach((offer, idx) => {
          let claimedByDisplay = 'Not claimed';
          if (offer.claimedBy) {
            const volunteer = allUsers[offer.claimedBy];
            if (volunteer) {
              claimedByDisplay = volunteer.organizationName 
                ? `${volunteer.name} (${volunteer.organizationName})`
                : volunteer.name;
            } else {
              claimedByDisplay = offer.claimedByName || 'Unknown';
            }
          }

          restaurantSheet.addRow({
            restaurantName: idx === 0 ? restaurant.name : '',
            orderPlaced: formatDate(offer.createdAt),
            pickupDate: formatDate(offer.completedAt || offer.claimedAt || offer.pickupTime),
            foodType: offer.foodType || offer.title || 'N/A',
            quantity: offer.quantity || 'N/A',
            status: offer.status?.toUpperCase() || 'N/A',
            claimedBy: claimedByDisplay
          });
        });
      }
    });

    styleHeaderRow(restaurantSheet);
    autoFitColumns(restaurantSheet);

    // === SUMMARY SHEET ===
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    const completedOffers = allOffers.filter(o => o.status === OFFER_STATUS.COMPLETED);
    
    summarySheet.addRow({ metric: 'Total Organizations', value: Object.keys(organizations || {}).length });
    summarySheet.addRow({ metric: 'Total Volunteers', value: volunteers.length });
    summarySheet.addRow({ metric: 'Total Restaurants', value: restaurants.length });
    summarySheet.addRow({ metric: 'Total Offers Created', value: allOffers.length });
    summarySheet.addRow({ metric: 'Completed Pickups', value: completedOffers.length });
    summarySheet.addRow({ metric: 'Report Generated', value: formatDate(new Date().toISOString()) });

    styleHeaderRow(summarySheet);
    autoFitColumns(summarySheet);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=platform-report-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Master admin report error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to generate report' });
  }
});

module.exports = router;


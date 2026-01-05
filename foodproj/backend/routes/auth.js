const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { getFirestore, isDemo } = require('../config/firebase');
const { authMiddleware } = require('../middleware/auth');
const { COLLECTIONS, USER_ROLES, USER_STATUS } = require('../../shared/types');
const { isValidPhone } = require('../../shared/validation');
const demoStore = require('../demoStore');

// Helper to hash passwords
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

// Helper to check if user is any kind of admin
const isAnyAdmin = (role) => [USER_ROLES.MASTER_ADMIN, USER_ROLES.ORG_ADMIN].includes(role);

/**
 * GET /auth/admin-exists
 * Check if a master admin has been registered
 */
router.get('/admin-exists', async (req, res) => {
  try {
    if (isDemo()) {
      return res.json({ exists: !!demoStore.masterAdmin });
    }

    const db = getFirestore();
    const adminSnap = await db.collection(COLLECTIONS.MASTER_ADMIN).doc('config').get();
    return res.json({ exists: adminSnap.exists && !!adminSnap.data()?.adminId });
  } catch (err) {
    console.error('Admin exists check error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to check admin status' });
  }
});

/**
 * POST /auth/master-admin/register
 * One-time master admin registration - only works if no master admin exists
 * Body: { email, password, name }
 */
router.post('/master-admin/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, password, and name are required' });
    }

    if (isDemo()) {
      // Check if master admin already exists
      if (demoStore.masterAdmin) {
        return res.status(403).json({ error: 'Forbidden', message: 'Master admin already registered' });
      }

      const adminId = `master-admin-${Date.now()}`;
      demoStore.masterAdmin = {
        uid: adminId,
        email: String(email).trim().toLowerCase(),
        passwordHash: hashPassword(password),
        name: String(name).trim(),
        role: USER_ROLES.MASTER_ADMIN,
        createdAt: new Date().toISOString(),
      };

      // Also add to users
      demoStore.users[adminId] = {
        uid: adminId,
        email: demoStore.masterAdmin.email,
        name: demoStore.masterAdmin.name,
        role: USER_ROLES.MASTER_ADMIN,
        profileId: adminId,
        status: USER_STATUS.ACTIVE,
      };

      return res.status(201).json({ 
        message: 'Master admin registered successfully',
        admin: { uid: adminId, email: demoStore.masterAdmin.email, name: demoStore.masterAdmin.name }
      });
    }

    // Firebase implementation
    const db = getFirestore();
    const adminSnap = await db.collection(COLLECTIONS.MASTER_ADMIN).doc('config').get();
    if (adminSnap.exists && adminSnap.data()?.adminId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Master admin already registered' });
    }

    const adminId = `master-admin-${Date.now()}`;
    await db.collection(COLLECTIONS.MASTER_ADMIN).doc('config').set({
      adminId,
      email: String(email).trim().toLowerCase(),
      passwordHash: hashPassword(password),
      name: String(name).trim(),
      createdAt: new Date().toISOString(),
    });

    await db.collection(COLLECTIONS.USERS).doc(adminId).set({
      uid: adminId,
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      role: USER_ROLES.MASTER_ADMIN,
      profileId: adminId,
      status: USER_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ 
      message: 'Master admin registered successfully',
      admin: { uid: adminId, email: String(email).trim().toLowerCase(), name: String(name).trim() }
    });
  } catch (err) {
    console.error('Master admin register error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to register admin' });
  }
});

/**
 * POST /auth/master-admin/login
 * Master admin login
 * Body: { email, password }
 */
router.post('/master-admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (isDemo()) {
      if (!demoStore.masterAdmin) {
        return res.status(404).json({ error: 'Not Found', message: 'No master admin registered' });
      }

      if (demoStore.masterAdmin.email !== emailLower || demoStore.masterAdmin.passwordHash !== passwordHash) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
      }

      return res.json({
        user: demoStore.users[demoStore.masterAdmin.uid],
        token: `demo-token-${demoStore.masterAdmin.uid}`
      });
    }

    const db = getFirestore();
    const adminSnap = await db.collection(COLLECTIONS.MASTER_ADMIN).doc('config').get();
    if (!adminSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'No master admin registered' });
    }

    const adminData = adminSnap.data();
    if (adminData.email !== emailLower || adminData.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(adminData.adminId).get();
    return res.json({
      user: userSnap.data(),
      token: `admin-token-${adminData.adminId}`
    });
  } catch (err) {
    console.error('Master admin login error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to login' });
  }
});

/**
 * POST /auth/master-admin/create-org-admin
 * Master admin creates an organizational admin
 * Body: { email, password, name, organizationName }
 */
router.post('/master-admin/create-org-admin', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { email, password, name, organizationName } = req.body || {};

    // Verify requester is master admin
    if (isDemo() || isDemoUser) {
      const admin = demoStore.users[uid];
      if (!admin || admin.role !== USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only master admin can create organizational admins' });
      }
    }

    if (!email || !password || !name || !organizationName) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, password, name, and organization name are required' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (isDemo() || isDemoUser) {
      // Check if email already exists
      const existingUser = Object.values(demoStore.users).find(u => u.email === emailLower);
      if (existingUser) {
        return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
      }

      const pendingUser = Object.values(demoStore.pendingUsers).find(u => u.email === emailLower);
      if (pendingUser) {
        return res.status(409).json({ error: 'Conflict', message: 'User with this email already pending' });
      }

      const orgAdminId = `org-admin-${Date.now()}`;
      const orgId = `org-${Date.now()}`;

      // Create organization
      demoStore.organizations[orgId] = {
        id: orgId,
        name: String(organizationName).trim(),
        adminId: orgAdminId,
        createdBy: uid,
        createdAt: new Date().toISOString(),
      };

      // Create pending org admin
      demoStore.pendingUsers[orgAdminId] = {
        uid: orgAdminId,
        email: emailLower,
        passwordHash,
        name: String(name).trim(),
        role: USER_ROLES.ORG_ADMIN,
        organizationId: orgId,
        organizationName: String(organizationName).trim(),
        status: USER_STATUS.PENDING_ONBOARDING,
        createdBy: uid,
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({
        message: 'Organizational admin account created. They can now sign in.',
        user: { 
          uid: orgAdminId, 
          email: emailLower, 
          name: String(name).trim(), 
          role: USER_ROLES.ORG_ADMIN,
          organizationName: String(organizationName).trim(),
          status: USER_STATUS.PENDING_ONBOARDING 
        }
      });
    }

    // Firebase implementation
    const db = getFirestore();
    const orgAdminId = `org-admin-${Date.now()}`;
    const orgId = `org-${Date.now()}`;

    await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).set({
      id: orgId,
      name: String(organizationName).trim(),
      adminId: orgAdminId,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });

    await db.collection(COLLECTIONS.USERS).doc(orgAdminId).set({
      uid: orgAdminId,
      email: emailLower,
      passwordHash,
      name: String(name).trim(),
      role: USER_ROLES.ORG_ADMIN,
      organizationId: orgId,
      organizationName: String(organizationName).trim(),
      status: USER_STATUS.PENDING_ONBOARDING,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Organizational admin account created. They can now sign in.',
      user: { 
        uid: orgAdminId, 
        email: emailLower, 
        name: String(name).trim(), 
        role: USER_ROLES.ORG_ADMIN,
        organizationName: String(organizationName).trim(),
        status: USER_STATUS.PENDING_ONBOARDING 
      }
    });
  } catch (err) {
    console.error('Create org admin error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to create organizational admin' });
  }
});

/**
 * POST /auth/master-admin/create-restaurant
 * Master admin creates a restaurant account
 * Body: { email, password, name }
 */
router.post('/master-admin/create-restaurant', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { email, password, name } = req.body || {};

    // Verify requester is master admin
    if (isDemo() || isDemoUser) {
      const admin = demoStore.users[uid];
      if (!admin || admin.role !== USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only master admin can create restaurant accounts' });
      }
    }

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, password, and name are required' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (isDemo() || isDemoUser) {
      // Check if email already exists
      const existingUser = Object.values(demoStore.users).find(u => u.email === emailLower);
      if (existingUser) {
        return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
      }

      const pendingUser = Object.values(demoStore.pendingUsers).find(u => u.email === emailLower);
      if (pendingUser) {
        return res.status(409).json({ error: 'Conflict', message: 'User with this email already pending' });
      }

      const restaurantId = `restaurant-${Date.now()}`;
      demoStore.pendingUsers[restaurantId] = {
        uid: restaurantId,
        email: emailLower,
        passwordHash,
        name: String(name).trim(),
        role: USER_ROLES.RESTAURANT,
        status: USER_STATUS.PENDING_ONBOARDING,
        createdBy: uid,
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({
        message: 'Restaurant account created. They can now sign in.',
        user: { uid: restaurantId, email: emailLower, name: String(name).trim(), role: USER_ROLES.RESTAURANT, status: USER_STATUS.PENDING_ONBOARDING }
      });
    }

    // Firebase implementation
    const db = getFirestore();
    const restaurantId = `restaurant-${Date.now()}`;
    
    await db.collection(COLLECTIONS.USERS).doc(restaurantId).set({
      uid: restaurantId,
      email: emailLower,
      passwordHash,
      name: String(name).trim(),
      role: USER_ROLES.RESTAURANT,
      status: USER_STATUS.PENDING_ONBOARDING,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Restaurant account created. They can now sign in.',
      user: { uid: restaurantId, email: emailLower, name: String(name).trim(), role: USER_ROLES.RESTAURANT, status: USER_STATUS.PENDING_ONBOARDING }
    });
  } catch (err) {
    console.error('Create restaurant error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to create restaurant' });
  }
});

/**
 * POST /auth/org-admin/create-volunteer
 * Org admin creates a volunteer for their organization
 * Body: { email, password, name }
 */
router.post('/org-admin/create-volunteer', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { email, password, name } = req.body || {};

    let orgAdmin;
    if (isDemo() || isDemoUser) {
      orgAdmin = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!orgAdmin || orgAdmin.role !== USER_ROLES.ORG_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only organizational admins can create volunteer accounts' });
      }
    }

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, password, and name are required' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (isDemo() || isDemoUser) {
      // Check if email already exists
      const existingUser = Object.values(demoStore.users).find(u => u.email === emailLower);
      if (existingUser) {
        return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
      }

      const pendingUser = Object.values(demoStore.pendingUsers).find(u => u.email === emailLower);
      if (pendingUser) {
        return res.status(409).json({ error: 'Conflict', message: 'User with this email already pending' });
      }

      const volunteerId = `volunteer-${Date.now()}`;
      demoStore.pendingUsers[volunteerId] = {
        uid: volunteerId,
        email: emailLower,
        passwordHash,
        name: String(name).trim(),
        role: USER_ROLES.VOLUNTEER,
        organizationId: orgAdmin.organizationId,
        organizationName: orgAdmin.organizationName,
        status: USER_STATUS.PENDING_ONBOARDING,
        createdBy: uid,
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({
        message: 'Volunteer account created. They can now sign in.',
        user: { 
          uid: volunteerId, 
          email: emailLower, 
          name: String(name).trim(), 
          role: USER_ROLES.VOLUNTEER, 
          organizationName: orgAdmin.organizationName,
          status: USER_STATUS.PENDING_ONBOARDING 
        }
      });
    }

    // Firebase implementation
    const db = getFirestore();
    
    const orgAdminSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!orgAdminSnap.exists || orgAdminSnap.data().role !== USER_ROLES.ORG_ADMIN) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only organizational admins can create volunteer accounts' });
    }

    const orgAdminData = orgAdminSnap.data();
    const volunteerId = `volunteer-${Date.now()}`;
    
    await db.collection(COLLECTIONS.USERS).doc(volunteerId).set({
      uid: volunteerId,
      email: emailLower,
      passwordHash,
      name: String(name).trim(),
      role: USER_ROLES.VOLUNTEER,
      organizationId: orgAdminData.organizationId,
      organizationName: orgAdminData.organizationName,
      status: USER_STATUS.PENDING_ONBOARDING,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Volunteer account created. They can now sign in.',
      user: { 
        uid: volunteerId, 
        email: emailLower, 
        name: String(name).trim(), 
        role: USER_ROLES.VOLUNTEER, 
        organizationName: orgAdminData.organizationName,
        status: USER_STATUS.PENDING_ONBOARDING 
      }
    });
  } catch (err) {
    console.error('Create volunteer error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to create volunteer' });
  }
});

/**
 * GET /auth/master-admin/users
 * Get all org admins and restaurants (for master admin dashboard)
 */
router.get('/master-admin/users', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    if (isDemo() || isDemoUser) {
      const admin = demoStore.users[uid];
      if (!admin || admin.role !== USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only master admin can view users' });
      }

      // Get org admins and restaurants
      const activeUsers = Object.values(demoStore.users).filter(
        u => [USER_ROLES.ORG_ADMIN, USER_ROLES.RESTAURANT].includes(u.role)
      );
      const pendingUsers = Object.values(demoStore.pendingUsers).filter(
        u => [USER_ROLES.ORG_ADMIN, USER_ROLES.RESTAURANT].includes(u.role)
      );
      const organizations = Object.values(demoStore.organizations);

      return res.json({ activeUsers, pendingUsers, organizations });
    }

    const db = getFirestore();
    const userSnap = await db.collection(COLLECTIONS.USERS)
      .where('role', 'in', [USER_ROLES.ORG_ADMIN, USER_ROLES.RESTAURANT])
      .get();
    const users = userSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    
    const activeUsers = users.filter(u => u.status === USER_STATUS.ACTIVE || u.status === USER_STATUS.SUSPENDED);
    const pendingUsers = users.filter(u => u.status === USER_STATUS.PENDING_ONBOARDING);

    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).get();
    const organizations = orgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({ activeUsers, pendingUsers, organizations });
  } catch (err) {
    console.error('Get master admin users error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch users' });
  }
});

/**
 * GET /auth/org-admin/volunteers
 * Get all volunteers for an organization (for org admin dashboard)
 */
router.get('/org-admin/volunteers', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    if (isDemo() || isDemoUser) {
      const orgAdmin = demoStore.users[uid] || demoStore.pendingUsers[uid];
      if (!orgAdmin || orgAdmin.role !== USER_ROLES.ORG_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only org admins can view their volunteers' });
      }

      // Get volunteers in this organization
      const activeVolunteers = Object.values(demoStore.users).filter(
        u => u.role === USER_ROLES.VOLUNTEER && u.organizationId === orgAdmin.organizationId
      );
      const pendingVolunteers = Object.values(demoStore.pendingUsers).filter(
        u => u.role === USER_ROLES.VOLUNTEER && u.organizationId === orgAdmin.organizationId
      );

      return res.json({ 
        activeVolunteers, 
        pendingVolunteers,
        organization: demoStore.organizations[orgAdmin.organizationId]
      });
    }

    const db = getFirestore();
    const orgAdminSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!orgAdminSnap.exists || orgAdminSnap.data().role !== USER_ROLES.ORG_ADMIN) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only org admins can view their volunteers' });
    }

    const orgAdminData = orgAdminSnap.data();
    const volunteerSnap = await db.collection(COLLECTIONS.USERS)
      .where('role', '==', USER_ROLES.VOLUNTEER)
      .where('organizationId', '==', orgAdminData.organizationId)
      .get();
    
    const volunteers = volunteerSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    const activeVolunteers = volunteers.filter(u => u.status === USER_STATUS.ACTIVE || u.status === USER_STATUS.SUSPENDED);
    const pendingVolunteers = volunteers.filter(u => u.status === USER_STATUS.PENDING_ONBOARDING);

    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgAdminData.organizationId).get();

    return res.json({ 
      activeVolunteers, 
      pendingVolunteers,
      organization: orgSnap.exists ? { id: orgSnap.id, ...orgSnap.data() } : null
    });
  } catch (err) {
    console.error('Get org volunteers error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch volunteers' });
  }
});

/**
 * POST /auth/admin/login
 * Org admin login
 * Body: { email, password }
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (isDemo()) {
      // Check pending org admins first
      const pendingOrgAdmin = Object.values(demoStore.pendingUsers).find(
        u => u.email === emailLower && u.role === USER_ROLES.ORG_ADMIN
      );

      if (pendingOrgAdmin) {
        if (pendingOrgAdmin.status === USER_STATUS.SUSPENDED) {
          return res.status(403).json({ error: 'Forbidden', message: 'Your account has been suspended.' });
        }
        if (pendingOrgAdmin.passwordHash !== passwordHash) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
        }
        return res.json({
          user: pendingOrgAdmin,
          token: `demo-token-${pendingOrgAdmin.uid}`,
          needsOnboarding: true
        });
      }

      // Check active org admins
      const activeOrgAdmin = Object.values(demoStore.users).find(
        u => u.email === emailLower && u.role === USER_ROLES.ORG_ADMIN
      );

      if (!activeOrgAdmin) {
        return res.status(404).json({ error: 'Not Found', message: 'No organizational admin account found.' });
      }

      if (activeOrgAdmin.status === USER_STATUS.SUSPENDED) {
        return res.status(403).json({ error: 'Forbidden', message: 'Your account has been suspended.' });
      }

      if (activeOrgAdmin.passwordHash !== passwordHash) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
      }

      return res.json({
        user: activeOrgAdmin,
        token: `demo-token-${activeOrgAdmin.uid}`,
        needsOnboarding: false
      });
    }

    // Firebase implementation
    const db = getFirestore();
    const usersSnap = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', emailLower)
      .where('role', '==', USER_ROLES.ORG_ADMIN)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return res.status(404).json({ error: 'Not Found', message: 'No organizational admin account found.' });
    }

    const userData = usersSnap.docs[0].data();
    if (userData.status === USER_STATUS.SUSPENDED) {
      return res.status(403).json({ error: 'Forbidden', message: 'Your account has been suspended.' });
    }
    if (userData.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    return res.json({
      user: userData,
      token: `user-token-${userData.uid}`,
      needsOnboarding: userData.status === USER_STATUS.PENDING_ONBOARDING
    });
  } catch (err) {
    console.error('Org admin login error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to login' });
  }
});

/**
 * POST /auth/login
 * User login (restaurant or volunteer)
 * Body: { email, password, role }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, password, and role are required' });
    }

    if (![USER_ROLES.RESTAURANT, USER_ROLES.VOLUNTEER].includes(role)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid role' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (isDemo()) {
      // Check pending users first
      const pendingUser = Object.values(demoStore.pendingUsers).find(
        u => u.email === emailLower && u.role === role
      );

      if (pendingUser) {
        if (pendingUser.status === USER_STATUS.SUSPENDED) {
          return res.status(403).json({ error: 'Forbidden', message: 'Your account has been suspended. Please contact the administrator.' });
        }

        if (pendingUser.passwordHash !== passwordHash) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
        }

        return res.json({
          user: pendingUser,
          token: `demo-token-${pendingUser.uid}`,
          needsOnboarding: true
        });
      }

      // Check active users
      const activeUser = Object.values(demoStore.users).find(
        u => u.email === emailLower && u.role === role
      );

      if (!activeUser) {
        return res.status(404).json({ error: 'Not Found', message: 'No account found. Contact admin for registration.' });
      }

      if (activeUser.status === USER_STATUS.SUSPENDED) {
        return res.status(403).json({ error: 'Forbidden', message: 'Your account has been suspended. Please contact the administrator.' });
      }

      if (activeUser.passwordHash !== passwordHash) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
      }

      return res.json({
        user: activeUser,
        token: `demo-token-${activeUser.uid}`,
        needsOnboarding: false
      });
    }

    // Firebase implementation
    const db = getFirestore();
    const usersSnap = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', emailLower)
      .where('role', '==', role)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return res.status(404).json({ error: 'Not Found', message: 'No account found. Contact admin for registration.' });
    }

    const userData = usersSnap.docs[0].data();

    if (userData.status === USER_STATUS.SUSPENDED) {
      return res.status(403).json({ error: 'Forbidden', message: 'Your account has been suspended. Please contact the administrator.' });
    }

    if (userData.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    return res.json({
      user: userData,
      token: `user-token-${userData.uid}`,
      needsOnboarding: userData.status === USER_STATUS.PENDING_ONBOARDING
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to login' });
  }
});

/**
 * POST /auth/complete-onboarding
 * Complete first-time onboarding for any user type
 * Body varies by role
 */
router.post('/complete-onboarding', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const onboardingData = req.body || {};

    if (isDemo() || isDemoUser) {
      // Check if user is pending
      const pendingUser = demoStore.pendingUsers[uid];
      if (!pendingUser) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found or already onboarded' });
      }

      const now = new Date().toISOString();
      const profileId = `profile-${uid}`;

      // Validate based on role
      if (pendingUser.role === USER_ROLES.RESTAURANT) {
        if (!onboardingData.location || !onboardingData.foodTypes || !onboardingData.wasteFrequency) {
          return res.status(400).json({ error: 'Validation Error', message: 'Location, food types, and waste frequency are required' });
        }
      } else if (pendingUser.role === USER_ROLES.VOLUNTEER) {
        if (!onboardingData.location) {
          return res.status(400).json({ error: 'Validation Error', message: 'Location is required' });
        }
      } else if (pendingUser.role === USER_ROLES.ORG_ADMIN) {
        if (!onboardingData.location) {
          return res.status(400).json({ error: 'Validation Error', message: 'Location is required' });
        }
      }

      // Move from pending to active
      demoStore.users[uid] = {
        ...pendingUser,
        profileId,
        status: USER_STATUS.ACTIVE,
        onboarding: onboardingData,
        address: onboardingData.location,
        onboardedAt: now,
        updatedAt: now,
      };

      delete demoStore.pendingUsers[uid];

      return res.json({
        message: 'Onboarding complete!',
        user: demoStore.users[uid]
      });
    }

    // Firebase implementation
    const db = getFirestore();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const userData = userSnap.data();
    if (userData.status !== USER_STATUS.PENDING_ONBOARDING) {
      return res.status(400).json({ error: 'Bad Request', message: 'User already onboarded' });
    }

    const now = new Date().toISOString();
    await userSnap.ref.update({
      status: USER_STATUS.ACTIVE,
      onboarding: onboardingData,
      address: onboardingData.location,
      onboardedAt: now,
      updatedAt: now,
    });

    const updatedSnap = await userSnap.ref.get();
    return res.json({
      message: 'Onboarding complete!',
      user: updatedSnap.data()
    });
  } catch (err) {
    console.error('Complete onboarding error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to complete onboarding' });
  }
});

/**
 * GET /auth/me
 * Returns user doc + role profile doc (if any)
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;

    if (isDemo() || isDemoUser) {
      // Check active users first
      let user = demoStore.users[uid] || null;
      
      // Check pending users
      if (!user) {
        user = demoStore.pendingUsers[uid] || null;
      }

      return res.json({ user });
    }

    const db = getFirestore();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
      return res.json({ user: null });
    }
    const user = userSnap.data();

    let profile = null;
    if (user.role === USER_ROLES.RESTAURANT && user.profileId) {
      const p = await db.collection(COLLECTIONS.RESTAURANTS).doc(user.profileId).get();
      if (p.exists) profile = { id: p.id, ...p.data() };
    } else if (user.role === USER_ROLES.VOLUNTEER && user.profileId) {
      const p = await db.collection(COLLECTIONS.VOLUNTEERS).doc(user.profileId).get();
      if (p.exists) profile = { id: p.id, ...p.data() };
    }

    return res.json({ user: { ...user, profile } });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to fetch profile' });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Validation Error', message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Validation Error', message: 'New password must be at least 6 characters' });
    }

    const currentHash = hashPassword(currentPassword);
    const newHash = hashPassword(newPassword);

    if (isDemo() || isDemoUser) {
      // Check pending users first (during onboarding)
      let user = demoStore.pendingUsers[uid];
      let isPending = !!user;
      
      if (!user) {
        user = demoStore.users[uid];
      }

      if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found' });
      }

      // Verify current password
      if (user.passwordHash !== currentHash) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Current password is incorrect' });
      }

      // Update password
      user.passwordHash = newHash;
      user.passwordChangedAt = new Date().toISOString();

      if (isPending) {
        demoStore.pendingUsers[uid] = user;
      } else {
        demoStore.users[uid] = user;
      }

      return res.json({ message: 'Password changed successfully' });
    }

    // Firebase implementation
    const db = getFirestore();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const userData = userSnap.data();

    if (userData.passwordHash !== currentHash) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Current password is incorrect' });
    }

    await userSnap.ref.update({
      passwordHash: newHash,
      passwordChangedAt: new Date().toISOString()
    });

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to change password' });
  }
});

/**
 * POST /auth/suspend-user
 * Suspend a user (master admin can suspend anyone except master admin, org admin can suspend their volunteers)
 * Body: { userId }
 */
router.post('/suspend-user', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'Validation Error', message: 'User ID is required' });
    }

    if (isDemo() || isDemoUser) {
      const admin = demoStore.users[uid] || demoStore.pendingUsers[uid];
      
      if (!admin || !isAnyAdmin(admin.role)) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only admins can suspend users' });
      }

      // Find user to suspend
      let user = demoStore.users[userId];
      let isPending = false;
      
      if (!user) {
        user = demoStore.pendingUsers[userId];
        isPending = true;
      }

      if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found' });
      }

      // Authorization checks
      if (user.role === USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Cannot suspend master admin account' });
      }

      // Org admin can only suspend their own volunteers
      if (admin.role === USER_ROLES.ORG_ADMIN) {
        if (user.role !== USER_ROLES.VOLUNTEER || user.organizationId !== admin.organizationId) {
          return res.status(403).json({ error: 'Forbidden', message: 'You can only suspend volunteers in your organization' });
        }
      }

      // Suspend the user
      user.status = USER_STATUS.SUSPENDED;
      user.suspendedAt = new Date().toISOString();
      user.suspendedBy = uid;

      if (isPending) {
        demoStore.pendingUsers[userId] = user;
      } else {
        demoStore.users[userId] = user;
      }

      return res.json({ message: 'User suspended successfully', user });
    }

    // Firebase implementation (similar logic)
    const db = getFirestore();
    
    const adminSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const adminData = adminSnap.data();
    if (!adminSnap.exists || !isAnyAdmin(adminData.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only admins can suspend users' });
    }

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const userData = userSnap.data();
    if (userData.role === USER_ROLES.MASTER_ADMIN) {
      return res.status(403).json({ error: 'Forbidden', message: 'Cannot suspend master admin account' });
    }

    if (adminData.role === USER_ROLES.ORG_ADMIN) {
      if (userData.role !== USER_ROLES.VOLUNTEER || userData.organizationId !== adminData.organizationId) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only suspend volunteers in your organization' });
      }
    }

    await userSnap.ref.update({
      status: USER_STATUS.SUSPENDED,
      suspendedAt: new Date().toISOString(),
      suspendedBy: uid
    });

    return res.json({ message: 'User suspended successfully' });
  } catch (err) {
    console.error('Suspend user error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to suspend user' });
  }
});

/**
 * POST /auth/unsuspend-user
 * Reactivate a suspended user
 * Body: { userId }
 */
router.post('/unsuspend-user', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'Validation Error', message: 'User ID is required' });
    }

    if (isDemo() || isDemoUser) {
      const admin = demoStore.users[uid] || demoStore.pendingUsers[uid];
      
      if (!admin || !isAnyAdmin(admin.role)) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only admins can unsuspend users' });
      }

      let user = demoStore.users[userId];
      let isPending = false;
      
      if (!user) {
        user = demoStore.pendingUsers[userId];
        isPending = true;
      }

      if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found' });
      }

      // Org admin can only unsuspend their own volunteers
      if (admin.role === USER_ROLES.ORG_ADMIN) {
        if (user.role !== USER_ROLES.VOLUNTEER || user.organizationId !== admin.organizationId) {
          return res.status(403).json({ error: 'Forbidden', message: 'You can only unsuspend volunteers in your organization' });
        }
      }

      const newStatus = isPending ? USER_STATUS.PENDING_ONBOARDING : USER_STATUS.ACTIVE;
      
      user.status = newStatus;
      delete user.suspendedAt;
      delete user.suspendedBy;
      user.unsuspendedAt = new Date().toISOString();

      if (isPending) {
        demoStore.pendingUsers[userId] = user;
      } else {
        demoStore.users[userId] = user;
      }

      return res.json({ message: 'User reactivated successfully', user });
    }

    // Firebase implementation
    const db = getFirestore();
    
    const adminSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const adminData = adminSnap.data();
    if (!adminSnap.exists || !isAnyAdmin(adminData.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only admins can unsuspend users' });
    }

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const userData = userSnap.data();
    if (adminData.role === USER_ROLES.ORG_ADMIN) {
      if (userData.role !== USER_ROLES.VOLUNTEER || userData.organizationId !== adminData.organizationId) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only unsuspend volunteers in your organization' });
      }
    }

    const newStatus = userData.onboardedAt ? USER_STATUS.ACTIVE : USER_STATUS.PENDING_ONBOARDING;

    await userSnap.ref.update({
      status: newStatus,
      suspendedAt: null,
      suspendedBy: null,
      unsuspendedAt: new Date().toISOString()
    });

    return res.json({ message: 'User reactivated successfully' });
  } catch (err) {
    console.error('Unsuspend user error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to unsuspend user' });
  }
});

/**
 * DELETE /auth/delete-user/:userId
 * Permanently delete a user account
 */
router.delete('/delete-user/:userId', authMiddleware, async (req, res) => {
  try {
    const { uid, isDemo: isDemoUser } = req.user;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Validation Error', message: 'User ID is required' });
    }

    if (isDemo() || isDemoUser) {
      const admin = demoStore.users[uid] || demoStore.pendingUsers[uid];
      
      if (!admin || !isAnyAdmin(admin.role)) {
        return res.status(403).json({ error: 'Forbidden', message: 'Only admins can delete users' });
      }

      // Find user to delete
      let user = demoStore.users[userId];
      let isPending = false;
      
      if (!user) {
        user = demoStore.pendingUsers[userId];
        isPending = true;
      }

      if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found' });
      }

      if (user.role === USER_ROLES.MASTER_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Cannot delete master admin account' });
      }

      // Org admin can only delete their own volunteers
      if (admin.role === USER_ROLES.ORG_ADMIN) {
        if (user.role !== USER_ROLES.VOLUNTEER || user.organizationId !== admin.organizationId) {
          return res.status(403).json({ error: 'Forbidden', message: 'You can only delete volunteers in your organization' });
        }
      }

      // Delete the user
      if (isPending) {
        delete demoStore.pendingUsers[userId];
      } else {
        delete demoStore.users[userId];
      }

      // Also delete associated data
      if (user.role === USER_ROLES.RESTAURANT) {
        Object.keys(demoStore.offers).forEach(offerId => {
          if (demoStore.offers[offerId].restaurantId === userId) {
            delete demoStore.offers[offerId];
          }
        });
      }

      // If deleting an org admin, also delete their organization and volunteers
      if (user.role === USER_ROLES.ORG_ADMIN && user.organizationId) {
        delete demoStore.organizations[user.organizationId];
        // Delete all volunteers in this org
        Object.keys(demoStore.users).forEach(id => {
          if (demoStore.users[id].organizationId === user.organizationId) {
            delete demoStore.users[id];
          }
        });
        Object.keys(demoStore.pendingUsers).forEach(id => {
          if (demoStore.pendingUsers[id].organizationId === user.organizationId) {
            delete demoStore.pendingUsers[id];
          }
        });
      }

      return res.json({ message: 'User deleted successfully' });
    }

    // Firebase implementation (similar logic)
    const db = getFirestore();
    
    const adminSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const adminData = adminSnap.data();
    if (!adminSnap.exists || !isAnyAdmin(adminData.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only admins can delete users' });
    }

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const userData = userSnap.data();
    if (userData.role === USER_ROLES.MASTER_ADMIN) {
      return res.status(403).json({ error: 'Forbidden', message: 'Cannot delete master admin account' });
    }

    if (adminData.role === USER_ROLES.ORG_ADMIN) {
      if (userData.role !== USER_ROLES.VOLUNTEER || userData.organizationId !== adminData.organizationId) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only delete volunteers in your organization' });
      }
    }

    await userSnap.ref.delete();

    if (userData.profileId) {
      const collection = userData.role === USER_ROLES.RESTAURANT ? COLLECTIONS.RESTAURANTS : COLLECTIONS.VOLUNTEERS;
      await db.collection(collection).doc(userData.profileId).delete().catch(() => {});
    }

    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to delete user' });
  }
});

// Legacy endpoints for backwards compatibility
router.post('/admin/register', (req, res) => {
  // Redirect to new master admin endpoint
  return res.redirect(307, '/auth/master-admin/register');
});

router.get('/admin/users', authMiddleware, (req, res) => {
  return res.redirect('/auth/master-admin/users');
});

module.exports = router;

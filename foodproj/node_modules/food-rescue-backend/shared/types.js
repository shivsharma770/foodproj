/**
 * Shared Types and Constants
 * Used by both frontend and backend
 */

// User roles in the system
const USER_ROLES = {
  MASTER_ADMIN: 'master_admin',
  ORG_ADMIN: 'org_admin',
  RESTAURANT: 'restaurant',
  VOLUNTEER: 'volunteer'
};

// User account statuses
const USER_STATUS = {
  PENDING_ONBOARDING: 'pending_onboarding',
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
};

// Food offer statuses
const OFFER_STATUS = {
  OPEN: 'open',
  CLAIMED: 'claimed',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Firestore collection names
const COLLECTIONS = {
  USERS: 'users',
  FOOD_OFFERS: 'food_offers',
  MESSAGES: 'messages',
  PICKUPS: 'pickups',
  MASTER_ADMIN: 'master_admin',
  ORG_ADMINS: 'org_admins',
  ORGANIZATIONS: 'organizations',
  VOLUNTEERS: 'volunteers',
  RESTAURANTS: 'restaurants'
};

// Message types for chat
const MESSAGE_TYPES = {
  TEXT: 'text',
  SYSTEM: 'system',
  STATUS_UPDATE: 'status_update'
};

// Alias for MESSAGE_TYPES (some files use MESSAGE_TYPE)
const MESSAGE_TYPE = MESSAGE_TYPES;

// Pickup statuses
const PICKUP_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

module.exports = {
  USER_ROLES,
  USER_STATUS,
  OFFER_STATUS,
  COLLECTIONS,
  MESSAGE_TYPES,
  MESSAGE_TYPE,
  PICKUP_STATUS
};

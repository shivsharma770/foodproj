/**
 * Persistent demo store - saves data to a JSON file
 * Data survives server restarts!
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '.demo-data.json');

// Default empty store structure
const defaultStore = {
  users: {},           // uid -> user profile
  offers: {},          // offerId -> offer
  pickups: {},         // pickupId -> pickup
  messages: {},        // messageId -> message
  volunteers: {},      // volunteerId -> volunteer availability
  organizations: {},   // orgId -> organization (for org admins)
  masterAdmin: null,   // Single master admin user (null if not registered)
  pendingUsers: {},    // Users created by admin, pending first login
};

// Load existing data or start fresh
function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log('✅ Demo data loaded from file');
      console.log(`   - ${Object.keys(parsed.users || {}).length} users`);
      console.log(`   - ${Object.keys(parsed.offers || {}).length} offers`);
      console.log(`   - ${Object.keys(parsed.organizations || {}).length} organizations`);
      console.log(`   - Master Admin: ${parsed.masterAdmin ? 'registered' : 'not registered'}`);
      return { ...defaultStore, ...parsed };
    }
  } catch (err) {
    console.error('⚠️ Error loading demo data, starting fresh:', err.message);
  }
  console.log('📦 Starting with fresh demo data');
  return { ...defaultStore };
}

// The actual data store
const store = loadStore();

// Debounced save - saves after 100ms of no changes
let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
    } catch (err) {
      console.error('⚠️ Error saving demo data:', err.message);
    }
  }, 100);
}

// Save immediately (for critical operations)
function saveNow() {
  if (saveTimeout) clearTimeout(saveTimeout);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('⚠️ Error saving demo data:', err.message);
  }
}

// Create a deep proxy that auto-saves on any change
function createDeepProxy(obj, rootSave) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  return new Proxy(obj, {
    get(target, prop) {
      if (prop === '_save') return saveNow;
      if (prop === '_clear') return function() {
        store.users = {};
        store.offers = {};
        store.pickups = {};
        store.messages = {};
        store.volunteers = {};
        store.organizations = {};
        store.masterAdmin = null;
        store.pendingUsers = {};
        saveNow();
        console.log('🗑️ Demo data cleared');
      };
      if (prop === '_raw') return store;
      
      const value = target[prop];
      if (value && typeof value === 'object') {
        return createDeepProxy(value, rootSave);
      }
      return value;
    },
    set(target, prop, value) {
      target[prop] = value;
      rootSave();
      return true;
    },
    deleteProperty(target, prop) {
      delete target[prop];
      rootSave();
      return true;
    }
  });
}

// Export the proxied store
module.exports = createDeepProxy(store, scheduleSave);

// Also save on process exit
process.on('beforeExit', saveNow);
process.on('SIGINT', () => {
  saveNow();
  process.exit(0);
});
process.on('SIGTERM', () => {
  saveNow();
  process.exit(0);
});

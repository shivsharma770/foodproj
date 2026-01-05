function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(email) {
  if (!isNonEmptyString(email)) return false;
  // Simple email sanity check (good enough for MVP; Firebase Auth does deeper validation)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone) {
  if (phone == null || phone === '') return true; // optional in MVP
  if (!isNonEmptyString(phone)) return false;
  // Allow + and digits and spaces/dashes/parentheses
  return /^[+]?[\d\s\-()]{7,20}$/.test(phone.trim());
}

function isValidCoordinates(coords) {
  if (!coords || typeof coords !== 'object') return false;
  const { lat, lng } = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function validateFoodOffer(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Invalid payload'] };
  }

  if (!isNonEmptyString(payload.title)) errors.push('title is required');
  if (!isNonEmptyString(payload.description)) errors.push('description is required');

  const qty = payload.quantity;
  if (typeof qty !== 'number' || Number.isNaN(qty) || qty <= 0) errors.push('quantity must be a positive number');

  if (!isNonEmptyString(payload.expirationTime)) errors.push('expirationTime is required (ISO string)');

  return { valid: errors.length === 0, errors };
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidCoordinates,
  validateFoodOffer,
};











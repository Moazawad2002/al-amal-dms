/**
 * Utils.gs — Shared Utilities
 * Al Amal Distribution Management System
 * 
 * Provides ID generation, formatting, validation, hashing, and helper functions.
 * All functions use underscore suffix to prevent exposure via google.script.run.
 */

// ============================================================
// ID Generation
// ============================================================

/**
 * Generates a unique ID with the given prefix.
 * Format: PREFIX-xxxxxxxx (8 random hex chars)
 * @param {string} prefix - ID prefix (e.g., 'USR', 'INV', 'CUST')
 * @returns {string} Unique ID
 */
function generateUniqueId_(prefix) {
  var uuid = Utilities.getUuid().replace(/-/g, '');
  return prefix + '-' + uuid.substring(0, 12);
}

/**
 * Generates a sequential business number.
 * Format: PREFIX-000001
 * @param {string} prefix - Number prefix
 * @param {number} currentMax - Current maximum sequence number
 * @returns {string} Sequential business number
 */
function generateSequentialNumber_(prefix, currentMax) {
  var nextNum = (currentMax || 0) + 1;
  var padded = ('000000' + nextNum).slice(-6);
  return prefix + '-' + padded;
}

// ============================================================
// Date/Time Utilities
// ============================================================

/**
 * Returns current datetime as ISO string in Cairo timezone.
 * @returns {string} ISO datetime string
 */
function nowISO_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Formats a date for display based on language.
 * @param {string|Date} date - Date to format
 * @param {string} lang - Language code ('ar' or 'en')
 * @returns {string} Formatted date string
 */
function formatDate_(date, lang) {
  if (!date) return '';
  var d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  
  if (lang === 'ar') {
    return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy/MM/dd');
  }
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM/yyyy');
}

/**
 * Formats a date as ISO string (YYYY-MM-DD).
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
function formatDateISO_(date) {
  if (!date) return '';
  var d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Converts Date object to YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
function toISODateString_(date) {
  return formatDateISO_(date);
}

/**
 * Converts YYYY-MM-DD string to Date object.
 * @param {string} str - ISO date string
 * @returns {Date|null}
 */
function fromISODateString_(str) {
  if (!str) return null;
  var parts = String(str).split('-');
  if (parts.length !== 3) return null;
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// Currency & Number Formatting
// ============================================================

/**
 * Rounds a monetary amount to configured decimal places using half-up rounding.
 * @param {number} amount
 * @returns {number}
 */
function roundMoney_(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  var factor = Math.pow(10, CONFIG.DECIMAL_PLACES);
  return Math.round(amount * factor) / factor;
}

/**
 * Formats a number as currency string for display only (never for storage).
 * @param {number} amount
 * @param {string} lang - 'ar' or 'en'
 * @returns {string}
 */
function formatCurrency_(amount, lang) {
  var num = roundMoney_(safeParseFloat_(amount));
  var formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: CONFIG.DECIMAL_PLACES,
    maximumFractionDigits: CONFIG.DECIMAL_PLACES
  });
  
  if (lang === 'ar') {
    return formatted + ' ' + CONFIG.CURRENCY_SYMBOL_AR;
  }
  return CONFIG.CURRENCY_SYMBOL_EN + ' ' + formatted;
}

// ============================================================
// Safe Parsing
// ============================================================

/**
 * Safely parses a float value. Returns 0 if invalid.
 * @param {*} value
 * @returns {number}
 */
function safeParseFloat_(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  var parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely parses an integer value. Returns 0 if invalid.
 * @param {*} value
 * @returns {number}
 */
function safeParseInt_(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : Math.floor(value);
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely parses a boolean from sheet value.
 * @param {*} value
 * @returns {boolean}
 */
function parseBoolean_(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
  }
  return Boolean(value);
}

// ============================================================
// Validation
// ============================================================

/**
 * Validates that required fields are present in an object.
 * @param {Object} obj - Object to validate
 * @param {string[]} fields - Required field names
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateRequired_(obj, fields) {
  var errors = [];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      errors.push('Field "' + field + '" is required');
    }
  }
  return errors;
}

/**
 * Validates that a value is a positive number.
 * @param {*} value
 * @param {string} fieldName
 * @returns {string|null} Error message or null if valid
 */
function validatePositiveNumber_(value, fieldName) {
  var num = safeParseFloat_(value);
  if (num <= 0) {
    return fieldName + ' must be a positive number';
  }
  return null;
}

/**
 * Basic email validation.
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail_(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

// ============================================================
// Security: Hashing & Tokens
// ============================================================

/**
 * Generates a random salt for password hashing.
 * Uses Utilities.getUuid() for randomness.
 * @returns {string}
 */
function generateSalt_() {
  return Utilities.getUuid();
}

/**
 * Hashes a password with the given salt using SHA-256.
 * 
 * SECURITY LIMITATION: SHA-256 is NOT a dedicated password hash (like bcrypt/argon2).
 * This is the best available in Apps Script without external libraries.
 * For production with external users, prefer Google-managed authentication.
 * 
 * @param {string} password - Plain text password
 * @param {string} salt - Unique salt for this user
 * @returns {string} Hex-encoded hash
 */
function hashPassword_(password, salt) {
  var input = salt + ':' + password;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < digest.length; i++) {
    var b = digest[i];
    if (b < 0) b += 256;
    var hexByte = b.toString(16);
    if (hexByte.length === 1) hexByte = '0' + hexByte;
    hex += hexByte;
  }
  return hex;
}

/**
 * Generates a secure session token.
 * Combines UUID with timestamp for uniqueness.
 * @returns {string}
 */
function generateSessionToken_() {
  var uuid1 = Utilities.getUuid().replace(/-/g, '');
  var uuid2 = Utilities.getUuid().replace(/-/g, '');
  var timestamp = new Date().getTime().toString(36);
  return uuid1 + uuid2 + timestamp;
}

// ============================================================
// Sanitization & Escaping
// ============================================================

/**
 * Escapes HTML entities to prevent XSS.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml_(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitizes a value before writing to a Google Sheet.
 * Prevents formula injection by prefixing dangerous characters.
 * @param {*} value
 * @returns {*}
 */
function sanitizeForSheet_(value) {
  if (typeof value !== 'string') return value;
  // Prevent formula injection: prefix with single quote if starts with =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

// ============================================================
// Search & Pagination
// ============================================================

/**
 * Filters records by search term across multiple fields.
 * @param {Object[]} records - Array of record objects
 * @param {string} searchTerm - Search query
 * @param {string[]} searchFields - Fields to search in
 * @returns {Object[]} Filtered records
 */
function buildSearchFilter_(records, searchTerm, searchFields) {
  if (!searchTerm || !searchTerm.trim()) return records;
  
  var term = searchTerm.toLowerCase().trim();
  return records.filter(function(record) {
    for (var i = 0; i < searchFields.length; i++) {
      var val = record[searchFields[i]];
      if (val && String(val).toLowerCase().indexOf(term) !== -1) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Paginates an array of records.
 * @param {Object[]} records - Full array of records
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Records per page
 * @returns {Object} { data, total, page, pageSize, totalPages }
 */
function paginateResults_(records, page, pageSize) {
  page = Math.max(1, safeParseInt_(page) || 1);
  pageSize = Math.min(CONFIG.MAX_PAGE_SIZE, Math.max(1, safeParseInt_(pageSize) || CONFIG.DEFAULT_PAGE_SIZE));
  
  var total = records.length;
  var totalPages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(page, totalPages);
  
  var start = (page - 1) * pageSize;
  var data = records.slice(start, start + pageSize);
  
  return {
    data: data,
    total: total,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages
  };
}

// ============================================================
// Misc Helpers
// ============================================================

/**
 * Deep clones a simple object (no functions, dates become strings).
 * @param {Object} obj
 * @returns {Object}
 */
function deepClone_(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Removes sensitive fields from a user record before sending to frontend.
 * @param {Object} user
 * @returns {Object}
 */
function sanitizeUserForClient_(user) {
  if (!user) return null;
  var safe = deepClone_(user);
  delete safe.passwordHash;
  delete safe.salt;
  delete safe.lockedUntil;
  delete safe.failedLogins;
  return safe;
}

/**
 * Checks if a date string/object is in the past.
 * @param {string|Date} date
 * @returns {boolean}
 */
function isDatePast_(date) {
  if (!date) return false;
  var d = (date instanceof Date) ? date : new Date(date);
  return d < new Date();
}

/**
 * Checks if a date is within N days from now.
 * @param {string|Date} date
 * @param {number} days
 * @returns {boolean}
 */
function isWithinDays_(date, days) {
  if (!date) return false;
  var d = (date instanceof Date) ? date : new Date(date);
  var now = new Date();
  var future = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  return d >= now && d <= future;
}

/**
 * Gets the max sequential number from existing records.
 * @param {string} prefix - The prefix to strip (e.g., 'INV-')
 * @param {string[]} existingNumbers - Array of existing numbers
 * @returns {number} Maximum sequence number found
 */
function getMaxSequenceNumber_(prefix, existingNumbers) {
  var max = 0;
  var prefixWithDash = prefix + '-';
  for (var i = 0; i < existingNumbers.length; i++) {
    var num = existingNumbers[i];
    if (num && String(num).indexOf(prefixWithDash) === 0) {
      var seq = parseInt(String(num).substring(prefixWithDash.length), 10);
      if (!isNaN(seq) && seq > max) {
        max = seq;
      }
    }
  }
  return max;
}

/**
 * Auth.gs — Authentication & Session Management
 * Al Amal Distribution Management System
 * 
 * Implements custom username/password authentication with SHA-256 hashing,
 * server-side session management via PropertiesService, login throttling,
 * and role-based authorization.
 * 
 * SECURITY LIMITATION: SHA-256 is not a dedicated password hash like bcrypt.
 * For production with external users, prefer Google Workspace SSO.
 * This is suitable for an internal tool with 4 known users.
 * 
 * SESSION MODEL: Sessions are stored in PropertiesService (server-side).
 * The client receives a token stored in sessionStorage (cleared on tab close).
 * Every server call validates the token — the server never trusts client-supplied
 * role, userId, or repId.
 */

// ============================================================
// Session Store (Private)
// ============================================================

/**
 * Gets the session storage (PropertiesService).
 * @returns {PropertiesService.Properties}
 */
function getSessionStore_() {
  return PropertiesService.getScriptProperties();
}

/**
 * Creates a new session for an authenticated user.
 * @param {Object} user - User record from database
 * @returns {string} Session token
 */
function createSession_(user) {
  var token = generateSessionToken_();
  var now = new Date();
  var expiresAt = new Date(now.getTime() + (CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000));
  
  var session = {
    userId: user.userId,
    username: user.username,
    displayNameAr: user.displayNameAr,
    displayNameEn: user.displayNameEn,
    role: user.role,
    repId: user.repId || '',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
  
  // Store session — key format: session_TOKEN
  getSessionStore_().setProperty('session_' + token, JSON.stringify(session));
  
  return token;
}

/**
 * Retrieves and validates a session by token.
 * Deletes expired sessions.
 * @param {string} token
 * @returns {Object|null} Session object or null if invalid/expired
 */
function getSession_(token) {
  if (!token) return null;
  
  var store = getSessionStore_();
  var sessionStr = store.getProperty('session_' + token);
  
  if (!sessionStr) return null;
  
  try {
    var session = JSON.parse(sessionStr);
    
    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      // Session expired — clean up
      store.deleteProperty('session_' + token);
      return null;
    }
    
    return session;
  } catch (e) {
    store.deleteProperty('session_' + token);
    return null;
  }
}

/**
 * Deletes a session by token.
 * @param {string} token
 */
function deleteSession_(token) {
  if (!token) return;
  getSessionStore_().deleteProperty('session_' + token);
}

/**
 * Deletes all sessions for a given userId.
 * Used when deactivating a user or resetting their password.
 * @param {string} userId
 */
function deleteUserSessions_(userId) {
  var store = getSessionStore_();
  var allProps = store.getProperties();
  var keys = Object.keys(allProps);
  
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf('session_') === 0) {
      try {
        var session = JSON.parse(allProps[keys[i]]);
        if (session.userId === userId) {
          store.deleteProperty(keys[i]);
        }
      } catch (e) {
        // Corrupt session — clean up
        store.deleteProperty(keys[i]);
      }
    }
  }
}

// ============================================================
// Authorization Helpers (Private)
// ============================================================

/**
 * Validates session token and returns the authenticated user's identity.
 * This is the TRUSTED identity source — never accept identity from the client.
 * @param {string} sessionToken
 * @returns {Object} { userId, username, displayNameAr, displayNameEn, role, repId }
 * @throws {Error} 'UNAUTHORIZED' if session is invalid
 */
function getCurrentUser_(sessionToken) {
  var session = getSession_(sessionToken);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return {
    userId: session.userId,
    username: session.username,
    displayNameAr: session.displayNameAr,
    displayNameEn: session.displayNameEn,
    role: session.role,
    repId: session.repId
  };
}

/**
 * Validates session and checks that the user has the required role.
 * MANAGER can access everything.
 * @param {string} sessionToken
 * @param {string} requiredRole
 * @returns {Object} User info
 * @throws {Error} 'UNAUTHORIZED' or 'FORBIDDEN'
 */
function requireRole_(sessionToken, requiredRole) {
  var user = getCurrentUser_(sessionToken);
  
  // Manager can access everything
  if (user.role === CONFIG.ROLES.MANAGER) return user;
  
  // Check specific role
  if (user.role !== requiredRole) {
    throw new Error('FORBIDDEN');
  }
  
  return user;
}

/**
 * Requires MANAGER role.
 * @param {string} sessionToken
 * @returns {Object} User info
 */
function requireManager_(sessionToken) {
  var user = getCurrentUser_(sessionToken);
  if (user.role !== CONFIG.ROLES.MANAGER) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Requires any authenticated user.
 * @param {string} sessionToken
 * @returns {Object} User info
 */
function requireAuth_(sessionToken) {
  return getCurrentUser_(sessionToken);
}

/**
 * Checks if a representative is authorized to access a customer.
 * @param {string} repId
 * @param {string} customerId
 * @returns {boolean}
 */
function isRepAuthorizedForCustomer_(repId, customerId) {
  var assignments = dbFindByField_(SHEETS.CUSTOMER_ASSIGNMENTS, 'customerId', customerId);
  for (var i = 0; i < assignments.length; i++) {
    if (assignments[i].repId === repId && assignments[i].status === CONFIG.STATUS.ACTIVE) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a representative is authorized to access an invoice.
 * @param {string} repId
 * @param {string} invoiceId
 * @returns {boolean}
 */
function isRepAuthorizedForInvoice_(repId, invoiceId) {
  var invoice = dbFindById_(SHEETS.SALES_INVOICES, invoiceId);
  if (!invoice) return false;
  return invoice.repId === repId;
}

/**
 * Filters records to only those accessible by the given user.
 * Manager gets all records. Representative gets only their own.
 * @param {Object[]} records - Array of records
 * @param {Object} user - Authenticated user from getCurrentUser_
 * @param {string} repField - Field name containing the rep ID
 * @returns {Object[]} Filtered records
 */
function filterByRepAccess_(records, user, repField) {
  if (user.role === CONFIG.ROLES.MANAGER) return records;
  
  var repId = user.repId;
  return records.filter(function(record) {
    return record[repField] === repId;
  });
}

// ============================================================
// Public Authentication Functions
// ============================================================

/**
 * Authenticates a user with username and password.
 * Implements login throttling and account lockout.
 * 
 * @param {string} username
 * @param {string} password
 * @returns {Object} { success, token?, user?, error? }
 */
function login(username, password) {
  if (!username || !password) {
    return { success: false, error: 'missing_credentials' };
  }
  
  username = String(username).trim().toLowerCase();
  
  // Find user by username
  var user = dbFindOneByField_(SHEETS.USERS, 'username', username);
  
  if (!user) {
    // Don't reveal whether the username exists
    Utilities.sleep(500); // Timing attack mitigation
    return { success: false, error: 'invalid_credentials' };
  }
  
  // Check if user is active
  if (user.status !== CONFIG.STATUS.ACTIVE) {
    return { success: false, error: 'account_inactive' };
  }
  
  // Check lockout
  var failedLogins = safeParseInt_(user.failedLogins);
  if (failedLogins >= CONFIG.MAX_FAILED_LOGINS && user.lockedUntil) {
    var lockedUntil = new Date(user.lockedUntil);
    if (lockedUntil > new Date()) {
      return { success: false, error: 'account_locked' };
    }
    // Lockout period has passed — reset counter
    failedLogins = 0;
  }
  
  // Hash the provided password
  var hash = hashPassword_(password, user.salt);
  
  if (hash !== user.passwordHash) {
    // Wrong password — use lock to prevent race conditions on counter
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(5000);
      
      // Re-read to get latest failedLogins count
      var freshUser = dbFindById_(SHEETS.USERS, user.userId);
      var newFailedCount = safeParseInt_(freshUser.failedLogins) + 1;
      
      var lockoutChanges = {
        failedLogins: newFailedCount,
        updatedAt: nowISO_()
      };
      
      if (newFailedCount >= CONFIG.MAX_FAILED_LOGINS) {
        var lockUntil = new Date(new Date().getTime() + (CONFIG.LOCKOUT_MINUTES * 60 * 1000));
        lockoutChanges.lockedUntil = lockUntil.toISOString();
      }
      
      dbUpdate_(SHEETS.USERS, user.userId, lockoutChanges);
      lock.releaseLock();
    } catch (e) {
      try { lock.releaseLock(); } catch (e2) {}
    }
    
    logAudit_(user.userId, username, 'LOGIN_FAILED', 'User', user.userId, 
      { reason: 'invalid_password', failedAttempt: failedLogins + 1 });
    
    Utilities.sleep(500); // Timing attack mitigation
    return { success: false, error: 'invalid_credentials' };
  }
  
  // Successful login
  // Reset failed login counter and update last login
  dbUpdate_(SHEETS.USERS, user.userId, {
    failedLogins: 0,
    lockedUntil: '',
    lastLoginAt: nowISO_(),
    updatedAt: nowISO_()
  });
  
  // Create session
  var token = createSession_(user);
  
  logAudit_(user.userId, username, 'LOGIN_SUCCESS', 'User', user.userId, null);
  
  return {
    success: true,
    token: token,
    user: {
      userId: user.userId,
      username: user.username,
      displayNameAr: user.displayNameAr,
      displayNameEn: user.displayNameEn,
      role: user.role,
      repId: user.repId || ''
    }
  };
}

/**
 * Logs out the current user by invalidating their session.
 * @param {string} sessionToken
 * @returns {Object} { success: true }
 */
function logout(sessionToken) {
  if (sessionToken) {
    var session = getSession_(sessionToken);
    if (session) {
      logAudit_(session.userId, session.username, 'LOGOUT', 'User', session.userId, null);
    }
    deleteSession_(sessionToken);
  }
  return { success: true };
}

/**
 * Validates if a session token is still active.
 * @param {string} sessionToken
 * @returns {Object} { success, user? }
 */
function validateSession(sessionToken) {
  if (!sessionToken) {
    return { success: false, error: 'no_token' };
  }
  
  var session = getSession_(sessionToken);
  if (!session) {
    return { success: false, error: 'session_expired' };
  }
  
  return {
    success: true,
    user: {
      userId: session.userId,
      username: session.username,
      displayNameAr: session.displayNameAr,
      displayNameEn: session.displayNameEn,
      role: session.role,
      repId: session.repId
    }
  };
}

/**
 * Changes the current user's password.
 * @param {string} sessionToken
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Object} { success } or error
 */
function changePassword(sessionToken, currentPassword, newPassword) {
  var currentUser = requireAuth_(sessionToken);
  
  if (!currentPassword || !newPassword) {
    return { success: false, error: 'missing_fields' };
  }
  
  if (newPassword.length < 6) {
    return { success: false, error: 'password_too_short' };
  }
  
  // Get full user record with hash
  var user = dbFindById_(SHEETS.USERS, currentUser.userId);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  // Verify current password
  var currentHash = hashPassword_(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    return { success: false, error: 'wrong_current_password' };
  }
  
  // Generate new salt and hash
  var newSalt = generateSalt_();
  var newHash = hashPassword_(newPassword, newSalt);
  
  dbUpdate_(SHEETS.USERS, currentUser.userId, {
    passwordHash: newHash,
    salt: newSalt,
    updatedAt: nowISO_()
  });
  
  // Invalidate all other sessions for this user (keep current)
  // This is a simplified approach — invalidate all then re-create current
  deleteUserSessions_(currentUser.userId);
  var newToken = createSession_(user);
  
  logAudit_(currentUser.userId, currentUser.username, 'CHANGE_PASSWORD', 'User', currentUser.userId, null);
  
  return { success: true, newToken: newToken };
}

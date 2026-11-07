/**
 * Users.gs — User Provisioning & Management
 * Al Amal Distribution Management System
 * 
 * Manages user accounts, roles, and profile operations.
 * All public functions validate session tokens server-side.
 * Never returns passwordHash or salt to the frontend.
 */

// ============================================================
// Public User Management Functions
// ============================================================

/**
 * Gets all users (without sensitive fields). Manager only.
 * @param {string} sessionToken
 * @returns {Object} { success, data }
 */
function getUsers(sessionToken) {
  requireManager_(sessionToken);
  
  var users = dbReadAll_(SHEETS.USERS);
  var safeUsers = users.map(function(u) {
    return sanitizeUserForClient_(u);
  });
  
  return { success: true, data: safeUsers };
}

/**
 * Creates a new user. Manager only.
 * @param {string} sessionToken
 * @param {Object} userData - { username, displayNameAr, displayNameEn, email, password, role, repId }
 * @returns {Object} { success, data }
 */
function createUser(sessionToken, userData) {
  var manager = requireManager_(sessionToken);
  
  // Validate required fields
  var errors = validateRequired_(userData, ['username', 'displayNameAr', 'password', 'role']);
  if (errors.length > 0) {
    return { success: false, error: 'validation', details: errors };
  }
  
  var username = String(userData.username).trim().toLowerCase();
  
  // Validate role
  if (userData.role !== CONFIG.ROLES.MANAGER && userData.role !== CONFIG.ROLES.REPRESENTATIVE) {
    return { success: false, error: 'invalid_role' };
  }
  
  // Check unique username
  var existing = dbFindOneByField_(SHEETS.USERS, 'username', username);
  if (existing) {
    return { success: false, error: 'username_exists' };
  }
  
  // Validate password length
  if (userData.password.length < 6) {
    return { success: false, error: 'password_too_short' };
  }
  
  // If representative, validate repId
  if (userData.role === CONFIG.ROLES.REPRESENTATIVE) {
    if (!userData.repId) {
      return { success: false, error: 'rep_id_required' };
    }
    var rep = dbFindById_(SHEETS.REPRESENTATIVES, userData.repId);
    if (!rep) {
      return { success: false, error: 'invalid_rep_id' };
    }
  }
  
  // Create user
  var salt = generateSalt_();
  var hash = hashPassword_(userData.password, salt);
  
  var user = {
    userId: generateUniqueId_('USR'),
    username: username,
    displayNameAr: userData.displayNameAr,
    displayNameEn: userData.displayNameEn || userData.displayNameAr,
    email: userData.email || '',
    passwordHash: hash,
    salt: salt,
    role: userData.role,
    repId: userData.repId || '',
    status: CONFIG.STATUS.ACTIVE,
    failedLogins: 0,
    lockedUntil: '',
    lastLoginAt: '',
    createdAt: nowISO_(),
    updatedAt: nowISO_()
  };
  
  dbInsert_(SHEETS.USERS, user);
  
  // Update representative's userId link if applicable
  if (userData.role === CONFIG.ROLES.REPRESENTATIVE && userData.repId) {
    dbUpdate_(SHEETS.REPRESENTATIVES, userData.repId, {
      userId: user.userId,
      updatedAt: nowISO_()
    });
  }
  
  logAudit_(manager.userId, manager.username, 'CREATE_USER', 'User', user.userId, {
    username: username,
    role: userData.role
  });
  
  return { success: true, data: sanitizeUserForClient_(user) };
}

/**
 * Updates a user's non-sensitive fields. Manager only.
 * Cannot change password through this function.
 * @param {string} sessionToken
 * @param {string} userId
 * @param {Object} changes - { displayNameAr, displayNameEn, email, role, status }
 * @returns {Object} { success, data }
 */
function updateUser(sessionToken, userId, changes) {
  var manager = requireManager_(sessionToken);
  
  var user = dbFindById_(SHEETS.USERS, userId);
  if (!user) {
    return { success: false, error: 'user_not_found' };
  }
  
  // Don't allow password changes through this endpoint
  delete changes.passwordHash;
  delete changes.salt;
  delete changes.password;
  delete changes.userId;
  delete changes.username; // Username is immutable
  
  // Validate role change
  if (changes.role) {
    if (changes.role !== CONFIG.ROLES.MANAGER && changes.role !== CONFIG.ROLES.REPRESENTATIVE) {
      return { success: false, error: 'invalid_role' };
    }
    
    // Prevent demoting the last manager
    if (user.role === CONFIG.ROLES.MANAGER && changes.role !== CONFIG.ROLES.MANAGER) {
      var managers = dbFindByField_(SHEETS.USERS, 'role', CONFIG.ROLES.MANAGER);
      var activeManagers = managers.filter(function(m) { return m.status === CONFIG.STATUS.ACTIVE; });
      if (activeManagers.length <= 1) {
        return { success: false, error: 'last_manager' };
      }
    }
  }
  
  changes.updatedAt = nowISO_();
  
  var updated = dbUpdate_(SHEETS.USERS, userId, changes);
  
  logAudit_(manager.userId, manager.username, 'UPDATE_USER', 'User', userId, {
    changes: Object.keys(changes)
  });
  
  return { success: true, data: sanitizeUserForClient_(updated) };
}

/**
 * Deactivates a user. Manager only. Cannot deactivate self.
 * @param {string} sessionToken
 * @param {string} userId
 * @returns {Object} { success }
 */
function deactivateUser(sessionToken, userId) {
  var manager = requireManager_(sessionToken);
  
  if (manager.userId === userId) {
    return { success: false, error: 'cannot_deactivate_self' };
  }
  
  var user = dbFindById_(SHEETS.USERS, userId);
  if (!user) {
    return { success: false, error: 'user_not_found' };
  }
  
  // Prevent deactivating the last active manager
  if (user.role === CONFIG.ROLES.MANAGER) {
    var managers = dbFindByField_(SHEETS.USERS, 'role', CONFIG.ROLES.MANAGER);
    var activeManagers = managers.filter(function(m) { 
      return m.status === CONFIG.STATUS.ACTIVE && m.userId !== userId; 
    });
    if (activeManagers.length === 0) {
      return { success: false, error: 'last_manager' };
    }
  }
  
  dbUpdate_(SHEETS.USERS, userId, {
    status: CONFIG.STATUS.INACTIVE,
    updatedAt: nowISO_()
  });
  
  // Invalidate all sessions for this user
  deleteUserSessions_(userId);
  
  logAudit_(manager.userId, manager.username, 'DEACTIVATE_USER', 'User', userId, {
    username: user.username
  });
  
  return { success: true };
}

/**
 * Resets a user's password. Manager only.
 * @param {string} sessionToken
 * @param {string} userId
 * @param {string} newPassword
 * @returns {Object} { success }
 */
function resetUserPassword(sessionToken, userId, newPassword) {
  var manager = requireManager_(sessionToken);
  
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'password_too_short' };
  }
  
  var user = dbFindById_(SHEETS.USERS, userId);
  if (!user) {
    return { success: false, error: 'user_not_found' };
  }
  
  var newSalt = generateSalt_();
  var newHash = hashPassword_(newPassword, newSalt);
  
  dbUpdate_(SHEETS.USERS, userId, {
    passwordHash: newHash,
    salt: newSalt,
    failedLogins: 0,
    lockedUntil: '',
    updatedAt: nowISO_()
  });
  
  // Invalidate all sessions
  deleteUserSessions_(userId);
  
  // Do NOT log the actual password
  logAudit_(manager.userId, manager.username, 'RESET_PASSWORD', 'User', userId, {
    username: user.username
  });
  
  return { success: true };
}

/**
 * Gets the current user's profile. Any authenticated user.
 * @param {string} sessionToken
 * @returns {Object} { success, data }
 */
function getUserProfile(sessionToken) {
  var currentUser = requireAuth_(sessionToken);
  
  var user = dbFindById_(SHEETS.USERS, currentUser.userId);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  var profile = sanitizeUserForClient_(user);
  
  // If representative, include rep info
  if (currentUser.repId) {
    var rep = dbFindById_(SHEETS.REPRESENTATIVES, currentUser.repId);
    if (rep) {
      profile.representative = rep;
    }
  }
  
  return { success: true, data: profile };
}

// ============================================================
// Internal User Provisioning (Private)
// ============================================================

/**
 * Creates initial users during setup. Only creates if username doesn't exist.
 * NEVER overwrites existing passwords or statuses.
 * @param {Object[]} users - Array of user objects with { username, displayNameAr, displayNameEn, password, role, repId }
 * @returns {Object} { created, skipped, errors }
 */
function provisionInitialUsers_(users) {
  var result = { created: [], skipped: [], errors: [] };
  
  for (var i = 0; i < users.length; i++) {
    var userData = users[i];
    try {
      var username = String(userData.username).trim().toLowerCase();
      var existing = dbFindOneByField_(SHEETS.USERS, 'username', username);
      
      if (existing) {
        result.skipped.push(username);
        continue;
      }
      
      var salt = generateSalt_();
      var hash = hashPassword_(userData.password, salt);
      
      var user = {
        userId: generateUniqueId_('USR'),
        username: username,
        displayNameAr: userData.displayNameAr,
        displayNameEn: userData.displayNameEn || '',
        email: userData.email || '',
        passwordHash: hash,
        salt: salt,
        role: userData.role,
        repId: userData.repId || '',
        status: CONFIG.STATUS.ACTIVE,
        failedLogins: 0,
        lockedUntil: '',
        lastLoginAt: '',
        createdAt: nowISO_(),
        updatedAt: nowISO_()
      };
      
      dbInsert_(SHEETS.USERS, user);
      result.created.push(username);
      
    } catch (e) {
      result.errors.push({ username: userData.username, error: e.message });
    }
  }
  
  return result;
}

/**
 * Audit.gs — Audit Logging System
 * Al Amal Distribution Management System
 * 
 * Records important business events for accountability and traceability.
 * Never stores passwords, tokens, or sensitive authentication data.
 */

// ============================================================
// Private Audit Functions
// ============================================================

/**
 * Records an audit log entry.
 * @param {string} userId - ID of the user performing the action
 * @param {string} username - Username for quick reference
 * @param {string} action - Action description (e.g., 'CREATE_INVOICE', 'LOGIN')
 * @param {string} entityType - Type of entity (e.g., 'SalesInvoice', 'Customer')
 * @param {string} entityId - ID of the affected entity
 * @param {Object|string} details - Additional details (object will be JSON.stringify'd)
 */
function logAudit_(userId, username, action, entityType, entityId, details) {
  try {
    var detailsStr = '';
    if (details) {
      if (typeof details === 'object') {
        // Remove any sensitive fields before logging
        var safeDetails = deepClone_(details);
        delete safeDetails.password;
        delete safeDetails.passwordHash;
        delete safeDetails.salt;
        delete safeDetails.sessionToken;
        delete safeDetails.token;
        detailsStr = JSON.stringify(safeDetails);
      } else {
        detailsStr = String(details);
      }
    }
    
    // Truncate details if too long (Sheets cell limit)
    if (detailsStr.length > 5000) {
      detailsStr = detailsStr.substring(0, 5000) + '...[truncated]';
    }
    
    var record = {
      logId: generateUniqueId_('LOG'),
      userId: userId || 'SYSTEM',
      username: username || 'system',
      action: action,
      entityType: entityType || '',
      entityId: entityId || '',
      details: detailsStr,
      createdAt: nowISO_()
    };
    
    dbInsert_(SHEETS.AUDIT_LOGS, record);
  } catch (e) {
    // Audit logging should never crash the main operation
    Logger.log('Audit log error: ' + e.message);
  }
}

// ============================================================
// Public Audit Functions
// ============================================================

/**
 * Gets paginated audit logs. Manager only.
 * @param {string} sessionToken
 * @param {Object} filters - { entityType, entityId, userId, action, dateFrom, dateTo, page, pageSize }
 * @returns {Object} { success, data, total, page, totalPages }
 */
function getAuditLogs(sessionToken, filters) {
  var user = requireManager_(sessionToken);
  filters = filters || {};
  
  var records = dbReadAll_(SHEETS.AUDIT_LOGS);
  
  // Apply filters
  if (filters.entityType) {
    records = records.filter(function(r) { return r.entityType === filters.entityType; });
  }
  if (filters.entityId) {
    records = records.filter(function(r) { return r.entityId === filters.entityId; });
  }
  if (filters.userId) {
    records = records.filter(function(r) { return r.userId === filters.userId; });
  }
  if (filters.action) {
    records = records.filter(function(r) { return r.action === filters.action; });
  }
  if (filters.dateFrom) {
    records = records.filter(function(r) { return r.createdAt >= filters.dateFrom; });
  }
  if (filters.dateTo) {
    records = records.filter(function(r) { return r.createdAt <= filters.dateTo + 'T23:59:59'; });
  }
  if (filters.search) {
    records = buildSearchFilter_(records, filters.search, ['username', 'action', 'entityType', 'entityId', 'details']);
  }
  
  // Sort by most recent first
  records.sort(function(a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  
  var result = paginateResults_(records, filters.page, filters.pageSize);
  result.success = true;
  return result;
}

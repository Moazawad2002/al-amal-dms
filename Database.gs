/**
 * Database.gs — Spreadsheet Access Layer
 * Al Amal Distribution Management System
 * 
 * Provides CRUD operations, schema initialization, and batch read/write helpers.
 * All database access goes through these functions.
 * Uses batch reads (getDataRange().getValues()) — never cell-by-cell.
 */

// Script-level cache for the current execution
var _dbCache = null;
var _sheetCache = {};
var _dataCache = {};

// ============================================================
// Core Database Access
// ============================================================

/**
 * Opens the spreadsheet by CONFIG.SPREADSHEET_ID.
 * Caches for the current execution to avoid repeated opens.
 * @returns {Spreadsheet}
 * @throws {Error} If spreadsheet ID is not configured or spreadsheet not found
 */
function getDb_() {
  if (_dbCache) return _dbCache;
  
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'PASTE_YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('Spreadsheet ID not configured. Please update CONFIG.SPREADSHEET_ID in Config.gs');
  }
  
  try {
    _dbCache = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    throw new Error('Cannot open spreadsheet. Check the SPREADSHEET_ID in Config.gs. Error: ' + e.message);
  }
  
  return _dbCache;
}

/**
 * Gets a sheet by name from the database spreadsheet.
 * Caches sheet references for the current execution.
 * @param {string} sheetName
 * @returns {Sheet}
 * @throws {Error} If sheet not found
 */
function getSheet_(sheetName) {
  if (_sheetCache[sheetName]) return _sheetCache[sheetName];
  
  var db = getDb_();
  var sheet = db.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found in the spreadsheet');
  }
  
  _sheetCache[sheetName] = sheet;
  return sheet;
}

/**
 * Clears all execution-level caches.
 * Call after batch writes to ensure fresh reads.
 */
function clearDbCache_() {
  _dbCache = null;
  _sheetCache = {};
  _dataCache = {};
}

/**
 * Clears the data cache for a specific sheet.
 * Call after writes to that sheet.
 * @param {string} sheetName
 */
function clearSheetCache_(sheetName) {
  delete _dataCache[sheetName];
}

// ============================================================
// Data Reading
// ============================================================

/**
 * Reads all data from a sheet as an array of objects.
 * Uses row 1 as headers. Returns empty array if no data rows.
 * Uses batch read (getDataRange().getValues()).
 * @param {string} sheetName
 * @returns {Object[]} Array of record objects
 */
function getSheetData_(sheetName) {
  if (_dataCache[sheetName]) return deepClone_(_dataCache[sheetName]);
  
  var sheet = getSheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    _dataCache[sheetName] = [];
    return [];
  }
  
  var headers = data[0];
  var records = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Skip completely empty rows
    if (!row[0] && row.every(function(cell) { return cell === '' || cell === null || cell === undefined; })) {
      continue;
    }
    
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      // Convert Date objects to ISO strings for consistency
      if (val instanceof Date) {
        val = Utilities.formatDate(val, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
      }
      record[headers[j]] = val;
    }
    records.push(record);
  }
  
  _dataCache[sheetName] = records;
  return deepClone_(records);
}

/**
 * Alias for getSheetData_.
 * @param {string} sheetName
 * @returns {Object[]}
 */
function dbReadAll_(sheetName) {
  return getSheetData_(sheetName);
}

/**
 * Finds a record by its primary key (first column).
 * @param {string} sheetName
 * @param {string} id - Primary key value
 * @returns {Object|null} Record object or null
 */
function dbFindById_(sheetName, id) {
  var records = getSheetData_(sheetName);
  var schema = SCHEMAS[sheetName];
  if (!schema || !schema.length) return null;
  
  var idField = schema[0]; // First column is always the PK
  for (var i = 0; i < records.length; i++) {
    if (String(records[i][idField]) === String(id)) {
      return records[i];
    }
  }
  return null;
}

/**
 * Finds all records where a field matches a value.
 * @param {string} sheetName
 * @param {string} field - Field name to match
 * @param {*} value - Value to match
 * @returns {Object[]} Matching records
 */
function dbFindByField_(sheetName, field, value) {
  var records = getSheetData_(sheetName);
  return records.filter(function(record) {
    return String(record[field]) === String(value);
  });
}

/**
 * Finds the first record where a field matches a value.
 * @param {string} sheetName
 * @param {string} field
 * @param {*} value
 * @returns {Object|null}
 */
function dbFindOneByField_(sheetName, field, value) {
  var records = getSheetData_(sheetName);
  for (var i = 0; i < records.length; i++) {
    if (String(records[i][field]) === String(value)) {
      return records[i];
    }
  }
  return null;
}

/**
 * Counts records matching a field/value.
 * @param {string} sheetName
 * @param {string} field
 * @param {*} value
 * @returns {number}
 */
function dbCountByField_(sheetName, field, value) {
  return dbFindByField_(sheetName, field, value).length;
}

// ============================================================
// Data Writing
// ============================================================

/**
 * Inserts a single record into a sheet.
 * Maps object keys to header columns. Validates that keys exist in schema.
 * Sanitizes values before writing.
 * @param {string} sheetName
 * @param {Object} record - Record object to insert
 * @returns {Object} The inserted record
 * @throws {Error} If record contains invalid fields
 */
function dbInsert_(sheetName, record) {
  var sheet = getSheet_(sheetName);
  var schema = SCHEMAS[sheetName];
  
  if (!schema) {
    throw new Error('No schema defined for sheet: ' + sheetName);
  }
  
  // Validate that record keys exist in schema
  var recordKeys = Object.keys(record);
  for (var i = 0; i < recordKeys.length; i++) {
    if (schema.indexOf(recordKeys[i]) === -1) {
      throw new Error('Invalid field "' + recordKeys[i] + '" for sheet ' + sheetName);
    }
  }
  
  // Build row array matching schema column order
  var row = [];
  for (var j = 0; j < schema.length; j++) {
    var val = record[schema[j]];
    if (val === undefined) val = '';
    row.push(sanitizeForSheet_(val));
  }
  
  sheet.appendRow(row);
  clearSheetCache_(sheetName);
  
  return record;
}

/**
 * Updates a record by its primary key (first column).
 * Only updates specified fields in the changes object.
 * @param {string} sheetName
 * @param {string} id - Primary key value
 * @param {Object} changes - Fields to update
 * @returns {Object} Updated record
 * @throws {Error} If record not found
 */
function dbUpdate_(sheetName, id, changes) {
  var sheet = getSheet_(sheetName);
  var schema = SCHEMAS[sheetName];
  
  if (!schema) {
    throw new Error('No schema defined for sheet: ' + sheetName);
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = 0; // First column is the PK
  
  // Find the row
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Record not found: ' + id + ' in sheet ' + sheetName);
  }
  
  // Apply changes
  var changeKeys = Object.keys(changes);
  for (var c = 0; c < changeKeys.length; c++) {
    var field = changeKeys[c];
    var colIndex = headers.indexOf(field);
    if (colIndex === -1) {
      throw new Error('Invalid field "' + field + '" for sheet ' + sheetName);
    }
    // +1 because sheet rows are 1-indexed
    sheet.getRange(rowIndex + 1, colIndex + 1).setValue(sanitizeForSheet_(changes[field]));
  }
  
  clearSheetCache_(sheetName);
  
  // Return updated record
  return dbFindById_(sheetName, id);
}

/**
 * Soft-deletes a record by setting status to 'inactive'.
 * @param {string} sheetName
 * @param {string} id
 * @returns {Object} Updated record
 */
function dbSoftDelete_(sheetName, id) {
  return dbUpdate_(sheetName, id, {
    status: CONFIG.STATUS.INACTIVE,
    updatedAt: nowISO_()
  });
}

/**
 * Batch-inserts multiple records for performance.
 * Uses setValues() for a single write operation.
 * @param {string} sheetName
 * @param {Object[]} records - Array of record objects
 * @returns {number} Number of records inserted
 */
function dbBatchInsert_(sheetName, records) {
  if (!records || records.length === 0) return 0;
  
  var sheet = getSheet_(sheetName);
  var schema = SCHEMAS[sheetName];
  
  if (!schema) {
    throw new Error('No schema defined for sheet: ' + sheetName);
  }
  
  var rows = [];
  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    var row = [];
    for (var j = 0; j < schema.length; j++) {
      var val = record[schema[j]];
      if (val === undefined) val = '';
      row.push(sanitizeForSheet_(val));
    }
    rows.push(row);
  }
  
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, schema.length).setValues(rows);
  clearSheetCache_(sheetName);
  
  return rows.length;
}

// ============================================================
// Schema Initialization
// ============================================================

/**
 * Creates all sheets defined in SCHEMAS if they don't exist.
 * Adds header rows to empty sheets.
 * NEVER deletes existing sheets or data.
 * @returns {Object} { created: [], existing: [], headersAdded: [] }
 */
function initializeSheets_() {
  var db = getDb_();
  var result = { created: [], existing: [], headersAdded: [] };
  
  var sheetNames = Object.keys(SCHEMAS);
  
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = db.getSheetByName(name);
    
    if (!sheet) {
      // Create the sheet
      sheet = db.insertSheet(name);
      result.created.push(name);
      
      // Add header row
      var headers = SCHEMAS[name];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F3F4F6');
      
      // Freeze header row
      sheet.setFrozenRows(1);
      
      result.headersAdded.push(name);
    } else {
      result.existing.push(name);
      
      // Check if headers are present
      var firstRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      var expectedHeaders = SCHEMAS[name];
      
      // If sheet is empty or first cell is empty, add headers
      if (!firstRow[0] || firstRow[0] === '') {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        var headerRange2 = sheet.getRange(1, 1, 1, expectedHeaders.length);
        headerRange2.setFontWeight('bold');
        headerRange2.setBackground('#F3F4F6');
        sheet.setFrozenRows(1);
        result.headersAdded.push(name);
      }
    }
  }
  
  // Remove the default "Sheet1" if it exists and is empty
  var defaultSheet = db.getSheetByName('Sheet1');
  if (defaultSheet && db.getSheets().length > 1) {
    try {
      if (defaultSheet.getLastRow() <= 1 && defaultSheet.getLastColumn() <= 1) {
        var cell = defaultSheet.getRange(1, 1).getValue();
        if (!cell || cell === '') {
          db.deleteSheet(defaultSheet);
        }
      }
    } catch (e) {
      // Ignore — can't delete the only sheet
    }
  }
  
  return result;
}

/**
 * Validates that a sheet's header row matches the expected schema.
 * @param {string} sheetName
 * @returns {Object} { valid, expected, actual, missing, extra }
 */
function validateSchema_(sheetName) {
  var sheet = getSheet_(sheetName);
  var expected = SCHEMAS[sheetName];
  
  if (!expected) {
    return { valid: false, error: 'No schema defined for ' + sheetName };
  }
  
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    return { valid: false, expected: expected, actual: [], missing: expected, extra: [] };
  }
  
  var actual = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  var missing = [];
  for (var i = 0; i < expected.length; i++) {
    if (actual.indexOf(expected[i]) === -1) {
      missing.push(expected[i]);
    }
  }
  
  var extra = [];
  for (var j = 0; j < actual.length; j++) {
    if (expected.indexOf(actual[j]) === -1 && actual[j] !== '') {
      extra.push(actual[j]);
    }
  }
  
  return {
    valid: missing.length === 0,
    expected: expected,
    actual: actual,
    missing: missing,
    extra: extra
  };
}

/**
 * Gets the next sequential number for a given prefix from existing records.
 * @param {string} prefix - Number prefix (e.g., 'INV')
 * @param {string} sheetName - Sheet to look in
 * @param {string} numberField - Field name containing the sequential number
 * @returns {string} Next sequential number (e.g., 'INV-000042')
 */
function getNextSequentialNumber_(prefix, sheetName, numberField) {
  var records = getSheetData_(sheetName);
  var numbers = records.map(function(r) { return r[numberField]; });
  var maxNum = getMaxSequenceNumber_(prefix, numbers);
  return generateSequentialNumber_(prefix, maxNum);
}

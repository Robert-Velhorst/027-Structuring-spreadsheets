/**
 * Utils.gs - Utility functions and helpers
 * Part of Sheet Shaper Google Sheets Add-on
 */

/**
 * Validates if a value is a valid delimiter
 * @param {string} delimiter - Delimiter to validate
 * @return {Object} Validation result
 */
function validateDelimiter(delimiter) {
  if (!delimiter || delimiter.length === 0) {
    return {
      isValid: false,
      message: 'Delimiter cannot be empty.'
    };
  }
  
  if (delimiter.length > 10) {
    return {
      isValid: false,
      message: 'Delimiter is too long. Please use a shorter delimiter.'
    };
  }
  
  return {
    isValid: true,
    message: 'Delimiter is valid.'
  };
}

/**
 * Validates column index
 * @param {number} columnIndex - Column index to validate
 * @param {number} maxColumns - Maximum number of columns
 * @return {Object} Validation result
 */
function validateColumnIndex(columnIndex, maxColumns) {
  if (isNaN(columnIndex) || columnIndex < 0) {
    return {
      isValid: false,
      message: 'Column index must be a non-negative number.'
    };
  }
  
  if (columnIndex >= maxColumns) {
    return {
      isValid: false,
      message: 'Column index ' + columnIndex + ' is out of range. Maximum is ' + (maxColumns - 1) + '.'
    };
  }
  
  return {
    isValid: true,
    message: 'Column index is valid.'
  };
}

/**
 * Gets column letter from index (A, B, C, etc.)
 * @param {number} columnIndex - 0-based column index
 * @return {string} Column letter
 */
function getColumnLetter(columnIndex) {
  var letter = '';
  while (columnIndex >= 0) {
    letter = String.fromCharCode(65 + (columnIndex % 26)) + letter;
    columnIndex = Math.floor(columnIndex / 26) - 1;
  }
  return letter;
}

/**
 * Gets column index from letter (A=0, B=1, C=2, etc.)
 * @param {string} columnLetter - Column letter
 * @return {number} 0-based column index
 */
function getColumnIndex(columnLetter) {
  var index = 0;
  for (var i = 0; i < columnLetter.length; i++) {
    index = index * 26 + (columnLetter.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Formats a number with commas for display
 * @param {number} num - Number to format
 * @return {string} Formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Estimates processing time based on data size
 * @param {number} rows - Number of rows
 * @param {number} columns - Number of columns
 * @return {string} Estimated time description
 */
function estimateProcessingTime(rows, columns) {
  var totalCells = rows * columns;
  
  if (totalCells < 1000) {
    return 'Less than 1 second';
  } else if (totalCells < 10000) {
    return '1-3 seconds';
  } else if (totalCells < 100000) {
    return '3-10 seconds';
  } else {
    return 'More than 10 seconds';
  }
}

/**
 * Checks if the current user has edit permissions
 * @return {boolean} True if user can edit
 */
function canUserEdit() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var protection = spreadsheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    return protection.length === 0 || protection.some(function(p) {
      return p.canEdit();
    });
  } catch (error) {
    return false;
  }
}

/**
 * Creates a backup of the current sheet
 * @return {Object} Backup information
 */
function createSheetBackup() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = spreadsheet.getActiveSheet();
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
    var backupName = activeSheet.getName() + '_backup_' + timestamp;
    
    var backup = activeSheet.copyTo(spreadsheet);
    backup.setName(backupName);
    
    return {
      success: true,
      backupName: backupName,
      message: 'Backup created: ' + backupName
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create backup: ' + error.toString()
    };
  }
}

/**
 * Logs operation for debugging
 * @param {string} operation - Operation name
 * @param {Object} details - Operation details
 */
function logOperation(operation, details) {
  try {
    console.log('Sheet Shaper Operation: ' + operation);
    console.log('Details: ' + JSON.stringify(details));
  } catch (error) {
    // Silently fail if logging is not available
  }
}

/**
 * Gets safe cell value (handles null/undefined)
 * @param {*} cell - Cell value
 * @return {string} Safe string representation
 */
function getSafeCellValue(cell) {
  if (cell === null || cell === undefined) {
    return '';
  }
  return cell.toString();
}

/**
 * Checks if a row is completely empty
 * @param {Array} row - Row data
 * @return {boolean} True if row is empty
 */
function isRowEmpty(row) {
  return !row.some(function(cell) {
    return cell !== null && cell !== undefined && cell.toString().trim() !== '';
  });
}

/**
 * Checks if a column is completely empty
 * @param {Array} data - 2D array of sheet data
 * @param {number} columnIndex - Column index to check
 * @return {boolean} True if column is empty
 */
function isColumnEmpty(data, columnIndex) {
  return !data.some(function(row) {
    var cell = row[columnIndex];
    return cell !== null && cell !== undefined && cell.toString().trim() !== '';
  });
}

/**
 * Sanitizes user input for safe processing
 * @param {string} input - User input
 * @return {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input.replace(/[<>\"'&]/g, '');
}

/**
 * Gets the data type of a cell value
 * @param {*} value - Cell value
 * @return {string} Data type
 */
function getCellDataType(value) {
  if (value === null || value === undefined || value === '') {
    return 'empty';
  }
  
  if (typeof value === 'number') {
    return 'number';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  if (value instanceof Date) {
    return 'date';
  }
  
  if (typeof value === 'string') {
    // Check if it's a number string
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      return 'number_string';
    }
    
    // Check if it's a date string
    var dateTest = new Date(value);
    if (!isNaN(dateTest.getTime())) {
      return 'date_string';
    }
    
    return 'text';
  }
  
  return 'unknown';
}


/**
 * ErrorHandling.gs - Comprehensive error handling and logging
 * Part of Sheet Shaper Google Sheets Add-on
 */

/**
 * Global error handler for all Sheet Shaper operations
 * @param {Error} error - The error object
 * @param {string} operation - Name of the operation that failed
 * @param {Object} context - Additional context information
 */
function handleError(error, operation, context) {
  var errorInfo = {
    operation: operation,
    message: error.toString(),
    stack: error.stack || 'No stack trace available',
    timestamp: new Date().toISOString(),
    context: context || {}
  };
  
  // Log the error
  logError(errorInfo);
  
  // Show user-friendly error message
  var userMessage = getUserFriendlyErrorMessage(error, operation);
  showErrorMessage(userMessage);
  
  // Return error info for further processing if needed
  return errorInfo;
}

/**
 * Logs error information for debugging
 * @param {Object} errorInfo - Error information object
 */
function logError(errorInfo) {
  try {
    console.error('Sheet Shaper Error:', JSON.stringify(errorInfo, null, 2));
    
    // Optionally store errors in a sheet for debugging (commented out by default)
    // storeErrorInSheet(errorInfo);
    
  } catch (loggingError) {
    // If logging fails, fail silently to avoid infinite error loops
    console.error('Failed to log error:', loggingError.toString());
  }
}

/**
 * Converts technical errors into user-friendly messages
 * @param {Error} error - The error object
 * @param {string} operation - Name of the operation that failed
 * @return {string} User-friendly error message
 */
function getUserFriendlyErrorMessage(error, operation) {
  var message = error.toString().toLowerCase();
  
  // Permission errors
  if (message.includes('permission') || message.includes('access')) {
    return 'Permission Error: You don\'t have permission to modify this spreadsheet. Please check your access rights.';
  }
  
  // Network/timeout errors
  if (message.includes('timeout') || message.includes('network')) {
    return 'Network Error: The operation timed out. Please try again or work with smaller datasets.';
  }
  
  // Memory/size errors
  if (message.includes('memory') || message.includes('limit') || message.includes('too large')) {
    return 'Data Size Error: The dataset is too large to process. Try working with smaller ranges or fewer columns.';
  }
  
  // Invalid data errors
  if (message.includes('invalid') || message.includes('malformed')) {
    return 'Data Error: The data contains invalid values. Please check your data format and try again.';
  }
  
  // Range errors
  if (message.includes('range') || message.includes('index')) {
    return 'Range Error: The selected range is invalid. Please check your column/row selection.';
  }
  
  // Quota errors
  if (message.includes('quota') || message.includes('rate')) {
    return 'Quota Error: You\'ve exceeded the usage limits. Please wait a moment and try again.';
  }
  
  // Generic error with operation context
  return 'Error in ' + operation + ': ' + error.toString() + '\n\nIf this problem persists, please try working with smaller datasets or contact support.';
}

/**
 * Validates operation prerequisites
 * @param {string} operation - Name of the operation
 * @param {Object} params - Operation parameters
 * @return {Object} Validation result
 */
function validateOperation(operation, params) {
  try {
    // Check if user has edit permissions
    if (!canUserEdit()) {
      return {
        isValid: false,
        message: 'You don\'t have permission to edit this spreadsheet.'
      };
    }
    
    // Validate sheet data
    var sheetValidation = validateSheetData();
    if (!sheetValidation.isValid) {
      return sheetValidation;
    }
    
    // Operation-specific validations
    switch (operation) {
      case 'splitText':
        return validateSplitTextParams(params);
      case 'changeCase':
        return validateChangeCaseParams(params);
      case 'batchOperations':
        return validateBatchParams(params);
      case 'columnOperations':
        return validateColumnParams(params);
      default:
        return { isValid: true, message: 'Validation passed' };
    }
    
  } catch (error) {
    return {
      isValid: false,
      message: 'Validation error: ' + error.toString()
    };
  }
}

/**
 * Validates split text operation parameters
 * @param {Object} params - Split text parameters
 * @return {Object} Validation result
 */
function validateSplitTextParams(params) {
  if (!params.delimiter || params.delimiter.length === 0) {
    return {
      isValid: false,
      message: 'Delimiter cannot be empty.'
    };
  }
  
  if (params.delimiter.length > 10) {
    return {
      isValid: false,
      message: 'Delimiter is too long. Please use a shorter delimiter.'
    };
  }
  
  if (params.columnIndex < 0) {
    return {
      isValid: false,
      message: 'Invalid column index.'
    };
  }
  
  return { isValid: true, message: 'Split text parameters are valid' };
}

/**
 * Validates change case operation parameters
 * @param {Object} params - Change case parameters
 * @return {Object} Validation result
 */
function validateChangeCaseParams(params) {
  var validCaseTypes = ['upper', 'lower', 'title', 'sentence'];
  
  if (!params.caseType || validCaseTypes.indexOf(params.caseType) === -1) {
    return {
      isValid: false,
      message: 'Invalid case type. Must be one of: ' + validCaseTypes.join(', ')
    };
  }
  
  return { isValid: true, message: 'Change case parameters are valid' };
}

/**
 * Validates batch operation parameters
 * @param {Object} params - Batch operation parameters
 * @return {Object} Validation result
 */
function validateBatchParams(params) {
  if (!params.operations || !Array.isArray(params.operations) || params.operations.length === 0) {
    return {
      isValid: false,
      message: 'No operations specified for batch processing.'
    };
  }
  
  if (params.operations.length > 10) {
    return {
      isValid: false,
      message: 'Too many operations in batch. Maximum is 10.'
    };
  }
  
  return { isValid: true, message: 'Batch parameters are valid' };
}

/**
 * Validates column operation parameters
 * @param {Object} params - Column operation parameters
 * @return {Object} Validation result
 */
function validateColumnParams(params) {
  if (!params.columnIndices || !Array.isArray(params.columnIndices) || params.columnIndices.length === 0) {
    return {
      isValid: false,
      message: 'No columns specified for operation.'
    };
  }
  
  var sheetInfo = getSheetInfo();
  var invalidColumns = params.columnIndices.filter(function(index) {
    return index < 0 || index >= sheetInfo.columnCount;
  });
  
  if (invalidColumns.length > 0) {
    return {
      isValid: false,
      message: 'Invalid column indices: ' + invalidColumns.join(', ')
    };
  }
  
  return { isValid: true, message: 'Column parameters are valid' };
}

/**
 * Wraps function execution with error handling
 * @param {Function} func - Function to execute
 * @param {string} operationName - Name of the operation
 * @param {Object} context - Additional context
 * @return {*} Function result or null if error occurred
 */
function executeWithErrorHandling(func, operationName, context) {
  try {
    return func();
  } catch (error) {
    handleError(error, operationName, context);
    return null;
  }
}

/**
 * Checks if the current environment supports all required features
 * @return {Object} Compatibility check result
 */
function checkCompatibility() {
  var issues = [];
  
  try {
    // Check if SpreadsheetApp is available
    if (typeof SpreadsheetApp === 'undefined') {
      issues.push('SpreadsheetApp service not available');
    }
    
    // Check if HtmlService is available
    if (typeof HtmlService === 'undefined') {
      issues.push('HtmlService not available - UI components will not work');
    }
    
    // Check if Utilities service is available
    if (typeof Utilities === 'undefined') {
      issues.push('Utilities service not available');
    }
    
    // Check if we can access the active spreadsheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      issues.push('Cannot access active spreadsheet');
    }
    
    // Check if we can access the active sheet
    var sheet = SpreadsheetApp.getActiveSheet();
    if (!sheet) {
      issues.push('Cannot access active sheet');
    }
    
  } catch (error) {
    issues.push('Error during compatibility check: ' + error.toString());
  }
  
  return {
    isCompatible: issues.length === 0,
    issues: issues
  };
}

/**
 * Performs a health check of the add-on
 * @return {Object} Health check result
 */
function performHealthCheck() {
  var results = {
    timestamp: new Date().toISOString(),
    compatibility: checkCompatibility(),
    permissions: canUserEdit(),
    sheetData: validateSheetData(),
    version: '1.0.0'
  };
  
  results.overall = results.compatibility.isCompatible && 
                   results.permissions && 
                   results.sheetData.isValid;
  
  return results;
}

/**
 * Stores error information in a dedicated error log sheet (optional)
 * @param {Object} errorInfo - Error information to store
 */
function storeErrorInSheet(errorInfo) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var errorSheetName = 'Sheet_Shaper_Error_Log';
    var errorSheet;
    
    // Get or create error log sheet
    try {
      errorSheet = spreadsheet.getSheetByName(errorSheetName);
    } catch (e) {
      errorSheet = spreadsheet.insertSheet(errorSheetName);
      // Add headers
      errorSheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'Operation', 'Error Message', 'Stack Trace', 'Context']
      ]);
    }
    
    // Add error entry
    var lastRow = errorSheet.getLastRow();
    errorSheet.getRange(lastRow + 1, 1, 1, 5).setValues([
      [
        errorInfo.timestamp,
        errorInfo.operation,
        errorInfo.message,
        errorInfo.stack,
        JSON.stringify(errorInfo.context)
      ]
    ]);
    
    // Keep only last 100 error entries
    if (lastRow > 100) {
      errorSheet.deleteRows(2, lastRow - 100);
    }
    
  } catch (error) {
    // If we can't store the error, just log it to console
    console.error('Failed to store error in sheet:', error.toString());
  }
}


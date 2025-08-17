/**
 * Menu.gs - Menu creation and UI management functions
 * Part of Sheet Shaper Google Sheets Add-on
 */

/**
 * Shows the help dialog with information about the add-on
 */
function showHelpDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Help')
    .setWidth(500)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Sheet Shaper Help');
}

/**
 * Shows the advanced options dialog
 */
function showAdvancedOptionsDialog() {
  var html = HtmlService.createHtmlOutputFromFile('AdvancedOptions')
    .setWidth(600)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Advanced Options');
}

/**
 * Shows the split text dialog
 */
function showSplitTextDialog() {
  var html = HtmlService.createHtmlOutputFromFile('SplitText')
    .setWidth(500)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Split Text');
}

/**
 * Shows the column selection sidebar
 */
function showColumnSelectionSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('ColumnSelection')
    .setTitle('Column Selection')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Gets information about the current sheet for UI components
 * @return {Object} Sheet information including headers and data preview
 */
function getSheetInfo() {
  var sheet = getActiveSheet();
  var data = getSheetData(sheet);
  
  if (data.length === 0) {
    return {
      sheetName: sheet.getName(),
      headers: [],
      rowCount: 0,
      columnCount: 0,
      hasData: false
    };
  }
  
  var headers = data[0] || [];
  
  return {
    sheetName: sheet.getName(),
    headers: headers,
    rowCount: data.length,
    columnCount: headers.length,
    hasData: true,
    dataPreview: data.slice(0, 5) // First 5 rows for preview
  };
}

/**
 * Gets a list of all sheets in the current spreadsheet
 * @return {Array} Array of sheet names
 */
function getAllSheetNames() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  
  return sheets.map(function(sheet) {
    return {
      name: sheet.getName(),
      index: sheet.getIndex()
    };
  });
}

/**
 * Validates if the current sheet has data
 * @return {Object} Validation result with status and message
 */
function validateSheetData() {
  var sheet = getActiveSheet();
  var data = getSheetData(sheet);
  
  if (data.length === 0) {
    return {
      isValid: false,
      message: 'The current sheet appears to be empty. Please add some data before using Sheet Shaper tools.'
    };
  }
  
  if (data.length === 1) {
    return {
      isValid: false,
      message: 'The sheet only contains headers. Please add data rows to perform transformations.'
    };
  }
  
  return {
    isValid: true,
    message: 'Sheet data is valid for processing.',
    rowCount: data.length,
    columnCount: data[0].length
  };
}


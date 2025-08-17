/**
 * Sheet Shaper - Google Sheets Add-on
 * Main code file with core functionality
 */

/**
 * Runs when the add-on is installed or when the spreadsheet is opened
 * Creates the custom menu in the Google Sheets UI
 */
function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  
  // Create the main Sheet Shaper menu
  var menu = ui.createMenu('Sheet Shaper')
    .addItem('Smart Trim', 'smartTrimActiveSheet')
    .addItem('Remove Duplicates', 'removeDuplicateRowsActiveSheet')
    .addSeparator()
    .addSubMenu(ui.createMenu('Change Case')
      .addItem('UPPERCASE', 'changeToUpperCase')
      .addItem('lowercase', 'changeToLowerCase')
      .addItem('Title Case', 'changeToTitleCase')
      .addItem('Sentence case', 'changeToSentenceCase'))
    .addSeparator()
    .addItem('Split Text...', 'showSplitTextDialog')
    .addItem('Remove Empty Rows', 'removeEmptyRows')
    .addItem('Remove Empty Columns', 'removeEmptyColumns')
    .addSeparator()
    .addItem('Advanced Options...', 'showAdvancedOptionsDialog')
    .addItem('Help', 'showHelpDialog');
  
  menu.addToUi();
}

/**
 * Runs when the add-on is installed
 * Sets up initial permissions and configuration
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Gets the currently active sheet
 * @return {Sheet} The active sheet
 */
function getActiveSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

/**
 * Gets all data from the active sheet
 * @return {Array} 2D array of sheet data
 */
function getSheetData(sheet) {
  if (!sheet) {
    sheet = getActiveSheet();
  }
  
  var range = sheet.getDataRange();
  if (range.getNumRows() === 0 || range.getNumColumns() === 0) {
    return [];
  }
  
  return range.getValues();
}

/**
 * Writes data back to the sheet
 * @param {Array} data - 2D array of data to write
 * @param {Sheet} sheet - Target sheet (optional, defaults to active sheet)
 */
function writeSheetData(data, sheet) {
  if (!sheet) {
    sheet = getActiveSheet();
  }
  
  if (data.length === 0) {
    SpreadsheetApp.getUi().alert('No data to write.');
    return;
  }
  
  // Clear existing content
  sheet.clear();
  
  // Write new data
  var range = sheet.getRange(1, 1, data.length, data[0].length);
  range.setValues(data);
}

/**
 * Shows a success message to the user
 * @param {string} message - Message to display
 */
function showSuccessMessage(message) {
  SpreadsheetApp.getUi().alert('Success', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Shows an error message to the user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  SpreadsheetApp.getUi().alert('Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} title - Title of the toast (optional)
 */
function showToast(message, title) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title || 'Sheet Shaper', 3);
}


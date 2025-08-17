/**
 * FormattingManager.gs - Comprehensive formatting and styling features
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Applies a predefined theme to the current sheet
 * @param {string} themeName - Name of the theme to apply
 */
function applyTheme(themeName) {
  try {
    var sheet = getActiveSheet();
    var theme = getTheme(themeName);
    
    if (!theme) {
      throw new Error('Theme "' + themeName + '" not found.');
    }
    
    // Apply theme settings (this is a simplified example)
    var dataRange = sheet.getDataRange();
    
    // Apply header style
    if (theme.headerStyle) {
      var headerRange = sheet.getRange(1, 1, 1, dataRange.getNumColumns());
      applyFormatting(headerRange.getA1Notation(), theme.headerStyle);
    }
    
    // Apply data style
    if (theme.dataStyle) {
      var bodyRange = sheet.getRange(2, 1, dataRange.getNumRows() - 1, dataRange.getNumColumns());
      applyFormatting(bodyRange.getA1Notation(), theme.dataStyle);
    }
    
    // Apply alternating row colors
    if (theme.alternatingRowColors && theme.alternatingRowColors.length === 2) {
      applyAlternatingRowColors(dataRange.getA1Notation(), theme.alternatingRowColors[0], theme.alternatingRowColors[1]);
    }
    
    showToast('Theme "' + themeName + '" applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'applyTheme', { themeName: themeName });
    return false;
  }
}

/**
 * Gets a predefined theme configuration
 * @param {string} themeName - Name of the theme
 * @return {Object} Theme configuration object
 */
function getTheme(themeName) {
  var themes = {
    'professional_blue': {
      headerStyle: { backgroundColor: '#4a86e8', fontColor: '#ffffff', fontWeight: 'bold', horizontalAlignment: 'center' },
      dataStyle: { backgroundColor: '#ffffff', fontColor: '#000000' },
      alternatingRowColors: ['#ffffff', '#cfe2f3']
    },
    'modern_gray': {
      headerStyle: { backgroundColor: '#666666', fontColor: '#ffffff', fontWeight: 'bold' },
      dataStyle: { backgroundColor: '#f3f3f3', fontColor: '#333333' },
      alternatingRowColors: ['#f3f3f3', '#e6e6e6']
    },
    'vibrant_green': {
      headerStyle: { backgroundColor: '#6aa84f', fontColor: '#ffffff', fontWeight: 'bold' },
      dataStyle: { backgroundColor: '#ffffff', fontColor: '#000000' },
      alternatingRowColors: ['#ffffff', '#d9ead3']
    }
  };
  
  return themes[themeName];
}

/**
 * Applies alternating row colors to a range
 * @param {string} range - A1 notation of the range
 * @param {string} color1 - First alternating color
 * @param {string} color2 - Second alternating color
 */
function applyAlternatingRowColors(range, color1, color2) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    
    var banding = targetRange.getBandings();
    if (banding && banding.length > 0) {
      banding[0].remove(); // Remove existing banding
    }
    
    targetRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
      .setFirstRowColor(color1)
      .setSecondRowColor(color2);
      
    showToast('Alternating row colors applied', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'applyAlternatingRowColors', { range: range, color1: color1, color2: color2 });
    return false;
  }
}

/**
 * Clears all formatting from a range
 * @param {string} range - A1 notation of the range
 */
function clearFormatting(range) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    targetRange.clearFormat();
    showToast('Formatting cleared successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'clearFormatting', { range: range });
    return false;
  }
}

/**
 * Copies formatting from one range to another
 * @param {string} sourceRange - A1 notation of the source range
 * @param {string} destinationRange - A1 notation of the destination range
 */
function copyFormatting(sourceRange, destinationRange) {
  try {
    var sheet = getActiveSheet();
    var source = sheet.getRange(sourceRange);
    var destination = sheet.getRange(destinationRange);
    
    source.copyTo(destination, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    showToast('Formatting copied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'copyFormatting', { sourceRange: sourceRange, destinationRange: destinationRange });
    return false;
  }
}

/**
 * Merges cells in a specified range
 * @param {string} range - A1 notation of the range to merge
 */
function mergeCells(range) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    targetRange.merge();
    showToast('Cells merged successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'mergeCells', { range: range });
    return false;
  }
}

/**
 * Unmerges cells in a specified range
 * @param {string} range - A1 notation of the range to unmerge
 */
function unmergeCells(range) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    targetRange.breakApart();
    showToast('Cells unmerged successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'unmergeCells', { range: range });
    return false;
  }
}

/**
 * Sets row heights for specified rows
 * @param {number} startRow - Starting row index (1-based)
 * @param {number} numRows - Number of rows to affect
 * @param {number} height - Height in pixels
 */
function setRowHeights(startRow, numRows, height) {
  try {
    var sheet = getActiveSheet();
    sheet.setRowHeights(startRow, numRows, height);
    showToast('Row heights set successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'setRowHeights', { startRow: startRow, numRows: numRows, height: height });
    return false;
  }
}

/**
 * Sets column widths for specified columns
 * @param {number} startColumn - Starting column index (1-based)
 * @param {number} numColumns - Number of columns to affect
 * @param {number} width - Width in pixels
 */
function setColumnWidths(startColumn, numColumns, width) {
  try {
    var sheet = getActiveSheet();
    sheet.setColumnWidths(startColumn, numColumns, width);
    showToast('Column widths set successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'setColumnWidths', { startColumn: startColumn, numColumns: numColumns, width: width });
    return false;
  }
}

/**
 * Auto-resizes rows to fit content
 * @param {number} startRow - Starting row index (1-based)
 * @param {number} numRows - Number of rows to affect
 */
function autoResizeRows(startRow, numRows) {
  try {
    var sheet = getActiveSheet();
    sheet.autoResizeRows(startRow, numRows);
    showToast('Rows auto-resized successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'autoResizeRows', { startRow: startRow, numRows: numRows });
    return false;
  }
}

/**
 * Auto-resizes columns to fit content
 * @param {number} startColumn - Starting column index (1-based)
 * @param {number} numColumns - Number of columns to affect
 */
function autoResizeColumns(startColumn, numColumns) {
  try {
    var sheet = getActiveSheet();
    sheet.autoResizeColumns(startColumn, numColumns);
    showToast('Columns auto-resized successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'autoResizeColumns', { startColumn: startColumn, numColumns: numColumns });
    return false;
  }
}

/**
 * Sets text rotation for a range
 * @param {string} range - A1 notation of the range
 * @param {number} degrees - Rotation angle in degrees (-90 to 90)
 */
function setTextRotation(range, degrees) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    targetRange.setTextRotation(degrees);
    showToast('Text rotation applied successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'setTextRotation', { range: range, degrees: degrees });
    return false;
  }
}

/**
 * Sets text wrapping strategy for a range
 * @param {string} range - A1 notation of the range
 * @param {string} wrapStrategy - 'OVERFLOW', 'WRAP', or 'CLIP'
 */
function setTextWrapping(range, wrapStrategy) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    var strategyEnum;
    switch(wrapStrategy.toUpperCase()) {
      case 'OVERFLOW': strategyEnum = SpreadsheetApp.WrapStrategy.OVERFLOW; break;
      case 'WRAP': strategyEnum = SpreadsheetApp.WrapStrategy.WRAP; break;
      case 'CLIP': strategyEnum = SpreadsheetApp.WrapStrategy.CLIP; break;
      default: throw new Error('Invalid wrap strategy');
    }
    targetRange.setWrapStrategy(strategyEnum);
    showToast('Text wrapping set successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'setTextWrapping', { range: range, wrapStrategy: wrapStrategy });
    return false;
  }
}

/**
 * Gets available number formats
 * @return {Array} List of common number formats
 */
function getNumberFormats() {
  return [
    { value: '0', label: 'Number (0)', example: '1235' },
    { value: '0.00', label: 'Number (0.00)', example: '1234.57' },
    { value: '#,##0', label: 'Number (#,##0)', example: '1,235' },
    { value: '#,##0.00', label: 'Number (#,##0.00)', example: '1,234.57' },
    { value: '$#,##0.00', label: 'Currency ($#,##0.00)', example: '$1,234.57' },
    { value: '€#,##0.00', label: 'Currency (€#,##0.00)', example: '€1,234.57' },
    { value: '0%', label: 'Percent (0%)', example: '12%' },
    { value: '0.00%', label: 'Percent (0.00%)', example: '12.35%' },
    { value: '# ?/?', label: 'Fraction (# ?/?)', example: '1 1/4' },
    { value: 'm/d/yyyy', label: 'Date (m/d/yyyy)', example: '12/31/2024' },
    { value: 'd-mmm-yy', label: 'Date (d-mmm-yy)', example: '31-Dec-24' },
    { value: 'h:mm AM/PM', label: 'Time (h:mm AM/PM)', example: '3:30 PM' },
    { value: 'h:mm:ss', label: 'Time (h:mm:ss)', example: '15:30:55' },
    { value: '@', label: 'Plain text', example: 'Text' }
  ];
}

/**
 * Gets available fonts
 * @return {Array} List of common fonts
 */
function getAvailableFonts() {
  // Note: Google Apps Script doesn't provide a direct way to list all available fonts.
  // This list includes common fonts available in Google Sheets.
  return [
    'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 
    'Comic Sans MS', 'Impact', 'Lobster', 'Pacifico', 'Roboto', 'Open Sans',
    'Lato', 'Montserrat', 'Oswald', 'Raleway', 'Source Sans Pro'
  ];
}

// Ensure applyFormatting function exists (can be moved from SheetsIntegration.gs or kept there)
// If moved, update references in other files.
// For now, assume it exists in SheetsIntegration.gs or is added here.

/**
 * Applies formatting to a range (ensure this exists or is moved here)
 * @param {string} range - A1 notation of range to format
 * @param {Object} formatting - Formatting options
 */
function applyFormatting(range, formatting) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    
    if (formatting.backgroundColor) {
      targetRange.setBackground(formatting.backgroundColor);
    }
    if (formatting.fontColor) {
      targetRange.setFontColor(formatting.fontColor);
    }
    if (formatting.fontSize) {
      targetRange.setFontSize(formatting.fontSize);
    }
    if (formatting.fontWeight) {
      targetRange.setFontWeight(formatting.fontWeight);
    }
    if (formatting.fontStyle) {
      targetRange.setFontStyle(formatting.fontStyle);
    }
    if (formatting.fontFamily) {
      targetRange.setFontFamily(formatting.fontFamily);
    }
    if (formatting.horizontalAlignment) {
      targetRange.setHorizontalAlignment(formatting.horizontalAlignment);
    }
    if (formatting.verticalAlignment) {
      targetRange.setVerticalAlignment(formatting.verticalAlignment);
    }
    if (formatting.numberFormat) {
      targetRange.setNumberFormat(formatting.numberFormat);
    }
    if (formatting.borders) {
      applyBorders(targetRange, formatting.borders);
    }
    if (formatting.textRotation !== undefined) {
       targetRange.setTextRotation(formatting.textRotation);
    }
    if (formatting.wrapStrategy) {
       setTextWrapping(range, formatting.wrapStrategy); // Use the function defined above
    }

    // showToast('Formatting applied successfully', 'Success'); // Avoid duplicate toasts if called internally
    return true;
    
  } catch (error) {
    handleError(error, 'applyFormatting', { range: range, formatting: formatting });
    return false;
  }
}

/**
 * Applies borders to a range (ensure this exists or is moved here)
 * @param {Range} range - Range object to apply borders to
 * @param {Object} borderConfig - Border configuration {top, left, bottom, right, vertical, horizontal, color, style}
 */
function applyBorders(range, borderConfig) {
  var color = borderConfig.color || null;
  var style = borderConfig.style ? SpreadsheetApp.BorderStyle[borderConfig.style.toUpperCase()] : null;
  
  range.setBorder(
    borderConfig.top || null,
    borderConfig.left || null,
    borderConfig.bottom || null,
    borderConfig.right || null,
    borderConfig.vertical || null,
    borderConfig.horizontal || null,
    color,
    style
  );
}


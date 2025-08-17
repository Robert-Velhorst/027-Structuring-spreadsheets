/**
 * DataTransforms.gs - Data transformation functions
 * Part of Sheet Shaper Google Sheets Add-on
 */

/**
 * Smart Trim - Removes leading/trailing whitespace and collapses multiple spaces
 */
function smartTrimActiveSheet() {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    var processedRows = 0;
    var processedCells = 0;
    
    var newData = data.map(function(row) {
      return row.map(function(cell) {
        if (typeof cell === 'string' && cell.length > 0) {
          var trimmed = cell.trim().replace(/\s\s+/g, ' ');
          if (trimmed !== cell) {
            processedCells++;
          }
          return trimmed;
        }
        return cell;
      });
    });
    
    writeSheetData(newData, sheet);
    showToast('Smart trim completed. Processed ' + processedCells + ' cells.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error during smart trim: ' + error.toString());
  }
}

/**
 * Remove Duplicate Rows - Removes rows that are exact duplicates
 */
function removeDuplicateRowsActiveSheet() {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    var originalCount = data.length;
    
    var uniqueData = [];
    var seen = new Set();
    
    data.forEach(function(row) {
      var rowString = JSON.stringify(row);
      if (!seen.has(rowString)) {
        seen.add(rowString);
        uniqueData.push(row);
      }
    });
    
    var duplicatesRemoved = originalCount - uniqueData.length;
    
    if (duplicatesRemoved === 0) {
      showToast('No duplicate rows found.', 'Info');
      return;
    }
    
    writeSheetData(uniqueData, sheet);
    showToast('Removed ' + duplicatesRemoved + ' duplicate rows. ' + uniqueData.length + ' rows remaining.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error removing duplicates: ' + error.toString());
  }
}

/**
 * Change Case Functions
 */

function changeToUpperCase() {
  changeCaseActiveSheet('upper');
}

function changeToLowerCase() {
  changeCaseActiveSheet('lower');
}

function changeToTitleCase() {
  changeCaseActiveSheet('title');
}

function changeToSentenceCase() {
  changeCaseActiveSheet('sentence');
}

/**
 * Generic case change function
 * @param {string} caseType - Type of case change (upper, lower, title, sentence)
 */
function changeCaseActiveSheet(caseType) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    var processedCells = 0;
    
    var newData = data.map(function(row) {
      return row.map(function(cell) {
        if (typeof cell === 'string' && cell.length > 0) {
          var newValue = transformCase(cell, caseType);
          if (newValue !== cell) {
            processedCells++;
          }
          return newValue;
        }
        return cell;
      });
    });
    
    writeSheetData(newData, sheet);
    showToast('Case changed to ' + caseType + '. Processed ' + processedCells + ' cells.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error changing case: ' + error.toString());
  }
}

/**
 * Transform text case based on type
 * @param {string} text - Text to transform
 * @param {string} caseType - Type of transformation
 * @return {string} Transformed text
 */
function transformCase(text, caseType) {
  switch (caseType) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    default:
      return text;
  }
}

/**
 * Remove Empty Rows - Removes rows that are completely empty or contain only whitespace
 */
function removeEmptyRows() {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    var originalCount = data.length;
    
    var nonEmptyData = data.filter(function(row) {
      return row.some(function(cell) {
        return cell !== null && cell !== undefined && cell.toString().trim() !== '';
      });
    });
    
    var emptyRowsRemoved = originalCount - nonEmptyData.length;
    
    if (emptyRowsRemoved === 0) {
      showToast('No empty rows found.', 'Info');
      return;
    }
    
    writeSheetData(nonEmptyData, sheet);
    showToast('Removed ' + emptyRowsRemoved + ' empty rows. ' + nonEmptyData.length + ' rows remaining.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error removing empty rows: ' + error.toString());
  }
}

/**
 * Remove Empty Columns - Removes columns that are completely empty or contain only whitespace
 */
function removeEmptyColumns() {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    if (data.length === 0 || data[0].length === 0) {
      showToast('No data to process.', 'Info');
      return;
    }
    
    var originalColumnCount = data[0].length;
    var columnsToKeep = [];
    
    // Check each column for non-empty content
    for (var col = 0; col < originalColumnCount; col++) {
      var hasContent = false;
      for (var row = 0; row < data.length; row++) {
        var cell = data[row][col];
        if (cell !== null && cell !== undefined && cell.toString().trim() !== '') {
          hasContent = true;
          break;
        }
      }
      if (hasContent) {
        columnsToKeep.push(col);
      }
    }
    
    var emptyColumnsRemoved = originalColumnCount - columnsToKeep.length;
    
    if (emptyColumnsRemoved === 0) {
      showToast('No empty columns found.', 'Info');
      return;
    }
    
    // Create new data with only non-empty columns
    var newData = data.map(function(row) {
      return columnsToKeep.map(function(colIndex) {
        return row[colIndex];
      });
    });
    
    writeSheetData(newData, sheet);
    showToast('Removed ' + emptyColumnsRemoved + ' empty columns. ' + columnsToKeep.length + ' columns remaining.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error removing empty columns: ' + error.toString());
  }
}

/**
 * Split text in a column by delimiter
 * @param {number} columnIndex - Index of column to split (0-based)
 * @param {string} delimiter - Delimiter to split by
 * @param {boolean} removeOriginal - Whether to remove the original column
 */
function splitTextInColumn(columnIndex, delimiter, removeOriginal) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    if (columnIndex < 0 || columnIndex >= data[0].length) {
      showErrorMessage('Invalid column index: ' + columnIndex);
      return;
    }
    
    var maxSplits = 0;
    var splitData = [];
    
    // First pass: determine maximum number of splits
    data.forEach(function(row) {
      var cell = row[columnIndex];
      if (typeof cell === 'string') {
        var splits = cell.split(delimiter);
        maxSplits = Math.max(maxSplits, splits.length);
        splitData.push(splits);
      } else {
        splitData.push([cell]);
      }
    });
    
    // Second pass: create new data with split columns
    var newData = data.map(function(row, rowIndex) {
      var newRow = [];
      
      // Add columns before the split column
      for (var i = 0; i < columnIndex; i++) {
        newRow.push(row[i]);
      }
      
      // Add split columns
      var splits = splitData[rowIndex];
      for (var j = 0; j < maxSplits; j++) {
        newRow.push(splits[j] || '');
      }
      
      // Add original column if not removing it
      if (!removeOriginal) {
        newRow.push(row[columnIndex]);
      }
      
      // Add columns after the split column
      for (var k = columnIndex + 1; k < row.length; k++) {
        newRow.push(row[k]);
      }
      
      return newRow;
    });
    
    writeSheetData(newData, sheet);
    showToast('Text split into ' + maxSplits + ' columns using delimiter "' + delimiter + '".', 'Success');
    
  } catch (error) {
    showErrorMessage('Error splitting text: ' + error.toString());
  }
}


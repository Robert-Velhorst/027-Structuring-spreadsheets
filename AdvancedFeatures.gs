/**
 * AdvancedFeatures.gs - Advanced features and batch operations
 * Part of Sheet Shaper Google Sheets Add-on
 */

/**
 * Runs multiple operations in batch
 * @param {Array} operations - Array of operations to perform
 */
function runBatchOperations(operations) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var operationCount = 0;
    var results = [];
    
    logOperation('Batch Operations Started', { operations: operations });
    
    operations.forEach(function(operation) {
      try {
        if (operation === 'trim') {
          smartTrimActiveSheet();
          operationCount++;
          results.push('Smart Trim completed');
        } else if (operation === 'duplicates') {
          removeDuplicateRowsActiveSheet();
          operationCount++;
          results.push('Duplicates removed');
        } else if (operation === 'empty') {
          removeEmptyRows();
          removeEmptyColumns();
          operationCount++;
          results.push('Empty rows/columns removed');
        } else if (operation.type === 'case') {
          changeCaseActiveSheet(operation.caseType);
          operationCount++;
          results.push('Case changed to ' + operation.caseType);
        }
      } catch (error) {
        results.push('Error in ' + operation + ': ' + error.toString());
      }
    });
    
    showToast('Batch operations completed. ' + operationCount + ' operations performed.', 'Success');
    logOperation('Batch Operations Completed', { results: results });
    
  } catch (error) {
    showErrorMessage('Error during batch operations: ' + error.toString());
  }
}

/**
 * Changes case in specific columns
 * @param {Array} columnIndices - Array of column indices
 * @param {string} caseType - Type of case change
 */
function changeCaseInColumns(columnIndices, caseType) {
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
      return row.map(function(cell, colIndex) {
        if (columnIndices.indexOf(colIndex) !== -1 && typeof cell === 'string' && cell.length > 0) {
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
    showToast('Case changed in ' + columnIndices.length + ' columns. Processed ' + processedCells + ' cells.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error changing case in columns: ' + error.toString());
  }
}

/**
 * Splits text in multiple columns
 * @param {Array} columnIndices - Array of column indices to split
 * @param {string} delimiter - Delimiter to split by
 * @param {boolean} removeOriginal - Whether to remove original columns
 */
function splitTextInColumns(columnIndices, delimiter, removeOriginal) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    // Process each column separately to avoid index conflicts
    columnIndices.sort(function(a, b) { return b - a; }); // Process from right to left
    
    columnIndices.forEach(function(columnIndex) {
      if (columnIndex >= 0 && columnIndex < data[0].length) {
        data = splitColumnData(data, columnIndex, delimiter, removeOriginal);
      }
    });
    
    writeSheetData(data, sheet);
    showToast('Text split in ' + columnIndices.length + ' columns using delimiter "' + delimiter + '".', 'Success');
    
  } catch (error) {
    showErrorMessage('Error splitting text in columns: ' + error.toString());
  }
}

/**
 * Helper function to split data in a single column
 * @param {Array} data - 2D array of sheet data
 * @param {number} columnIndex - Column index to split
 * @param {string} delimiter - Delimiter to split by
 * @param {boolean} removeOriginal - Whether to remove original column
 * @return {Array} Modified data array
 */
function splitColumnData(data, columnIndex, delimiter, removeOriginal) {
  var maxSplits = 0;
  var splitData = [];
  
  // Determine maximum number of splits
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
  
  // Create new data with split columns
  return data.map(function(row, rowIndex) {
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
}

/**
 * Trims whitespace in specific columns
 * @param {Array} columnIndices - Array of column indices
 */
function trimColumnsWhitespace(columnIndices) {
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
      return row.map(function(cell, colIndex) {
        if (columnIndices.indexOf(colIndex) !== -1 && typeof cell === 'string' && cell.length > 0) {
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
    showToast('Whitespace trimmed in ' + columnIndices.length + ' columns. Processed ' + processedCells + ' cells.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error trimming columns: ' + error.toString());
  }
}

/**
 * Removes specified columns
 * @param {Array} columnIndices - Array of column indices to remove
 */
function removeColumns(columnIndices) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      showErrorMessage(validation.message);
      return;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    // Sort indices in descending order to avoid index shifting issues
    var sortedIndices = columnIndices.slice().sort(function(a, b) { return b - a; });
    
    var newData = data.map(function(row) {
      var newRow = row.slice();
      sortedIndices.forEach(function(index) {
        if (index >= 0 && index < newRow.length) {
          newRow.splice(index, 1);
        }
      });
      return newRow;
    });
    
    writeSheetData(newData, sheet);
    showToast('Removed ' + columnIndices.length + ' columns.', 'Success');
    
  } catch (error) {
    showErrorMessage('Error removing columns: ' + error.toString());
  }
}

/**
 * Analyzes data quality in the sheet
 * @return {Object} Analysis results
 */
function analyzeSheetData() {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      return {
        emptyCells: 0,
        duplicates: 0,
        whitespaceIssues: 0,
        mixedTypes: 0
      };
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    var emptyCells = 0;
    var whitespaceIssues = 0;
    var mixedTypes = 0;
    
    // Analyze each column for data type consistency
    var columnTypes = {};
    
    data.forEach(function(row, rowIndex) {
      row.forEach(function(cell, colIndex) {
        // Count empty cells
        if (cell === null || cell === undefined || cell === '') {
          emptyCells++;
        }
        
        // Check for whitespace issues
        if (typeof cell === 'string') {
          if (cell !== cell.trim() || /\s\s+/.test(cell)) {
            whitespaceIssues++;
          }
        }
        
        // Track data types per column
        var dataType = getCellDataType(cell);
        if (!columnTypes[colIndex]) {
          columnTypes[colIndex] = new Set();
        }
        columnTypes[colIndex].add(dataType);
      });
    });
    
    // Count columns with mixed data types
    Object.keys(columnTypes).forEach(function(colIndex) {
      if (columnTypes[colIndex].size > 2) { // Allow for empty + one other type
        mixedTypes++;
      }
    });
    
    // Count potential duplicates
    var seen = new Set();
    var duplicates = 0;
    data.forEach(function(row) {
      var rowString = JSON.stringify(row);
      if (seen.has(rowString)) {
        duplicates++;
      } else {
        seen.add(rowString);
      }
    });
    
    return {
      emptyCells: emptyCells,
      duplicates: duplicates,
      whitespaceIssues: whitespaceIssues,
      mixedTypes: mixedTypes
    };
    
  } catch (error) {
    showErrorMessage('Error analyzing data: ' + error.toString());
    return null;
  }
}

/**
 * Analyzes specific columns
 * @param {Array} columnIndices - Array of column indices to analyze
 * @return {Array} Analysis results for each column
 */
function analyzeColumns(columnIndices) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      return [];
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    return columnIndices.map(function(columnIndex) {
      var columnData = data.map(function(row) {
        return row[columnIndex];
      });
      
      var emptyCells = 0;
      var uniqueValues = new Set();
      var dataTypes = new Set();
      
      columnData.forEach(function(cell) {
        if (cell === null || cell === undefined || cell === '') {
          emptyCells++;
        } else {
          uniqueValues.add(cell);
        }
        dataTypes.add(getCellDataType(cell));
      });
      
      return {
        columnIndex: columnIndex,
        totalCells: columnData.length,
        emptyCells: emptyCells,
        uniqueValues: uniqueValues.size,
        dataType: dataTypes.size === 1 ? Array.from(dataTypes)[0] : 'mixed'
      };
    });
    
  } catch (error) {
    showErrorMessage('Error analyzing columns: ' + error.toString());
    return [];
  }
}

/**
 * Gets statistics for a specific column
 * @param {number} columnIndex - Column index to analyze
 * @return {Object} Column statistics
 */
function getColumnStatistics(columnIndex) {
  try {
    var validation = validateSheetData();
    if (!validation.isValid) {
      return null;
    }
    
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    
    var columnData = data.map(function(row) {
      return row[columnIndex];
    });
    
    var totalValues = columnData.length;
    var emptyValues = 0;
    var uniqueValues = new Set();
    var dataTypes = new Set();
    var numericValues = [];
    
    columnData.forEach(function(cell) {
      if (cell === null || cell === undefined || cell === '') {
        emptyValues++;
      } else {
        uniqueValues.add(cell);
        var dataType = getCellDataType(cell);
        dataTypes.add(dataType);
        
        if (dataType === 'number' || dataType === 'number_string') {
          numericValues.push(parseFloat(cell));
        }
      }
    });
    
    var stats = {
      totalValues: totalValues,
      emptyValues: emptyValues,
      uniqueValues: uniqueValues.size,
      dataType: dataTypes.size === 1 ? Array.from(dataTypes)[0] : 'mixed'
    };
    
    // Add numeric statistics if applicable
    if (numericValues.length > 0) {
      stats.numericCount = numericValues.length;
      stats.min = Math.min.apply(null, numericValues);
      stats.max = Math.max.apply(null, numericValues);
      stats.average = numericValues.reduce(function(a, b) { return a + b; }, 0) / numericValues.length;
    }
    
    return stats;
    
  } catch (error) {
    showErrorMessage('Error getting column statistics: ' + error.toString());
    return null;
  }
}


/**
 * FormulaAssistant.gs - Formula assistance and automation tools
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Analyzes formulas in the current sheet
 * @return {Object} Formula analysis results
 */
function analyzeFormulas() {
  try {
    var sheet = getActiveSheet();
    var data = getSheetData(sheet);
    var formulas = [];
    var formulaStats = {
      totalFormulas: 0,
      uniqueFormulas: new Set(),
      errorFormulas: 0,
      complexFormulas: 0,
      functionUsage: {}
    };
    
    data.forEach(function(row, rowIndex) {
      row.forEach(function(cell, colIndex) {
        var cellRange = sheet.getRange(rowIndex + 1, colIndex + 1);
        var formula = cellRange.getFormula();
        
        if (formula) {
          formulaStats.totalFormulas++;
          formulaStats.uniqueFormulas.add(formula);
          
          var formulaInfo = {
            cell: cellRange.getA1Notation(),
            formula: formula,
            value: cell,
            isError: isFormulaError(cell),
            complexity: getFormulaComplexity(formula),
            functions: extractFunctions(formula)
          };
          
          formulas.push(formulaInfo);
          
          if (formulaInfo.isError) {
            formulaStats.errorFormulas++;
          }
          
          if (formulaInfo.complexity > 3) {
            formulaStats.complexFormulas++;
          }
          
          // Count function usage
          formulaInfo.functions.forEach(function(func) {
            formulaStats.functionUsage[func] = (formulaStats.functionUsage[func] || 0) + 1;
          });
        }
      });
    });
    
    formulaStats.uniqueFormulas = formulaStats.uniqueFormulas.size;
    
    return {
      formulas: formulas,
      statistics: formulaStats
    };
    
  } catch (error) {
    handleError(error, 'analyzeFormulas');
    return null;
  }
}

/**
 * Suggests formula optimizations
 * @param {string} formula - Formula to optimize
 * @return {Object} Optimization suggestions
 */
function suggestFormulaOptimizations(formula) {
  var suggestions = [];
  var optimizedFormula = formula;
  
  // Check for volatile functions
  var volatileFunctions = ['NOW', 'TODAY', 'RAND', 'RANDBETWEEN', 'INDIRECT'];
  volatileFunctions.forEach(function(func) {
    if (formula.toUpperCase().includes(func)) {
      suggestions.push({
        type: 'performance',
        issue: 'Volatile function detected: ' + func,
        suggestion: 'Consider using non-volatile alternatives or caching values',
        severity: 'medium'
      });
    }
  });
  
  // Check for nested IF statements
  var ifCount = (formula.match(/IF\(/gi) || []).length;
  if (ifCount > 3) {
    suggestions.push({
      type: 'readability',
      issue: 'Multiple nested IF statements (' + ifCount + ')',
      suggestion: 'Consider using IFS, SWITCH, or lookup functions',
      severity: 'high'
    });
  }
  
  // Check for array formulas that could be optimized
  if (formula.includes('ARRAYFORMULA')) {
    suggestions.push({
      type: 'performance',
      issue: 'Array formula detected',
      suggestion: 'Ensure array formulas are necessary and optimized',
      severity: 'low'
    });
  }
  
  // Check for inefficient range references
  if (formula.includes(':') && formula.includes('1048576')) {
    suggestions.push({
      type: 'performance',
      issue: 'Full column reference detected',
      suggestion: 'Use specific ranges instead of full column references',
      severity: 'medium'
    });
  }
  
  return {
    originalFormula: formula,
    optimizedFormula: optimizedFormula,
    suggestions: suggestions
  };
}

/**
 * Creates common formulas based on data patterns
 * @param {string} range - A1 notation of data range
 * @param {string} formulaType - Type of formula to create
 * @return {string} Generated formula
 */
function generateFormula(range, formulaType) {
  try {
    var sheet = getActiveSheet();
    var dataRange = sheet.getRange(range);
    var formula = '';
    
    switch (formulaType.toUpperCase()) {
      case 'SUM':
        formula = '=SUM(' + range + ')';
        break;
      case 'AVERAGE':
        formula = '=AVERAGE(' + range + ')';
        break;
      case 'COUNT':
        formula = '=COUNT(' + range + ')';
        break;
      case 'COUNTA':
        formula = '=COUNTA(' + range + ')';
        break;
      case 'MAX':
        formula = '=MAX(' + range + ')';
        break;
      case 'MIN':
        formula = '=MIN(' + range + ')';
        break;
      case 'MEDIAN':
        formula = '=MEDIAN(' + range + ')';
        break;
      case 'STDEV':
        formula = '=STDEV(' + range + ')';
        break;
      case 'VLOOKUP':
        formula = '=VLOOKUP(lookup_value, ' + range + ', col_index_num, FALSE)';
        break;
      case 'INDEX_MATCH':
        formula = '=INDEX(' + range + ', MATCH(lookup_value, lookup_range, 0))';
        break;
      case 'CONCATENATE':
        var columns = range.split(':');
        if (columns.length === 2) {
          formula = '=CONCATENATE(' + columns[0] + ', " ", ' + columns[1] + ')';
        }
        break;
      case 'IF_CONDITION':
        formula = '=IF(' + range + ' > 0, "Positive", "Non-positive")';
        break;
      case 'COUNTIF':
        formula = '=COUNTIF(' + range + ', criteria)';
        break;
      case 'SUMIF':
        formula = '=SUMIF(' + range + ', criteria, sum_range)';
        break;
    }
    
    return formula;
    
  } catch (error) {
    handleError(error, 'generateFormula', { range: range, formulaType: formulaType });
    return '';
  }
}

/**
 * Applies a formula to a range
 * @param {string} targetRange - A1 notation of target range
 * @param {string} formula - Formula to apply
 * @param {boolean} fillDown - Whether to fill down the formula
 */
function applyFormula(targetRange, formula, fillDown) {
  try {
    var sheet = getActiveSheet();
    var range = sheet.getRange(targetRange);
    
    if (fillDown && range.getNumRows() > 1) {
      // Apply formula to first cell and fill down
      var firstCell = sheet.getRange(range.getRow(), range.getColumn());
      firstCell.setFormula(formula);
      
      if (range.getNumRows() > 1) {
        var fillRange = sheet.getRange(
          range.getRow(), 
          range.getColumn(), 
          range.getNumRows(), 
          1
        );
        firstCell.copyTo(fillRange);
      }
    } else {
      // Apply formula to entire range
      range.setFormula(formula);
    }
    
    showToast('Formula applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'applyFormula', { targetRange: targetRange, formula: formula });
    return false;
  }
}

/**
 * Creates array formulas for bulk operations
 * @param {string} range - A1 notation of data range
 * @param {string} operation - Operation to perform
 * @param {Object} options - Additional options
 */
function createArrayFormula(range, operation, options) {
  try {
    var sheet = getActiveSheet();
    var formula = '';
    
    switch (operation.toUpperCase()) {
      case 'UPPER':
        formula = '=ARRAYFORMULA(UPPER(' + range + '))';
        break;
      case 'LOWER':
        formula = '=ARRAYFORMULA(LOWER(' + range + '))';
        break;
      case 'PROPER':
        formula = '=ARRAYFORMULA(PROPER(' + range + '))';
        break;
      case 'TRIM':
        formula = '=ARRAYFORMULA(TRIM(' + range + '))';
        break;
      case 'LEN':
        formula = '=ARRAYFORMULA(LEN(' + range + '))';
        break;
      case 'MULTIPLY':
        if (options.multiplier) {
          formula = '=ARRAYFORMULA(' + range + ' * ' + options.multiplier + ')';
        }
        break;
      case 'ADD':
        if (options.addend) {
          formula = '=ARRAYFORMULA(' + range + ' + ' + options.addend + ')';
        }
        break;
      case 'CONCATENATE':
        if (options.text) {
          formula = '=ARRAYFORMULA(' + range + ' & "' + options.text + '")';
        }
        break;
      case 'IF_BLANK':
        if (options.replacement) {
          formula = '=ARRAYFORMULA(IF(' + range + '="", "' + options.replacement + '", ' + range + '))';
        }
        break;
    }
    
    if (formula && options.outputRange) {
      var outputRange = sheet.getRange(options.outputRange);
      outputRange.setFormula(formula);
      showToast('Array formula created successfully', 'Success');
      return true;
    }
    
    return formula;
    
  } catch (error) {
    handleError(error, 'createArrayFormula', { range: range, operation: operation });
    return false;
  }
}

/**
 * Validates formulas for errors
 * @param {string} range - A1 notation of range to validate
 * @return {Array} Array of formula errors
 */
function validateFormulas(range) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    var errors = [];
    
    var values = targetRange.getValues();
    var formulas = targetRange.getFormulas();
    
    for (var row = 0; row < values.length; row++) {
      for (var col = 0; col < values[row].length; col++) {
        var value = values[row][col];
        var formula = formulas[row][col];
        
        if (formula && isFormulaError(value)) {
          var cellAddress = targetRange.getCell(row + 1, col + 1).getA1Notation();
          errors.push({
            cell: cellAddress,
            formula: formula,
            error: value.toString(),
            errorType: getErrorType(value)
          });
        }
      }
    }
    
    return errors;
    
  } catch (error) {
    handleError(error, 'validateFormulas', { range: range });
    return [];
  }
}

/**
 * Creates named ranges for easier formula reference
 * @param {string} range - A1 notation of range
 * @param {string} name - Name for the range
 */
function createNamedRange(range, name) {
  try {
    var sheet = getActiveSheet();
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var targetRange = sheet.getRange(range);
    
    // Remove existing named range if it exists
    try {
      var existingRange = spreadsheet.getRangeByName(name);
      if (existingRange) {
        spreadsheet.removeNamedRange(name);
      }
    } catch (e) {
      // Named range doesn't exist, continue
    }
    
    spreadsheet.setNamedRange(name, targetRange);
    showToast('Named range "' + name + '" created successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createNamedRange', { range: range, name: name });
    return false;
  }
}

/**
 * Helper function to check if a value is a formula error
 * @param {*} value - Value to check
 * @return {boolean} True if value is an error
 */
function isFormulaError(value) {
  if (typeof value === 'string') {
    return value.startsWith('#') && (
      value.includes('#DIV/0!') ||
      value.includes('#N/A') ||
      value.includes('#NAME?') ||
      value.includes('#NULL!') ||
      value.includes('#NUM!') ||
      value.includes('#REF!') ||
      value.includes('#VALUE!')
    );
  }
  return false;
}

/**
 * Helper function to get error type
 * @param {*} value - Error value
 * @return {string} Error type
 */
function getErrorType(value) {
  if (typeof value === 'string') {
    if (value.includes('#DIV/0!')) return 'Division by zero';
    if (value.includes('#N/A')) return 'Value not available';
    if (value.includes('#NAME?')) return 'Invalid function name';
    if (value.includes('#NULL!')) return 'Null intersection';
    if (value.includes('#NUM!')) return 'Invalid number';
    if (value.includes('#REF!')) return 'Invalid reference';
    if (value.includes('#VALUE!')) return 'Wrong data type';
  }
  return 'Unknown error';
}

/**
 * Helper function to calculate formula complexity
 * @param {string} formula - Formula to analyze
 * @return {number} Complexity score
 */
function getFormulaComplexity(formula) {
  var complexity = 0;
  
  // Count nested functions
  var openParens = (formula.match(/\(/g) || []).length;
  complexity += openParens;
  
  // Count operators
  var operators = (formula.match(/[+\-*/^&<>=]/g) || []).length;
  complexity += operators * 0.5;
  
  // Count references
  var references = (formula.match(/[A-Z]+[0-9]+/g) || []).length;
  complexity += references * 0.3;
  
  // Count range references
  var ranges = (formula.match(/:/g) || []).length;
  complexity += ranges * 0.7;
  
  return Math.round(complexity);
}

/**
 * Helper function to extract function names from formula
 * @param {string} formula - Formula to analyze
 * @return {Array} Array of function names
 */
function extractFunctions(formula) {
  var functions = [];
  var functionPattern = /([A-Z][A-Z0-9_]*)\s*\(/g;
  var match;
  
  while ((match = functionPattern.exec(formula)) !== null) {
    var funcName = match[1];
    if (functions.indexOf(funcName) === -1) {
      functions.push(funcName);
    }
  }
  
  return functions;
}


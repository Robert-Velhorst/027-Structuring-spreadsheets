/**
 * DataValidationManager.gs - Comprehensive data validation, filters, and conditional formatting
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Creates advanced data validation rules with multiple criteria
 * @param {string} range - A1 notation of range to validate
 * @param {Array} validationRules - Array of validation rule objects
 */
function createAdvancedDataValidation(range, validationRules) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    
    validationRules.forEach(function(ruleConfig) {
      var rule = SpreadsheetApp.newDataValidation();
      
      // Set validation criteria based on type
      switch (ruleConfig.type) {
        case 'LIST_OF_ITEMS':
          rule.requireValueInList(ruleConfig.values, ruleConfig.showDropdown !== false);
          break;
        case 'LIST_FROM_RANGE':
          var listRange = sheet.getRange(ruleConfig.listRange);
          rule.requireValueInRange(listRange, ruleConfig.showDropdown !== false);
          break;
        case 'NUMBER_GREATER':
          rule.requireNumberGreaterThan(ruleConfig.value);
          break;
        case 'NUMBER_LESS':
          rule.requireNumberLessThan(ruleConfig.value);
          break;
        case 'NUMBER_BETWEEN':
          rule.requireNumberBetween(ruleConfig.minValue, ruleConfig.maxValue);
          break;
        case 'NUMBER_EQUAL':
          rule.requireNumberEqualTo(ruleConfig.value);
          break;
        case 'NUMBER_NOT_EQUAL':
          rule.requireNumberNotEqualTo(ruleConfig.value);
          break;
        case 'TEXT_LENGTH':
          rule.requireTextLengthLessThanOrEqualTo(ruleConfig.maxLength);
          break;
        case 'TEXT_CONTAINS':
          rule.requireTextContains(ruleConfig.text);
          break;
        case 'TEXT_DOES_NOT_CONTAIN':
          rule.requireTextDoesNotContain(ruleConfig.text);
          break;
        case 'TEXT_IS_EMAIL':
          rule.requireTextIsEmail();
          break;
        case 'TEXT_IS_URL':
          rule.requireTextIsUrl();
          break;
        case 'DATE_AFTER':
          rule.requireDateAfter(ruleConfig.date);
          break;
        case 'DATE_BEFORE':
          rule.requireDateBefore(ruleConfig.date);
          break;
        case 'DATE_BETWEEN':
          rule.requireDateBetween(ruleConfig.startDate, ruleConfig.endDate);
          break;
        case 'DATE_EQUAL':
          rule.requireDateEqualTo(ruleConfig.date);
          break;
        case 'DATE_ON_OR_AFTER':
          rule.requireDateOnOrAfter(ruleConfig.date);
          break;
        case 'DATE_ON_OR_BEFORE':
          rule.requireDateOnOrBefore(ruleConfig.date);
          break;
        case 'CUSTOM_FORMULA':
          rule.requireFormulaSatisfied(ruleConfig.formula);
          break;
        case 'CHECKBOX':
          rule.requireCheckbox();
          break;
        case 'CHECKBOX_WITH_VALUES':
          rule.requireCheckbox(ruleConfig.checkedValue, ruleConfig.uncheckedValue);
          break;
      }
      
      // Set additional properties
      if (ruleConfig.helpText) {
        rule.setHelpText(ruleConfig.helpText);
      }
      
      if (ruleConfig.allowInvalid !== undefined) {
        rule.setAllowInvalid(ruleConfig.allowInvalid);
      }
      
      // Apply the rule to the range
      targetRange.setDataValidation(rule.build());
    });
    
    showToast('Advanced data validation applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createAdvancedDataValidation', { range: range, validationRules: validationRules });
    return false;
  }
}

/**
 * Creates cascading dropdown lists
 * @param {Object} config - Cascading dropdown configuration
 */
function createCascadingDropdowns(config) {
  try {
    var sheet = getActiveSheet();
    
    // Create primary dropdown
    var primaryRange = sheet.getRange(config.primaryRange);
    var primaryRule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(sheet.getRange(config.primarySourceRange))
      .setAllowInvalid(false)
      .setHelpText(config.primaryHelpText || 'Select a value from the list')
      .build();
    
    primaryRange.setDataValidation(primaryRule);
    
    // Create secondary dropdown with formula dependency
    var secondaryRange = sheet.getRange(config.secondaryRange);
    var dependencyFormula = config.dependencyFormula || 
      '=INDIRECT("' + config.secondarySourcePrefix + '"&' + config.primaryRange + ')';
    
    var secondaryRule = SpreadsheetApp.newDataValidation()
      .requireFormulaSatisfied(dependencyFormula)
      .setAllowInvalid(false)
      .setHelpText(config.secondaryHelpText || 'Select a value based on the primary selection')
      .build();
    
    secondaryRange.setDataValidation(secondaryRule);
    
    showToast('Cascading dropdowns created successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createCascadingDropdowns', { config: config });
    return false;
  }
}

/**
 * Creates advanced filters with multiple criteria
 * @param {string} range - A1 notation of data range to filter
 * @param {Array} filterCriteria - Array of filter criteria objects
 */
function createAdvancedFilter(range, filterCriteria) {
  try {
    var sheet = getActiveSheet();
    var dataRange = sheet.getRange(range);
    
    // Remove existing filter if present
    var existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
    }
    
    // Create new filter
    var filter = dataRange.createFilter();
    
    // Apply each filter criterion
    filterCriteria.forEach(function(criterion) {
      var criteria = SpreadsheetApp.newFilterCriteria();
      
      switch (criterion.type) {
        case 'VALUES':
          criteria.setVisibleValues(criterion.values);
          break;
        case 'CONDITION_GREATER':
          criteria.whenNumberGreaterThan(criterion.value);
          break;
        case 'CONDITION_LESS':
          criteria.whenNumberLessThan(criterion.value);
          break;
        case 'CONDITION_BETWEEN':
          criteria.whenNumberBetween(criterion.minValue, criterion.maxValue);
          break;
        case 'CONDITION_EQUAL':
          criteria.whenNumberEqualTo(criterion.value);
          break;
        case 'TEXT_CONTAINS':
          criteria.whenTextContains(criterion.text);
          break;
        case 'TEXT_DOES_NOT_CONTAIN':
          criteria.whenTextDoesNotContain(criterion.text);
          break;
        case 'TEXT_EQUALS':
          criteria.whenTextEqualTo(criterion.text);
          break;
        case 'TEXT_STARTS_WITH':
          criteria.whenTextStartsWith(criterion.text);
          break;
        case 'TEXT_ENDS_WITH':
          criteria.whenTextEndsWith(criterion.text);
          break;
        case 'DATE_AFTER':
          criteria.whenDateAfter(criterion.date);
          break;
        case 'DATE_BEFORE':
          criteria.whenDateBefore(criterion.date);
          break;
        case 'DATE_EQUAL':
          criteria.whenDateEqualTo(criterion.date);
          break;
        case 'CELL_EMPTY':
          criteria.whenCellEmpty();
          break;
        case 'CELL_NOT_EMPTY':
          criteria.whenCellNotEmpty();
          break;
        case 'CUSTOM_FORMULA':
          criteria.whenFormulaSatisfied(criterion.formula);
          break;
      }
      
      // Set background color if specified
      if (criterion.backgroundColor) {
        criteria.setBackgroundColor(criterion.backgroundColor);
      }
      
      // Set foreground color if specified
      if (criterion.foregroundColor) {
        criteria.setForegroundColor(criterion.foregroundColor);
      }
      
      filter.setColumnFilterCriteria(criterion.column, criteria.build());
    });
    
    showToast('Advanced filter applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createAdvancedFilter', { range: range, filterCriteria: filterCriteria });
    return false;
  }
}

/**
 * Creates comprehensive conditional formatting rules
 * @param {string} range - A1 notation of range to apply conditional formatting
 * @param {Array} conditions - Array of condition objects
 */
function createAdvancedConditionalFormatting(range, conditions) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    var rules = sheet.getConditionalFormatRules();
    
    conditions.forEach(function(condition) {
      var rule = SpreadsheetApp.newConditionalFormatRule();
      
      // Set condition based on type
      switch (condition.type) {
        case 'CELL_EMPTY':
          rule.whenCellEmpty();
          break;
        case 'CELL_NOT_EMPTY':
          rule.whenCellNotEmpty();
          break;
        case 'NUMBER_GREATER':
          rule.whenNumberGreaterThan(condition.value);
          break;
        case 'NUMBER_GREATER_THAN_OR_EQUAL':
          rule.whenNumberGreaterThanOrEqualTo(condition.value);
          break;
        case 'NUMBER_LESS':
          rule.whenNumberLessThan(condition.value);
          break;
        case 'NUMBER_LESS_THAN_OR_EQUAL':
          rule.whenNumberLessThanOrEqualTo(condition.value);
          break;
        case 'NUMBER_EQUAL':
          rule.whenNumberEqualTo(condition.value);
          break;
        case 'NUMBER_NOT_EQUAL':
          rule.whenNumberNotEqualTo(condition.value);
          break;
        case 'NUMBER_BETWEEN':
          rule.whenNumberBetween(condition.minValue, condition.maxValue);
          break;
        case 'NUMBER_NOT_BETWEEN':
          rule.whenNumberNotBetween(condition.minValue, condition.maxValue);
          break;
        case 'TEXT_CONTAINS':
          rule.whenTextContains(condition.value);
          break;
        case 'TEXT_DOES_NOT_CONTAIN':
          rule.whenTextDoesNotContain(condition.value);
          break;
        case 'TEXT_EQUALS':
          rule.whenTextEqualTo(condition.value);
          break;
        case 'TEXT_STARTS_WITH':
          rule.whenTextStartsWith(condition.value);
          break;
        case 'TEXT_ENDS_WITH':
          rule.whenTextEndsWith(condition.value);
          break;
        case 'DATE_AFTER':
          rule.whenDateAfter(condition.date);
          break;
        case 'DATE_BEFORE':
          rule.whenDateBefore(condition.date);
          break;
        case 'DATE_EQUAL':
          rule.whenDateEqualTo(condition.date);
          break;
        case 'DATE_ON_OR_AFTER':
          rule.whenDateOnOrAfter(condition.date);
          break;
        case 'DATE_ON_OR_BEFORE':
          rule.whenDateOnOrBefore(condition.date);
          break;
        case 'CUSTOM_FORMULA':
          rule.whenFormulaSatisfied(condition.formula);
          break;
        case 'VALUE_IN_LIST':
          rule.whenValueInList(condition.values);
          break;
        case 'VALUE_IN_RANGE':
          var listRange = sheet.getRange(condition.listRange);
          rule.whenValueInRange(listRange);
          break;
      }
      
      // Set formatting
      if (condition.backgroundColor) {
        rule.setBackground(condition.backgroundColor);
      }
      
      if (condition.fontColor) {
        rule.setFontColor(condition.fontColor);
      }
      
      if (condition.bold) {
        rule.setBold(condition.bold);
      }
      
      if (condition.italic) {
        rule.setItalic(condition.italic);
      }
      
      if (condition.strikethrough) {
        rule.setStrikethrough(condition.strikethrough);
      }
      
      if (condition.underline) {
        rule.setUnderline(condition.underline);
      }
      
      // Set gradient colors if specified
      if (condition.gradientMinpoint && condition.gradientMaxpoint) {
        rule.setGradientMinpoint(condition.gradientMinpoint);
        rule.setGradientMaxpoint(condition.gradientMaxpoint);
        
        if (condition.gradientMidpoint) {
          rule.setGradientMidpoint(condition.gradientMidpoint);
        }
      }
      
      rule.setRanges([targetRange]);
      rules.push(rule.build());
    });
    
    sheet.setConditionalFormatRules(rules);
    
    showToast('Advanced conditional formatting applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createAdvancedConditionalFormatting', { range: range, conditions: conditions });
    return false;
  }
}

/**
 * Creates data validation templates for common scenarios
 * @param {string} templateType - Type of validation template
 * @param {string} range - A1 notation of range to apply validation
 * @param {Object} options - Template-specific options
 */
function applyValidationTemplate(templateType, range, options) {
  try {
    var templates = {
      'email_validation': {
        type: 'TEXT_IS_EMAIL',
        helpText: 'Please enter a valid email address',
        allowInvalid: false
      },
      
      'url_validation': {
        type: 'TEXT_IS_URL',
        helpText: 'Please enter a valid URL',
        allowInvalid: false
      },
      
      'phone_validation': {
        type: 'CUSTOM_FORMULA',
        formula: '=AND(LEN(A1)>=10, LEN(A1)<=15, ISNUMBER(VALUE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(A1,"-",""),"(",""),")",""))), A1<>"")',
        helpText: 'Please enter a valid phone number',
        allowInvalid: false
      },
      
      'percentage_validation': {
        type: 'NUMBER_BETWEEN',
        minValue: 0,
        maxValue: 100,
        helpText: 'Please enter a percentage between 0 and 100',
        allowInvalid: false
      },
      
      'positive_number': {
        type: 'NUMBER_GREATER',
        value: 0,
        helpText: 'Please enter a positive number',
        allowInvalid: false
      },
      
      'date_future': {
        type: 'DATE_AFTER',
        date: new Date(),
        helpText: 'Please enter a future date',
        allowInvalid: false
      },
      
      'yes_no_dropdown': {
        type: 'LIST_OF_ITEMS',
        values: ['Yes', 'No'],
        showDropdown: true,
        helpText: 'Please select Yes or No',
        allowInvalid: false
      },
      
      'priority_dropdown': {
        type: 'LIST_OF_ITEMS',
        values: ['High', 'Medium', 'Low'],
        showDropdown: true,
        helpText: 'Please select a priority level',
        allowInvalid: false
      },
      
      'status_dropdown': {
        type: 'LIST_OF_ITEMS',
        values: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
        showDropdown: true,
        helpText: 'Please select a status',
        allowInvalid: false
      }
    };
    
    var template = templates[templateType];
    if (!template) {
      throw new Error('Validation template "' + templateType + '" not found');
    }
    
    // Merge template with options
    var validationConfig = Object.assign({}, template, options);
    
    return createAdvancedDataValidation(range, [validationConfig]);
    
  } catch (error) {
    handleError(error, 'applyValidationTemplate', { templateType: templateType, range: range });
    return false;
  }
}

/**
 * Creates conditional formatting templates for common scenarios
 * @param {string} templateType - Type of formatting template
 * @param {string} range - A1 notation of range to apply formatting
 * @param {Object} options - Template-specific options
 */
function applyConditionalFormattingTemplate(templateType, range, options) {
  try {
    var templates = {
      'traffic_light': [
        { type: 'NUMBER_GREATER', value: options.highThreshold || 80, backgroundColor: '#00ff00', fontColor: '#000000' },
        { type: 'NUMBER_BETWEEN', minValue: options.mediumThreshold || 50, maxValue: options.highThreshold || 80, backgroundColor: '#ffff00', fontColor: '#000000' },
        { type: 'NUMBER_LESS', value: options.mediumThreshold || 50, backgroundColor: '#ff0000', fontColor: '#ffffff' }
      ],
      
      'heat_map': [
        { type: 'CUSTOM_FORMULA', formula: '=A1>=PERCENTILE($A$1:$Z$1000,0.8)', backgroundColor: '#ff0000', fontColor: '#ffffff' },
        { type: 'CUSTOM_FORMULA', formula: '=A1>=PERCENTILE($A$1:$Z$1000,0.6)', backgroundColor: '#ff8000', fontColor: '#000000' },
        { type: 'CUSTOM_FORMULA', formula: '=A1>=PERCENTILE($A$1:$Z$1000,0.4)', backgroundColor: '#ffff00', fontColor: '#000000' },
        { type: 'CUSTOM_FORMULA', formula: '=A1>=PERCENTILE($A$1:$Z$1000,0.2)', backgroundColor: '#80ff00', fontColor: '#000000' },
        { type: 'CUSTOM_FORMULA', formula: '=A1<PERCENTILE($A$1:$Z$1000,0.2)', backgroundColor: '#00ff00', fontColor: '#000000' }
      ],
      
      'due_dates': [
        { type: 'DATE_BEFORE', date: new Date(), backgroundColor: '#ff0000', fontColor: '#ffffff' }, // Overdue
        { type: 'DATE_BETWEEN', startDate: new Date(), endDate: new Date(Date.now() + 7*24*60*60*1000), backgroundColor: '#ffff00', fontColor: '#000000' }, // Due soon
        { type: 'DATE_AFTER', date: new Date(Date.now() + 7*24*60*60*1000), backgroundColor: '#00ff00', fontColor: '#000000' } // Future
      ],
      
      'text_highlighting': [
        { type: 'TEXT_CONTAINS', value: options.highlightText || 'Important', backgroundColor: '#ffff00', fontColor: '#000000', bold: true }
      ],
      
      'alternating_rows': [
        { type: 'CUSTOM_FORMULA', formula: '=MOD(ROW(),2)=0', backgroundColor: '#f0f0f0', fontColor: '#000000' }
      ],
      
      'blank_cells': [
        { type: 'CELL_EMPTY', backgroundColor: '#ffcccc', fontColor: '#000000' }
      ],
      
      'duplicates': [
        { type: 'CUSTOM_FORMULA', formula: '=COUNTIF($A$1:$A$1000,A1)>1', backgroundColor: '#ff8080', fontColor: '#000000', bold: true }
      ]
    };
    
    var template = templates[templateType];
    if (!template) {
      throw new Error('Conditional formatting template "' + templateType + '" not found');
    }
    
    return createAdvancedConditionalFormatting(range, template);
    
  } catch (error) {
    handleError(error, 'applyConditionalFormattingTemplate', { templateType: templateType, range: range });
    return false;
  }
}

/**
 * Removes all data validation from a range
 * @param {string} range - A1 notation of range to clear validation
 */
function clearDataValidation(range) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    targetRange.clearDataValidations();
    showToast('Data validation cleared successfully', 'Success');
    return true;
  } catch (error) {
    handleError(error, 'clearDataValidation', { range: range });
    return false;
  }
}

/**
 * Removes all conditional formatting from a range
 * @param {string} range - A1 notation of range to clear formatting
 */
function clearConditionalFormatting(range) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    
    // Get all conditional format rules and filter out those that don't apply to this range
    var allRules = sheet.getConditionalFormatRules();
    var filteredRules = allRules.filter(function(rule) {
      var ruleRanges = rule.getRanges();
      return !ruleRanges.some(function(ruleRange) {
        return rangesOverlap(targetRange, ruleRange);
      });
    });
    
    sheet.setConditionalFormatRules(filteredRules);
    showToast('Conditional formatting cleared successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'clearConditionalFormatting', { range: range });
    return false;
  }
}

/**
 * Helper function to check if two ranges overlap
 * @param {Range} range1 - First range
 * @param {Range} range2 - Second range
 * @return {boolean} True if ranges overlap
 */
function rangesOverlap(range1, range2) {
  var r1 = {
    startRow: range1.getRow(),
    endRow: range1.getRow() + range1.getNumRows() - 1,
    startCol: range1.getColumn(),
    endCol: range1.getColumn() + range1.getNumColumns() - 1
  };
  
  var r2 = {
    startRow: range2.getRow(),
    endRow: range2.getRow() + range2.getNumRows() - 1,
    startCol: range2.getColumn(),
    endCol: range2.getColumn() + range2.getNumColumns() - 1
  };
  
  return !(r1.endRow < r2.startRow || r2.endRow < r1.startRow || 
           r1.endCol < r2.startCol || r2.endCol < r1.startCol);
}


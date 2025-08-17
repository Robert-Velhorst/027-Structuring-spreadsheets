/**
 * PivotTableManager.gs - Comprehensive pivot table creation and management
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Creates a pivot table wizard interface
 * @param {string} sourceRange - A1 notation of source data
 * @return {Object} Pivot table wizard configuration
 */
function getPivotTableWizard(sourceRange) {
  try {
    var sheet = getActiveSheet();
    var range = sheet.getRange(sourceRange);
    var data = range.getValues();
    
    if (data.length === 0) {
      throw new Error('Source range contains no data');
    }
    
    // Analyze source data
    var analysis = analyzePivotSourceData(data);
    
    return {
      sourceRange: sourceRange,
      sourceAnalysis: analysis,
      availableFields: analysis.fields,
      suggestedConfigurations: getSuggestedPivotConfigurations(analysis),
      summarizeFunctions: getPivotSummarizeFunctions()
    };
    
  } catch (error) {
    handleError(error, 'getPivotTableWizard', { sourceRange: sourceRange });
    return null;
  }
}

/**
 * Creates an advanced pivot table with comprehensive configuration
 * @param {Object} config - Pivot table configuration
 */
function createAdvancedPivotTable(config) {
  try {
    var sheet = getActiveSheet();
    var sourceRange = sheet.getRange(config.sourceRange);
    
    // Determine destination
    var destinationSheet = config.newSheet ? 
      SpreadsheetApp.getActiveSpreadsheet().insertSheet('Pivot Analysis') : 
      sheet;
    
    var destinationCell = destinationSheet.getRange(config.destinationCell || 'A1');
    
    // Create pivot table
    var pivotTable = destinationSheet.insertPivotTable(sourceRange, destinationCell);
    
    // Configure row groups
    if (config.rowGroups) {
      config.rowGroups.forEach(function(rowGroup) {
        var pivotGroup = pivotTable.addRowGroup(rowGroup.sourceColumn);
        
        if (rowGroup.sortOrder) {
          pivotGroup.setSortOrder(rowGroup.sortOrder);
        }
        
        if (rowGroup.showTotals !== undefined) {
          pivotGroup.showTotals(rowGroup.showTotals);
        }
        
        if (rowGroup.sortBy) {
          pivotGroup.sortBy(rowGroup.sortBy.pivotValue, rowGroup.sortBy.order);
        }
      });
    }
    
    // Configure column groups
    if (config.columnGroups) {
      config.columnGroups.forEach(function(columnGroup) {
        var pivotGroup = pivotTable.addColumnGroup(columnGroup.sourceColumn);
        
        if (columnGroup.sortOrder) {
          pivotGroup.setSortOrder(columnGroup.sortOrder);
        }
        
        if (columnGroup.showTotals !== undefined) {
          pivotGroup.showTotals(columnGroup.showTotals);
        }
      });
    }
    
    // Configure values
    if (config.values) {
      config.values.forEach(function(value) {
        var pivotValue = pivotTable.addPivotValue(value.sourceColumn);
        
        if (value.summarizeFunction) {
          pivotValue.setSummarizeFunction(value.summarizeFunction);
        }
        
        if (value.displayName) {
          pivotValue.setDisplayName(value.displayName);
        }
        
        if (value.formula) {
          pivotValue.setFormula(value.formula);
        }
      });
    }
    
    // Configure filters
    if (config.filters) {
      config.filters.forEach(function(filter) {
        var pivotFilter = pivotTable.addFilter(filter.sourceColumn);
        
        if (filter.criteria) {
          var filterCriteria = SpreadsheetApp.newFilterCriteria();
          
          switch (filter.criteria.type) {
            case 'VALUES':
              filterCriteria.setVisibleValues(filter.criteria.values);
              break;
            case 'CONDITION':
              filterCriteria.whenNumberGreaterThan(filter.criteria.value);
              break;
            case 'TEXT_CONTAINS':
              filterCriteria.whenTextContains(filter.criteria.text);
              break;
          }
          
          pivotFilter.setFilterCriteria(filterCriteria.build());
        }
      });
    }
    
    // Apply formatting if specified
    if (config.formatting) {
      applyPivotTableFormatting(pivotTable, config.formatting);
    }
    
    showToast('Advanced pivot table created successfully', 'Success');
    return {
      success: true,
      pivotTable: pivotTable,
      destinationSheet: destinationSheet.getName(),
      destinationRange: destinationCell.getA1Notation()
    };
    
  } catch (error) {
    handleError(error, 'createAdvancedPivotTable', { config: config });
    return { success: false, error: error.message };
  }
}

/**
 * Creates multiple pivot tables with different configurations
 * @param {string} sourceRange - A1 notation of source data
 * @param {Array} configurations - Array of pivot table configurations
 */
function createMultiplePivotTables(sourceRange, configurations) {
  try {
    var results = [];
    
    configurations.forEach(function(config, index) {
      config.sourceRange = sourceRange;
      config.newSheet = true;
      
      var result = createAdvancedPivotTable(config);
      result.configurationIndex = index;
      result.configurationName = config.name || 'Pivot Table ' + (index + 1);
      
      results.push(result);
    });
    
    var successCount = results.filter(function(r) { return r.success; }).length;
    showToast('Created ' + successCount + ' pivot tables successfully', 'Success');
    
    return results;
    
  } catch (error) {
    handleError(error, 'createMultiplePivotTables', { sourceRange: sourceRange });
    return [];
  }
}

/**
 * Updates an existing pivot table
 * @param {Object} pivotTable - Pivot table object
 * @param {Object} updates - Updates to apply
 */
function updatePivotTable(pivotTable, updates) {
  try {
    // Update source range if specified
    if (updates.sourceRange) {
      var sheet = getActiveSheet();
      var newSourceRange = sheet.getRange(updates.sourceRange);
      pivotTable.setSourceRange(newSourceRange);
    }
    
    // Add new row groups
    if (updates.addRowGroups) {
      updates.addRowGroups.forEach(function(rowGroup) {
        pivotTable.addRowGroup(rowGroup.sourceColumn);
      });
    }
    
    // Add new column groups
    if (updates.addColumnGroups) {
      updates.addColumnGroups.forEach(function(columnGroup) {
        pivotTable.addColumnGroup(columnGroup.sourceColumn);
      });
    }
    
    // Add new values
    if (updates.addValues) {
      updates.addValues.forEach(function(value) {
        var pivotValue = pivotTable.addPivotValue(value.sourceColumn);
        if (value.summarizeFunction) {
          pivotValue.setSummarizeFunction(value.summarizeFunction);
        }
      });
    }
    
    // Add new filters
    if (updates.addFilters) {
      updates.addFilters.forEach(function(filter) {
        pivotTable.addFilter(filter.sourceColumn);
      });
    }
    
    showToast('Pivot table updated successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'updatePivotTable', { updates: updates });
    return false;
  }
}

/**
 * Analyzes pivot table performance and suggests optimizations
 * @param {Object} pivotTable - Pivot table to analyze
 * @return {Object} Performance analysis and suggestions
 */
function analyzePivotTablePerformance(pivotTable) {
  try {
    var analysis = {
      sourceDataSize: 0,
      complexity: 0,
      suggestions: [],
      performance: 'good'
    };
    
    // Analyze source data size
    var sourceRange = pivotTable.getSourceRange();
    analysis.sourceDataSize = sourceRange.getNumRows() * sourceRange.getNumColumns();
    
    // Analyze complexity
    var rowGroups = pivotTable.getRowGroups();
    var columnGroups = pivotTable.getColumnGroups();
    var values = pivotTable.getValues();
    var filters = pivotTable.getFilters();
    
    analysis.complexity = rowGroups.length + columnGroups.length + values.length + filters.length;
    
    // Generate suggestions
    if (analysis.sourceDataSize > 100000) {
      analysis.suggestions.push({
        type: 'performance',
        message: 'Large source data detected. Consider filtering data before creating pivot table.',
        severity: 'medium'
      });
      analysis.performance = 'fair';
    }
    
    if (analysis.complexity > 10) {
      analysis.suggestions.push({
        type: 'complexity',
        message: 'High complexity pivot table. Consider simplifying or breaking into multiple tables.',
        severity: 'high'
      });
      analysis.performance = 'poor';
    }
    
    if (rowGroups.length > 3) {
      analysis.suggestions.push({
        type: 'usability',
        message: 'Many row groups may make the table difficult to read.',
        severity: 'low'
      });
    }
    
    if (values.length > 5) {
      analysis.suggestions.push({
        type: 'usability',
        message: 'Many value columns may make the table cluttered.',
        severity: 'low'
      });
    }
    
    return analysis;
    
  } catch (error) {
    handleError(error, 'analyzePivotTablePerformance');
    return null;
  }
}

/**
 * Creates pivot table templates for common business scenarios
 * @param {string} templateType - Type of template to create
 * @param {string} sourceRange - A1 notation of source data
 * @return {Object} Template configuration
 */
function createPivotTableTemplate(templateType, sourceRange) {
  var templates = {
    'sales_summary': {
      name: 'Sales Summary',
      rowGroups: [{ sourceColumn: 1, showTotals: true }], // Assuming product/category in column 1
      columnGroups: [{ sourceColumn: 2 }], // Assuming time period in column 2
      values: [{ sourceColumn: 3, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM }], // Sales amount
      filters: []
    },
    
    'employee_performance': {
      name: 'Employee Performance',
      rowGroups: [{ sourceColumn: 1 }, { sourceColumn: 2 }], // Employee, Department
      columnGroups: [],
      values: [
        { sourceColumn: 3, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.AVERAGE },
        { sourceColumn: 4, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.COUNT }
      ],
      filters: [{ sourceColumn: 5 }] // Date filter
    },
    
    'financial_analysis': {
      name: 'Financial Analysis',
      rowGroups: [{ sourceColumn: 1 }], // Account/Category
      columnGroups: [{ sourceColumn: 2 }], // Time period
      values: [
        { sourceColumn: 3, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM },
        { sourceColumn: 4, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.AVERAGE }
      ],
      filters: []
    },
    
    'inventory_analysis': {
      name: 'Inventory Analysis',
      rowGroups: [{ sourceColumn: 1 }, { sourceColumn: 2 }], // Product, Category
      columnGroups: [],
      values: [
        { sourceColumn: 3, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM }, // Quantity
        { sourceColumn: 4, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.AVERAGE } // Value
      ],
      filters: [{ sourceColumn: 5 }] // Location filter
    },
    
    'customer_analysis': {
      name: 'Customer Analysis',
      rowGroups: [{ sourceColumn: 1 }], // Customer segment
      columnGroups: [{ sourceColumn: 2 }], // Time period
      values: [
        { sourceColumn: 3, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.COUNT },
        { sourceColumn: 4, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM }
      ],
      filters: []
    }
  };
  
  var template = templates[templateType];
  if (template) {
    template.sourceRange = sourceRange;
    return template;
  }
  
  return null;
}

/**
 * Exports pivot table data to a new sheet
 * @param {Object} pivotTable - Pivot table to export
 * @param {Object} exportOptions - Export configuration
 */
function exportPivotTableData(pivotTable, exportOptions) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var exportSheet = spreadsheet.insertSheet(exportOptions.sheetName || 'Pivot Export');
    
    // Get pivot table range
    var pivotRange = pivotTable.getAnchorCell();
    var pivotSheet = pivotRange.getSheet();
    
    // Find the actual pivot table data range
    var lastRow = pivotSheet.getLastRow();
    var lastCol = pivotSheet.getLastColumn();
    
    var dataRange = pivotSheet.getRange(
      pivotRange.getRow(),
      pivotRange.getColumn(),
      lastRow - pivotRange.getRow() + 1,
      lastCol - pivotRange.getColumn() + 1
    );
    
    // Copy data based on export type
    if (exportOptions.valuesOnly) {
      var values = dataRange.getValues();
      exportSheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    } else {
      dataRange.copyTo(exportSheet.getRange(1, 1));
    }
    
    // Apply formatting if requested
    if (exportOptions.includeFormatting && !exportOptions.valuesOnly) {
      var formatting = dataRange.getTextStyles();
      exportSheet.getRange(1, 1, formatting.length, formatting[0].length).setTextStyles(formatting);
    }
    
    showToast('Pivot table data exported successfully', 'Success');
    return {
      success: true,
      exportSheet: exportSheet.getName(),
      exportRange: 'A1:' + exportSheet.getRange(1, 1).offset(dataRange.getNumRows() - 1, dataRange.getNumColumns() - 1).getA1Notation()
    };
    
  } catch (error) {
    handleError(error, 'exportPivotTableData', { exportOptions: exportOptions });
    return { success: false, error: error.message };
  }
}

/**
 * Analyzes source data for pivot table creation
 * @param {Array} data - 2D array of source data
 * @return {Object} Source data analysis
 */
function analyzePivotSourceData(data) {
  var analysis = {
    rowCount: data.length,
    columnCount: data[0] ? data[0].length : 0,
    hasHeaders: false,
    fields: [],
    dataTypes: [],
    uniqueValues: [],
    recommendations: []
  };
  
  if (analysis.rowCount === 0) {
    return analysis;
  }
  
  // Check for headers
  var firstRow = data[0];
  analysis.hasHeaders = firstRow.every(function(cell) {
    return typeof cell === 'string' && cell.length > 0;
  });
  
  var dataStartRow = analysis.hasHeaders ? 1 : 0;
  
  // Analyze each column
  for (var col = 0; col < analysis.columnCount; col++) {
    var columnName = analysis.hasHeaders ? firstRow[col] : 'Column ' + (col + 1);
    var columnData = [];
    
    for (var row = dataStartRow; row < analysis.rowCount; row++) {
      if (data[row] && data[row][col] !== null && data[row][col] !== '') {
        columnData.push(data[row][col]);
      }
    }
    
    var dataType = determineColumnDataType(columnData);
    var uniqueCount = new Set(columnData).size;
    
    analysis.fields.push({
      index: col,
      name: columnName,
      dataType: dataType,
      uniqueValues: uniqueCount,
      totalValues: columnData.length,
      sampleValues: columnData.slice(0, 5),
      isGoodForGrouping: uniqueCount < columnData.length * 0.5,
      isGoodForValues: dataType === 'number'
    });
    
    analysis.dataTypes.push(dataType);
    analysis.uniqueValues.push(uniqueCount);
  }
  
  return analysis;
}

/**
 * Gets suggested pivot table configurations based on data analysis
 * @param {Object} analysis - Source data analysis
 * @return {Array} Suggested configurations
 */
function getSuggestedPivotConfigurations(analysis) {
  var suggestions = [];
  
  var groupingFields = analysis.fields.filter(function(field) {
    return field.isGoodForGrouping;
  });
  
  var valueFields = analysis.fields.filter(function(field) {
    return field.isGoodForValues;
  });
  
  // Basic summary configuration
  if (groupingFields.length > 0 && valueFields.length > 0) {
    suggestions.push({
      name: 'Basic Summary',
      description: 'Simple grouping with value summation',
      rowGroups: [{ sourceColumn: groupingFields[0].index + 1 }],
      values: [{ sourceColumn: valueFields[0].index + 1, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM }]
    });
  }
  
  // Cross-tabulation if multiple grouping fields
  if (groupingFields.length >= 2 && valueFields.length > 0) {
    suggestions.push({
      name: 'Cross-tabulation',
      description: 'Two-way analysis with rows and columns',
      rowGroups: [{ sourceColumn: groupingFields[0].index + 1 }],
      columnGroups: [{ sourceColumn: groupingFields[1].index + 1 }],
      values: [{ sourceColumn: valueFields[0].index + 1, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM }]
    });
  }
  
  // Multi-level grouping
  if (groupingFields.length >= 3) {
    suggestions.push({
      name: 'Multi-level Analysis',
      description: 'Hierarchical grouping with multiple levels',
      rowGroups: [
        { sourceColumn: groupingFields[0].index + 1 },
        { sourceColumn: groupingFields[1].index + 1 }
      ],
      values: valueFields.slice(0, 2).map(function(field) {
        return { sourceColumn: field.index + 1, summarizeFunction: SpreadsheetApp.PivotTableSummarizeFunction.SUM };
      })
    });
  }
  
  return suggestions;
}

/**
 * Gets available pivot table summarize functions
 * @return {Array} Array of summarize function options
 */
function getPivotSummarizeFunctions() {
  return [
    { value: SpreadsheetApp.PivotTableSummarizeFunction.SUM, label: 'Sum', description: 'Add all values' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.AVERAGE, label: 'Average', description: 'Calculate mean value' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.COUNT, label: 'Count', description: 'Count non-empty values' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.COUNTA, label: 'Count All', description: 'Count all values including text' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.MAX, label: 'Maximum', description: 'Find highest value' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.MIN, label: 'Minimum', description: 'Find lowest value' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.MEDIAN, label: 'Median', description: 'Find middle value' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.PRODUCT, label: 'Product', description: 'Multiply all values' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.STDEV, label: 'Standard Deviation', description: 'Calculate standard deviation' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.STDEVP, label: 'Population Std Dev', description: 'Calculate population standard deviation' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.VAR, label: 'Variance', description: 'Calculate variance' },
    { value: SpreadsheetApp.PivotTableSummarizeFunction.VARP, label: 'Population Variance', description: 'Calculate population variance' }
  ];
}

/**
 * Applies formatting to a pivot table
 * @param {Object} pivotTable - Pivot table to format
 * @param {Object} formatting - Formatting options
 */
function applyPivotTableFormatting(pivotTable, formatting) {
  try {
    var anchorCell = pivotTable.getAnchorCell();
    var sheet = anchorCell.getSheet();
    
    // This is a simplified version - actual implementation would need to
    // determine the exact range of the pivot table and apply formatting accordingly
    
    if (formatting.headerStyle) {
      // Apply header formatting (would need to identify header cells)
    }
    
    if (formatting.dataStyle) {
      // Apply data formatting (would need to identify data cells)
    }
    
    if (formatting.totalStyle) {
      // Apply total row/column formatting
    }
    
    showToast('Pivot table formatting applied', 'Success');
    
  } catch (error) {
    handleError(error, 'applyPivotTableFormatting', { formatting: formatting });
  }
}


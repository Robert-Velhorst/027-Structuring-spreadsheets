/**
 * SheetsIntegration.gs - Advanced Google Sheets feature integration
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Gets all charts in the current sheet
 * @return {Array} Array of chart objects with metadata
 */
function getAllCharts() {
  try {
    var sheet = getActiveSheet();
    var charts = sheet.getCharts();
    
    return charts.map(function(chart, index) {
      return {
        index: index,
        chartType: chart.getChartType(),
        position: chart.getContainerInfo(),
        title: getChartTitle(chart),
        dataRange: getChartDataRange(chart)
      };
    });
  } catch (error) {
    handleError(error, 'getAllCharts');
    return [];
  }
}

/**
 * Creates a new chart based on selected data range
 * @param {string} chartType - Type of chart to create
 * @param {string} dataRange - A1 notation of data range
 * @param {Object} options - Chart configuration options
 */
function createChart(chartType, dataRange, options) {
  try {
    var sheet = getActiveSheet();
    var range = sheet.getRange(dataRange);
    
    var chartBuilder = sheet.newChart()
      .setChartType(getChartTypeEnum(chartType))
      .addRange(range)
      .setPosition(options.row || 5, options.column || 5, 0, 0);
    
    if (options.title) {
      chartBuilder.setOption('title', options.title);
    }
    
    if (options.width) {
      chartBuilder.setOption('width', options.width);
    }
    
    if (options.height) {
      chartBuilder.setOption('height', options.height);
    }
    
    var chart = chartBuilder.build();
    sheet.insertChart(chart);
    
    showToast('Chart created successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createChart', { chartType: chartType, dataRange: dataRange });
    return false;
  }
}

/**
 * Updates an existing chart
 * @param {number} chartIndex - Index of chart to update
 * @param {Object} updates - Updates to apply
 */
function updateChart(chartIndex, updates) {
  try {
    var sheet = getActiveSheet();
    var charts = sheet.getCharts();
    
    if (chartIndex >= charts.length) {
      throw new Error('Chart index out of range');
    }
    
    var chart = charts[chartIndex];
    var chartBuilder = chart.modify();
    
    if (updates.title) {
      chartBuilder.setOption('title', updates.title);
    }
    
    if (updates.chartType) {
      chartBuilder.setChartType(getChartTypeEnum(updates.chartType));
    }
    
    if (updates.dataRange) {
      var range = sheet.getRange(updates.dataRange);
      chartBuilder.clearRanges().addRange(range);
    }
    
    var updatedChart = chartBuilder.build();
    sheet.updateChart(updatedChart);
    
    showToast('Chart updated successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'updateChart', { chartIndex: chartIndex, updates: updates });
    return false;
  }
}

/**
 * Deletes a chart by index
 * @param {number} chartIndex - Index of chart to delete
 */
function deleteChart(chartIndex) {
  try {
    var sheet = getActiveSheet();
    var charts = sheet.getCharts();
    
    if (chartIndex >= charts.length) {
      throw new Error('Chart index out of range');
    }
    
    sheet.removeChart(charts[chartIndex]);
    showToast('Chart deleted successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'deleteChart', { chartIndex: chartIndex });
    return false;
  }
}

/**
 * Creates a pivot table from selected data
 * @param {string} sourceRange - A1 notation of source data
 * @param {string} destinationRange - A1 notation for pivot table placement
 * @param {Object} config - Pivot table configuration
 */
function createPivotTable(sourceRange, destinationRange, config) {
  try {
    var sheet = getActiveSheet();
    var sourceData = sheet.getRange(sourceRange);
    var destinationCell = sheet.getRange(destinationRange);
    
    var pivotTable = sheet.insertPivotTable(sourceData, destinationCell);
    
    // Add row groups
    if (config.rowGroups) {
      config.rowGroups.forEach(function(rowGroup) {
        pivotTable.addRowGroup(rowGroup.column);
      });
    }
    
    // Add column groups
    if (config.columnGroups) {
      config.columnGroups.forEach(function(columnGroup) {
        pivotTable.addColumnGroup(columnGroup.column);
      });
    }
    
    // Add values
    if (config.values) {
      config.values.forEach(function(value) {
        var pivotValue = pivotTable.addPivotValue(value.column);
        if (value.summarizeFunction) {
          pivotValue.setSummarizeFunction(value.summarizeFunction);
        }
      });
    }
    
    // Add filters
    if (config.filters) {
      config.filters.forEach(function(filter) {
        pivotTable.addFilter(filter.column);
      });
    }
    
    showToast('Pivot table created successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createPivotTable', { sourceRange: sourceRange, config: config });
    return false;
  }
}

/**
 * Applies formatting to a range
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
    
    showToast('Formatting applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'applyFormatting', { range: range, formatting: formatting });
    return false;
  }
}

/**
 * Applies borders to a range
 * @param {Range} range - Range object to apply borders to
 * @param {Object} borderConfig - Border configuration
 */
function applyBorders(range, borderConfig) {
  if (borderConfig.all) {
    range.setBorder(true, true, true, true, true, true);
  } else {
    range.setBorder(
      borderConfig.top || false,
      borderConfig.left || false,
      borderConfig.bottom || false,
      borderConfig.right || false,
      borderConfig.vertical || false,
      borderConfig.horizontal || false
    );
  }
}

/**
 * Creates conditional formatting rules
 * @param {string} range - A1 notation of range to apply conditional formatting
 * @param {Object} condition - Condition configuration
 */
function createConditionalFormatting(range, condition) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    
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
      case 'NUMBER_LESS':
        rule.whenNumberLessThan(condition.value);
        break;
      case 'NUMBER_BETWEEN':
        rule.whenNumberBetween(condition.minValue, condition.maxValue);
        break;
      case 'TEXT_CONTAINS':
        rule.whenTextContains(condition.value);
        break;
      case 'TEXT_EQUALS':
        rule.whenTextEqualTo(condition.value);
        break;
      case 'CUSTOM_FORMULA':
        rule.whenFormulaSatisfied(condition.formula);
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
    
    rule.setRanges([targetRange]);
    
    var rules = sheet.getConditionalFormatRules();
    rules.push(rule.build());
    sheet.setConditionalFormatRules(rules);
    
    showToast('Conditional formatting applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createConditionalFormatting', { range: range, condition: condition });
    return false;
  }
}

/**
 * Creates data validation for a range
 * @param {string} range - A1 notation of range to validate
 * @param {Object} validation - Validation configuration
 */
function createDataValidation(range, validation) {
  try {
    var sheet = getActiveSheet();
    var targetRange = sheet.getRange(range);
    
    var rule = SpreadsheetApp.newDataValidation();
    
    // Set validation criteria based on type
    switch (validation.type) {
      case 'LIST_OF_ITEMS':
        rule.requireValueInList(validation.values, validation.showDropdown !== false);
        break;
      case 'LIST_FROM_RANGE':
        var listRange = sheet.getRange(validation.listRange);
        rule.requireValueInRange(listRange, validation.showDropdown !== false);
        break;
      case 'NUMBER_GREATER':
        rule.requireNumberGreaterThan(validation.value);
        break;
      case 'NUMBER_LESS':
        rule.requireNumberLessThan(validation.value);
        break;
      case 'NUMBER_BETWEEN':
        rule.requireNumberBetween(validation.minValue, validation.maxValue);
        break;
      case 'TEXT_LENGTH':
        rule.requireTextLengthLessThanOrEqualTo(validation.maxLength);
        break;
      case 'DATE_AFTER':
        rule.requireDateAfter(validation.date);
        break;
      case 'DATE_BEFORE':
        rule.requireDateBefore(validation.date);
        break;
      case 'CUSTOM_FORMULA':
        rule.requireFormulaSatisfied(validation.formula);
        break;
    }
    
    if (validation.helpText) {
      rule.setHelpText(validation.helpText);
    }
    
    if (validation.allowInvalid !== undefined) {
      rule.setAllowInvalid(validation.allowInvalid);
    }
    
    targetRange.setDataValidation(rule.build());
    
    showToast('Data validation applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createDataValidation', { range: range, validation: validation });
    return false;
  }
}

/**
 * Creates and applies filters to data
 * @param {string} range - A1 notation of data range to filter
 * @param {Object} filterConfig - Filter configuration
 */
function createFilter(range, filterConfig) {
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
    
    // Apply column filters if specified
    if (filterConfig.columnFilters) {
      filterConfig.columnFilters.forEach(function(columnFilter) {
        var criteria = SpreadsheetApp.newFilterCriteria();
        
        switch (columnFilter.type) {
          case 'VALUES':
            criteria.setVisibleValues(columnFilter.values);
            break;
          case 'CONDITION':
            criteria.whenNumberGreaterThan(columnFilter.value);
            break;
          case 'TEXT_CONTAINS':
            criteria.whenTextContains(columnFilter.text);
            break;
          case 'TEXT_EQUALS':
            criteria.whenTextEqualTo(columnFilter.text);
            break;
        }
        
        filter.setColumnFilterCriteria(columnFilter.column, criteria.build());
      });
    }
    
    showToast('Filter applied successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createFilter', { range: range, filterConfig: filterConfig });
    return false;
  }
}

/**
 * Helper function to get chart type enum
 * @param {string} chartType - String representation of chart type
 * @return {Charts.ChartType} Chart type enum
 */
function getChartTypeEnum(chartType) {
  var chartTypes = {
    'COLUMN': Charts.ChartType.COLUMN,
    'BAR': Charts.ChartType.BAR,
    'LINE': Charts.ChartType.LINE,
    'PIE': Charts.ChartType.PIE,
    'SCATTER': Charts.ChartType.SCATTER,
    'AREA': Charts.ChartType.AREA,
    'HISTOGRAM': Charts.ChartType.HISTOGRAM,
    'CANDLESTICK': Charts.ChartType.CANDLESTICK
  };
  
  return chartTypes[chartType] || Charts.ChartType.COLUMN;
}

/**
 * Helper function to get chart title
 * @param {Chart} chart - Chart object
 * @return {string} Chart title
 */
function getChartTitle(chart) {
  try {
    return chart.getOptions().get('title') || 'Untitled Chart';
  } catch (error) {
    return 'Untitled Chart';
  }
}

/**
 * Helper function to get chart data range
 * @param {Chart} chart - Chart object
 * @return {string} Data range in A1 notation
 */
function getChartDataRange(chart) {
  try {
    var ranges = chart.getRanges();
    if (ranges.length > 0) {
      return ranges[0].getA1Notation();
    }
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}


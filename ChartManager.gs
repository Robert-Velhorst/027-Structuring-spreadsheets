/**
 * ChartManager.gs - Comprehensive chart and visualization management
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Creates a comprehensive chart wizard interface
 * @param {string} dataRange - A1 notation of data range
 * @return {Object} Chart creation options
 */
function getChartWizardOptions(dataRange) {
  try {
    var sheet = getActiveSheet();
    var range = sheet.getRange(dataRange);
    var data = range.getValues();
    
    // Analyze data to suggest appropriate chart types
    var analysis = analyzeDataForCharts(data);
    
    return {
      dataRange: dataRange,
      dataAnalysis: analysis,
      suggestedCharts: getSuggestedChartTypes(analysis),
      chartTypes: getAllChartTypes(),
      defaultOptions: getDefaultChartOptions()
    };
    
  } catch (error) {
    handleError(error, 'getChartWizardOptions', { dataRange: dataRange });
    return null;
  }
}

/**
 * Creates multiple chart types from the same data
 * @param {string} dataRange - A1 notation of data range
 * @param {Array} chartTypes - Array of chart types to create
 * @param {Object} options - Chart creation options
 */
function createMultipleCharts(dataRange, chartTypes, options) {
  try {
    var sheet = getActiveSheet();
    var range = sheet.getRange(dataRange);
    var createdCharts = [];
    
    chartTypes.forEach(function(chartType, index) {
      var chartOptions = Object.assign({}, options);
      
      // Position charts in a grid layout
      var row = Math.floor(index / 2) * 15 + (options.startRow || 5);
      var col = (index % 2) * 8 + (options.startCol || 5);
      
      chartOptions.row = row;
      chartOptions.column = col;
      chartOptions.title = (options.titlePrefix || 'Chart') + ' - ' + chartType;
      
      var success = createChart(chartType, dataRange, chartOptions);
      if (success) {
        createdCharts.push({
          type: chartType,
          position: { row: row, column: col },
          title: chartOptions.title
        });
      }
    });
    
    showToast('Created ' + createdCharts.length + ' charts successfully', 'Success');
    return createdCharts;
    
  } catch (error) {
    handleError(error, 'createMultipleCharts', { dataRange: dataRange, chartTypes: chartTypes });
    return [];
  }
}

/**
 * Creates a dashboard with multiple visualizations
 * @param {Object} dashboardConfig - Dashboard configuration
 */
function createDashboard(dashboardConfig) {
  try {
    var sheet = getActiveSheet();
    var dashboard = {
      title: dashboardConfig.title || 'Data Dashboard',
      charts: [],
      metrics: [],
      filters: []
    };
    
    // Create title
    if (dashboardConfig.title) {
      var titleRange = sheet.getRange(1, 1, 1, 10);
      titleRange.merge();
      titleRange.setValue(dashboardConfig.title);
      titleRange.setFontSize(18);
      titleRange.setFontWeight('bold');
      titleRange.setHorizontalAlignment('center');
    }
    
    // Create summary metrics
    if (dashboardConfig.metrics) {
      createDashboardMetrics(dashboardConfig.metrics, 3);
    }
    
    // Create charts
    if (dashboardConfig.charts) {
      dashboardConfig.charts.forEach(function(chartConfig, index) {
        var row = 8 + Math.floor(index / 2) * 15;
        var col = (index % 2) * 8 + 1;
        
        chartConfig.row = row;
        chartConfig.column = col;
        
        var success = createChart(chartConfig.type, chartConfig.dataRange, chartConfig);
        if (success) {
          dashboard.charts.push(chartConfig);
        }
      });
    }
    
    // Create filters if specified
    if (dashboardConfig.filters) {
      createDashboardFilters(dashboardConfig.filters);
    }
    
    showToast('Dashboard created successfully', 'Success');
    return dashboard;
    
  } catch (error) {
    handleError(error, 'createDashboard', { dashboardConfig: dashboardConfig });
    return null;
  }
}

/**
 * Creates dashboard metrics summary
 * @param {Array} metrics - Array of metric configurations
 * @param {number} startRow - Starting row for metrics
 */
function createDashboardMetrics(metrics, startRow) {
  var sheet = getActiveSheet();
  
  metrics.forEach(function(metric, index) {
    var col = index * 3 + 1;
    
    // Metric title
    var titleRange = sheet.getRange(startRow, col, 1, 2);
    titleRange.merge();
    titleRange.setValue(metric.title);
    titleRange.setFontWeight('bold');
    titleRange.setHorizontalAlignment('center');
    
    // Metric value
    var valueRange = sheet.getRange(startRow + 1, col, 1, 2);
    valueRange.merge();
    valueRange.setFormula(metric.formula);
    valueRange.setFontSize(16);
    valueRange.setHorizontalAlignment('center');
    
    // Apply formatting
    if (metric.numberFormat) {
      valueRange.setNumberFormat(metric.numberFormat);
    }
    
    if (metric.backgroundColor) {
      titleRange.setBackground(metric.backgroundColor);
      valueRange.setBackground(metric.backgroundColor);
    }
  });
}

/**
 * Updates all charts in the current sheet
 * @param {Object} updateOptions - Update options
 */
function updateAllCharts(updateOptions) {
  try {
    var sheet = getActiveSheet();
    var charts = sheet.getCharts();
    var updatedCount = 0;
    
    charts.forEach(function(chart, index) {
      try {
        var chartBuilder = chart.modify();
        var hasUpdates = false;
        
        if (updateOptions.title) {
          chartBuilder.setOption('title', updateOptions.title + ' ' + (index + 1));
          hasUpdates = true;
        }
        
        if (updateOptions.backgroundColor) {
          chartBuilder.setOption('backgroundColor', updateOptions.backgroundColor);
          hasUpdates = true;
        }
        
        if (updateOptions.fontSize) {
          chartBuilder.setOption('titleTextStyle.fontSize', updateOptions.fontSize);
          hasUpdates = true;
        }
        
        if (updateOptions.colors && updateOptions.colors.length > 0) {
          chartBuilder.setOption('colors', updateOptions.colors);
          hasUpdates = true;
        }
        
        if (hasUpdates) {
          var updatedChart = chartBuilder.build();
          sheet.updateChart(updatedChart);
          updatedCount++;
        }
        
      } catch (chartError) {
        console.error('Error updating chart ' + index + ':', chartError);
      }
    });
    
    showToast('Updated ' + updatedCount + ' charts successfully', 'Success');
    return updatedCount;
    
  } catch (error) {
    handleError(error, 'updateAllCharts', { updateOptions: updateOptions });
    return 0;
  }
}

/**
 * Exports charts as images (placeholder - would require additional setup)
 * @param {Array} chartIndices - Indices of charts to export
 * @return {Array} Export results
 */
function exportChartsAsImages(chartIndices) {
  try {
    var sheet = getActiveSheet();
    var charts = sheet.getCharts();
    var exportResults = [];
    
    chartIndices.forEach(function(index) {
      if (index < charts.length) {
        var chart = charts[index];
        
        // Note: Actual image export would require additional Google Apps Script capabilities
        // This is a placeholder for the export functionality
        exportResults.push({
          chartIndex: index,
          title: getChartTitle(chart),
          status: 'Export functionality requires additional setup',
          note: 'Charts can be manually copied as images from the Google Sheets interface'
        });
      }
    });
    
    return exportResults;
    
  } catch (error) {
    handleError(error, 'exportChartsAsImages', { chartIndices: chartIndices });
    return [];
  }
}

/**
 * Creates sparkline charts for quick data visualization
 * @param {string} dataRange - A1 notation of data range
 * @param {string} outputRange - A1 notation for sparkline placement
 * @param {Object} options - Sparkline options
 */
function createSparklines(dataRange, outputRange, options) {
  try {
    var sheet = getActiveSheet();
    var outputCell = sheet.getRange(outputRange);
    
    var sparklineFormula = '=SPARKLINE(' + dataRange;
    
    if (options) {
      var optionsArray = [];
      
      if (options.charttype) {
        optionsArray.push('"charttype","' + options.charttype + '"');
      }
      
      if (options.color1) {
        optionsArray.push('"color1","' + options.color1 + '"');
      }
      
      if (options.color2) {
        optionsArray.push('"color2","' + options.color2 + '"');
      }
      
      if (options.max !== undefined) {
        optionsArray.push('"max",' + options.max);
      }
      
      if (options.min !== undefined) {
        optionsArray.push('"min",' + options.min);
      }
      
      if (optionsArray.length > 0) {
        sparklineFormula += ',{' + optionsArray.join(',') + '}';
      }
    }
    
    sparklineFormula += ')';
    
    outputCell.setFormula(sparklineFormula);
    showToast('Sparkline created successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'createSparklines', { dataRange: dataRange, outputRange: outputRange });
    return false;
  }
}

/**
 * Analyzes data to determine appropriate chart types
 * @param {Array} data - 2D array of data
 * @return {Object} Data analysis results
 */
function analyzeDataForCharts(data) {
  var analysis = {
    rowCount: data.length,
    columnCount: data[0] ? data[0].length : 0,
    hasHeaders: false,
    dataTypes: [],
    numericColumns: [],
    textColumns: [],
    dateColumns: [],
    recommendations: []
  };
  
  if (analysis.rowCount === 0) {
    return analysis;
  }
  
  // Check if first row contains headers
  var firstRow = data[0];
  analysis.hasHeaders = firstRow.every(function(cell) {
    return typeof cell === 'string' && cell.length > 0;
  });
  
  // Analyze column data types
  var dataStartRow = analysis.hasHeaders ? 1 : 0;
  
  for (var col = 0; col < analysis.columnCount; col++) {
    var columnData = [];
    for (var row = dataStartRow; row < analysis.rowCount; row++) {
      if (data[row] && data[row][col] !== null && data[row][col] !== '') {
        columnData.push(data[row][col]);
      }
    }
    
    var dataType = determineColumnDataType(columnData);
    analysis.dataTypes.push(dataType);
    
    if (dataType === 'number') {
      analysis.numericColumns.push(col);
    } else if (dataType === 'text') {
      analysis.textColumns.push(col);
    } else if (dataType === 'date') {
      analysis.dateColumns.push(col);
    }
  }
  
  return analysis;
}

/**
 * Suggests appropriate chart types based on data analysis
 * @param {Object} analysis - Data analysis results
 * @return {Array} Suggested chart types
 */
function getSuggestedChartTypes(analysis) {
  var suggestions = [];
  
  if (analysis.numericColumns.length === 0) {
    return ['COLUMN']; // Default fallback
  }
  
  // Single numeric column
  if (analysis.numericColumns.length === 1) {
    if (analysis.textColumns.length > 0) {
      suggestions.push('COLUMN', 'BAR', 'PIE');
    } else {
      suggestions.push('LINE', 'AREA');
    }
  }
  
  // Multiple numeric columns
  if (analysis.numericColumns.length > 1) {
    suggestions.push('COLUMN', 'LINE', 'SCATTER');
    
    if (analysis.numericColumns.length === 2) {
      suggestions.push('SCATTER');
    }
  }
  
  // Time series data
  if (analysis.dateColumns.length > 0 && analysis.numericColumns.length > 0) {
    suggestions.push('LINE', 'AREA');
  }
  
  // Large datasets
  if (analysis.rowCount > 50) {
    suggestions.push('HISTOGRAM');
  }
  
  return suggestions.length > 0 ? suggestions : ['COLUMN'];
}

/**
 * Gets all available chart types
 * @return {Array} Array of chart type objects
 */
function getAllChartTypes() {
  return [
    { value: 'COLUMN', label: 'Column Chart', description: 'Compare values across categories' },
    { value: 'BAR', label: 'Bar Chart', description: 'Horizontal comparison of values' },
    { value: 'LINE', label: 'Line Chart', description: 'Show trends over time' },
    { value: 'PIE', label: 'Pie Chart', description: 'Show parts of a whole' },
    { value: 'SCATTER', label: 'Scatter Plot', description: 'Show correlation between variables' },
    { value: 'AREA', label: 'Area Chart', description: 'Show cumulative totals over time' },
    { value: 'HISTOGRAM', label: 'Histogram', description: 'Show distribution of data' },
    { value: 'CANDLESTICK', label: 'Candlestick Chart', description: 'Show financial data' }
  ];
}

/**
 * Gets default chart options
 * @return {Object} Default chart options
 */
function getDefaultChartOptions() {
  return {
    width: 600,
    height: 400,
    backgroundColor: '#ffffff',
    colors: ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6'],
    fontSize: 12,
    titlePosition: 'top',
    legendPosition: 'right'
  };
}

/**
 * Determines the data type of a column
 * @param {Array} columnData - Array of column values
 * @return {string} Data type
 */
function determineColumnDataType(columnData) {
  if (columnData.length === 0) {
    return 'empty';
  }
  
  var numericCount = 0;
  var dateCount = 0;
  var textCount = 0;
  
  columnData.forEach(function(value) {
    if (typeof value === 'number') {
      numericCount++;
    } else if (value instanceof Date) {
      dateCount++;
    } else if (typeof value === 'string') {
      if (!isNaN(value) && !isNaN(parseFloat(value))) {
        numericCount++;
      } else if (isValidDate(value)) {
        dateCount++;
      } else {
        textCount++;
      }
    }
  });
  
  var total = columnData.length;
  
  if (numericCount / total > 0.8) {
    return 'number';
  } else if (dateCount / total > 0.8) {
    return 'date';
  } else {
    return 'text';
  }
}

/**
 * Checks if a string represents a valid date
 * @param {string} dateString - String to check
 * @return {boolean} True if valid date
 */
function isValidDate(dateString) {
  var date = new Date(dateString);
  return !isNaN(date.getTime());
}


/**
 * DataIntegration.gs - Import/export and external data integration capabilities
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Imports data from a CSV file
 * @param {string} csvData - CSV data as string
 * @param {Object} options - Import options
 */
function importCSVData(csvData, options) {
  try {
    var sheet = getActiveSheet();
    var delimiter = options.delimiter || ',';
    var hasHeaders = options.hasHeaders !== false;
    var startCell = options.startCell || 'A1';
    
    // Parse CSV data
    var rows = parseCSV(csvData, delimiter);
    
    if (rows.length === 0) {
      throw new Error('No data found in CSV');
    }
    
    // Get target range
    var startRange = sheet.getRange(startCell);
    var targetRange = sheet.getRange(
      startRange.getRow(),
      startRange.getColumn(),
      rows.length,
      rows[0].length
    );
    
    // Clear existing data if specified
    if (options.clearExisting) {
      targetRange.clear();
    }
    
    // Set values
    targetRange.setValues(rows);
    
    // Apply header formatting if specified
    if (hasHeaders && options.formatHeaders) {
      var headerRange = sheet.getRange(
        startRange.getRow(),
        startRange.getColumn(),
        1,
        rows[0].length
      );
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f0f0f0');
    }
    
    showToast('CSV data imported successfully (' + rows.length + ' rows)', 'Success');
    return {
      success: true,
      rowsImported: rows.length,
      columnsImported: rows[0].length,
      range: targetRange.getA1Notation()
    };
    
  } catch (error) {
    handleError(error, 'importCSVData', { options: options });
    return { success: false, error: error.message };
  }
}

/**
 * Exports sheet data to CSV format
 * @param {string} range - A1 notation of range to export (optional)
 * @param {Object} options - Export options
 * @return {string} CSV data
 */
function exportToCSV(range, options) {
  try {
    var sheet = getActiveSheet();
    var exportRange;
    
    if (range) {
      exportRange = sheet.getRange(range);
    } else {
      exportRange = sheet.getDataRange();
    }
    
    var values = exportRange.getValues();
    var delimiter = options.delimiter || ',';
    var includeHeaders = options.includeHeaders !== false;
    
    // Filter out empty rows if specified
    if (options.skipEmptyRows) {
      values = values.filter(function(row) {
        return row.some(function(cell) {
          return cell !== null && cell !== '';
        });
      });
    }
    
    // Convert to CSV
    var csvData = values.map(function(row) {
      return row.map(function(cell) {
        var cellValue = cell.toString();
        // Escape quotes and wrap in quotes if contains delimiter or quotes
        if (cellValue.includes(delimiter) || cellValue.includes('"') || cellValue.includes('\n')) {
          cellValue = '"' + cellValue.replace(/"/g, '""') + '"';
        }
        return cellValue;
      }).join(delimiter);
    }).join('\n');
    
    return csvData;
    
  } catch (error) {
    handleError(error, 'exportToCSV', { range: range, options: options });
    return null;
  }
}

/**
 * Imports data from a JSON source
 * @param {string} jsonData - JSON data as string
 * @param {Object} options - Import options
 */
function importJSONData(jsonData, options) {
  try {
    var sheet = getActiveSheet();
    var data = JSON.parse(jsonData);
    var startCell = options.startCell || 'A1';
    
    // Handle different JSON structures
    var rows = [];
    var headers = [];
    
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        // Array of objects - extract headers and convert to rows
        headers = Object.keys(data[0]);
        rows = [headers];
        
        data.forEach(function(item) {
          var row = headers.map(function(header) {
            return item[header] || '';
          });
          rows.push(row);
        });
      } else {
        // Array of primitives - single column
        headers = [options.columnName || 'Value'];
        rows = [headers];
        data.forEach(function(item) {
          rows.push([item]);
        });
      }
    } else if (typeof data === 'object') {
      // Single object - convert to key-value pairs
      headers = ['Key', 'Value'];
      rows = [headers];
      Object.keys(data).forEach(function(key) {
        rows.push([key, data[key]]);
      });
    }
    
    if (rows.length === 0) {
      throw new Error('No data found in JSON');
    }
    
    // Import the data
    var startRange = sheet.getRange(startCell);
    var targetRange = sheet.getRange(
      startRange.getRow(),
      startRange.getColumn(),
      rows.length,
      rows[0].length
    );
    
    targetRange.setValues(rows);
    
    // Format headers
    if (headers.length > 0) {
      var headerRange = sheet.getRange(
        startRange.getRow(),
        startRange.getColumn(),
        1,
        headers.length
      );
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f0f0f0');
    }
    
    showToast('JSON data imported successfully (' + (rows.length - 1) + ' records)', 'Success');
    return {
      success: true,
      rowsImported: rows.length,
      columnsImported: rows[0].length,
      range: targetRange.getA1Notation()
    };
    
  } catch (error) {
    handleError(error, 'importJSONData', { options: options });
    return { success: false, error: error.message };
  }
}

/**
 * Fetches data from a web API
 * @param {string} url - API endpoint URL
 * @param {Object} options - Request options
 */
function fetchAPIData(url, options) {
  try {
    var requestOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      muteHttpExceptions: true
    };
    
    if (options.payload) {
      requestOptions.payload = JSON.stringify(options.payload);
      requestOptions.headers['Content-Type'] = 'application/json';
    }
    
    var response = UrlFetchApp.fetch(url, requestOptions);
    var responseCode = response.getResponseCode();
    
    if (responseCode >= 200 && responseCode < 300) {
      var responseData = response.getContentText();
      
      // Try to parse as JSON
      try {
        var jsonData = JSON.parse(responseData);
        return {
          success: true,
          data: jsonData,
          responseCode: responseCode
        };
      } catch (parseError) {
        // Return as text if not JSON
        return {
          success: true,
          data: responseData,
          responseCode: responseCode,
          isText: true
        };
      }
    } else {
      throw new Error('API request failed with status: ' + responseCode);
    }
    
  } catch (error) {
    handleError(error, 'fetchAPIData', { url: url, options: options });
    return { success: false, error: error.message };
  }
}

/**
 * Imports data from Google Drive file
 * @param {string} fileId - Google Drive file ID
 * @param {Object} options - Import options
 */
function importFromDriveFile(fileId, options) {
  try {
    var file = DriveApp.getFileById(fileId);
    var mimeType = file.getBlob().getContentType();
    var fileName = file.getName();
    
    var result = { success: false };
    
    if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      var csvData = file.getBlob().getDataAsString();
      result = importCSVData(csvData, options);
    } else if (mimeType === 'application/json' || fileName.toLowerCase().endsWith('.json')) {
      var jsonData = file.getBlob().getDataAsString();
      result = importJSONData(jsonData, options);
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      // Import from another Google Sheets file
      result = importFromGoogleSheets(fileId, options);
    } else {
      throw new Error('Unsupported file type: ' + mimeType);
    }
    
    if (result.success) {
      showToast('Data imported from ' + fileName, 'Success');
    }
    
    return result;
    
  } catch (error) {
    handleError(error, 'importFromDriveFile', { fileId: fileId, options: options });
    return { success: false, error: error.message };
  }
}

/**
 * Imports data from another Google Sheets file
 * @param {string} spreadsheetId - Source spreadsheet ID
 * @param {Object} options - Import options
 */
function importFromGoogleSheets(spreadsheetId, options) {
  try {
    var sourceSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sourceSheet = options.sourceSheetName ? 
      sourceSpreadsheet.getSheetByName(options.sourceSheetName) : 
      sourceSpreadsheet.getActiveSheet();
    
    if (!sourceSheet) {
      throw new Error('Source sheet not found');
    }
    
    var sourceRange = options.sourceRange ? 
      sourceSheet.getRange(options.sourceRange) : 
      sourceSheet.getDataRange();
    
    var values = sourceRange.getValues();
    
    // Import to current sheet
    var sheet = getActiveSheet();
    var startCell = options.startCell || 'A1';
    var startRange = sheet.getRange(startCell);
    
    var targetRange = sheet.getRange(
      startRange.getRow(),
      startRange.getColumn(),
      values.length,
      values[0].length
    );
    
    targetRange.setValues(values);
    
    // Copy formatting if specified
    if (options.copyFormatting) {
      sourceRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    
    showToast('Data imported from Google Sheets', 'Success');
    return {
      success: true,
      rowsImported: values.length,
      columnsImported: values[0].length,
      range: targetRange.getA1Notation()
    };
    
  } catch (error) {
    handleError(error, 'importFromGoogleSheets', { spreadsheetId: spreadsheetId, options: options });
    return { success: false, error: error.message };
  }
}

/**
 * Exports data to Google Drive as a file
 * @param {string} range - A1 notation of range to export
 * @param {Object} options - Export options
 */
function exportToDriveFile(range, options) {
  try {
    var sheet = getActiveSheet();
    var exportRange = range ? sheet.getRange(range) : sheet.getDataRange();
    var fileName = options.fileName || (sheet.getName() + '_export');
    var format = options.format || 'csv';
    
    var blob;
    var mimeType;
    
    switch (format.toLowerCase()) {
      case 'csv':
        var csvData = exportToCSV(range, options);
        blob = Utilities.newBlob(csvData, 'text/csv', fileName + '.csv');
        break;
        
      case 'json':
        var jsonData = exportToJSON(range, options);
        blob = Utilities.newBlob(jsonData, 'application/json', fileName + '.json');
        break;
        
      case 'xlsx':
        // Note: Direct XLSX export requires additional libraries
        // This is a placeholder for XLSX export functionality
        throw new Error('XLSX export not yet implemented');
        
      default:
        throw new Error('Unsupported export format: ' + format);
    }
    
    var file = DriveApp.createFile(blob);
    
    // Move to specified folder if provided
    if (options.folderId) {
      var folder = DriveApp.getFolderById(options.folderId);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }
    
    showToast('Data exported to ' + file.getName(), 'Success');
    return {
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl()
    };
    
  } catch (error) {
    handleError(error, 'exportToDriveFile', { range: range, options: options });
    return { success: false, error: error.message };
  }
}

/**
 * Exports sheet data to JSON format
 * @param {string} range - A1 notation of range to export
 * @param {Object} options - Export options
 * @return {string} JSON data
 */
function exportToJSON(range, options) {
  try {
    var sheet = getActiveSheet();
    var exportRange = range ? sheet.getRange(range) : sheet.getDataRange();
    var values = exportRange.getValues();
    
    if (values.length === 0) {
      return '[]';
    }
    
    var hasHeaders = options.hasHeaders !== false;
    var format = options.format || 'array'; // 'array' or 'object'
    
    var result;
    
    if (format === 'object' && hasHeaders) {
      // Convert to array of objects using first row as headers
      var headers = values[0];
      var dataRows = values.slice(1);
      
      result = dataRows.map(function(row) {
        var obj = {};
        headers.forEach(function(header, index) {
          obj[header] = row[index];
        });
        return obj;
      });
    } else {
      // Return as 2D array
      result = values;
    }
    
    return JSON.stringify(result, null, 2);
    
  } catch (error) {
    handleError(error, 'exportToJSON', { range: range, options: options });
    return null;
  }
}

/**
 * Syncs data with an external source on a schedule
 * @param {Object} syncConfig - Synchronization configuration
 */
function setupDataSync(syncConfig) {
  try {
    // Store sync configuration
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty('dataSyncConfig', JSON.stringify(syncConfig));
    
    // Create trigger for scheduled sync
    if (syncConfig.schedule) {
      var trigger;
      
      switch (syncConfig.schedule.type) {
        case 'hourly':
          trigger = ScriptApp.newTrigger('executeDataSync')
            .timeBased()
            .everyHours(syncConfig.schedule.interval || 1)
            .create();
          break;
          
        case 'daily':
          trigger = ScriptApp.newTrigger('executeDataSync')
            .timeBased()
            .everyDays(syncConfig.schedule.interval || 1)
            .atHour(syncConfig.schedule.hour || 9)
            .create();
          break;
          
        case 'weekly':
          trigger = ScriptApp.newTrigger('executeDataSync')
            .timeBased()
            .everyWeeks(syncConfig.schedule.interval || 1)
            .onWeekDay(ScriptApp.WeekDay[syncConfig.schedule.weekday || 'MONDAY'])
            .atHour(syncConfig.schedule.hour || 9)
            .create();
          break;
      }
      
      if (trigger) {
        properties.setProperty('dataSyncTriggerId', trigger.getUniqueId());
      }
    }
    
    showToast('Data sync configured successfully', 'Success');
    return { success: true, triggerId: trigger ? trigger.getUniqueId() : null };
    
  } catch (error) {
    handleError(error, 'setupDataSync', { syncConfig: syncConfig });
    return { success: false, error: error.message };
  }
}

/**
 * Executes data synchronization (called by trigger)
 */
function executeDataSync() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var configJson = properties.getProperty('dataSyncConfig');
    
    if (!configJson) {
      throw new Error('No sync configuration found');
    }
    
    var config = JSON.parse(configJson);
    
    // Execute sync based on configuration
    switch (config.source.type) {
      case 'api':
        var apiResult = fetchAPIData(config.source.url, config.source.options);
        if (apiResult.success) {
          if (config.source.dataFormat === 'json') {
            importJSONData(JSON.stringify(apiResult.data), config.import);
          }
        }
        break;
        
      case 'drive_file':
        importFromDriveFile(config.source.fileId, config.import);
        break;
        
      case 'google_sheets':
        importFromGoogleSheets(config.source.spreadsheetId, config.import);
        break;
    }
    
    // Log sync execution
    console.log('Data sync executed successfully at ' + new Date());
    
  } catch (error) {
    console.error('Data sync failed:', error);
    handleError(error, 'executeDataSync');
  }
}

/**
 * Helper function to parse CSV data
 * @param {string} csvData - CSV data string
 * @param {string} delimiter - Field delimiter
 * @return {Array} 2D array of parsed data
 */
function parseCSV(csvData, delimiter) {
  var rows = [];
  var lines = csvData.split('\n');
  
  lines.forEach(function(line) {
    if (line.trim()) {
      var fields = [];
      var field = '';
      var inQuotes = false;
      
      for (var i = 0; i < line.length; i++) {
        var char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            field += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          fields.push(field);
          field = '';
        } else {
          field += char;
        }
      }
      
      fields.push(field); // Add last field
      rows.push(fields);
    }
  });
  
  return rows;
}

/**
 * Gets available data sources for import
 * @return {Array} Array of available data source types
 */
function getAvailableDataSources() {
  return [
    { type: 'csv', label: 'CSV File', description: 'Import from CSV file' },
    { type: 'json', label: 'JSON Data', description: 'Import from JSON data' },
    { type: 'api', label: 'Web API', description: 'Fetch data from REST API' },
    { type: 'drive_file', label: 'Google Drive File', description: 'Import from Google Drive file' },
    { type: 'google_sheets', label: 'Google Sheets', description: 'Import from another Google Sheets file' },
    { type: 'database', label: 'Database', description: 'Connect to external database (requires setup)' }
  ];
}

/**
 * Gets available export formats
 * @return {Array} Array of available export formats
 */
function getAvailableExportFormats() {
  return [
    { format: 'csv', label: 'CSV', description: 'Comma-separated values' },
    { format: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
    { format: 'xlsx', label: 'Excel', description: 'Microsoft Excel format (coming soon)' },
    { format: 'pdf', label: 'PDF', description: 'Portable Document Format (coming soon)' }
  ];
}


/**
 * @OnlyCurrentDoc
 * Sheet Shaper Apps Script integration and RPC boundary.
 */

var SS_PROP_PREFIX = 'SS2_';
var SS_PREVIEW_SECONDS = 600;
var SS_HISTORY_LIMIT = 30;
var SS_BACKUP_LIMIT = 10;
var SS_MIN_MUTATION_INTERVAL_MS = 1500;
var SS_MAX_CSV_CHARACTERS = 500000;
var SS_FEATURE_FLAGS = {
  csvImport: true,
  bilingualUi: true,
  historyPagination: true,
  exceptionRecovery: true
};

function onOpen(e) {
  SpreadsheetApp.getUi().createAddonMenu()
    .addItem('Open Sheet Shaper', 'showSheetShaper')
    .addSeparator()
    .addItem('Run safety check', 'menuSafetyCheck')
    .addItem('Help and privacy', 'showSheetShaper')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSheetShaper() {
  var output = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Sheet Shaper')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(output);
}

function menuSafetyCheck() {
  var response = getBootstrap();
  var ui = SpreadsheetApp.getUi();
  if (response.ok) {
    ui.alert('Sheet Shaper safety check', 'Ready. Changes are ' + (response.data.paused ? 'paused' : 'enabled') +
      '. Current target: ' + response.data.sheet.selectionA1 + '. A preview and backup are required before every write.', ui.ButtonSet.OK);
  } else {
    ui.alert('Sheet Shaper safety check', response.error.message, ui.ButtonSet.OK);
  }
}

function getBootstrap() {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    var selection = spreadsheet.getActiveRange() || sheet.getDataRange();
    var store = ssUserStore();
    var namespace = ssNamespace(spreadsheet);
    var settings = ssReadJson(store, ssKey(namespace, 'SETTINGS'), {
      language: 'en', firstRun: true, requireAcknowledgement: true
    });
    return {
      version: SS_VERSION,
      authorized: true,
      paused: store.getProperty(ssKey(namespace, 'PAUSED')) === 'true',
      settings: settings,
      featureFlags: SS_FEATURE_FLAGS,
      sheet: {
        spreadsheetName: spreadsheet.getName(),
        sheetName: sheet.getName(),
        sheetId: sheet.getSheetId(),
        selectionA1: selection.getA1Notation(),
        selectionRows: selection.getNumRows(),
        selectionColumns: selection.getNumColumns(),
        dataRows: sheet.getLastRow(),
        dataColumns: sheet.getLastColumn(),
        editable: selection.canEdit(),
        hasMergedCells: selection.isPartOfMerge()
      },
      capabilities: {
        maxCells: SS_MAX_CELLS,
        maxOperations: SS_MAX_OPERATIONS,
        backupLimit: SS_BACKUP_LIMIT,
        externalTransmission: false,
        backgroundJobs: false,
        driveScope: false
      },
      operations: Object.keys(SS_OPERATION_DEFINITIONS).map(function(key) {
        return { type: key, label: SS_OPERATION_DEFINITIONS[key].label, risk: SS_OPERATION_DEFINITIONS[key].risk };
      }),
      history: ssHistory(spreadsheet, 1, 8, '', ''),
      latest: ssLatestOperation(spreadsheet)
    };
  }, 'REFRESH_FAILED');
}

function setLanguage(language) {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var store = ssUserStore();
    var key = ssKey(ssNamespace(spreadsheet), 'SETTINGS');
    var settings = ssReadJson(store, key, { firstRun: true, requireAcknowledgement: true });
    settings.language = language === 'nl' ? 'nl' : 'en';
    store.setProperty(key, JSON.stringify(settings));
    return { language: settings.language };
  }, 'SETTINGS_FAILED');
}

function acknowledgeOnboarding() {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var store = ssUserStore();
    var key = ssKey(ssNamespace(spreadsheet), 'SETTINGS');
    var settings = ssReadJson(store, key, {});
    settings.firstRun = false;
    settings.requireAcknowledgement = true;
    store.setProperty(key, JSON.stringify(settings));
    return { saved: true };
  }, 'SETTINGS_FAILED');
}

function previewOperation(request) {
  return ssRpc(function() {
    var context = ssReadContext(request);
    var preview = ssPreviewGrid(context.grid, request);
    ssAssertExpansionIsSafe(context, preview.result);
    var token = Utilities.getUuid();
    var owner = ssOwnerKey();
    var payload = {
      token: token,
      owner: owner,
      spreadsheetId: context.spreadsheet.getId(),
      sheetId: context.sheet.getSheetId(),
      rangeA1: context.range.getA1Notation(),
      startRow: context.range.getRow(),
      startColumn: context.range.getColumn(),
      inputRows: context.range.getNumRows(),
      inputColumns: context.range.getNumColumns(),
      inputDigest: ssDigestGrid(context.grid),
      request: preview.normalizedRequest,
      createdAt: new Date().toISOString()
    };
    CacheService.getUserCache().put(ssPreviewKey(token), JSON.stringify(payload), SS_PREVIEW_SECONDS);
    return {
      previewToken: token,
      expiresInSeconds: SS_PREVIEW_SECONDS,
      target: context.sheet.getName() + '!' + context.range.getA1Notation(),
      summary: preview.summary,
      examples: preview.examples,
      beforeQuality: preview.beforeQuality,
      afterQuality: preview.afterQuality,
      warnings: ssPreviewWarnings(context, preview)
    };
  }, 'PREVIEW_FAILED');
}

function previewCsvImport(csvText, options) {
  return ssRpc(function() {
    var context = ssReadCsvContext(csvText, options);
    var differences = ssDifferenceSummary(context.beforeGrid, context.outputGrid, 12);
    var token = Utilities.getUuid();
    var payload = {
      kind: 'CSV_IMPORT',
      token: token,
      owner: ssOwnerKey(),
      spreadsheetId: context.spreadsheet.getId(),
      sheetId: context.sheet.getSheetId(),
      rangeA1: context.outputRange.getA1Notation(),
      startRow: context.outputRange.getRow(),
      startColumn: context.outputRange.getColumn(),
      inputRows: context.outputRange.getNumRows(),
      inputColumns: context.outputRange.getNumColumns(),
      inputDigest: ssDigestGrid(context.beforeGrid),
      csvDigest: ssHash(String(csvText) + '\n' + context.delimiter),
      delimiter: context.delimiter,
      hasHeader: context.hasHeader,
      createdAt: new Date().toISOString()
    };
    CacheService.getUserCache().put(ssPreviewKey(token), JSON.stringify(payload), SS_PREVIEW_SECONDS);
    var formulaCells = context.beforeGrid.reduce(function(total, row) {
      return total + row.filter(function(cell) { return Boolean(cell.formula); }).length;
    }, 0);
    var warnings = [
      'CSV content stays in this browser request and is not stored in operation history.',
      'A hidden in-spreadsheet backup is created before the write.'
    ];
    if (formulaCells) warnings.push('The import will replace ' + formulaCells + ' formula cell(s) in the target.');
    return {
      previewToken: token,
      kind: 'CSV_IMPORT',
      expiresInSeconds: SS_PREVIEW_SECONDS,
      target: context.sheet.getName() + '!' + context.outputRange.getA1Notation(),
      summary: {
        beforeRows: context.beforeGrid.length,
        beforeColumns: context.beforeGrid[0] ? context.beforeGrid[0].length : 0,
        afterRows: context.outputGrid.length,
        afterColumns: context.outputGrid[0] ? context.outputGrid[0].length : 0,
        changedCells: differences.changedCells,
        risk: 'HIGH',
        backupRequired: true,
        retrySafeBeforeApply: true,
        operationLabels: ['Import CSV']
      },
      examples: differences.examples,
      beforeQuality: ssQualityReport(context.beforeGrid, context.hasHeader),
      afterQuality: ssQualityReport(context.outputGrid, context.hasHeader),
      warnings: warnings
    };
  }, 'CSV_PREVIEW_FAILED');
}

function applyCsvImport(command) {
  return ssRpc(function() {
    command = command || {};
    if (command.acknowledged !== true) throw ssError('ACKNOWLEDGEMENT_REQUIRED', 'Review and confirm the CSV preview before importing.');
    if (!command.previewToken) throw ssError('PREVIEW_REQUIRED', 'Create a fresh CSV preview before importing.');
    var csvText = String(command.csvText == null ? '' : command.csvText);
    var cache = CacheService.getUserCache();
    var raw = cache.get(ssPreviewKey(command.previewToken));
    if (!raw) throw ssError('PREVIEW_EXPIRED', 'The CSV preview expired or was already used. Preview it again.');
    var previewRecord = JSON.parse(raw);
    if (previewRecord.kind !== 'CSV_IMPORT') throw ssError('INVALID_PREVIEW', 'This preview is not a CSV import preview.');
    if (previewRecord.owner !== ssOwnerKey()) throw ssError('NOT_AUTHORIZED', 'This preview belongs to a different user.');
    if (ssHash(csvText + '\n' + previewRecord.delimiter) !== previewRecord.csvDigest) {
      throw ssError('CSV_CHANGED', 'The CSV content changed after preview. Create a fresh preview.');
    }
    var spreadsheet = ssRequireSpreadsheet();
    var namespace = ssNamespace(spreadsheet);
    ssRequireMutationsEnabled(spreadsheet);
    ssEnforceRateLimit(namespace);
    var idempotencyKey = String(command.idempotencyKey || command.previewToken);
    var prior = ssFindIdempotentResult(namespace, idempotencyKey);
    if (prior) return prior;
    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(5000)) throw ssError('BUSY', 'Another Sheet Shaper write is active. Retry after it finishes.');
    try {
      if (previewRecord.spreadsheetId !== spreadsheet.getId()) throw ssError('WRONG_SPREADSHEET', 'Return to the spreadsheet used for the preview.');
      var sheet = ssSheetById(spreadsheet, previewRecord.sheetId);
      if (!sheet) throw ssError('SHEET_NOT_FOUND', 'The target sheet no longer exists.');
      var range = sheet.getRange(previewRecord.rangeA1);
      ssAssertWritable(range);
      var beforeGrid = ssReadGrid(range);
      if (ssDigestGrid(beforeGrid) !== previewRecord.inputDigest) throw ssError('STALE_PREVIEW', 'The target changed after preview. No changes were made; preview again.');
      var values = ssParseCsv(csvText, previewRecord.delimiter);
      var outputGrid = ssMakeGrid(values);
      if (outputGrid.length !== previewRecord.inputRows || (outputGrid[0] ? outputGrid[0].length : 0) !== previewRecord.inputColumns) {
        throw ssError('CSV_CHANGED', 'The parsed CSV shape changed after preview. Create a fresh preview.');
      }
      var differences = ssDifferenceSummary(beforeGrid, outputGrid, 12);
      var operationId = Utilities.getUuid();
      var backup = ssCreateBackup(spreadsheet, sheet, operationId);
      var record = {
        id: operationId,
        version: SS_VERSION,
        owner: ssOwnerKey(),
        spreadsheetId: spreadsheet.getId(),
        sheetId: sheet.getSheetId(),
        sheetName: sheet.getName(),
        rangeA1: range.getA1Notation(),
        startRow: range.getRow(),
        startColumn: range.getColumn(),
        beforeRows: range.getNumRows(),
        beforeColumns: range.getNumColumns(),
        afterRows: outputGrid.length,
        afterColumns: outputGrid[0] ? outputGrid[0].length : 0,
        inputDigest: previewRecord.inputDigest,
        expectedDigest: ssDigestGrid(outputGrid),
        backupSheetId: backup.getSheetId(),
        backupSheetName: backup.getName(),
        status: 'APPLYING',
        operations: [{ type: 'import_csv', options: { delimiter: previewRecord.delimiter } }],
        summary: { beforeRows: range.getNumRows(), beforeColumns: range.getNumColumns(), afterRows: outputGrid.length, afterColumns: outputGrid[0] ? outputGrid[0].length : 0, changedCells: differences.changedCells, risk: 'HIGH' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ssSaveOperation(spreadsheet, record);
      try {
        ssWriteResult(sheet, range, outputGrid);
        var actualGrid = ssReadGrid(sheet.getRange(record.startRow, record.startColumn, record.afterRows, record.afterColumns));
        record.actualDigest = ssDigestGrid(actualGrid);
        record.validation = { passed: record.actualDigest === record.expectedDigest, checkedAt: new Date().toISOString(), quality: ssQualityReport(actualGrid, previewRecord.hasHeader) };
        if (!record.validation.passed) throw ssError('VALIDATION_FAILED', 'The CSV write did not match the preview. Use Restore now.');
        record.status = 'APPLIED';
        record.updatedAt = new Date().toISOString();
        ssSaveOperation(spreadsheet, record);
        var result = ssPublicOperation(record);
        ssBestEffort('post_csv_cleanup', function() {
          ssSaveIdempotentResult(namespace, idempotencyKey, result);
          cache.remove(ssPreviewKey(command.previewToken));
          ssPruneHistory(spreadsheet, ssUserStore(), namespace);
          spreadsheet.toast('CSV import validated. Backup: ' + backup.getName(), 'Sheet Shaper', 5);
        });
        return result;
      } catch (writeError) {
        record.status = 'FAILED';
        record.errorCode = writeError.code || 'WRITE_FAILED';
        record.updatedAt = new Date().toISOString();
        ssSaveOperation(spreadsheet, record);
        throw writeError;
      }
    } finally {
      lock.releaseLock();
    }
  }, 'CSV_APPLY_FAILED');
}

function applyOperation(command) {
  return ssRpc(function() {
    command = command || {};
    if (command.acknowledged !== true) {
      throw ssError('ACKNOWLEDGEMENT_REQUIRED', 'Confirm that you reviewed the preview and understand that a hidden backup will be created.');
    }
    if (!command.previewToken) throw ssError('PREVIEW_REQUIRED', 'Create a fresh preview before applying changes.');
    var cache = CacheService.getUserCache();
    var raw = cache.get(ssPreviewKey(command.previewToken));
    if (!raw) throw ssError('PREVIEW_EXPIRED', 'The preview expired or was already used. Preview the operation again.');
    var previewRecord = JSON.parse(raw);
    if (previewRecord.owner !== ssOwnerKey()) throw ssError('NOT_AUTHORIZED', 'This preview belongs to a different user.');
    var spreadsheet = ssRequireSpreadsheet();
    var namespace = ssNamespace(spreadsheet);
    ssRequireMutationsEnabled(spreadsheet);
    ssEnforceRateLimit(namespace);
    var idempotencyKey = String(command.idempotencyKey || command.previewToken);
    var prior = ssFindIdempotentResult(namespace, idempotencyKey);
    if (prior) return prior;

    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(5000)) throw ssError('BUSY', 'Another Sheet Shaper write is active. Retry after it finishes.');
    try {
      if (previewRecord.spreadsheetId !== spreadsheet.getId()) throw ssError('WRONG_SPREADSHEET', 'Return to the spreadsheet used for the preview.');
      var sheet = ssSheetById(spreadsheet, previewRecord.sheetId);
      if (!sheet) throw ssError('SHEET_NOT_FOUND', 'The target sheet no longer exists.');
      var range = sheet.getRange(previewRecord.rangeA1);
      ssAssertWritable(range);
      var grid = ssReadGrid(range);
      if (ssDigestGrid(grid) !== previewRecord.inputDigest) {
        throw ssError('STALE_PREVIEW', 'The target changed after preview. No changes were made; preview again.');
      }
      var preview = ssPreviewGrid(grid, previewRecord.request);
      ssAssertExpansionIsSafe({ sheet: sheet, range: range, grid: grid }, preview.result);
      var operationId = Utilities.getUuid();
      var backup = ssCreateBackup(spreadsheet, sheet, operationId);
      var record = {
        id: operationId,
        version: SS_VERSION,
        owner: ssOwnerKey(),
        spreadsheetId: spreadsheet.getId(),
        sheetId: sheet.getSheetId(),
        sheetName: sheet.getName(),
        rangeA1: range.getA1Notation(),
        startRow: range.getRow(),
        startColumn: range.getColumn(),
        beforeRows: range.getNumRows(),
        beforeColumns: range.getNumColumns(),
        afterRows: preview.result.length,
        afterColumns: preview.result[0] ? preview.result[0].length : 0,
        inputDigest: previewRecord.inputDigest,
        expectedDigest: ssDigestGrid(preview.result),
        backupSheetId: backup.getSheetId(),
        backupSheetName: backup.getName(),
        status: 'APPLYING',
        operations: preview.normalizedRequest.operations,
        summary: preview.summary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ssSaveOperation(spreadsheet, record);
      try {
        ssWriteResult(sheet, range, preview.result);
        var outputRange = sheet.getRange(record.startRow, record.startColumn,
          Math.max(record.afterRows, 1), Math.max(record.afterColumns, 1));
        var actualGrid = record.afterRows && record.afterColumns ? ssReadGrid(outputRange) : [];
        record.actualDigest = ssDigestGrid(actualGrid);
        record.validation = {
          passed: record.actualDigest === record.expectedDigest,
          checkedAt: new Date().toISOString(),
          quality: ssQualityReport(actualGrid, preview.normalizedRequest.hasHeader)
        };
        if (!record.validation.passed) throw ssError('VALIDATION_FAILED', 'The write did not match the preview. Use Restore now.');
        record.status = 'APPLIED';
        record.updatedAt = new Date().toISOString();
        ssSaveOperation(spreadsheet, record);
        var result = ssPublicOperation(record);
        ssBestEffort('post_apply_cleanup', function() {
          ssSaveIdempotentResult(namespace, idempotencyKey, result);
          cache.remove(ssPreviewKey(command.previewToken));
          ssPruneHistory(spreadsheet, ssUserStore(), namespace);
          spreadsheet.toast('Validated. Backup: ' + backup.getName(), 'Sheet Shaper', 5);
        });
        return result;
      } catch (writeError) {
        record.status = 'FAILED';
        record.errorCode = writeError.code || 'WRITE_FAILED';
        record.updatedAt = new Date().toISOString();
        ssSaveOperation(spreadsheet, record);
        throw writeError;
      }
    } finally {
      lock.releaseLock();
    }
  }, 'APPLY_FAILED');
}

function undoOperation(operationId) {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    ssRequireMutationsEnabled(spreadsheet);
    var record = ssLoadOperation(spreadsheet, operationId);
    if (!record || record.owner !== ssOwnerKey()) throw ssError('NOT_FOUND', 'No user-owned operation was found.');
    if (record.status !== 'APPLIED' && record.status !== 'FAILED') {
      throw ssError('INVALID_STATE', 'Only applied or failed operations can be restored. Current state: ' + record.status + '.');
    }
    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(5000)) throw ssError('BUSY', 'Another Sheet Shaper write is active.');
    try {
      var sheet = ssSheetById(spreadsheet, record.sheetId);
      var backup = ssSheetById(spreadsheet, record.backupSheetId);
      if (!sheet || !backup) throw ssError('BACKUP_MISSING', 'The source or hidden backup sheet is missing. No data was changed.');
      var clearRows = Math.max(record.beforeRows, record.afterRows, 1);
      var clearColumns = Math.max(record.beforeColumns, record.afterColumns, 1);
      ssEnsureSheetSize(sheet, record.startRow + clearRows - 1, record.startColumn + clearColumns - 1);
      sheet.getRange(record.startRow, record.startColumn, clearRows, clearColumns).clearContent();
      backup.getRange(record.startRow, record.startColumn, record.beforeRows, record.beforeColumns)
        .copyTo(sheet.getRange(record.startRow, record.startColumn, record.beforeRows, record.beforeColumns), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
      var restored = ssReadGrid(sheet.getRange(record.rangeA1));
      if (ssDigestGrid(restored) !== record.inputDigest) {
        throw ssError('RESTORE_VALIDATION_FAILED', 'Restore verification failed. The hidden backup remains available for manual recovery.');
      }
      record.status = 'UNDONE';
      record.undoneAt = new Date().toISOString();
      record.updatedAt = record.undoneAt;
      ssSaveOperation(spreadsheet, record);
      ssBestEffort('post_restore_toast', function() {
        spreadsheet.toast('Restore validated for ' + record.rangeA1 + '.', 'Sheet Shaper', 5);
      });
      return ssPublicOperation(record);
    } finally {
      lock.releaseLock();
    }
  }, 'RESTORE_FAILED');
}

function analyzeCurrentTarget(request) {
  return ssRpc(function() {
    var context = ssReadContext(request || { scope: 'selection', operation: 'smart_trim' });
    return {
      target: context.sheet.getName() + '!' + context.range.getA1Notation(),
      quality: ssQualityReport(context.grid, request && request.hasHeader !== false),
      rows: context.range.getNumRows(),
      columns: context.range.getNumColumns()
    };
  }, 'ANALYSIS_FAILED');
}

function getOperationHistory(page, pageSize, query, status) {
  return ssRpc(function() {
    return ssHistory(ssRequireSpreadsheet(), Number(page) || 1, Math.min(Number(pageSize) || 10, 20), String(query || ''), String(status || ''));
  }, 'HISTORY_FAILED');
}

function exportCurrentRangeCsv(options) {
  return ssRpc(function() {
    options = options || {};
    var context = ssReadContext({ scope: options.scope || 'selection', operation: 'smart_trim' });
    var content = ssGridToCsv(context.grid, options.delimiter === ';' ? ';' : ',');
    if (content.length > 5000000) throw ssError('EXPORT_TOO_LARGE', 'The CSV exceeds the 5 MB sidebar transfer limit. Export a smaller range.');
    return {
      filename: ssSafeFilename(context.spreadsheet.getName() + '-' + context.sheet.getName()) + '.csv',
      mimeType: 'text/csv;charset=utf-8',
      content: content
    };
  }, 'EXPORT_FAILED');
}

function savePreset(name, request) {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var normalizedName = String(name || '').trim();
    if (!/^[\p{L}\p{N} _-]{1,40}$/u.test(normalizedName)) throw ssError('INVALID_NAME', 'Preset names may contain letters, numbers, spaces, hyphens, and underscores.');
    var normalized = ssNormalizeRequest(request);
    var store = ssUserStore();
    var key = ssKey(ssNamespace(spreadsheet), 'PRESETS');
    var presets = ssReadJson(store, key, {});
    presets[normalizedName] = { name: normalizedName, request: normalized, updatedAt: new Date().toISOString() };
    if (Object.keys(presets).length > 20) throw ssError('PRESET_LIMIT', 'Delete a preset before saving another.');
    store.setProperty(key, JSON.stringify(presets));
    return { presets: Object.keys(presets).sort().map(function(presetName) { return presets[presetName]; }) };
  }, 'PRESET_FAILED');
}

function listPresets() {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var presets = ssReadJson(ssUserStore(), ssKey(ssNamespace(spreadsheet), 'PRESETS'), {});
    return { presets: Object.keys(presets).sort().map(function(name) { return presets[name]; }) };
  }, 'PRESET_FAILED');
}

function deletePreset(name) {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var store = ssUserStore();
    var key = ssKey(ssNamespace(spreadsheet), 'PRESETS');
    var presets = ssReadJson(store, key, {});
    delete presets[String(name || '')];
    store.setProperty(key, JSON.stringify(presets));
    return { deleted: true };
  }, 'PRESET_FAILED');
}

function setMutationPause(paused) {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    ssUserStore().setProperty(ssKey(ssNamespace(spreadsheet), 'PAUSED'), paused === true ? 'true' : 'false');
    return { paused: paused === true };
  }, 'SETTINGS_FAILED');
}

function exportSupportBundle() {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    var payload = {
      generatedAt: new Date().toISOString(),
      version: SS_VERSION,
      spreadsheetIdHash: ssHash(spreadsheet.getId()).slice(0, 16),
      sheetId: sheet.getSheetId(),
      locale: spreadsheet.getSpreadsheetLocale(),
      timezone: spreadsheet.getSpreadsheetTimeZone(),
      paused: ssUserStore().getProperty(ssKey(ssNamespace(spreadsheet), 'PAUSED')) === 'true',
      history: ssHistory(spreadsheet, 1, SS_HISTORY_LIMIT, '').items.map(function(item) {
        return { id: item.id, status: item.status, operations: item.operations, summary: item.summary, createdAt: item.createdAt, errorCode: item.errorCode || null };
      }),
      privacy: 'No cell values, formulas, user email addresses, access tokens, or spreadsheet names are included.'
    };
    return {
      filename: 'sheet-shaper-support-' + new Date().toISOString().slice(0, 10) + '.json',
      mimeType: 'application/json',
      content: JSON.stringify(payload, null, 2)
    };
  }, 'SUPPORT_EXPORT_FAILED');
}

function deleteMySheetShaperData() {
  return ssRpc(function() {
    var spreadsheet = ssRequireSpreadsheet();
    var store = ssUserStore();
    var namespace = ssNamespace(spreadsheet);
    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(5000)) throw ssError('BUSY', 'Another Sheet Shaper write is active.');
    try {
      var index = ssReadJson(store, ssKey(namespace, 'INDEX'), []);
      var deletedBackups = 0;
      index.forEach(function(operationId) {
        var record = ssReadJson(store, ssKey(namespace, 'OP_' + operationId), null);
        var backup = record && ssSheetById(spreadsheet, record.backupSheetId);
        if (backup && spreadsheet.getSheets().length > 1) {
          spreadsheet.deleteSheet(backup);
          deletedBackups++;
        }
      });
      Object.keys(store.getProperties()).forEach(function(key) {
        if (key.indexOf(SS_PROP_PREFIX + namespace + '_') === 0) store.deleteProperty(key);
      });
      return { deletedRecords: index.length, deletedBackups: deletedBackups };
    } finally {
      lock.releaseLock();
    }
  }, 'DELETE_FAILED');
}

function ssReadContext(request) {
  var spreadsheet = ssRequireSpreadsheet();
  var sheet = spreadsheet.getActiveSheet();
  var normalized = ssNormalizeRequest(request);
  var range = normalized.scope === 'data' ? sheet.getDataRange() : (spreadsheet.getActiveRange() || sheet.getDataRange());
  ssAssertWritable(range);
  var cells = range.getNumRows() * range.getNumColumns();
  if (cells > SS_MAX_CELLS) throw ssError('RANGE_TOO_LARGE', 'The target contains ' + cells.toLocaleString('en-US') + ' cells; the safe limit is ' + SS_MAX_CELLS.toLocaleString('en-US') + '.');
  var grid = ssReadGrid(range);
  var shapeChanging = normalized.operations.some(function(operation) { return SS_OPERATION_DEFINITIONS[operation.type].shapeChange; });
  var containsFormula = grid.some(function(row) { return row.some(function(cell) { return Boolean(cell.formula); }); });
  if (shapeChanging && containsFormula) {
    throw ssError('FORMULA_SHAPE_CHANGE', 'Shape-changing operations are blocked when the target contains formulas. Select constant-value data or use a non-shape-changing operation.');
  }
  return { spreadsheet: spreadsheet, sheet: sheet, range: range, grid: grid, request: normalized };
}

function ssReadCsvContext(csvText, options) {
  csvText = String(csvText == null ? '' : csvText);
  options = options || {};
  if (!csvText) throw ssError('EMPTY_CSV', 'Choose or paste CSV content before previewing.');
  if (csvText.length > SS_MAX_CSV_CHARACTERS) throw ssError('CSV_TOO_LARGE', 'CSV import is limited to ' + SS_MAX_CSV_CHARACTERS.toLocaleString('en-US') + ' characters per run.');
  var delimiter = options.delimiter === ';' || options.delimiter === '\t' ? options.delimiter : ',';
  var values = ssParseCsv(csvText, delimiter);
  var outputGrid = ssMakeGrid(values);
  var rows = outputGrid.length;
  var columns = outputGrid[0] ? outputGrid[0].length : 0;
  if (!rows || !columns) throw ssError('EMPTY_CSV', 'The CSV does not contain an importable table.');
  if (rows * columns > SS_MAX_CELLS) throw ssError('RANGE_TOO_LARGE', 'CSV import is limited to ' + SS_MAX_CELLS.toLocaleString('en-US') + ' cells per run.');
  var spreadsheet = ssRequireSpreadsheet();
  var sheet = spreadsheet.getActiveSheet();
  var selection = spreadsheet.getActiveRange() || sheet.getDataRange();
  if (selection.getRow() + rows - 1 > sheet.getMaxRows() || selection.getColumn() + columns - 1 > sheet.getMaxColumns()) {
    throw ssError('TARGET_OUT_OF_BOUNDS', 'The CSV does not fit in the current sheet grid. Add rows or columns, then preview again.');
  }
  var outputRange = sheet.getRange(selection.getRow(), selection.getColumn(), rows, columns);
  ssAssertWritable(outputRange);
  ssAssertExpansionIsSafe({ sheet: sheet, range: selection }, outputGrid);
  return {
    spreadsheet: spreadsheet,
    sheet: sheet,
    selection: selection,
    outputRange: outputRange,
    beforeGrid: ssReadGrid(outputRange),
    outputGrid: outputGrid,
    delimiter: delimiter,
    hasHeader: options.hasHeader !== false
  };
}

function ssAssertWritable(range) {
  if (!range.canEdit()) throw ssError('READ_ONLY', 'You do not have permission to edit the selected range.');
  if (range.isPartOfMerge()) throw ssError('MERGED_CELLS', 'Unmerge the selected cells before using Sheet Shaper. No changes were made.');
}

function ssAssertExpansionIsSafe(context, outputGrid) {
  var outputRows = outputGrid.length;
  var outputColumns = outputGrid[0] ? outputGrid[0].length : 0;
  if (!outputRows || !outputColumns) return;
  var range = context.range;
  var sheet = context.sheet;
  if (outputRows <= range.getNumRows() && outputColumns <= range.getNumColumns()) return;
  var existingRows = Math.min(outputRows, sheet.getMaxRows() - range.getRow() + 1);
  var existingColumns = Math.min(outputColumns, sheet.getMaxColumns() - range.getColumn() + 1);
  if (existingRows <= 0 || existingColumns <= 0) return;
  var expanded = sheet.getRange(range.getRow(), range.getColumn(), existingRows, existingColumns).getDisplayValues();
  for (var row = 0; row < existingRows; row++) {
    for (var column = 0; column < existingColumns; column++) {
      if ((row >= range.getNumRows() || column >= range.getNumColumns()) && expanded[row][column] !== '') {
        throw ssError('EXPANSION_COLLISION', 'The result would overwrite data outside the selected range. Clear space or select a wider target.');
      }
    }
  }
}

function ssPreviewWarnings(context, preview) {
  var warnings = ['No changes are applied until you press Apply and confirm the preview.', 'A hidden in-spreadsheet backup is created before the write.'];
  if (preview.summary.risk === 'HIGH') warnings.push('This operation changes the target shape. Verify the column and delimiter carefully.');
  if (preview.summary.changedCells === 0) warnings.push('The preview found no cell-level differences. Applying would still create a backup.');
  if (context.range.getNumRows() * context.range.getNumColumns() > 100000) warnings.push('Large target: the Apps Script execution-time quota may require a smaller range.');
  return warnings;
}

function ssWriteResult(sheet, originalRange, grid) {
  var rows = grid.length;
  var columns = grid[0] ? grid[0].length : 0;
  var clearRows = Math.max(originalRange.getNumRows(), rows, 1);
  var clearColumns = Math.max(originalRange.getNumColumns(), columns, 1);
  ssEnsureSheetSize(sheet, originalRange.getRow() + clearRows - 1, originalRange.getColumn() + clearColumns - 1);
  sheet.getRange(originalRange.getRow(), originalRange.getColumn(), clearRows, clearColumns).clearContent();
  if (rows && columns) sheet.getRange(originalRange.getRow(), originalRange.getColumn(), rows, columns).setValues(ssGridToWriteValues(grid));
  SpreadsheetApp.flush();
}

function ssCreateBackup(spreadsheet, sourceSheet, operationId) {
  var timestamp = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss');
  var backup = sourceSheet.copyTo(spreadsheet);
  backup.setName(('_SS Backup ' + timestamp + ' ' + operationId.slice(0, 8)).slice(0, 99));
  backup.hideSheet();
  return backup;
}

function ssReadGrid(range) {
  return ssMakeGrid(range.getValues(), range.getFormulas());
}

function ssDigestGrid(grid) {
  return ssHash(JSON.stringify(ssCanonicalGrid(grid)));
}

function ssHash(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function ssOwnerKey() {
  var temporaryKey = Session.getTemporaryActiveUserKey();
  if (!temporaryKey) throw ssError('IDENTITY_UNAVAILABLE', 'Google could not establish a temporary user boundary. Reauthorize and retry.');
  return ssHash(temporaryKey).slice(0, 24);
}

function ssRequireSpreadsheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw ssError('NO_SPREADSHEET', 'Open Sheet Shaper from a Google Sheets document.');
  return spreadsheet;
}

function ssRequireMutationsEnabled(spreadsheet) {
  if (ssUserStore().getProperty(ssKey(ssNamespace(spreadsheet), 'PAUSED')) === 'true') {
    throw ssError('SAFETY_STOP', 'Changes are paused for your account in this spreadsheet. Resume changes from the sidebar first.');
  }
}

function ssEnsureSheetSize(sheet, rows, columns) {
  if (rows > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (columns > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
}

function ssSheetById(spreadsheet, sheetId) {
  var matches = spreadsheet.getSheets().filter(function(sheet) { return sheet.getSheetId() === Number(sheetId); });
  return matches.length ? matches[0] : null;
}

function ssNamespace(spreadsheet) {
  return ssHash(spreadsheet.getId()).slice(0, 16);
}

function ssKey(namespace, suffix) {
  return SS_PROP_PREFIX + namespace + '_' + suffix;
}

function ssPreviewKey(token) {
  return SS_PROP_PREFIX + 'PREVIEW_' + token;
}

function ssUserStore() {
  return PropertiesService.getUserProperties();
}

function ssReadJson(store, key, fallback) {
  var raw = store.getProperty(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (error) { return fallback; }
}

function ssSaveOperation(spreadsheet, record) {
  var store = ssUserStore();
  var namespace = ssNamespace(spreadsheet);
  store.setProperty(ssKey(namespace, 'OP_' + record.id), JSON.stringify(record));
  var indexKey = ssKey(namespace, 'INDEX');
  var index = ssReadJson(store, indexKey, []);
  index = [record.id].concat(index.filter(function(id) { return id !== record.id; }));
  store.setProperty(indexKey, JSON.stringify(index));
}

function ssLoadOperation(spreadsheet, operationId) {
  return ssReadJson(ssUserStore(), ssKey(ssNamespace(spreadsheet), 'OP_' + String(operationId || '')), null);
}

function ssLatestOperation(spreadsheet) {
  var store = ssUserStore();
  var namespace = ssNamespace(spreadsheet);
  var index = ssReadJson(store, ssKey(namespace, 'INDEX'), []);
  return index.length ? ssPublicOperation(ssReadJson(store, ssKey(namespace, 'OP_' + index[0]), null)) : null;
}

function ssPublicOperation(record) {
  if (!record) return null;
  return {
    id: record.id,
    status: record.status,
    sheetName: record.sheetName,
    rangeA1: record.rangeA1,
    operations: record.operations,
    summary: record.summary,
    validation: record.validation || null,
    backupSheetName: record.backupSheetName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    errorCode: record.errorCode || null,
    canRestore: record.status === 'APPLIED' || record.status === 'FAILED'
  };
}

function ssHistory(spreadsheet, page, pageSize, query, status) {
  var store = ssUserStore();
  var namespace = ssNamespace(spreadsheet);
  var index = ssReadJson(store, ssKey(namespace, 'INDEX'), []);
  var lowered = query.toLocaleLowerCase();
  var requestedStatus = String(status || '').toLocaleUpperCase();
  var allRecords = index.map(function(id) { return ssReadJson(store, ssKey(namespace, 'OP_' + id), null); })
    .filter(Boolean).map(ssPublicOperation);
  var statusCounts = allRecords.reduce(function(counts, record) {
    counts[record.status] = (counts[record.status] || 0) + 1;
    return counts;
  }, { APPLIED: 0, FAILED: 0, UNDONE: 0, APPLYING: 0 });
  var records = allRecords.filter(function(record) {
    var matchesQuery = !lowered || JSON.stringify(record).toLocaleLowerCase().indexOf(lowered) !== -1;
    var matchesStatus = !requestedStatus || record.status === requestedStatus;
    return matchesQuery && matchesStatus;
  });
  var pages = Math.max(1, Math.ceil(records.length / pageSize));
  var safePage = Math.min(Math.max(page, 1), pages);
  var start = (safePage - 1) * pageSize;
  return { items: records.slice(start, start + pageSize), page: safePage, pageSize: pageSize, total: records.length, pages: pages, statusCounts: statusCounts };
}

function ssPruneHistory(spreadsheet, store, namespace) {
  var indexKey = ssKey(namespace, 'INDEX');
  var index = ssReadJson(store, indexKey, []);
  var keep = index.slice(0, SS_HISTORY_LIMIT);
  var backupsKept = 0;
  index.forEach(function(id, position) {
    var record = ssReadJson(store, ssKey(namespace, 'OP_' + id), null);
    if (!record || !record.backupSheetId) return;
    backupsKept++;
    if (backupsKept > SS_BACKUP_LIMIT || position >= SS_HISTORY_LIMIT) {
      var backup = ssSheetById(spreadsheet, record.backupSheetId);
      if (backup && spreadsheet.getSheets().length > 1) spreadsheet.deleteSheet(backup);
      if (position < SS_HISTORY_LIMIT) {
        record.backupSheetId = null;
        record.backupSheetName = '[expired by retention policy]';
        store.setProperty(ssKey(namespace, 'OP_' + id), JSON.stringify(record));
      }
    }
  });
  index.slice(SS_HISTORY_LIMIT).forEach(function(id) { store.deleteProperty(ssKey(namespace, 'OP_' + id)); });
  store.setProperty(indexKey, JSON.stringify(keep));
}

function ssEnforceRateLimit(namespace) {
  var store = ssUserStore();
  var key = ssKey(namespace, 'LAST_MUTATION');
  var previous = Number(store.getProperty(key) || 0);
  var now = Date.now();
  if (now - previous < SS_MIN_MUTATION_INTERVAL_MS) throw ssError('RATE_LIMITED', 'Wait a moment before applying another change.');
  store.setProperty(key, String(now));
}

function ssFindIdempotentResult(namespace, idempotencyKey) {
  var key = ssKey(namespace, 'IDEMP_' + ssHash(idempotencyKey).slice(0, 20));
  var raw = CacheService.getUserCache().get(key);
  return raw ? JSON.parse(raw) : null;
}

function ssSaveIdempotentResult(namespace, idempotencyKey, result) {
  CacheService.getUserCache().put(ssKey(namespace, 'IDEMP_' + ssHash(idempotencyKey).slice(0, 20)), JSON.stringify(result), 21600);
}

function ssSafeFilename(value) {
  return String(value || 'sheet-shaper-export').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'sheet-shaper-export';
}

function ssRpc(action, fallbackCode) {
  try {
    return { ok: true, data: action() };
  } catch (error) {
    var code = error && error.code ? error.code : fallbackCode;
    console.error(JSON.stringify({ event: 'sheet_shaper_error', code: code, message: error && error.message ? error.message : String(error) }));
    return {
      ok: false,
      error: {
        code: code,
        message: error && error.message ? error.message : 'The operation failed.',
        retrySafe: ['BUSY', 'RATE_LIMITED', 'PREVIEW_EXPIRED', 'STALE_PREVIEW'].indexOf(code) !== -1,
        nextAction: ssNextAction(code)
      }
    };
  }
}

function ssBestEffort(label, action) {
  try {
    action();
  } catch (error) {
    console.error(JSON.stringify({ event: 'sheet_shaper_best_effort_failed', label: label, message: error && error.message ? error.message : String(error) }));
  }
}

function ssNextAction(code) {
  if (code === 'PREVIEW_EXPIRED' || code === 'STALE_PREVIEW') return 'Refresh and create a new preview.';
  if (code === 'BUSY' || code === 'RATE_LIMITED') return 'Wait briefly, then retry once.';
  if (code === 'SAFETY_STOP') return 'Resume changes from Settings.';
  if (code === 'VALIDATION_FAILED' || code === 'RESTORE_VALIDATION_FAILED') return 'Use the hidden backup sheet and follow the restore runbook.';
  if (code === 'READ_ONLY') return 'Ask the spreadsheet owner for edit access.';
  if (code === 'FORMULA_SHAPE_CHANGE') return 'Select constant-value data, or choose trim/case operations that do not change shape.';
  return 'Review the target and options, then create a fresh preview.';
}

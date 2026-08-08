/**
 * @OnlyCurrentDoc
 * Sheet Shaper deterministic transformation engine.
 * This file intentionally has no Google service calls so it can be tested locally.
 */

var SS_VERSION = '2.0.0';
var SS_MAX_CELLS = 250000;
var SS_MAX_OPERATIONS = 8;

var SS_OPERATION_DEFINITIONS = {
  smart_trim: { label: 'Smart trim', risk: 'LOW', shapeChange: false },
  remove_duplicates: { label: 'Remove duplicate rows', risk: 'MEDIUM', shapeChange: true },
  uppercase: { label: 'UPPERCASE', risk: 'LOW', shapeChange: false },
  lowercase: { label: 'lowercase', risk: 'LOW', shapeChange: false },
  title_case: { label: 'Title Case', risk: 'LOW', shapeChange: false },
  sentence_case: { label: 'Sentence case', risk: 'LOW', shapeChange: false },
  remove_empty_rows: { label: 'Compact empty rows', risk: 'MEDIUM', shapeChange: true },
  remove_empty_columns: { label: 'Compact empty columns', risk: 'MEDIUM', shapeChange: true },
  split_text: { label: 'Split text', risk: 'HIGH', shapeChange: true },
  sort_rows: { label: 'Sort rows', risk: 'MEDIUM', shapeChange: true }
};

function ssError(code, message, details) {
  var error = new Error(message);
  error.code = code;
  error.details = details || {};
  return error;
}

function ssNormalizeRequest(request) {
  request = request || {};
  var inputOperations = request.operations || (request.operation ? [{ type: request.operation, options: request.options || {} }] : []);
  if (!Array.isArray(inputOperations) || inputOperations.length === 0) {
    throw ssError('INVALID_OPERATION', 'Choose at least one operation.');
  }
  if (inputOperations.length > SS_MAX_OPERATIONS) {
    throw ssError('TOO_MANY_OPERATIONS', 'A batch can contain at most ' + SS_MAX_OPERATIONS + ' operations.');
  }

  var operations = inputOperations.map(function(item) {
    var operation = typeof item === 'string' ? { type: item, options: {} } : item;
    if (!operation || !SS_OPERATION_DEFINITIONS[operation.type]) {
      throw ssError('INVALID_OPERATION', 'Unsupported operation: ' + (operation && operation.type ? operation.type : 'unknown'));
    }
    return {
      type: operation.type,
      options: ssNormalizeOptions(operation.type, operation.options || {})
    };
  });

  return {
    scope: request.scope === 'data' ? 'data' : 'selection',
    hasHeader: request.hasHeader !== false,
    operations: operations
  };
}

function ssNormalizeOptions(type, options) {
  var normalized = {};
  if (Array.isArray(options.columns)) {
    normalized.columns = options.columns.map(function(value) { return Number(value); }).filter(function(value) {
      return Number.isInteger(value) && value >= 0;
    });
  }
  if (type === 'split_text') {
    var delimiter = String(options.delimiter == null ? ',' : options.delimiter);
    if (!delimiter || delimiter.length > 20) {
      throw ssError('INVALID_DELIMITER', 'The delimiter must contain 1 to 20 characters.');
    }
    normalized.delimiter = delimiter;
    normalized.column = Number.isInteger(Number(options.column)) ? Number(options.column) : 0;
    normalized.keepOriginal = options.keepOriginal === true;
    normalized.maxParts = Math.min(Math.max(Number(options.maxParts) || 20, 2), 50);
  }
  if (type === 'sort_rows') {
    normalized.column = Number.isInteger(Number(options.column)) ? Number(options.column) : 0;
    normalized.direction = options.direction === 'desc' ? 'desc' : 'asc';
  }
  return normalized;
}

function ssMakeGrid(values, formulas) {
  values = values || [];
  formulas = formulas || values.map(function(row) { return row.map(function() { return ''; }); });
  return values.map(function(row, rowIndex) {
    return row.map(function(value, columnIndex) {
      return { value: value, formula: formulas[rowIndex] && formulas[rowIndex][columnIndex] ? formulas[rowIndex][columnIndex] : '' };
    });
  });
}

function ssGridToWriteValues(grid) {
  return grid.map(function(row) {
    return row.map(function(cell) {
      if (cell.formula) return cell.formula;
      if (typeof cell.value === 'string' && cell.value.indexOf('=') === 0) return "'" + cell.value;
      return cell.value;
    });
  });
}

function ssCloneCell(cell) {
  return { value: cell.value instanceof Date ? new Date(cell.value.getTime()) : cell.value, formula: cell.formula || '' };
}

function ssCloneGrid(grid) {
  return grid.map(function(row) { return row.map(ssCloneCell); });
}

function ssCellKey(cell) {
  if (cell.formula) return 'f:' + cell.formula;
  var value = cell.value;
  if (value instanceof Date) return 'd:' + value.toISOString();
  return typeof value + ':' + String(value == null ? '' : value);
}

function ssIsEmptyCell(cell) {
  return !cell.formula && (cell.value === '' || cell.value === null || typeof cell.value === 'undefined' ||
    (typeof cell.value === 'string' && cell.value.trim() === ''));
}

function ssRowKey(row) {
  return row.map(ssCellKey).join('\u001f');
}

function ssTrimValue(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\u00a0/g, ' ').replace(/[\t\r\n ]+/g, ' ').trim();
}

function ssTitleCase(value) {
  return value.toLocaleLowerCase().replace(/(^|[\s\-\/])([\p{L}\p{N}])/gu, function(match, boundary, letter) {
    return boundary + letter.toLocaleUpperCase();
  });
}

function ssSentenceCase(value) {
  var trimmed = value.toLocaleLowerCase();
  return trimmed.replace(/(^\s*|[.!?]\s+)([\p{L}])/gu, function(match, boundary, letter) {
    return boundary + letter.toLocaleUpperCase();
  });
}

function ssTargetColumns(width, options) {
  if (!options.columns || options.columns.length === 0) {
    return Array.from({ length: width }, function(_, index) { return index; });
  }
  var seen = {};
  return options.columns.filter(function(index) {
    if (index >= width || seen[index]) return false;
    seen[index] = true;
    return true;
  });
}

function ssTransformText(grid, type, options) {
  var result = ssCloneGrid(grid);
  var width = result[0] ? result[0].length : 0;
  var target = ssTargetColumns(width, options);
  var targetMap = {};
  target.forEach(function(index) { targetMap[index] = true; });
  result.forEach(function(row) {
    row.forEach(function(cell, columnIndex) {
      if (!targetMap[columnIndex] || cell.formula || typeof cell.value !== 'string') return;
      if (type === 'smart_trim') cell.value = ssTrimValue(cell.value);
      if (type === 'uppercase') cell.value = cell.value.toLocaleUpperCase();
      if (type === 'lowercase') cell.value = cell.value.toLocaleLowerCase();
      if (type === 'title_case') cell.value = ssTitleCase(cell.value);
      if (type === 'sentence_case') cell.value = ssSentenceCase(cell.value);
    });
  });
  return result;
}

function ssRemoveDuplicates(grid, hasHeader) {
  if (grid.length < 2) return ssCloneGrid(grid);
  var output = hasHeader ? [grid[0].map(ssCloneCell)] : [];
  var seen = {};
  grid.slice(hasHeader ? 1 : 0).forEach(function(row) {
    var key = ssRowKey(row);
    if (!seen[key]) {
      seen[key] = true;
      output.push(row.map(ssCloneCell));
    }
  });
  return output;
}

function ssRemoveEmptyRows(grid) {
  return grid.filter(function(row) { return !row.every(ssIsEmptyCell); }).map(function(row) { return row.map(ssCloneCell); });
}

function ssRemoveEmptyColumns(grid) {
  if (!grid.length || !grid[0].length) return ssCloneGrid(grid);
  var keep = [];
  for (var column = 0; column < grid[0].length; column++) {
    var empty = grid.every(function(row) { return ssIsEmptyCell(row[column]); });
    if (!empty) keep.push(column);
  }
  return grid.map(function(row) { return keep.map(function(column) { return ssCloneCell(row[column]); }); });
}

function ssSplitText(grid, options, hasHeader) {
  if (!grid.length || !grid[0].length) return ssCloneGrid(grid);
  var column = options.column;
  if (column < 0 || column >= grid[0].length) {
    throw ssError('INVALID_COLUMN', 'The split column is outside the selected range.');
  }
  var splitRows = grid.map(function(row, rowIndex) {
    var cell = row[column];
    if (cell.formula || typeof cell.value !== 'string' || (hasHeader && rowIndex === 0)) return [ssCloneCell(cell)];
    return cell.value.split(options.delimiter, options.maxParts).map(function(part) { return { value: part, formula: '' }; });
  });
  var parts = splitRows.reduce(function(maximum, row) { return Math.max(maximum, row.length); }, 1);
  return grid.map(function(row, rowIndex) {
    var before = row.slice(0, column).map(ssCloneCell);
    var after = row.slice(column + 1).map(ssCloneCell);
    var current = splitRows[rowIndex].map(ssCloneCell);
    if (hasHeader && rowIndex === 0 && parts > 1) {
      var label = String(row[column].value || 'Column');
      current = Array.from({ length: parts }, function(_, index) {
        return { value: label + ' ' + (index + 1), formula: '' };
      });
    }
    while (current.length < parts) current.push({ value: '', formula: '' });
    if (options.keepOriginal) current.unshift(ssCloneCell(row[column]));
    return before.concat(current, after);
  });
}

function ssSortRows(grid, options, hasHeader) {
  if (!grid.length || !grid[0].length) return ssCloneGrid(grid);
  var column = options.column;
  if (column < 0 || column >= grid[0].length) throw ssError('INVALID_COLUMN', 'The sort column is outside the selected range.');
  var header = hasHeader ? [grid[0].map(ssCloneCell)] : [];
  var rows = grid.slice(hasHeader ? 1 : 0).map(function(row) { return row.map(ssCloneCell); });
  rows.sort(function(left, right) {
    var a = left[column].value;
    var b = right[column].value;
    var comparison;
    if (typeof a === 'number' && typeof b === 'number') comparison = a - b;
    else comparison = String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), undefined, { numeric: true, sensitivity: 'base' });
    return options.direction === 'desc' ? -comparison : comparison;
  });
  return header.concat(rows);
}

function ssApplyOperation(grid, operation, hasHeader) {
  var type = operation.type;
  if (['smart_trim', 'uppercase', 'lowercase', 'title_case', 'sentence_case'].indexOf(type) !== -1) {
    return ssTransformText(grid, type, operation.options);
  }
  if (type === 'remove_duplicates') return ssRemoveDuplicates(grid, hasHeader);
  if (type === 'remove_empty_rows') return ssRemoveEmptyRows(grid);
  if (type === 'remove_empty_columns') return ssRemoveEmptyColumns(grid);
  if (type === 'split_text') return ssSplitText(grid, operation.options, hasHeader);
  if (type === 'sort_rows') return ssSortRows(grid, operation.options, hasHeader);
  throw ssError('INVALID_OPERATION', 'Unsupported operation: ' + type);
}

function ssApplyPipeline(grid, request) {
  var normalized = ssNormalizeRequest(request);
  var result = ssCloneGrid(grid);
  normalized.operations.forEach(function(operation) {
    result = ssApplyOperation(result, operation, normalized.hasHeader);
  });
  return result;
}

function ssQualityReport(grid, hasHeader) {
  var start = hasHeader ? 1 : 0;
  var rows = grid.slice(start);
  var width = grid[0] ? grid[0].length : 0;
  var total = rows.length * width;
  var empty = 0;
  var whitespace = 0;
  var duplicate = 0;
  var seen = {};
  var typeSets = Array.from({ length: width }, function() { return {}; });
  rows.forEach(function(row) {
    var key = ssRowKey(row);
    if (seen[key]) duplicate++;
    seen[key] = true;
    row.forEach(function(cell, index) {
      if (ssIsEmptyCell(cell)) {
        empty++;
        return;
      }
      if (!cell.formula && typeof cell.value === 'string' && ssTrimValue(cell.value) !== cell.value) whitespace++;
      var type = cell.formula ? 'formula' : (cell.value instanceof Date ? 'date' : typeof cell.value);
      typeSets[index][type] = true;
    });
  });
  var mixedColumns = typeSets.filter(function(types) { return Object.keys(types).length > 1; }).length;
  var penalty = Math.min(55, total ? Math.round((empty / total) * 35) : 0) + Math.min(20, whitespace) + Math.min(15, duplicate * 3) + Math.min(10, mixedColumns * 2);
  var score = Math.max(0, 100 - penalty);
  var confidence = total >= 100 ? 'HIGH' : (total >= 20 ? 'MEDIUM' : 'LOW');
  return {
    score: score,
    confidence: confidence,
    totalCells: total,
    emptyCells: empty,
    whitespaceIssues: whitespace,
    duplicateRows: duplicate,
    mixedTypeColumns: mixedColumns
  };
}

function ssDifferenceSummary(before, after, limit) {
  limit = limit || 12;
  var rows = Math.max(before.length, after.length);
  var columns = Math.max(before[0] ? before[0].length : 0, after[0] ? after[0].length : 0);
  var changed = 0;
  var examples = [];
  for (var row = 0; row < rows; row++) {
    for (var column = 0; column < columns; column++) {
      var oldCell = before[row] && before[row][column] ? before[row][column] : { value: '', formula: '' };
      var newCell = after[row] && after[row][column] ? after[row][column] : { value: '', formula: '' };
      if (ssCellKey(oldCell) !== ssCellKey(newCell)) {
        changed++;
        if (examples.length < limit) {
          examples.push({
            row: row + 1,
            column: column + 1,
            before: ssPreviewValue(oldCell),
            after: ssPreviewValue(newCell)
          });
        }
      }
    }
  }
  return { changedCells: changed, examples: examples };
}

function ssPreviewValue(cell) {
  var value = cell.formula || cell.value;
  if (value instanceof Date) return value.toISOString();
  var text = String(value == null ? '' : value);
  return text.length > 80 ? text.slice(0, 77) + '...' : text;
}

function ssPreviewGrid(grid, request) {
  var normalized = ssNormalizeRequest(request);
  var beforeRows = grid.length;
  var beforeColumns = grid[0] ? grid[0].length : 0;
  if (beforeRows * beforeColumns > SS_MAX_CELLS) {
    throw ssError('RANGE_TOO_LARGE', 'Select no more than ' + SS_MAX_CELLS.toLocaleString('en-US') + ' cells per run.');
  }
  var result = ssApplyPipeline(grid, normalized);
  var afterRows = result.length;
  var afterColumns = result[0] ? result[0].length : 0;
  var differences = ssDifferenceSummary(grid, result, 12);
  var risk = normalized.operations.reduce(function(current, operation) {
    var candidate = SS_OPERATION_DEFINITIONS[operation.type].risk;
    var weights = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    return weights[candidate] > weights[current] ? candidate : current;
  }, 'LOW');
  return {
    normalizedRequest: normalized,
    result: result,
    summary: {
      beforeRows: beforeRows,
      beforeColumns: beforeColumns,
      afterRows: afterRows,
      afterColumns: afterColumns,
      changedCells: differences.changedCells,
      risk: risk,
      backupRequired: true,
      retrySafeBeforeApply: true,
      operationLabels: normalized.operations.map(function(operation) { return SS_OPERATION_DEFINITIONS[operation.type].label; })
    },
    examples: differences.examples,
    beforeQuality: ssQualityReport(grid, normalized.hasHeader),
    afterQuality: ssQualityReport(result, normalized.hasHeader)
  };
}

function ssCanonicalGrid(grid) {
  return grid.map(function(row) { return row.map(ssCellKey); });
}

function ssCsvEscape(value, delimiter) {
  var text = value instanceof Date ? value.toISOString() : String(value == null ? '' : value);
  return /["\r\n]/.test(text) || text.indexOf(delimiter) !== -1 ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function ssGridToCsv(grid, delimiter) {
  delimiter = delimiter || ',';
  return grid.map(function(row) {
    return row.map(function(cell) { return ssCsvEscape(cell.formula || cell.value, delimiter); }).join(delimiter);
  }).join('\r\n');
}

function ssParseCsv(text, delimiter) {
  delimiter = delimiter || ',';
  if (delimiter.length !== 1) throw ssError('INVALID_DELIMITER', 'CSV import requires a one-character delimiter.');
  var rows = [];
  var row = [];
  var field = '';
  var quoted = false;
  for (var index = 0; index < text.length; index++) {
    var character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === delimiter) { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (quoted) throw ssError('INVALID_CSV', 'CSV contains an unclosed quoted field.');
  row.push(field.replace(/\r$/, ''));
  if (row.length > 1 || row[0] !== '' || rows.length === 0) rows.push(row);
  var width = rows.reduce(function(maximum, current) { return Math.max(maximum, current.length); }, 0);
  return rows.map(function(current) {
    while (current.length < width) current.push('');
    return current;
  });
}

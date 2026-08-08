import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts, grid } from './helpers.mjs';

const core = loadScripts();

test('smart trim changes constants and preserves formulas', () => {
  const input = grid(core, [[' Name ', 'Total'], ['  Ada   Lovelace ', 3]], [['', ''], ['', '=1+2']]);
  const result = core.ssApplyPipeline(input, { operation: 'smart_trim' });
  assert.equal(result[0][0].value, 'Name');
  assert.equal(result[1][0].value, 'Ada Lovelace');
  assert.equal(result[1][1].formula, '=1+2');
});

test('literal equals-prefixed text is escaped on write but formulas are not', () => {
  const input = grid(core, [['literal','formula'],['=not a formula',3]],[['',''],['','=1+2']]);
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(input))), [['literal','formula'],["'=not a formula",'=1+2']]);
});

test('duplicate removal preserves the header and first occurrence', () => {
  const input = grid(core, [['id', 'name'], [1, 'Ada'], [1, 'Ada'], [2, 'Grace']]);
  const result = core.ssApplyPipeline(input, { hasHeader: true, operation: 'remove_duplicates' });
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(result))), [['id','name'],[1,'Ada'],[2,'Grace']]);
});

test('batch operations run in declared order and improve whitespace quality', () => {
  const input = grid(core, [['Name'], ['  ADA  '], ['  ADA  '], ['Grace']]);
  const preview = core.ssPreviewGrid(input, { hasHeader: true, operations: [{type:'smart_trim'},{type:'title_case'},{type:'remove_duplicates'}] });
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(preview.result))), [['Name'],['Ada'],['Grace']]);
  assert.equal(preview.beforeQuality.whitespaceIssues, 2);
  assert.equal(preview.afterQuality.whitespaceIssues, 0);
  assert.equal(preview.summary.backupRequired, true);
});

test('split text expands a column without losing adjacent values', () => {
  const input = grid(core, [['Full name','Role'],['Ada,Lovelace','Engineer']]);
  const result = core.ssApplyPipeline(input, { hasHeader:true, operation:'split_text', options:{delimiter:',',column:0,keepOriginal:false} });
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(result))), [['Full name 1','Full name 2','Role'],['Ada','Lovelace','Engineer']]);
});

test('sorting is stable enough for headers, numbers, and direction', () => {
  const input = grid(core, [['id'],[10],[2],[5]]);
  const asc = core.ssApplyPipeline(input,{hasHeader:true,operation:'sort_rows',options:{column:0,direction:'asc'}});
  const desc = core.ssApplyPipeline(input,{hasHeader:true,operation:'sort_rows',options:{column:0,direction:'desc'}});
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(asc))), [['id'],[2],[5],[10]]);
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(desc))), [['id'],[10],[5],[2]]);
});

test('empty rows and columns are compacted without deleting the spreadsheet grid', () => {
  const input = grid(core, [['A','','B'],['x','','y'],['','','']]);
  const result = core.ssApplyPipeline(input,{operations:[{type:'remove_empty_rows'},{type:'remove_empty_columns'}]});
  assert.deepEqual(JSON.parse(JSON.stringify(core.ssGridToWriteValues(result))), [['A','B'],['x','y']]);
});

test('CSV export and import handle quotes, delimiters, and line breaks', () => {
  const input = grid(core, [['name','note'],['Ada','hello, "world"'],['Grace','two\nlines']]);
  const csv = core.ssGridToCsv(input, ',');
  assert.match(csv, /"hello, ""world"""/);
  const rows = core.ssParseCsv(csv, ',');
  assert.deepEqual(JSON.parse(JSON.stringify(rows)), [['name','note'],['Ada','hello, "world"'],['Grace','two\nlines']]);
});

test('adversarial input is rejected before transformation', () => {
  assert.throws(() => core.ssNormalizeRequest({ operation:'split_text', options:{delimiter:''} }), /delimiter/i);
  assert.throws(() => core.ssNormalizeRequest({ operation:'remote_fetch' }), /Unsupported operation/);
  assert.throws(() => core.ssNormalizeRequest({ operations:Array.from({length:9},()=>({type:'smart_trim'})) }), /at most 8/);
});

test('large ranges fail closed at the configured boundary', () => {
  const oversized = Array.from({length:501},()=>Array.from({length:500},()=>({value:'x',formula:''})));
  assert.throws(() => core.ssPreviewGrid(oversized,{operation:'smart_trim'}), /250,000/);
});

test('quality confidence is explicit for small datasets', () => {
  const report = core.ssQualityReport(grid(core,[['A'],['x']]),true);
  assert.equal(report.confidence,'LOW');
  assert.equal(typeof report.score,'number');
});

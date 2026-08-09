import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { loadScripts } from './helpers.mjs';

function columnName(number) {
  let result='';
  while(number){number--;result=String.fromCharCode(65+(number%26))+result;number=Math.floor(number/26);}
  return result;
}

function a1(row,column,rows,columns) {
  const start=columnName(column)+row;
  const end=columnName(column+columns-1)+(row+rows-1);
  return start===end?start:start+':'+end;
}

function parseA1(value) {
  const match=String(value).match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
  if(!match)throw new Error('Unsupported A1: '+value);
  const toColumn=letters=>letters.toUpperCase().split('').reduce((total,char)=>total*26+char.charCodeAt(0)-64,0);
  const row=Number(match[2]); const column=toColumn(match[1]);
  const endRow=match[4]?Number(match[4]):row; const endColumn=match[3]?toColumn(match[3]):column;
  return {row,column,rows:endRow-row+1,columns:endColumn-column+1};
}

class MemoryStore {
  constructor(){this.values={};}
  getProperty(key){return Object.hasOwn(this.values,key)?this.values[key]:null;}
  setProperty(key,value){this.values[key]=String(value);}
  deleteProperty(key){delete this.values[key];}
  getProperties(){return {...this.values};}
}

class MemoryCache {
  constructor(){this.values={};}
  get(key){return Object.hasOwn(this.values,key)?this.values[key]:null;}
  put(key,value){this.values[key]=String(value);}
  remove(key){delete this.values[key];}
}

class RangeMock {
  constructor(sheet,row,column,rows,columns){Object.assign(this,{sheet,row,column,rows,columns});}
  getRow(){return this.row;} getColumn(){return this.column;} getNumRows(){return this.rows;} getNumColumns(){return this.columns;}
  getA1Notation(){return a1(this.row,this.column,this.rows,this.columns);}
  canEdit(){return true;} isPartOfMerge(){return false;}
  matrix(source){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.columns},(_,c)=>source[this.row-1+r]?.[this.column-1+c]??''));}
  getValues(){return this.matrix(this.sheet.values);} getFormulas(){return this.matrix(this.sheet.formulas);} getDisplayValues(){return this.getValues().map(row=>row.map(String));}
  clearContent(){for(let r=0;r<this.rows;r++)for(let c=0;c<this.columns;c++){this.sheet.values[this.row-1+r][this.column-1+c]='';this.sheet.formulas[this.row-1+r][this.column-1+c]='';}return this;}
  setValues(values){for(let r=0;r<this.rows;r++)for(let c=0;c<this.columns;c++){const value=values[r][c];this.sheet.values[this.row-1+r][this.column-1+c]=typeof value==='string'&&value.startsWith("'=")?value.slice(1):value;this.sheet.formulas[this.row-1+r][this.column-1+c]='';}return this;}
  copyTo(target){target.clearContent();for(let r=0;r<this.rows;r++)for(let c=0;c<this.columns;c++){target.sheet.values[target.row-1+r][target.column-1+c]=this.sheet.values[this.row-1+r][this.column-1+c];target.sheet.formulas[target.row-1+r][target.column-1+c]=this.sheet.formulas[this.row-1+r][this.column-1+c];}return target;}
}

let nextSheetId=10;
class SheetMock {
  constructor(name,values,formulas){this.name=name;this.id=nextSheetId++;this.maxRows=40;this.maxColumns=20;this.hidden=false;this.values=Array.from({length:this.maxRows},(_,r)=>Array.from({length:this.maxColumns},(_,c)=>values?.[r]?.[c]??''));this.formulas=Array.from({length:this.maxRows},(_,r)=>Array.from({length:this.maxColumns},(_,c)=>formulas?.[r]?.[c]??''));}
  getName(){return this.name;} setName(name){this.name=name;return this;} getSheetId(){return this.id;} hideSheet(){this.hidden=true;return this;}
  getMaxRows(){return this.maxRows;} getMaxColumns(){return this.maxColumns;} getLastRow(){return 3;} getLastColumn(){return 2;}
  getRange(...args){const spec=typeof args[0]==='string'?parseA1(args[0]):{row:args[0],column:args[1],rows:args[2]??1,columns:args[3]??1};return new RangeMock(this,spec.row,spec.column,spec.rows,spec.columns);}
  getDataRange(){return this.getRange(1,1,3,2);}
  copyTo(spreadsheet){const copy=new SheetMock(this.name+' copy',this.values,this.formulas);spreadsheet.sheets.push(copy);return copy;}
  insertRowsAfter(last,count){for(let i=0;i<count;i++){this.values.push(Array(this.maxColumns).fill(''));this.formulas.push(Array(this.maxColumns).fill(''));}this.maxRows+=count;}
  insertColumnsAfter(last,count){for(const row of this.values)row.push(...Array(count).fill(''));for(const row of this.formulas)row.push(...Array(count).fill(''));this.maxColumns+=count;}
}

class SpreadsheetMock {
  constructor(sheet){this.sheet=sheet;this.sheets=[sheet];this.selection=sheet.getRange('A1:B3');}
  getId(){return 'spreadsheet-1';} getName(){return 'Integration book';} getActiveSheet(){return this.sheet;} getActiveRange(){return this.selection;} getSheets(){return this.sheets;}
  deleteSheet(sheet){this.sheets=this.sheets.filter(item=>item!==sheet);} toast(){}
}

function environment() {
  nextSheetId=10;
  const context=loadScripts(['src/Core.gs','src/Server.gs']);
  const sheet=new SheetMock('Data',[[' Name ','Email'],[' Ada ','ada@example.com'],[' Ada ','ada@example.com']]);
  const spreadsheet=new SpreadsheetMock(sheet); const store=new MemoryStore(); const cache=new MemoryCache(); let uuid=0;
  Object.assign(context,{
    SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,flush:()=>{},CopyPasteType:{PASTE_NORMAL:'PASTE_NORMAL'}},
    PropertiesService:{getUserProperties:()=>store},CacheService:{getUserCache:()=>cache},
    LockService:{getDocumentLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},Session:{getTemporaryActiveUserKey:()=> 'integration-user'},
    Utilities:{getUuid:()=>`uuid-${++uuid}`,formatDate:()=> '20260809-120000',DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest:(algorithm,value)=>crypto.createHash('sha256').update(String(value)).digest(),base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url')}
  });
  return {context,sheet,spreadsheet,store};
}

test('real server preview, backup, write, validation, history, and restore execute together',()=>{
  const {context,sheet,spreadsheet}=environment();
  const preview=context.previewOperation({scope:'selection',hasHeader:true,operations:[{type:'smart_trim',options:{}}]});
  assert.equal(preview.ok,true);
  const applied=context.applyOperation({previewToken:preview.data.previewToken,acknowledged:true,idempotencyKey:'apply-1'});
  assert.equal(applied.ok,true); assert.equal(applied.data.status,'APPLIED'); assert.equal(applied.data.validation.passed,true);
  assert.equal(sheet.values[1][0],'Ada'); assert.equal(spreadsheet.sheets.length,2); assert.equal(spreadsheet.sheets[1].hidden,true);
  const history=context.getOperationHistory(1,8,'','APPLIED');
  assert.equal(history.data.total,1); assert.equal(history.data.statusCounts.APPLIED,1);
  const restored=context.undoOperation(applied.data.id);
  assert.equal(restored.ok,true); assert.equal(restored.data.status,'UNDONE'); assert.equal(sheet.values[1][0],' Ada ');
});

test('CSV preview and import validate the write without persisting raw CSV',()=>{
  const {context,sheet,store}=environment();
  const csv='name,email\nGrace,grace@example.com\nLinus,=2+2';
  const preview=context.previewCsvImport(csv,{delimiter:',',hasHeader:true});
  assert.equal(preview.ok,true); assert.equal(preview.data.kind,'CSV_IMPORT');
  const applied=context.applyCsvImport({previewToken:preview.data.previewToken,csvText:csv,acknowledged:true,idempotencyKey:'csv-1'});
  assert.equal(applied.ok,true); assert.equal(applied.data.validation.passed,true);
  assert.equal(sheet.values[1][0],'Grace'); assert.equal(sheet.values[2][1],'=2+2'); assert.equal(sheet.formulas[2][1],'');
  assert.doesNotMatch(JSON.stringify(store.getProperties()),/grace@example\.com|Linus/);
});

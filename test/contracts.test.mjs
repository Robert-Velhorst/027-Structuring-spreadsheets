import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadScripts, root } from './helpers.mjs';

const serverText = fs.readFileSync(path.join(root,'src/Server.gs'),'utf8');
const sidebarText = fs.readFileSync(path.join(root,'src/Sidebar.html'),'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'appsscript.json'),'utf8'));

test('critical write path orders backup before write and validation after write', () => {
  const applyStart=serverText.indexOf('function applyOperation');
  const applyEnd=serverText.indexOf('function undoOperation');
  const apply=serverText.slice(applyStart,applyEnd);
  const backup=apply.indexOf('ssCreateBackup');
  const write=apply.indexOf('ssWriteResult');
  const validate=apply.indexOf('record.validation');
  assert.ok(backup>0 && write>backup && validate>write);
  assert.match(apply,/STALE_PREVIEW/);
  assert.match(apply,/getDocumentLock/);
  assert.match(apply,/idempotencyKey/);
  assert.match(apply,/ssBestEffort\('post_apply_cleanup'/);
});

test('restore is owner-scoped and digest-validated', () => {
  const start=serverText.indexOf('function undoOperation');
  const end=serverText.indexOf('function analyzeCurrentTarget');
  const restore=serverText.slice(start,end);
  assert.match(restore,/record\.owner !== ssOwnerKey/);
  assert.match(restore,/RESTORE_VALIDATION_FAILED/);
  assert.match(restore,/PASTE_NORMAL/);
});

test('manifest uses only current-document and container UI scopes', () => {
  assert.deepEqual(manifest.oauthScopes.sort(),[
    'https://www.googleapis.com/auth/script.container.ui',
    'https://www.googleapis.com/auth/spreadsheets.currentonly'
  ]);
  assert.equal(manifest.executionApi,undefined);
});

test('production code contains no external transport or fake-success provider', () => {
  const production=serverText+sidebarText+fs.readFileSync(path.join(root,'src/Core.gs'),'utf8');
  for(const pattern of [/UrlFetchApp/,/DriveApp/,/GmailApp/,/MailApp/,/coming soon/i,/not implemented/i,/placeholder\s*(?:-|:|functionality)/i]) assert.doesNotMatch(production,pattern);
});

test('every sidebar RPC call has a concrete server function', () => {
  const expected=['getBootstrap','acknowledgeOnboarding','previewOperation','applyOperation','undoOperation','analyzeCurrentTarget','getOperationHistory','exportCurrentRangeCsv','savePreset','listPresets','deletePreset','setMutationPause','exportSupportBundle','deleteMySheetShaperData'];
  for(const name of expected){
    assert.match(sidebarText,new RegExp(`\\.${name}\\(`));
    assert.match(serverText,new RegExp(`function\\s+${name}\\s*\\(`));
  }
});

test('public operation projection excludes owner keys and digests', () => {
  const context=loadScripts(['src/Core.gs','src/Server.gs']);
  const publicRecord=context.ssPublicOperation({id:'1',owner:'secret-owner',inputDigest:'secret-digest',status:'APPLIED',sheetName:'S',rangeA1:'A1',operations:[],summary:{},backupSheetName:'B',createdAt:'now',updatedAt:'now'});
  assert.equal(publicRecord.owner,undefined);
  assert.equal(publicRecord.inputDigest,undefined);
});

test('error envelope explains retry and next action without a stack trace', () => {
  const context=loadScripts(['src/Core.gs','src/Server.gs']);
  const result=context.ssRpc(()=>{throw context.ssError('STALE_PREVIEW','changed');},'FALLBACK');
  assert.equal(result.ok,false);
  assert.equal(result.error.retrySafe,true);
  assert.match(result.error.nextAction,/preview/i);
  assert.equal(result.error.stack,undefined);
});

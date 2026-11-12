const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const scope = {};
vm.runInNewContext(fs.readFileSync('sliby/admin-status.js','utf8'), scope);
const lib = scope.VedatorSlibyAdminStatus;
const source = fs.readFileSync('sliby/index.html','utf8');
const {patchReport}=require('./patch-sliby-admin-runtime.cjs');
const patched=patchReport(source);
assert.equal(patchReport(patched),patched,'Pages wiring is idempotent');
new vm.Script(patched.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(patched.includes('<script src="admin-status.js"></script>'));
assert(patched.includes("fetch('admin-overrides.json'"));
assert(patched.includes('VedatorSlibyAdminStatus.apply(D,overrides)'));
const admin = fs.readFileSync('sliby/admin/index.html','utf8');
const adminInline=admin.match(/<script>([\s\S]*?)<\/script>/);
assert(adminInline,'Admin inline script must not close prematurely');
new vm.Script(adminInline[1]);
assert(admin.includes('api.github.com/repos/Berniocal/vedator/contents/sliby/admin-overrides.json'));
assert(admin.includes("'Authorization': 'Bearer ' + token"));
assert(!admin.includes('localStorage.setItem') && !admin.includes('sessionStorage.setItem'));
assert(admin.includes('sha:latest.sha'));
assert(admin.includes('encodeContent('));
const original = [{candidate:31,tema:'Fermi',stav:'Nesplněno',mergedFrom:[
  {candidate:1066,tema:'Fermi člověk'}, {candidate:338,tema:'Fermi vědec'}]},
  {candidate:22,tema:'Jiné',stav:'Nesplněno'}];
const data = {findings:structuredClone(original),archive:{findings:structuredClone(original)},
  classification:{statuses:['Nesplněno','Splněno později','Splněno už dříve']}};
const entry={stav:'Splněno později',note:'Díl 300',updatedAt:'2026-11-12T05:00:00Z'};
const doc={schema:1,items:{[JSON.stringify([1066,'Fermi člověk'])]:entry}};
assert.equal(lib.keys(data.findings[0]).length,3);
assert.equal(lib.resolve(data.findings[0],doc).stav,entry.stav);
assert.equal(lib.apply(data,doc),2);
assert.equal(data.findings[0].stav,'Splněno později');
assert.equal(data.archive.findings[0].stav,'Splněno později');
assert.equal(data.findings[0].adminNote,'Díl 300');
assert.equal(data.findings[1].stav,'Nesplněno');
assert.equal(data.classification.statusCounts['Splněno později'],1);
assert.throws(()=>lib.check({schema:1,items:{'x':{stav:'neplatné'}}}));
assert.equal(lib.resolve(data.findings[0],{schema:1,items:{}}),null);

const catalogStart='<script type="application/json" id="audit-data">';
const dataStart=source.indexOf(catalogStart)+catalogStart.length;
const dataEnd=source.indexOf('</'+'script>',dataStart);
assert(dataStart>=catalogStart.length&&dataEnd>dataStart);
const actual=JSON.parse(source.slice(dataStart,dataEnd));
const overrides=JSON.parse(fs.readFileSync('sliby/admin-overrides.json','utf8'));
assert(lib.validStatuses.has('Budoucí slib'));
assert(patched.includes('id="nfuture"')&&patched.includes("r.stav==='Budoucí slib'?'future'"));
assert(admin.includes('<option value="future">Budoucí sliby</option>'));
assert(admin.includes("state==='Splněno později'||state==='Splněno už dříve'"));
lib.apply(actual,overrides);
const futureIds=[437,449,740,951,959,1107,1136,1173,1235,1251,1273,1326,1369,1375,1388,1434,1444,1472,1478];
assert.equal(actual.findings.filter(r=>r.stav==='Budoucí slib').length,futureIds.length);
assert(actual.classification.statuses.includes('Budoucí slib'));
for(const id of futureIds){
  const row=actual.findings.find(r=>r.candidate===id);
  assert(row,'Future promise not found: '+id);
  assert.equal(row.stav,'Budoucí slib');
  assert(row.adminNote,'Future promise missing rationale: '+id);
}
assert.equal(actual.classification.statusCounts['Budoucí slib'],futureIds.length);
const nearTermIds=[1458,1461,1504,1557,1783,1819];
for(const id of nearTermIds){
 const row=actual.findings.find(r=>r.candidate===id);
 assert(row,'Previously future record not found: '+id);
 assert.equal(row.stav,'Nesplněno','Near-term promise is not long-term future: '+id);
}

console.log('PASS: admin override validation, merged identity matching, durable status on live and archived rows, PAT safety checks, and future status reporting.');

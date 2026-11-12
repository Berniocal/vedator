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
const futureIds=[437,449,740,951,1107,1136,1173,1235,1251,1273,1326,1369,1388,1444,1458,1461,1472,1478,1504,1557,1783,1819];
assert.equal(actual.findings.filter(r=>r.stav==='Budoucí slib').length,futureIds.length);
assert(actual.classification.statuses.includes('Budoucí slib'));
for(const id of futureIds){
  const row=actual.findings.find(r=>r.candidate===id);
  assert(row,'Future promise not found: '+id);
  assert.equal(row.stav,'Budoucí slib');
  assert(row.adminNote,'Future promise missing rationale: '+id);
}
assert.equal(actual.classification.statusCounts['Budoucí slib'],futureIds.length);

console.log('PASS: admin override validation, merged identity matching, durable status on live and archived rows, PAT safety checks, and future status reporting.');


const candidateRx=/(?:20[3-9]\d|21\d\d|za (?:deset|dvacet|třicet|čtyřicet|padesát|[1-9]\d) let|(?:až|jakmile|když|pokud|po) [^.!?]{0,100}(?:objev|potvrd|vyřeš|dokáž|prokáž|ověř|zjist|změř|získ|nalezn|důkaz|experiment|vynález|přistán|vypust)|(?:objev|potvrzení|prokázání|vyřešení|nové výsledky|v důchodu|na důchodku|za několik desetiletí))/i;
console.log('FUTURE_AUDIT_BEGIN');
console.log('FUTURE_FIELDS',JSON.stringify(Object.keys(actual.findings[0])));
for(const row of actual.findings){
 if(row.stav==='Splněno později'||row.stav==='Splněno už dříve') continue;
 const fields=Object.entries(row).filter(([k,v])=>typeof v==='string' && !/URL|html|base64/i.test(k));
 const hit=fields.filter(([k,v])=>candidateRx.test(v));
 if(!hit.length)continue;
 console.log('FUTURE_CANDIDATE',JSON.stringify({id:row.candidate,stav:row.stav,tema:row.tema,section:row.section,hits:hit.map(([k,v])=>[k,v.slice(0,330)])}));
}
console.log('FUTURE_AUDIT_END');


console.log('ALL_UNFULFILLED_BEGIN');
for(const row of actual.findings){
 if(row.stav!=='Nesplněno')continue;
 console.log('UNFULFILLED_ROW',JSON.stringify({id:row.candidate,tema:row.tema,section:row.section,vysvetleni:String(row.vysvetleni||'').slice(0,640),quote:String(row.quote||'').slice(0,220),timing:String(row.timingStatus||'').slice(0,120)}));
}
console.log('ALL_UNFULFILLED_END');

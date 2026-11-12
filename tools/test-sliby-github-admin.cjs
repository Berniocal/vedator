const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const scope = {};
vm.runInNewContext(fs.readFileSync('sliby/admin-status.js','utf8'), scope);
const lib = scope.VedatorSlibyAdminStatus;
const source = fs.readFileSync('sliby/index.html','utf8');
assert(source.includes('<script src="admin-status.js"></script>'));
assert(source.includes("fetch('admin-overrides.json'"));
assert(source.includes('VedatorSlibyAdminStatus.apply(D, overrides)'));
const admin = fs.readFileSync('sliby/admin/index.html','utf8');
assert(admin.includes('api.github.com/repos/Berniocal/vedator/contents/sliby/admin-overrides.json'));
assert(admin.includes('Authorization: \'Bearer \' + token'));
assert(!admin.includes('localStorage.setItem') && !admin.includes('sessionStorage.setItem'));
assert(admin.includes('sha: latest.sha'));
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
console.log('PASS: admin override validation, merged identity matching, durable status on live and archived rows, and PAT safety checks.');

// Third batch: deliberately merge only repeated statements, not similar subjects.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('sliby/index.html','utf8');
const m=html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/);
assert(m,'Missing embedded Sliby data');
const d=JSON.parse(m[1]),r=JSON.parse(fs.readFileSync('sliby/duplicate-review.json','utf8'));
const batch=r.groups.filter(g=>g.batch===r.batchId);
assert.equal(r.batchId,'2026-11-12-3');
assert.equal(batch.length,4,'Only the four reviewed third-batch pairs may merge');
assert.deepEqual(batch.map(g=>g.members),[[1187,1190],[1262,1270],[1408,1499],[303,1292]]);
assert.equal(d.consolidation.originalFindings,1052);
assert.equal(d.findings.length,914);
assert.equal(d.sections.options.find(s=>s.id==='episodes').count,328);
assert.equal(d.consolidation.latestBatch.groups,4);
const key=x=>JSON.stringify([x.candidate,x.tema]);
const originals=x=>x.mergedFrom||[x];
assert.deepEqual(d.findings.map(key),d.archive.findings.map(key));
assert.equal(new Set(d.findings.flatMap(x=>originals(x).map(key))).size,1052,'Historical promises lost');
for(const group of batch){
  const root=d.findings.find(x=>x.candidate===group.members[0]);
  assert(root,'Missing root '+group.members[0]);
  assert.equal(root.displayTema,group.title);
  assert.equal(root.mergedFrom.length,2,'Unexpected merge size for '+group.title);
  assert(root.mergeNote&&root.mergeNote.length>30,'Review reasoning missing');
  const n=root.mergedFrom.map(x=>x.candidate).sort((a,b)=>a-b);
  assert.deepEqual(n,group.members.slice().sort((a,b)=>a-b));
  assert.equal(new Set(root.mergedFrom.map(x=>JSON.stringify([x.sourceRecording?.audioURL||x.file,x.seconds]))).size,2,'Evidence places collapsed');
  for(const original of root.mergedFrom){
    assert(original.timeURL&&/^https:.*#t=\d/.test(original.timeURL),'Playback timestamp lost');
    assert(root.mergedFrom.every(m=>m.stav===original.stav),'Conflicting statuses were merged');
    const matching=d.findings.filter(x=>originals(x).some(y=>key(y)===key(original)));
    assert.equal(matching.length,1,'Missing or duplicated original promise');
  }
}
for(const e of r.exclusions){
  const [a,b]=e.members;
  const bad=d.findings.find(x=>originals(x).some(y=>y.candidate===a)&&originals(x).some(y=>y.candidate===b));
  assert(!bad,'Accidental merge of distinct promises '+a+' and '+b);
}
console.log('PASS: four new precise duplicate pairs; all 1,052 original statements, evidence, statuses and exclusions preserved.');

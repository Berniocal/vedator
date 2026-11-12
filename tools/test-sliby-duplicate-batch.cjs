// Regression protection for the second, individually verified duplicate batch.
const fs = require('node:fs'), assert = require('node:assert/strict');
const html = fs.readFileSync('sliby/index.html','utf8');
const embedded=html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/);
assert(embedded,'Sliby source JSON missing');
const data=JSON.parse(embedded[1]);
const review=JSON.parse(fs.readFileSync('sliby/duplicate-review.json','utf8'));
const groupRows=review.groups.filter(g=>g.batch==='2026-11-12');
assert.equal(groupRows.length,9,'Second review must contain exactly nine audited merges');
const originalKeys=r=>(r.mergedFrom||[r]).map(x=>JSON.stringify([x.candidate,x.tema]));
const active=data.findings,archive=data.archive.findings;
const groupSizes=new Map([
  [271,4],[396,2],[1061,2],[1035,2],[1037,3],[210,2],
  [1295,4],[1405,4],[1507,2]
]);
assert.equal(data.consolidation.originalFindings,1052);
assert.equal(active.length,914);
assert.equal(data.sections.options.find(s=>s.id==='episodes').count,328);
assert.equal(data.consolidation.latestBatch.groups,4);
assert.deepEqual(active.map(r=>[r.candidate,r.tema]),archive.map(r=>[r.candidate,r.tema]));
for(const [candidate,count] of groupSizes){
  const root=active.find(r=>r.candidate===candidate);
  assert(root,'Missing consolidated root '+candidate);
  const originals=root.mergedFrom||[];
  assert.equal(originals.length,count,'Wrong number of sources '+candidate);
  const times=new Set(originals.map(r=>JSON.stringify([r.sourceRecording?.audioURL||r.file,r.seconds])));
  assert.equal(times.size,count,'Distinct playback evidence not preserved for '+candidate);
  assert(root.mergeNote?.trim().length>15);
  for(const member of originals){
    const matches=active.filter(r=>originalKeys(r).includes(JSON.stringify([member.candidate,member.tema])));
    assert.equal(matches.length,1,'Missing or duplicate original '+member.candidate);
    assert.equal(matches[0],root);
  }
}
const exclusions=review.exclusions||[];
assert(exclusions.length>=6,'Document intentionally distinct promises');
for(const ex of exclusions){
  const [a,b]=ex.members;
  const contains=active.find(r=>{
    const ids=(r.mergedFrom||[r]).map(m=>m.candidate);
    return ids.includes(a)&&ids.includes(b);
  });
  assert(!contains,'Accidental merge of different promises '+a+' and '+b);
}
assert.equal(new Set(active.flatMap(originalKeys)).size,1052,'All pre-consolidation keys must survive');
console.log('PASS: nine conservative groups, all 1,052 source statements, playback places, source statuses, and deliberate non-merges.');

// Paid-only promises must never return through defaults, exports or merged cards.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('sliby/index.html','utf8');
const d=JSON.parse(html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/)[1]);
const scope=JSON.parse(fs.readFileSync('sliby/content-scope.json','utf8'));
const excluded=new Set(scope.excludedMembers.map(r=>r.candidate));
assert.equal(excluded.size,27);
assert.equal(scope.removedCards,16);
const keys=rows=>rows.map(r=>JSON.stringify([r.candidate,r.tema]));
assert.deepEqual(keys(d.findings),keys(d.archive.findings),'Reset defaults must use the same public catalog');
for(const catalog of [d,d.archive]){
 const rows=catalog.findings;
 for(const row of rows)for(const member of [row,...(row.mergedFrom||[])]){
  assert(!excluded.has(member.candidate),'Paid promise retained: '+member.candidate);
 }
 assert.equal(rows.length,906);
 assert.equal(new Set(rows.flatMap(r=>(r.mergedFrom||[r]).map(m=>JSON.stringify([m.candidate,m.tema])))).size,1041);
 for(const section of catalog.sections.options)assert.equal(section.count,rows.filter(r=>r.section===section.id).length);
 for(const [label,count] of Object.entries(catalog.classification.categoryCounts))assert.equal(count,rows.filter(r=>r.kategorie===label).length);
 for(const [label,count] of Object.entries(catalog.classification.statusCounts))assert.equal(count,rows.filter(r=>r.stav===label).length);
 for(const id of [1324,1435,1707,1746,1751,1780,1789,919])assert(rows.some(r=>r.candidate===id),'Unrelated public promise lost: '+id);
 const artemis=rows.find(r=>r.candidate===1716);
 assert(!artemis.mergedFrom,'Artemis must keep only its original public promise');
 assert.equal(artemis.episode,321);
 assert(artemis.targets.every(t=>t.number===325));
 const invitation=rows.find(r=>r.candidate===1772);
 assert.equal(invitation.tema,'Rozeslat veřejné pozvánky newsletterem a na sociálních sítích');
 assert.equal(invitation.stav,'Nesplněno','Removing membership priority must not assert the remaining distribution happened');
 assert.equal(invitation.quote,null,'Do not retain the removed membership-priority quote');
 assert(catalog.nextSteps.includes(scope.rule));
}
console.log('PASS: 16 paid-only cards and 27 source mentions removed from live and reset catalogs; public promises, mixed public parts and counts preserved.');

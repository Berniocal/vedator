// Apply only explicitly reviewed duplicate groups. Safe to rerun after adding a batch.
const fs=require('node:fs'),assert=require('node:assert/strict');
const file='sliby/index.html',html=fs.readFileSync(file,'utf8');
const pattern=/(<script type="application\/json" id="audit-data">)([\s\S]*?)(<\/script>)/;
const data=JSON.parse(html.match(pattern)[2]);
const review=JSON.parse(fs.readFileSync('sliby/duplicate-review.json','utf8'));
const key=r=>JSON.stringify([r.candidate,r.tema]);
const matches=(r,selector)=>Array.isArray(selector)?key(r)===JSON.stringify(selector):r.candidate===selector;
function consolidate(rows,archival=false){
 for(const group of review.groups){
  const selected=group.members.map(selector=>{
   const hits=rows.filter(r=>matches(r,selector)||(r.mergedFrom||[]).some(m=>matches(m,selector)));
   assert.equal(hits.length,1,'Missing or ambiguous reviewed member: '+JSON.stringify(selector));return hits[0];
  });
  const root=selected[0],members=[...new Set(selected)];
  if(members.length===1)continue;
  assert(members.every(r=>r.section===root.section),'Do not merge across sections');
  const originals=new Map();
  for(const r of members)for(const original of r.mergedFrom||[r])originals.set(key(original),structuredClone(original));
  // Keep current verified timing, also for the primary record of an existing group.
  for(const r of members)if(originals.has(key(r))){const copy=structuredClone(r);delete copy.mergedFrom;originals.set(key(r),copy)}
  root.mergedFrom=[...originals.values()];
  root.displayTema=group.title;root.compactTitle=group.title;
  root.mergeNote=group.note;
  const targets=new Map();
  for(const r of members)for(const target of r.targets||[]){
   const id=target.audioURL||target.url||String(target.number),previous=targets.get(id);
   if(!previous){targets.set(id,structuredClone(target));continue}
   const evidence=new Map((previous.evidence||[]).map(e=>[JSON.stringify([e.timeURL,e.label]),e]));
   for(const e of target.evidence||[])evidence.set(JSON.stringify([e.timeURL,e.label]),structuredClone(e));
   previous.evidence=[...evidence.values()];
  }
  root.targets=[...targets.values()];
  root.cile=[...new Set(members.flatMap(r=>(r.cile||'').split(',').filter(Boolean)))].join(',');
  if(!archival){
   assert(members.every(r=>r.stav===root.stav),'Different statuses need an explicit manual decision');
   if(members.some(r=>r.kategorie==='Sliby'))root.kategorie='Sliby';
  }
  rows=rows.filter(r=>r===root||!members.includes(r));
 }
 return rows;
}
data.findings=consolidate(data.findings);
data.archive.findings=consolidate(data.archive.findings,true);
assert.deepEqual(data.archive.findings.map(key),data.findings.map(key));
for(const [i,r] of data.findings.entries())r.index=i+1;
for(const [i,r] of data.archive.findings.entries())r.index=i+1;
data.classification.categoryCounts=Object.fromEntries(data.classification.categories.map(v=>[v,data.findings.filter(r=>r.kategorie===v).length]));
data.classification.statusCounts=Object.fromEntries(data.classification.statuses.map(v=>[v,data.findings.filter(r=>r.stav===v).length]));
for(const section of data.sections.options)section.count=data.findings.filter(r=>r.section===section.id).length;
data.sections.review.reviewedFindings=data.findings.length;
data.consolidation={...data.consolidation,date:review.date,uniqueFindings:data.findings.length,
 groups:data.findings.filter(r=>r.mergedFrom).map(r=>({candidate:r.candidate,members:r.mergedFrom.map(m=>m.candidate),memberKeys:r.mergedFrom.map(key),title:r.displayTema||r.tema})),
 latestBatch:{date:review.date,groups:review.groups.filter(group=>group.batch===(review.batchId||review.date)).length,scope:review.scope,reviewFile:'sliby/duplicate-review.json'}};
fs.writeFileSync(file,html.replace(pattern,(_,before,content,after)=>before+JSON.stringify(data)+after));
console.log(`${data.findings.length} records; ${data.sections.options.find(s=>s.id==='episodes').count} episode topics; ${review.groups.length} reviewed groups.`);

#!/usr/bin/env node
'use strict';
// One-off, repeatable, lossless correction of episode-promise scope.
// The reviewed keys contain both candidate and original topic; candidate alone
// is not unique, e.g. two distinct records may share candidate 391.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const reportPath='sliby/index.html';
const reviewPath='sliby/episode-scope-review.json';
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
const html=fs.readFileSync(reportPath,'utf8');
const beginTag='<script type="application/json" id="audit-data">';
const start=html.indexOf(beginTag);
assert(start>=0,'Embedded audit data tag missing');
const startJson=start+beginTag.length;
const endJson=html.indexOf('</script>',startJson);
assert(endJson>startJson,'Embedded audit data closing tag missing');
const json=html.slice(startJson,endJson);
const data=JSON.parse(json);
const key=r=>JSON.stringify([r.candidate,r.tema]);
const entries=new Map(review.entries.map(r=>[key(r),r]));
assert.equal(review.entries.length,53);
assert.equal(entries.size,53,'Repeated review keys');
assert.equal(data.findings.length,897);
assert.equal(data.archive.findings.length,data.findings.length);
assert.deepEqual(data.findings.map(key),data.archive.findings.map(key),'Archive and live row identities diverged');
const sectionCount=(list,section)=>list.filter(r=>r.section===section).length;
const beforeEp=sectionCount(data.findings,'episodes');
const alreadyDone=beforeEp===review.expectedEpisodes;
assert(beforeEp===review.previousEpisodes||alreadyDone,'Unexpected initial episode count');
assert.equal(sectionCount(data.findings,'other'),alreadyDone?review.expectedOther:review.previousOther);
assert.equal(data.sections.options.length,2);
assert.deepEqual(data.sections.options.map(o=>o.id),['episodes','other']);
const beforeNoScope=(list)=>list.map(r=>{
 const clone={...r};delete clone.section;delete clone.sectionReason;return clone;
});
const originalRows=beforeNoScope(data.findings),originalArchive=beforeNoScope(data.archive.findings);
const modify=(list)=>{
 let changed=0;
 for(const row of list){
  const match=entries.get(key(row));
  if(!match)continue;
  if(row.section==='episodes'){
   row.section='other';
   row.sectionReason=match.why;
   changed++;
  }else{
   assert.equal(row.section,'other','Reviewed key has moved to an unexpected category');
  }
 }
 return changed;
};
const updated=modify(data.findings);
assert.equal(modify(data.archive.findings),updated,'Archive/live row corrections disagree');
assert.equal(updated,alreadyDone?0:53,'Incorrect number of rows moved');
for(const entry of review.entries){
 assert.equal(data.findings.filter(r=>key(r)===key(entry)).length,1,'Reviewed identity does not occur exactly once');
}
assert.deepEqual(beforeNoScope(data.findings),originalRows,'Unexpected change to findings outside scope classification');
assert.deepEqual(beforeNoScope(data.archive.findings),originalArchive,'Unexpected change to archive outside scope classification');
assert.equal(sectionCount(data.findings,'episodes'),review.expectedEpisodes);
assert.equal(sectionCount(data.findings,'other'),review.expectedOther);
assert.equal(sectionCount(data.archive.findings,'episodes'),review.expectedEpisodes);
assert.equal(sectionCount(data.archive.findings,'other'),review.expectedOther);
for(const option of data.sections.options){
 option.count=sectionCount(data.findings,option.id);
}
data.sections.rule='Mezi Epizody patří jen výslovný slib nebo námět na nový podcastový díl (včetně plánované tematické série). Krátká zmínka či odpověď v jiném dílu, návrat v tomtéž dílu, přednáška, článek, samostatné video, jiné médium a žertovná narážka patří mezi Ostatní. Sliby a Nápady se rozlišují nezávisle podle závaznosti.';
data.sections.review.date=review.date;
data.sections.review.reviewedFindings=data.findings.length;
// The previous review was a historical source classification. Preserve it and
// separately record the present stricter 53-key editorial correction.
data.sections.scopeCorrection={
 date:review.date,reviewFile:reviewPath,
 movedFromEpisodes:review.changed,
 previousEpisodes:review.previousEpisodes,
 finalEpisodes:review.expectedEpisodes,
 finalOther:review.expectedOther
};
assert.equal(data.classification.categoryCounts['Sliby'],463);
assert.equal(data.classification.categoryCounts['Návrhy / nápady'],434);
assert.equal(Object.values(data.classification.statusCounts).reduce((a,b)=>a+b,0),data.findings.length);
const originalJson=JSON.stringify(data);
const pretty=json.includes('\n');
const newJson=pretty?JSON.stringify(data,null,2):originalJson;
const nextHtml=html.slice(0,startJson)+newJson+html.slice(endJson);
assert.equal(nextHtml.slice(0,startJson),html.slice(0,startJson));
assert.equal(nextHtml.slice(startJson+newJson.length),html.slice(endJson));
if(nextHtml!==html)fs.writeFileSync(reportPath,nextHtml,'utf8');
console.log('PASS: moved '+updated+' exactly reviewed entries, episodes='+review.expectedEpisodes+
 ', other='+review.expectedOther+', total='+data.findings.length+
 '; all original identities, statuses, evidence and manual override keys preserved.');

#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('sliby/index.html','utf8');
const tag='<script type="application/json" id="audit-data">';
const start=html.indexOf(tag),end=html.indexOf('</script>',start);
assert(start>=0&&end>start,'Audit data block exists');
const data=JSON.parse(html.slice(start+tag.length,end));
const audit=JSON.parse(fs.readFileSync('sliby/episode-scope-review.json','utf8'));
const key=r=>JSON.stringify([r.candidate,r.tema]);
const checked=new Set(audit.entries.map(key));
assert.equal(checked.size,53);
assert.equal(data.findings.length,901);
assert.deepEqual(data.findings.map(key),data.archive.findings.map(key),'Archive retains exact historical rows');
for(const list of [data.findings,data.archive.findings]){
 assert.equal(list.filter(r=>r.section==='episodes').length,272);
 assert.equal(list.filter(r=>r.section==='other').length,629);
 for(const entry of audit.entries){
  const matches=list.filter(r=>key(r)===key(entry));
  assert.equal(matches.length,1,'Reviewed record must be unique: '+key(entry));
  assert.equal(matches[0].section,'other','Non-episode record remained in Episodes: '+key(entry));
  assert.equal(matches[0].sectionReason,entry.why,'Reason traceability preserved');
 }
}
assert.deepEqual(data.sections.options.map(x=>x.count),[272,629]);
assert.deepEqual(data.archive.sections.options.map(x=>x.count),[272,629], 'Reset archive section totals must match');
assert.equal(data.sections.review.reviewedFindings,901);
assert.equal(data.sections.scopeCorrection.movedFromEpisodes,53);
for(const field of ['kategorie','stav']){
 const counts=field==='kategorie'?data.classification.categoryCounts:data.classification.statusCounts;
 for(const [value,total] of Object.entries(counts))assert.equal(data.findings.filter(r=>r[field]===value).length,total);
}
console.log('PASS: all 53 exact review keys in Ostatni, 272 episode rows, 629 other rows, all 901 records and stable categories/statuses.');

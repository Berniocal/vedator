import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyReview,hash,key,readReport,writeReport,reviewHash} from './update-sliby-episode.mjs';
import {verifyPromises} from './verify-live-sliby.mjs';
const html=fs.readFileSync('sliby/index.html','utf8'),data=readReport(html);
// Every completed incremental review has a committed source manifest and live cards/evidence.
for(const receipt of data.episodeReviews||[]) {
  const review=JSON.parse(fs.readFileSync('tools/sliby-reviews/'+receipt.episode+'.json','utf8'));
  assert.equal(receipt.reviewHash,reviewHash(review));assert.equal(receipt.sha256,review.source.sha256);
  assert.equal(receipt.guid,review.guid);assert(receipt.completed&&receipt.fullRead);
  assert.equal(receipt.findingsAdded,review.additions.length);assert.equal(receipt.mentionsAdded,review.mentions.length);
  assert.equal(receipt.addedKeys.length,review.additions.length);assert.equal(receipt.mentionKeys.length,review.mentions.length);
  for(const k of receipt.addedKeys) {const row=data.findings.find(r=>key(r)===k);assert(row);assert.equal(row.episode,receipt.episode);assert(row.sourceURL.includes('/'+review.source.commit+'/'));}
  for(const k of receipt.mentionKeys) {const row=data.findings.find(r=>key(r)===k);assert(row?.targets.some(t=>t.number===receipt.episode&&t.evidence.some(e=>e.sourceURL?.includes('/'+review.source.commit+'/'))));}
  assert(data.readingProgress.files.some(f=>f.episode===receipt.episode&&f.sha256===receipt.sha256));
  assert(!data.missingRegular.includes(receipt.episode));assert(!data.readingProgress.availabilityCheck.missingEpisodes.includes(receipt.episode));
}
const ep={number:999,id:'test-guid',title:'Test',date:'2026-11-02',link:'https://example.org/e',enclosure:'https://example.org/a.mp3'};
const srt='1\n00:00:01,000 --> 00:00:02,000\nMožno nabudúce.\n\n2\n00:00:03,000 --> 00:00:05,000\nUž sme to dokončili.\n';
const base=structuredClone(data), oldKeys=base.findings.map(key), oldAliases=base.findings.map(r=>r.mergedFrom);
const review={schema:1,episode:999,guid:ep.id,date:'2026-11-02',fullRead:true,source:{commit:'a'.repeat(40),path:'titulky/test.srt',sha256:hash(srt),cueCount:2,videoID:'abcdefghijk',language:'sk',kind:'auto'},note:'Full review',timingNote:'Original source',additions:[],mentions:[],excluded:[]};
const empty=applyReview(base,review,srt,ep);assert(empty.changed);assert.equal(empty.data.findings.length,base.findings.length);assert.equal(empty.data.episodeReviews.at(-1).findingsAdded,0);
assert.equal(applyReview(empty.data,review,srt,ep).changed,false,'Zero findings must still complete the phase');
assert.throws(()=>applyReview(base,{...review,guid:'wrong'},srt,ep),/GUID/);
assert.throws(()=>applyReview(base,review,srt+'changed',ep),/hash/);
assert.throws(()=>applyReview(base,{...review,fullRead:false},srt,ep),/Full transcript/);
assert.throws(()=>applyReview(empty.data,{...review,note:'changed'},srt,ep),/explicit revision/);
const first=base.findings[0];
review.additions=[{tema:'Unique test commitment',kategorie:'Návrhy / nápady',section:'episodes',sectionReason:'Specific topic',cue:1,endCue:1,label:'Námět',vysvetleni:'A tentative idea.'}];
review.mentions=[{candidate:first.candidate,tema:first.tema,action:'repeat',cue:1,endCue:1,label:'Repeated',note:'Repeated announcement, no proof of fulfilment.'}];
const applied=applyReview(base,review,srt,ep);assert.equal(applied.data.findings.length,base.findings.length+1);
assert.deepEqual(applied.data.findings.slice(0,-1).map(key),oldKeys);assert.deepEqual(applied.data.findings.slice(0,-1).map(r=>r.mergedFrom),oldAliases);
assert.equal(applied.data.findings[0].stav,first.stav);assert.equal(applied.data.findings.at(-1).seconds,1);
assert(applied.data.findings.at(-1).candidate>Math.max(...base.candidateIndex.map(r=>r.id)),'IDs include historical mentions, not just visible cards');
assert.equal(applyReview(applied.data,review,srt,ep).changed,false);
assert.deepEqual(base,data,'Updater must not mutate the input');
assert.deepEqual(applied.data.readingProgress.completedBatches.slice(0,-1),data.readingProgress.completedBatches,'Historical snapshots stay intact');
assert.deepEqual(applied.data.archive.findings.map(key),applied.data.findings.map(key));
review.mentions[0].status='Splněno později';assert.throws(()=>applyReview(base,review,srt,ep),/cannot change status/);delete review.mentions[0].status;
review.mentions[0].tema='wrong';assert.throws(()=>applyReview(base,review,srt,ep),/Unknown stable/);review.mentions[0].tema=first.tema;
review.additions[0].cue=500;assert.throws(()=>applyReview(base,review,srt,ep),/cue range/);review.additions[0].cue=1;
review.additions[0].fulfilment={status:'Splněno později',cue:2,endCue:2,label:'Direct evidence',reason:'The complete undertaking is explicitly confirmed.'};
const fulfilled=applyReview(base,review,srt,ep);assert.equal(fulfilled.data.findings.at(-1).stav,'Splněno později');assert.equal(fulfilled.data.findings.at(-1).targets[0].evidence[0].sec,3);
delete review.additions[0].fulfilment;
review.additions[0].tema=first.tema;assert.throws(()=>applyReview(base,review,srt,ep),/Duplicate topic/);
const written=writeReport(html,applied.data);
const remove=h=>h.replace(/(<script type="application\/json" id="audit-data">)[\s\S]*?(<\/script>)/,'$1$2');
assert.equal(remove(written),remove(html),'HTML, CSS and executable JS must not change');
assert.deepEqual(readReport(written),applied.data);
assert.equal(verifyPromises(html,html).findings,data.findings.length);
assert.throws(()=>verifyPromises(html,written),/differs/);
assert.throws(()=>verifyPromises(html,'<html>bad response</html>'),/audit-data/);
console.log('Promises incremental review, stable personal keys, zero-results, retry and live artifact checks OK.');

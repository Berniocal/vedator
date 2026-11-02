// Build-time only. Semantic extraction is reviewed against the FULL transcript first.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const reviewHash = review => hash(JSON.stringify(review));
export const key = row => JSON.stringify([row.candidate, row.tema]);
const pattern = /(<script type="application\/json" id="audit-data">)([\s\S]*?)(<\/script>)/;
export function readReport(html) {
  assert(pattern.test(html), 'Missing audit-data');
  return JSON.parse(html.match(pattern)[2]);
}
export function writeReport(html, data) {
  // Replace data only, leave CSS, HTML and executable script byte-for-byte intact.
  return html.replace(pattern, (_, before, old, after) => before + JSON.stringify(data).replace(/</g, '\\u003c') + after);
}
export const time = seconds => [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, Math.floor(seconds) % 60].map(n => String(n).padStart(2,'0')).join(':');
export function parseSrt(text) {
  const rows = []; let offset = 0;
  for (const block of text.replace(/\r/g,'').trim().split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const stamp = lines[1]?.match(/^(\d{2,}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2,}):(\d{2}):(\d{2}),(\d{3})$/);
    assert(stamp && Number(lines[0]) === rows.length + 1, 'Invalid SRT cue');
    const sec = i => +stamp[i]*3600 + +stamp[i+1]*60 + +stamp[i+2] + +stamp[i+3]/1000;
    const start = +sec(1).toFixed(3), end = +sec(5).toFixed(3);
    assert(end >= start && (!rows.length || start >= rows.at(-1).seconds), 'Invalid SRT timing');
    assert(lines.slice(2).join(' ').trim(), 'Empty SRT cue');
    rows.push({cue: rows.length+1, seconds:start, end, line:offset+1, text:lines.slice(2).join(' ')});
    offset += lines.length + 1;
  }
  return rows;
}
function validateReview(review, episode) {
  assert.equal(review.schema, 1);
  assert.equal(review.fullRead, true, 'Full transcript review required, including zero findings');
  assert.equal(review.episode, episode.number);
  assert.equal(review.guid, episode.id, 'Wrong RSS GUID');
  assert.match(review.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(review.source.sha256, /^[a-f0-9]{64}$/);
  assert.match(review.source.commit, /^[a-f0-9]{40}$/);
  assert.match(review.source.path, /^titulky\/[^/]+\.srt$/);
  assert.match(review.source.videoID, /^[\w-]{11}$/);
  assert(review.source.language && ['manual','auto'].includes(review.source.kind));
  assert(review.note?.trim() && review.timingNote?.trim(), 'Missing review/timing explanation');
  assert(Array.isArray(review.additions) && Array.isArray(review.mentions));
  assert(Array.isArray(review.excluded), 'Record excluded ambiguous/promotional statements');
  assert(Number.isInteger(review.source.cueCount) && review.source.cueCount>0);
}
function evidence(input, review, cues, episode) {
  const start = cues[input.cue-1], end = cues[input.endCue-1];
  assert(start && end && end.cue >= start.cue, 'Invalid evidence cue range');
  assert(input.label?.trim(), 'Evidence needs a label');
  const quote = cues.slice(start.cue-1,end.cue).map(c=>c.text).join(' ');
  return { episode:review.episode, file:review.source.path.split('/').at(-1),
    time:time(start.seconds), sec:start.seconds, seconds:start.seconds, line:start.line,
    cue:start.cue, endCue:end.cue, label:input.label, quote,
    sourceURL:'https://github.com/Berniocal/vedator-test/blob/'+review.source.commit+'/'+review.source.path.split('/').map(encodeURIComponent).join('/')+'#L'+start.line,
    timeURL:episode.enclosure+'#t='+start.seconds };
}
export function applyReview(original, review, srt, episode) {
  validateReview(review, episode);
  assert.equal(hash(srt),review.source.sha256,'SRT hash mismatch');
  const cues = parseSrt(srt);
  assert.equal(cues.length,review.source.cueCount,'Truncated transcript');
  const previous = (original.episodeReviews||[]).find(r=>r.guid===review.guid || r.episode===review.episode);
  if(previous) {
    assert.equal(previous.guid,review.guid,'Episode identity changed');
    assert.equal(previous.sha256,review.source.sha256,'Changed transcript requires explicit re-review');
    assert.equal(previous.reviewHash,reviewHash(review),'Changed review requires explicit revision');
    return {data:original,changed:false};
  }
  const data = structuredClone(original);
  assert(!data.readingProgress.files.some(f=>f.episode===review.episode),'Already fully audited: reuse historical review, do not duplicate');
  const batch = Math.max(0,...data.readingProgress.completedBatches.map(b=>b.batch))+1;
  const allRows = [...data.findings,...data.archive.findings,...data.findings.flatMap(r=>r.mergedFrom||[])];
  let next = Math.max(0,...allRows.map(r=>Number(r.candidate)||0),...data.candidateIndex.map(r=>Number(r.id)||0));
  let index = Math.max(0,...data.findings.map(r=>Number(r.index)||0));
  const addedKeys = [], mentionKeys = [], seenTopics = new Set(data.findings.flatMap(r=>[r.tema,...(r.mergedFrom||[]).map(m=>m.tema)]).map(t=>t.normalize('NFC').trim().toLowerCase()));
  for(const item of review.additions) {
    assert(data.classification.categories.includes(item.kategorie));
    assert(['episodes','other'].includes(item.section));
    assert(item.tema?.trim() && item.vysvetleni?.trim() && item.sectionReason?.trim());
    const topic = item.tema.normalize('NFC').trim().toLowerCase();
    assert(!seenTopics.has(topic),'Duplicate topic: attach a mention to its stable key');seenTopics.add(topic);
    const ev = evidence(item,review,cues,episode), candidate = ++next;
    const row = {id:String(candidate),candidate,index:++index,kategorie:item.kategorie,tema:item.tema,
      stav:'Nesplněno',cile:'',vysvetleni:item.vysvetleni,episode:review.episode,episodeLabel:String(review.episode),sourceTitle:episode.title,
      time:ev.time,seconds:ev.sec,file:ev.file,line:ev.line,sourceURL:ev.sourceURL,playURL:'https://bernio.cz/vedator/#episode='+review.episode,
      targets:[],fullRead:true,reviewBatch:batch,timingStatus:null,quote:ev.quote,
      originalCategory:item.kategorie==='Sliby'?'Slib / plán':'Nápad',originalStatus:'Nedohledáno',
      section:item.section,sectionReason:item.sectionReason,outcomeNote:'Úplné splnění se zatím nepodařilo doložit.',categoryNote:'',
      sourceRecording:{number:review.episode,title:episode.title,date:episode.date,audioURL:episode.enclosure},timeURL:ev.timeURL,
      sourceEvidence:ev};
    if(item.fulfilment) {
      assert(['Splněno později','Splněno už dříve'].includes(item.fulfilment.status));
      assert(item.fulfilment.reason?.trim(),'Fulfilment needs explicit proof');
      const proof=evidence(item.fulfilment,review,cues,episode);
      row.stav=item.fulfilment.status;row.outcomeNote=item.fulfilment.reason;row.cile=String(review.episode);
      row.targets.push({number:review.episode,title:episode.title,date:episode.date,url:episode.link,audioURL:episode.enclosure,timeURL:episode.enclosure+'#t=0',evidence:[{...proof,verification:'fulfilment'}]});
    }
    data.findings.push(row);data.archive.findings.push(structuredClone(row));addedKeys.push(key(row));
    data.candidateIndex.push({id:candidate,file:ev.file,episode:review.episode,time:ev.time,sec:ev.sec,start:item.cue,end:item.endCue,reviewBatch:batch});
  }
  for(const item of review.mentions) {
    const targetKey = JSON.stringify([item.candidate,item.tema]);
    const row = data.findings.find(r=>key(r)===targetKey);
    const archived = data.archive.findings.find(r=>key(r)===targetKey);
    assert(row && archived,'Unknown stable target key');
    assert(item.note?.trim(),'Mention needs an interpretation');
    assert(['repeat','fulfilment'].includes(item.action),'Specify repeat or evidenced fulfilment');
    const ev = evidence(item,review,cues,episode);
    if(item.action==='fulfilment') {
      assert(['Splněno později','Splněno už dříve'].includes(item.status),'Invalid fulfilment status');
      assert(item.fulfilmentReason?.trim(),'Fulfilment needs explicit proof, not a matching topic');
    } else assert(item.status===undefined,'A repeated announcement cannot change status');
    // No new personal-state alias is needed: the existing card keeps candidate + tema.
    for(const target of [row,archived]) {
      let episodeTarget = target.targets.find(t=>t.number===review.episode);
      if(!episodeTarget) {episodeTarget={number:review.episode,title:episode.title,date:episode.date,url:episode.link,audioURL:episode.enclosure,timeURL:episode.enclosure+'#t=0',evidence:[]};target.targets.push(episodeTarget);}
      episodeTarget.evidence.push({...ev,label:item.label+' — '+item.note,verification:item.action});
      target.vysvetleni += ' '+item.note;
      target.cile = [...new Set(target.targets.map(t=>t.number))].join(',');
      if(item.action==='fulfilment') {target.stav=item.status;target.outcomeNote=item.fulfilmentReason;}
    }
    mentionKeys.push(targetKey);
  }
  // Preserve every old identity and merged alias used by localStorage.
  for(const old of original.findings) {
    const current = data.findings.find(r=>key(r)===key(old));
    assert(current && JSON.stringify(current.mergedFrom)===JSON.stringify(old.mergedFrom),'Personal keys/aliases changed');
  }
  const file=review.source.path.split('/').at(-1), sourceURL='https://github.com/Berniocal/vedator-test/blob/'+review.source.commit+'/'+review.source.path;
  data.date=review.date; data.sourceSHA=review.source.commit;
  data.stage=data.stage.replace(/; 361 čeká na přepis$/,'')+'; souvisle dokončen díl '+review.episode+' dne '+review.date;
  const progress=data.readingProgress, availability=progress.availabilityCheck;
  progress.files.push({episode:review.episode,file,sha256:review.source.sha256,status:'Přečten celý přepis',cueCount:cues.length,start:time(cues[0].seconds),lastCue:time(cues.at(-1).seconds),findingsAdded:review.additions.length,note:review.note,transcriptQuality:'YouTube '+review.source.language+' '+review.source.kind+'; zvuk neověřen. '+review.timingNote});
  progress.completedBatches.push({batch,episodes:[review.episode],date:review.date,sourceSHA:review.source.commit,cueCount:cues.length,addedFindings:review.additions.length,addedMentions:review.mentions.length,confirmedExistingFindings:0,updatedOlderFindings:new Set(mentionKeys).size,consolidatedExistingFindings:[],sourceAvailability:{srt:1,txt:0,missingEpisodes:[],txtEpisodes:[],recoveredEpisodes:[review.episode]},summary:review.note});
  availability.date=review.date;availability.checkedCurrentSourceSHA=review.source.commit;
  availability.episodes.push(review.episode);availability.srt++;
  for(const k of ['regularEpisodes','newlyAvailableEpisodes'])if(Array.isArray(availability[k])&&!availability[k].includes(review.episode))availability[k].push(review.episode);
  availability.missingEpisodes=availability.missingEpisodes.filter(n=>n!==review.episode);
  progress.pendingMissingTranscripts=progress.pendingMissingTranscripts.map(r=>r.episode===review.episode?{...r,status:'Přepis dodán a celý přečten',catalogOnly:false,resolved:true,date:review.date}:r);
  progress.nextBatch={episodes:[],startEpisode:review.episode+1,status:'Čeká na další pravidelný díl; historické mezery zůstávají evidované zvlášť'};
  const knownFile=data.files.find(r=>r.file===file);
  if(knownFile) {
    assert.equal(knownFile.sha256,review.source.sha256,'Source inventory hash differs');
    Object.assign(knownFile,{fullRead:true,scan:'Souvisle přečten celý přepis; zvuk neověřen',findingCount:review.additions.length,mentionCount:review.mentions.length,url:sourceURL});
  }
  if(!knownFile) {data.files.push({file,episode:review.episode,cueCount:cues.length,sha256:review.source.sha256,findingCount:review.additions.length,mentionCount:review.mentions.length,fullRead:true,scan:'Souvisle přečten celý přepis; zvuk neověřen',url:sourceURL});data.srtCount++;data.cueCount+=cues.length;}
  for(const k of ['missingRegular','missingFAQ'])data[k]=data[k].filter(n=>n!==review.episode);
  data.nextSteps=data.nextSteps.filter(t=>!t.startsWith('Po dodání souvisle přečíst '+review.episode+'.'));
  data.nextSteps.unshift('Průběžně zpracovávat sliby a nápady dalších pravidelných dílů; historické mezery doplňovat samostatně podle inventáře.');
  data.candidateCount+=review.additions.length;
  data.classification.categoryCounts=Object.fromEntries(data.classification.categories.map(c=>[c,data.findings.filter(r=>r.kategorie===c).length]));
  data.classification.statusCounts=Object.fromEntries(data.classification.statuses.map(s=>[s,data.findings.filter(r=>r.stav===s).length]));
  for(const section of data.sections.options)section.count=data.findings.filter(r=>r.section===section.id).length;
  data.sections.review.date=review.date;data.sections.review.reviewedFindings=data.findings.length;
  data.consolidation.uniqueFindings=data.findings.length;data.consolidation.originalFindings+=review.additions.length;
  const receipt={schema:1,episode:review.episode,guid:review.guid,sha256:review.source.sha256,reviewHash:reviewHash(review),date:review.date,source:review.source,fullRead:true,completed:true,addedKeys,mentionKeys,findingsAdded:addedKeys.length,mentionsAdded:mentionKeys.length};
  (data.episodeReviews??=[]).push(receipt);
  for(const [k,v] of Object.entries(data))if(k!=='archive'&&k!=='findings')data.archive[k]=structuredClone(v);
  return {data,changed:true};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [reviewPath,srtPath]=process.argv.slice(2);
  assert(reviewPath&&srtPath,'Usage: node tools/update-sliby-episode.mjs review.json /path/to/full.srt');
  const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
  const episode=JSON.parse(fs.readFileSync('episodes.json','utf8')).episodes.find(e=>e.id===review.guid&&e.number===review.episode);
  assert(episode,'Episode not found in current catalog');
  const html=fs.readFileSync('sliby/index.html','utf8');
  const result=applyReview(readReport(html),review,fs.readFileSync(srtPath,'utf8'),episode);
  if(result.changed)fs.writeFileSync('sliby/index.html',writeReport(html,result.data));
  console.log(result.changed?'Applied full transcript review '+review.episode:'Already applied, no changes');
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
const mappings=JSON.parse(fs.readFileSync('episode-videos.json','utf8'));
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const audit=JSON.parse(fs.readFileSync('video-audits/youtube-links-2026-11-18.json','utf8'));
const byGuid=new Map(data.episodes.map(e=>[e.id,e])),byEpisode=new Map(mappings.map(m=>[m.episode,m]));
const proofByGuid=new Map(audit.videos.map(v=>[v.guid,v]));
assert(mappings.length>=audit.totalCount);assert.equal(byEpisode.size,mappings.length);
assert.equal(mappings.filter(m=>proofByGuid.has(m.guid)).length,audit.totalCount);
assert.equal(new Set(mappings.map(m=>m.guid)).size,mappings.length);
assert.equal(audit.addedCount,audit.totalCount-audit.originalMappings.length);
for(const original of audit.originalMappings)for(const [key,value] of Object.entries(original))assert.deepEqual(byEpisode.get(original.episode)?.[key],value,'Preserve previous video, caption and MP3 mappings');
const byVideo=new Map();
for(const m of mappings){
  const episode=byGuid.get(m.guid),proof=proofByGuid.get(m.guid);
  assert(episode&&episode.number===m.episode,'Video belongs to the exact RSS GUID/internal episode ID');
  assert.equal(episode.youtubeId,m.youtubeId);assert(/^[A-Za-z0-9_-]{11}$/.test(m.youtubeId));
  if(proof){
    assert(proof.youtubeId===m.youtubeId&&proof.rssTitle===episode.title);
    assert.equal(new URL(proof.source).protocol,'https:');
    assert(['vedator.space','www.youtube.com'].includes(new URL(proof.source).hostname));
    assert(proof.youtubeTitle&&proof.authorUrl);
    if(proof.match==='reviewed-title-variant')assert(proof.reviewNote,'Title variants need explicit review evidence');
  }
  assert.equal(episode.captionFile,m.captionFile,'Video links alone never create captions; later caption additions remain supported');
  const entries=byVideo.get(m.youtubeId)||[];entries.push(episode);byVideo.set(m.youtubeId,entries);
}
for(const entries of byVideo.values())if(entries.length>1)assert.equal(new Set(entries.map(e=>e.enclosure)).size,1,'Shared video IDs only for duplicate RSS records of identical audio');
assert.equal(data.episodes.filter(e=>e.youtubeId).length,mappings.length);
for(let number=1;number<=363;number++)assert(byEpisode.has(number),'The reviewed regular episodes 1–363 retain their verified videos');
assert.notEqual(byEpisode.get(142).youtubeId,byEpisode.get(1642).youtubeId,'The two episodes numbered 142 must retain their separate videos');
for(const row of audit.unmatched){assert(byGuid.has(row.guid));assert(row.reason)}
console.log(`Video catalog OK: ${mappings.length} episode mappings, ${audit.addedCount} added, original caption bindings unchanged, ${audit.unmatched.length} unavailable/unmatched.`);

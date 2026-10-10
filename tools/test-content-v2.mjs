import fs from 'node:fs';
import './test-v2-mathjax-data.mjs';
import './test-summary-audit.mjs';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const seriesConfig=JSON.parse(fs.readFileSync('series.json','utf8'));
const fail=message=>{throw new Error(message)};

if(data.schema!==3)fail(`Unexpected schema ${data.schema}`);
if(!Array.isArray(data.episodes)||data.episodes.length<380)fail(`Too few episodes: ${data.episodes?.length}`);
if(!Array.isArray(data.questions)||data.questions.length<700)fail(`Questions missing or unexpectedly few: ${data.questions?.length}`);
if(data.questions.some(q=>!q.title||!Array.isArray(q.points)||!q.points.length))fail('Question with missing title/answer detected');
if(data.questions.some(q=>!q.i18n?.cs?.title||!q.i18n?.sk?.title||!Array.isArray(q.i18n.cs.points)||!Array.isArray(q.i18n.sk.points)))fail('Question translation bundle missing');
if(!Array.isArray(seriesConfig)||!Array.isArray(data.series)||data.series.length!==seriesConfig.length)fail('Series configuration mismatch');
if(data.series.some(series=>!series.i18n?.cs||!series.i18n?.sk))fail('Series translation missing');

const nuclear142=data.episodes.find(e=>e.id==='vedatorskypodcast.podbean.com/1f82b1fe-7f02-3fee-bb80-d8e5c028db88');
const webb142=data.episodes.find(e=>e.id==='vedatorskypodcast.podbean.com/16637ee2-55d2-330a-96db-861b1b9f1c10');
if(nuclear142?.number!==142||webb142?.number!==1642||webb142?.displayNumber!==142||webb142?.sourceNumber!==142)fail('The two different episode 142s must retain separate playback IDs');
if(nuclear142?.enclosure===webb142?.enclosure||!webb142?.enclosure?.endsWith('/ep_webb.mp3'))fail('Webb episode 142 must play its own audio');

const episodeNumbers=new Set(data.episodes.map(e=>Number(e.number)));
for(const q of data.questions){if(!episodeNumbers.has(Number(q.episode)))fail(`Question points to missing episode ${q.episode}`)}
for(const series of data.series){
  const refs=(series.episodes||[]).map(Number);
  if(refs.some(number=>!episodeNumbers.has(number)))fail(`Series ${series.name} points to a missing episode`);
}

const non=data.nonquestions?.episodes;
if(!non||Object.keys(non).length<10)fail('Nonquestion summaries missing');
// Regression: every chapter must survive the summary build and be available to the V2 renderer.
for(const [n,expectedChapters] of [[49,23],[50,30],[52,14]]){
  const episode=non[String(n)];
  if(!episode||!Array.isArray(episode.cs)||!Array.isArray(episode.sk)||episode.cs.length!==expectedChapters||episode.sk.length!==expectedChapters)fail(`Episode ${n} summary not published in both languages (expected ${expectedChapters} chapters)`);
  for(const lang of ['cs','sk']){
    for(const item of episode[lang]){
      if(!item?.title?.trim()||!/^\\d{2}:\\d{2}$/.test(item.time||'')||!Array.isArray(item.points)||item.points.length===0)fail(`Episode ${n} ${lang} has incomplete chapter data`);
    }
  }
}
for(const n of [157,159,160,161,162,163,164,165,166]){
  const episode=non[String(n)];
  if(!episode||!Array.isArray(episode.cs)||!Array.isArray(episode.sk)||!episode.cs.length||episode.cs.length!==episode.sk.length)fail(`Episode ${n} bilingual summary missing or mismatched`);
  for(const lang of ['cs','sk']){
    for(const item of episode[lang]){
      if(!item?.title?.trim().endsWith('?'))fail(`Episode ${n} ${lang} title is not a question: ${item?.title}`);
      if(!/^\d{2}:\d{2}$/.test(item.time||''))fail(`Episode ${n} ${lang} has invalid timestamp: ${item?.time}`);
      if(!Array.isArray(item.points)||item.points.length<1)fail(`Episode ${n} ${lang} has missing points`);
    }
  }
}

console.log(`content-v2 OK: ${data.episodes.length} episodes, ${data.questions.length} questions, ${Object.keys(non).length} summarized episodes.`);

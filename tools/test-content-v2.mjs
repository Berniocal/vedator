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

// Every RSS item, including the unnumbered specials, must have its own player
// identity and preserve the exact source MP3. Also guards daily RSS rebuilds.
const sourceEpisodes=JSON.parse(fs.readFileSync('episodes.json','utf8')).episodes;
const byGuid=new Map(data.episodes.map(e=>[e.id,e]));
const numbers=data.episodes.map(e=>Number(e.number));
if(data.episodes.length!==sourceEpisodes.length||byGuid.size!==sourceEpisodes.length)fail('RSS items were lost or duplicated in V2');
if(new Set(numbers).size!==numbers.length||numbers.some(n=>!Number.isInteger(n)||n<1||n>=2048))fail('Playback IDs must be unique integers in the playlist-ref range');
for(const source of sourceEpisodes){
  const built=byGuid.get(source.id);
  if(!built||built.enclosure!==source.enclosure)fail(`Wrong MP3 for RSS item: ${source.title}`);
  if(!Number(source.number)&&(!built.number||(!built.displayNumber&&!built.unnumbered)))fail(`Unnumbered special lacks playback identity: ${source.title}`);
  if(built.unnumbered&&Number(source.number))fail(`Regular episode incorrectly marked as standalone: ${source.title}`);
}
// Special translations must retain every original RSS link, including query
// separators and promo links inside a multi-paragraph Podbean <p>.
const decodeHref=value=>String(value).replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const htmlLinks=value=>[...String(value||'').matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m=>decodeHref(m[1]??m[2])).filter(url=>/^https?:\/\//i.test(url)).sort();
for(const source of sourceEpisodes.filter(e=>!Number(e.number))){
  const built=byGuid.get(source.id),expected=htmlLinks(source.description);
  if(built.date!==source.date)fail(`Special changed publication date: ${source.title}`);
  for(const [label,rich] of [['base',built.fullDescriptionHtml],['sk',built.i18n?.sk?.fullDescriptionHtml],['cs',built.i18n?.cs?.fullDescriptionHtml]]){
    if(label!=='base'&&!built.i18n?.[label])continue;
    if(JSON.stringify(htmlLinks(rich))!==JSON.stringify(expected))fail(`Special ${label} HTML lost or changed RSS URLs: ${source.title}`);
  }
}
const nanosatellite=byGuid.get('vedatorskypodcast.podbean.com/5004d1e0-bb5f-31da-b4a8-22641ddb2a2d');
if(/V podcaste rozprávame/.test(nanosatellite?.i18n?.cs?.fullDescriptionHtml||''))fail('Space talk 7 duplicated its translated second paragraph in Slovak');
// Regression: the special-series local ordinal 8..15 must never translate the
// unrelated Vedátorský podcast 8..15 (and inherit its earlier publication date).
for(let ordinal=1;ordinal<=15;ordinal++){
  const source=sourceEpisodes.find(e=>new RegExp('^Rozhovory o vesmíre\\s+'+ordinal+'\\b','i').test(String(e.title).replace(/\s+/g,' ')));
  if(!source)fail(`Space talk ${ordinal} missing in RSS`);
  const special=byGuid.get(source.id);
  if(!special||special.number!==1700+ordinal)fail(`Space talk ${ordinal} points to wrong internal ID`);
  if(special.date!==source.date||special.enclosure!==source.enclosure)fail(`Space talk ${ordinal} changed publication date or MP3`);
  if(!new RegExp('^Rozhovory o vesmíru\\s+'+ordinal+'\\b','i').test(special.i18n?.cs?.title||''))
    fail(`Space talk ${ordinal} missing Czech title or translated wrong record`);
  if(String(special.i18n?.sk?.title||'').replace(/\s+/g,' ').trim()!==String(source.title||'').replace(/\s+/g,' ').trim())fail(`Space talk ${ordinal} lost original Slovak title`);
  const regular=data.episodes.find(e=>e.number===ordinal);
  if(regular&&/^Rozhovory o vesmíru\s+\d+/i.test(regular.i18n?.cs?.title||''))
    fail(`Regular podcast ${ordinal} received a special-series Czech translation`);
}
const duplicate113=data.episodes.find(e=>e.id==='vedatorskypodcast.podbean.com/f7a0b29b-66bb-3090-9661-9c2b597593f9');
if(duplicate113?.number!==1613||duplicate113.displayNumber!==113)fail('Reposted episode 113 must retain distinct playback identity');
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
      if(!item?.title?.trim()||!/^\d{2}:\d{2}$/.test(item.time||'')||!Array.isArray(item.points)||item.points.length===0)fail(`Episode ${n} ${lang} has incomplete chapter data`);
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

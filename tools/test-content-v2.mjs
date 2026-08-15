import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const seriesConfig=JSON.parse(fs.readFileSync('series.json','utf8'));
const fail=message=>{throw new Error(message)};
const SPECIAL_ALIAS_BASES={vesmir:1700,genetika:1800,veda:1900};

function configRefNumber(raw){
  if(typeof raw==='number')return raw;
  const match=String(raw||'').trim().toLowerCase().match(/^(vesmir|genetika|veda):(\d+)$/);
  return match?SPECIAL_ALIAS_BASES[match[1]]+Number(match[2]):NaN;
}
function configRefNumbers(raw){
  const number=configRefNumber(raw);
  if(!Number.isInteger(number))return [number];
  if(typeof raw==='string')return [number];
  const matches=data.episodes.filter(episode=>Number(episode.number)===number);
  return matches.length?matches.map(()=>number):[number];
}
function sameMultiset(a,b){
  if(a.length!==b.length)return false;
  const counts=new Map();
  for(const value of a)counts.set(value,(counts.get(value)||0)+1);
  for(const value of b){
    const left=(counts.get(value)||0)-1;
    if(left<0)return false;
    if(left===0)counts.delete(value);else counts.set(value,left);
  }
  return counts.size===0;
}

if(data.schema!==3)fail(`Unexpected schema ${data.schema}`);
if(!Array.isArray(data.episodes)||data.episodes.length<380)fail(`Too few episodes: ${data.episodes?.length}`);
if(!Array.isArray(data.questions))fail('Questions missing');
if(data.questions.length!==734)fail(`Expected 734 questions, got ${data.questions.length}`);
if(new Set(data.questions.map(q=>q.episode)).size!==42)fail(`Expected 42 FAQ episodes, got ${new Set(data.questions.map(q=>q.episode)).size}`);
if(data.questions.some(q=>!q.title||!Array.isArray(q.points)||!q.points.length))fail('Question with missing title/answer detected');
if(data.questions.some(q=>!q.i18n?.cs?.title||!q.i18n?.sk?.title||!Array.isArray(q.i18n.cs.points)||!Array.isArray(q.i18n.sk.points)))fail('Question translation bundle missing');
if(!Array.isArray(seriesConfig))fail('series.json root must be an array');
if(!Array.isArray(data.series)||data.series.length!==seriesConfig.length)fail(`Expected ${seriesConfig.length} configured series, got ${data.series?.length}`);
if(data.series.some(series=>!series.i18n?.cs||!series.i18n?.sk))fail('Series translation missing');
const nonEpisodes=Object.keys(data.nonquestions?.episodes||{});
if(nonEpisodes.length<10)fail(`Too few nonquestion episodes: ${nonEpisodes.length}`);
for(const n of [292,293,294,296,297,298,299,301,302,303,304,305,306,307,308,309,310,311,312,315,318,320,321,322,323,324,325,334,335,336,338,339,341,342,343,344,345,347]){
  if(!data.nonquestions.episodes[String(n)])fail(`Missing nonquestion episode ${n}`);
}
const episodeNumbers=new Set(data.episodes.map(e=>Number(e.number)));
for(const q of data.questions){if(!episodeNumbers.has(Number(q.episode)))fail(`Question points to missing episode ${q.episode}`)}
for(const series of data.series){
  const refs=(series.episodes||[]).map(Number);
  if(refs.some(number=>!episodeNumbers.has(number)))fail(`Series ${series.name} points to a missing episode`);
}

for(const configured of seriesConfig){
  const series=data.series.find(item=>item.name===configured.cs);
  if(!series)fail(`Configured series missing from bundle: ${configured.cs}`);
  if(series.i18n?.cs!==configured.cs||series.i18n?.sk!==configured.sk)fail(`Series language names differ from series.json: ${configured.cs}`);
  if(Boolean(series.people)!==Boolean(configured.people))fail(`Series people flag differs from series.json: ${configured.cs}`);
  const expected=(configured.episodes||[]).flatMap(configRefNumbers);
  if(expected.some(number=>!Number.isInteger(number)||!episodeNumbers.has(number)))fail(`series.json contains unresolved episode in ${configured.cs}`);
  const actual=(series.episodes||[]).map(Number);
  if(!sameMultiset(actual,expected))fail(`Series membership differs from series.json: ${configured.cs}`);

  for(const raw of configured.episodes||[]){
    if(typeof raw!=='string')continue;
    const match=raw.trim().toLowerCase().match(/^(vesmir|genetika|veda):(\d+)$/);
    if(!match)fail(`Unknown series alias in test: ${raw}`);
    const ordinal=Number(match[2]);
    const episode=data.episodes.find(item=>Number(item.number)===configRefNumber(raw));
    if(!episode||Number(episode.displayNumber)!==ordinal)fail(`Special series alias has wrong display number: ${raw}`);
    if(Number(episode.number)<=0||Number(episode.number)>=2048)fail(`Special series internal id is outside safe range: ${raw}`);
  }
}

const episodeI18n=data.episodes.filter(e=>e.i18n?.cs&&e.i18n?.sk);
if(episodeI18n.length<340)fail(`Too few bilingual episodes: ${episodeI18n.length}`);
const changedEpisodes=episodeI18n.filter(e=>e.i18n.cs.title!==e.i18n.sk.title||e.i18n.cs.description!==e.i18n.sk.description);
if(changedEpisodes.length<300)fail(`Too few actually translated episodes: ${changedEpisodes.length}`);
const changedQuestions=data.questions.filter(q=>q.i18n.cs.title!==q.i18n.sk.title||q.i18n.cs.points.some((point,index)=>point!==q.i18n.sk.points[index]));
if(changedQuestions.length<500)fail(`Too few actually translated questions: ${changedQuestions.length}`);

const episode343=data.episodes.find(e=>Number(e.number)===343);
if(!episode343?.i18n?.cs?.title.includes('tečky'))fail('Episode 343 Czech title missing');
if(!episode343?.i18n?.sk?.title.includes('bodky'))fail('Episode 343 Slovak title missing');
if(data.meta?.legacyParity?.source!=='series.json')fail('Series source metadata missing');

console.log(JSON.stringify({
  ok:true,
  episodes:data.episodes.length,
  bilingualEpisodes:episodeI18n.length,
  changedEpisodes:changedEpisodes.length,
  questions:data.questions.length,
  translatedQuestions:changedQuestions.length,
  faqEpisodes:new Set(data.questions.map(q=>q.episode)).size,
  series:data.series.length,
  configuredSeries:seriesConfig.length,
  nonquestionEpisodes:nonEpisodes.length,
  episodeTranslationFiles:data.source?.episodeTranslationFiles,
  questionTranslationFiles:data.source?.questionTranslationFiles
},null,2));

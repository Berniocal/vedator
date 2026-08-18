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
for(const n of [216,217,219,220,221,222,223,224,225,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,243,245,246,247,249,250,251,252,253,254,255,256,258,259,260,261,262,265,266,267,268,269,271,273,274,276,277,279,280,281,282,283,285,286,287,288,290,292,293,294,296,297,298,299,301,302,303,304,305,306,307,308,309,310,311,312,315,318,320,321,322,323,324,325,334,335,336,338,339,341,342,343,344,345,347]){
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

const episode216=data.nonquestions.episodes['216'];
if(!episode216||episode216.cs?.length!==12||episode216.sk?.length!==12)fail('Episode 216 bilingual summary count mismatch');
const episode216Times=["01:20","05:50","07:01","09:02","10:19","13:32","15:09","16:24","17:37","19:23","19:40","22:28"];
if(JSON.stringify(episode216.cs.map(item=>item.time))!==JSON.stringify(episode216Times))fail('Episode 216 Czech timestamps mismatch');
if(JSON.stringify(episode216.sk.map(item=>item.time))!==JSON.stringify(episode216Times))fail('Episode 216 Slovak timestamps mismatch');

const episodeI18n=data.episodes.filter(e=>e.i18n?.cs&&e.i18n?.sk);
if(episodeI18n.length<340)fail(`Too few bilingual episodes: ${episodeI18n.length}`);
const changedEpisodes=episodeI18n.filter(e=>e.i18n.cs.title!==e.i18n.sk.title||e.i18n.cs.description!==e.i18n.sk.description);
if(changedEpisodes.length<300)fail(`Too few actually translated episodes: ${changedEpisodes.length}`);
const changedQuestions=data.questions.filter(q=>q.i18n.cs.title!==q.i18n.sk.title||q.i18n.cs.points.some((point,index)=>point!==q.i18n.sk.points[index]));
if(changedQuestions.length<500)fail(`Too few actually translated questions: ${changedQuestions.length}`);

const episode217=data.nonquestions.episodes['217'];
if(!episode217||episode217.cs?.length!==7||episode217.sk?.length!==7)fail('Episode 217 summary count mismatch');
const expected217Times=['03:43','07:20','11:29','12:50','15:24','16:57','18:41'];
if(episode217.cs.some((item,index)=>item.time!==expected217Times[index])||episode217.sk.some((item,index)=>item.time!==expected217Times[index]))fail('Episode 217 summary times mismatch');

const episode219=data.nonquestions.episodes['219'];
if(!episode219||episode219.cs?.length!==8||episode219.sk?.length!==8)fail('Episode 219 summary count mismatch');
const expected219Times=['00:49','02:50','04:29','06:54','09:34','11:32','13:53','15:13'];
if(episode219.cs.some((item,index)=>item.time!==expected219Times[index])||episode219.sk.some((item,index)=>item.time!==expected219Times[index]))fail('Episode 219 summary times mismatch');

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
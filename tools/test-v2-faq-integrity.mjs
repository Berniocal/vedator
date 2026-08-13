import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const expected=[346,340,337,336,332,326,319,313,300,295,289,284,278,272,270,263,257,248,244,226,218,211,203,190,179,170,158,143,138,133,128,119,112,100,89,82,75,69,60,51,35,26,17];
const expectedSet=new Set(expected);
const faqSeries=(data.series||[]).find(series=>String(series.name||'').includes('FAQ')||String(series.i18n?.cs||'').includes('FAQ'));
assert(faqSeries,'FAQ series missing');
const seriesEpisodes=new Set((faqSeries.episodes||[]).map(Number));
assert(seriesEpisodes.size===expectedSet.size,`FAQ series has ${seriesEpisodes.size} episodes, expected ${expectedSet.size}`);
for(const episode of expectedSet)assert(seriesEpisodes.has(episode),`FAQ series missing episode ${episode}`);

const byEpisode=new Map();
for(const question of data.questions||[]){
  const episode=Number(question.episode)||0;
  if(!byEpisode.has(episode))byEpisode.set(episode,[]);
  byEpisode.get(episode).push(question);
}
for(const episode of expectedSet){
  const questions=byEpisode.get(episode)||[];
  assert(questions.length>0,`FAQ episode ${episode} is in series but has no questions in Questions`);
}
for(const episode of byEpisode.keys())assert(expectedSet.has(episode),`Questions contain unexpected FAQ episode ${episode}`);

const q300=byEpisode.get(300)||[];
assert(q300.length===11,`Episode 300 has ${q300.length} questions, expected 11`);
assert(q300.some(question=>/mimozem/i.test(String(question.title||question.i18n?.cs?.title||''))), 'Episode 300 questions were not parsed correctly');
const q336=byEpisode.get(336)||[];
assert(q336.length===20,`Episode 336 has ${q336.length} questions, expected 20`);
assert(q336[0]?.sourceTime==='03:18'&&q336[0]?.time==='3:13','Episode 336 preroll/source time mismatch');
assert((data.questions||[]).length===754,`Expected 754 questions, got ${(data.questions||[]).length}`);

console.log(JSON.stringify({ok:true,faqEpisodes:seriesEpisodes.size,questionEpisodes:byEpisode.size,episode300Questions:q300.length,episode336Questions:q336.length,totalQuestions:data.questions.length},null,2));

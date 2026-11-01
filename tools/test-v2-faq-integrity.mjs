import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const expected=[361,358,350,346,340,337,332,326,319,313,300,295,289,284,278,272,270,263,257,248,244,226,218,211,203,190,179,170,158,143,138,133,128,119,112,100,89,82,75,69,60,51,35,26,17];
const expectedSet=new Set(expected);
const faqSeries=(data.series||[]).find(series=>String(series.name||'').includes('FAQ')||String(series.i18n?.cs||'').includes('FAQ'));
assert(faqSeries,'FAQ series missing');
const seriesEpisodes=new Set((faqSeries.episodes||[]).map(Number));
for(const episode of expectedSet)assert(seriesEpisodes.has(episode),`FAQ series missing canonical episode ${episode}`);
const extraSeriesEpisodes=[...seriesEpisodes].filter(episode=>!expectedSet.has(episode));
for(const episode of extraSeriesEpisodes){
  const item=(data.episodes||[]).find(value=>Number(value.number)===episode);
  const titles=[item?.title,item?.i18n?.cs?.title,item?.i18n?.sk?.title].filter(Boolean).join(' ');
  assert(/\bfaq\b/i.test(titles),`FAQ series contains non-FAQ extra episode ${episode}`);
}

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
const q350=byEpisode.get(350)||[];
assert(q350.length===15,`Episode 350 has ${q350.length} questions, expected 15`);
assert(q350.some(question=>/dúh|duh/i.test(String(question.title||question.i18n?.sk?.title||''))), 'Episode 350 questions were not parsed correctly');
assert((data.questions||[]).length===785,`Expected 785 questions, got ${(data.questions||[]).length}`);

// Episode 361 is a listener Q&A even though its title does not contain FAQ.
const q361=byEpisode.get(361)||[];
assert(q361.length===23,`Episode 361 has ${q361.length} questions, expected 23`);
const episode361=data.episodes.find(item=>Number(item.number)===361);
assert(episode361&&!/\bFAQ\b/i.test(episode361.title),'Episode 361 must remain a non-FAQ-titled Q&A regression case');
assert(q361.some(item=>/nestabiln/i.test(item.i18n.cs.title))&&q361.some(item=>/tma/i.test(item.i18n.cs.title)),'Episode 361 lost its opening or closing question');
assert(!data.nonquestions?.episodes?.['361'],'Episode 361 must not appear in Nonquestions');
assert((data.questions||[]).filter(item=>Number(item.episode)!==361).length===762,'Existing FAQ question count changed');
assert(new Set(data.source.faqEpisodes).size===expectedSet.size&&data.source.faqEpisodes.every(item=>expectedSet.has(item)),'Canonical FAQ list and integrity list differ');
assert(data.meta?.legacyParity?.faqEpisodes===expectedSet.size,'Parity FAQ count differs from canonical list');
for(const [index,question] of q361.entries()){
  assert(question.order===index,'Episode 361 question order changed');
  assert(question.i18n.cs.title.endsWith('?')&&question.i18n.sk.title.endsWith('?'),'Episode 361 question title missing');
  assert(question.i18n.cs.points.length===3&&question.i18n.sk.points.length===3,'Episode 361 answer points missing');
  const raw=question.sourceTime.split(':').reduce((total,part)=>total*60+Number(part),0);
  assert(question.seconds===Math.max(0,raw-5),'Episode 361 preroll applied incorrectly');
  if(index)assert(question.seconds>q361[index-1].seconds,'Episode 361 questions are not chronological');
}

console.log(JSON.stringify({ok:true,faqSeriesEpisodes:seriesEpisodes.size,canonicalQuestionEpisodes:expectedSet.size,extraFaqSeriesEpisodes:extraSeriesEpisodes,questionEpisodes:byEpisode.size,episode300Questions:q300.length,episode350Questions:q350.length,totalQuestions:data.questions.length},null,2));

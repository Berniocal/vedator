import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const math= /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g;
const rawFormula= /\b[A-Za-z]\s*=\s*(?:[A-Za-z\d])|\b10\^|[A-Za-z0-9ε][²³]|10[⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]|\b(?:CO₂|H₂O₂?)\b|\b\d+\s*\+\s*\d+\s*=|\(0,\^?\)/u;
let checkedStrings=0,formulaCount=0;
const episodes=new Set();
function check(copy,episode,label){
  for(const value of [copy?.title,...(copy?.points||[])]){
    if(typeof value!=='string')continue;checkedStrings++;
    const expressions=[...value.matchAll(math)];
    const plain=value.replace(math,'');
    if(rawFormula.test(plain))throw new Error(`Formula outside MathJax in episode ${episode} ${label}: ${value}`);
    if(/\\[()[\]]|\\(?:frac|mathrm|pi|sqrt)\b/.test(plain))throw new Error(`Incomplete MathJax delimiters in episode ${episode} ${label}: ${value}`);
    if(expressions.length){episodes.add(Number(episode));formulaCount+=expressions.length}
  }
}
for(const question of data.questions){
  check(question,question.episode,'base');
  for(const [lang,copy] of Object.entries(question.i18n||{}))check(copy,question.episode,lang);
}
for(const [episode,languages] of Object.entries(data.nonquestions.episodes)){
  for(const [lang,chapters] of Object.entries(languages))if(Array.isArray(chapters))for(const chapter of chapters)check(chapter,episode,lang);
}
if(formulaCount===0)throw new Error('MathJax formulas disappeared from summary data');
console.log(JSON.stringify({ok:true,mathjaxData:true,checkedStrings,formulaCount,episodesWithMath:episodes.size},null,2));

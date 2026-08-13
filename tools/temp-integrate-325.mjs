import fs from 'node:fs';

const decode=s=>String(s)
  .replace(/<[^>]*>/g,'')
  .replace(/&nbsp;/g,' ')
  .replace(/&amp;/g,'&')
  .replace(/&quot;/g,'"')
  .replace(/&#39;/g,"'")
  .replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .trim();

function parse(html){
  const out=[];
  const re=/<section\s+class="faq"\s+data-time="([^"]+)"[^>]*><h2>([\s\S]*?)<\/h2><ul>([\s\S]*?)<\/ul><\/section>/g;
  let m;
  while((m=re.exec(html))){
    const points=[...m[3].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x=>decode(x[1]));
    out.push({time:m[1],title:decode(m[2]),points});
  }
  return out;
}

async function get(url){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`${response.status} ${url}`);
  return response.text();
}

const [csHtml,skHtml]=await Promise.all([
  get('https://raw.githubusercontent.com/Berniocal/vedator-test/main/shrnuti/cs/325-posledna-sanca.html'),
  get('https://raw.githubusercontent.com/Berniocal/vedator-test/main/shrnuti/sk/325-posledna-sanca.html')
]);
const cs=parse(csHtml),sk=parse(skHtml);
if(cs.length!==20||sk.length!==20)throw new Error(`Expected 20+20 sections, got ${cs.length}+${sk.length}`);
for(let i=0;i<20;i++){
  if(cs[i].time!==sk[i].time)throw new Error(`CZ/SK time mismatch at ${i}`);
  if(!cs[i].title||!sk[i].title||!cs[i].points.length||!sk[i].points.length)throw new Error(`Incomplete item ${i}`);
}
const data={cs,sk};
fs.writeFileSync('episode-325-summary.js',`(()=>{\n  if(window.__vedatorEpisode325Summary)return;\n  window.__vedatorEpisode325Summary=true;\n\n  const DATA=${JSON.stringify(data)};\n  window.__vedatorEpisode325SummaryData=DATA;\n})();\n`);

const augmenterPath='tools/augment-v2-extra-nonquestions.mjs';
let augmenter=fs.readFileSync(augmenterPath,'utf8');
const match=augmenter.match(/const EXTRAS=\[([^\]]*)\];/);
if(!match)throw new Error('EXTRAS array not found');
const extras=match[1].split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
if(!extras.includes(325))extras.push(325);
extras.sort((a,b)=>a-b);
augmenter=augmenter.replace(match[0],`const EXTRAS=[${extras.join(',')}];`);
fs.writeFileSync(augmenterPath,augmenter);

const testPath='tools/test-content-v2.mjs';
let test=fs.readFileSync(testPath,'utf8');
const old='for(const n of [334,335,336,338,339,341,342,343,344,345,347]){';
const next='for(const n of [325,334,335,336,338,339,341,342,343,344,345,347]){';
if(!test.includes(old)&&!test.includes(next))throw new Error('Required nonquestion regression list not found');
test=test.replace(old,next);
fs.writeFileSync(testPath,test);
console.log(JSON.stringify({episode:325,cs:cs.length,sk:sk.length,first:cs[0].time,last:cs.at(-1).time,extras},null,2));

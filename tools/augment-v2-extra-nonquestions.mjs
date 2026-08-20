import fs from 'node:fs';

const CONTENT_FILE='content-v2.json';
const EXTRAS=[194,195,196,197,198,199,200,201,202,205,206,207,208,210,212,213,214,215,216,217,219,220,221,222,223,224,225,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,243,245,246,247,249,250,251,252,253,254,255,256,258,259,260,261,262,265,266,267,268,269,271,273,274,276,277,279,280,281,282,283,285,286,287,288,290,292,293,294,296,297,298,299,301,302,303,304,305,306,307,308,309,310,311,312,315,317,318,320,321,322,323,324,325,349];

function extractDataJson(source,episode){
  const marker='const DATA=';
  const start=source.indexOf(marker);
  if(start<0)throw new Error(`DATA marker missing for episode ${episode}`);
  const from=start+marker.length;
  let depth=0;
  let inString=false;
  let escaped=false;
  let started=false;
  for(let i=from;i<source.length;i++){
    const ch=source[i];
    if(inString){
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch==='"')inString=false;
      continue;
    }
    if(ch==='"'){
      inString=true;
      continue;
    }
    if(ch==='{'||ch==='['){
      depth++;
      started=true;
      continue;
    }
    if(ch==='}'||ch===']'){
      depth--;
      if(depth<0)throw new Error(`Unbalanced DATA for episode ${episode}`);
      if(started&&depth===0){
        const tail=source.slice(i+1).trimStart();
        if(!tail.startsWith(';'))throw new Error(`DATA terminator missing for episode ${episode}`);
        return source.slice(from,i+1).trim();
      }
    }
  }
  throw new Error(`Incomplete DATA for episode ${episode}`);
}

function readSummaryData(episode){
  const source=fs.readFileSync(`episode-${episode}-summary.js`,'utf8');
  const data=JSON.parse(extractDataJson(source,episode));
  if(!Array.isArray(data.cs)||!Array.isArray(data.sk))throw new Error(`Invalid bilingual summary for episode ${episode}`);
  return data;
}

const content=JSON.parse(fs.readFileSync(CONTENT_FILE,'utf8'));
content.nonquestions=content.nonquestions||{};
content.nonquestions.episodes=content.nonquestions.episodes||{};
for(const episode of EXTRAS)content.nonquestions.episodes[String(episode)]=readSummaryData(episode);
fs.writeFileSync(CONTENT_FILE,JSON.stringify(content));
console.log(`Added V2 nonquestions: ${EXTRAS.join(', ')}`);
// temp-verify-213: passed
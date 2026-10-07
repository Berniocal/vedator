import fs from 'node:fs';
import vm from 'node:vm';

const CONTENT_FILE='content-v2.json';
const EXTRAS=[91,92,93,94,95,96,97,98,99,106,107,108,109,111,113,114,115,116,117,118,120,121,122,123,124,125,126,127,128,129,130,131,132,134,135,136,137,139,140,141,142,144,145,146,147,148,149,150,151,152,153,154,155,156,157,159,160,161,162,163,164,165,166,167,168,169,171,172,173,174,175,176,177,178,180,181,182,183,184,185,186,187,188,189,191,192,193,194,195,196,197,198,199,200,201,202,205,206,207,208,210,212,213,214,215,216,217,219,220,221,222,223,224,225,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,243,245,246,247,249,250,251,252,253,254,255,256,258,259,260,261,262,265,266,267,268,269,271,273,274,276,277,279,280,281,282,283,285,286,287,288,290,292,293,294,296,297,298,299,301,302,303,304,305,306,307,308,309,310,311,312,314,315,317,318,320,321,322,323,324,325,348,349,351,352,353,354,355,356,1642];

function extractDataJson(source,episode){
  const marker='const DATA=';
  const start=source.indexOf(marker);
  if(start<0)throw new Error(`DATA marker missing for episode ${episode}`);
  const from=start+marker.length;
  let depth=0,inString=false,escaped=false,started=false;
  for(let i=from;i<source.length;i++){
    const ch=source[i];
    if(inString){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inString=false;continue;}
    if(ch==='"'){inString=true;continue;}
    if(ch==='{'||ch==='['){depth++;started=true;continue;}
    if(ch==='}'||ch===']'){depth--;if(depth<0)throw new Error(`Unbalanced DATA for episode ${episode}`);if(started&&depth===0){const tail=source.slice(i+1).trimStart();if(!tail.startsWith(';'))throw new Error(`DATA terminator missing for episode ${episode}`);return source.slice(from,i+1).trim();}}
  }
  throw new Error(`Incomplete DATA for episode ${episode}`);
}

function readLegacySummaryData(source,episode){
  const marker='const DATA=';const start=source.indexOf(marker);if(start<0)throw new Error(`DATA marker missing for episode ${episode}`);
  const dataEnd=source.indexOf(';',start);if(dataEnd<0)throw new Error(`DATA terminator missing for episode ${episode}`);
  const prefix=source.slice(0,dataEnd+1);const sandbox=Object.create(null);
  vm.runInNewContext(`${prefix}\n;globalThis.__SUMMARY_DATA__=DATA;`,sandbox,{timeout:1000,filename:`episode-${episode}-summary.js`});
  return sandbox.__SUMMARY_DATA__;
}

function textToPoints(text){
  const source=String(text||'').trim();
  if(!source)return [];
  const sentences=source.split(/(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽÄÔĽĹŔ])/u).map(s=>s.trim()).filter(Boolean);
  if(sentences.length<=4)return sentences;
  const points=[];
  for(let i=0;i<4;i++){const from=Math.floor(i*sentences.length/4),to=Math.floor((i+1)*sentences.length/4);const point=sentences.slice(from,to).join(' ').trim();if(point)points.push(point);}return points;
}
function preserveTextAnswers(data){for(const language of ['cs','sk'])data[language]=data[language].map(item=>{if(Array.isArray(item?.points)&&item.points.length)return item;const answer=typeof item?.text==='string'?item.text.trim():'';if(!answer)return item;const points=textToPoints(answer);const normalize=s=>String(s).replace(/\s+/g,' ').trim();if(normalize(points.join(' '))!==normalize(answer))throw new Error(`Text-to-points conversion lost content at ${item?.time||'unknown time'} (${language})`);return {...item,points};});return data;}
function readSummaryData(episode){const source=fs.readFileSync(`episode-${episode}-summary.js`,'utf8');let data;try{data=JSON.parse(extractDataJson(source,episode));}catch(error){if(!source.includes('const DATA={cs:conv(cs),sk:conv(sk)}'))throw error;data=readLegacySummaryData(source,episode);}if(!Array.isArray(data.cs)||!Array.isArray(data.sk))throw new Error(`Invalid bilingual summary for episode ${episode}`);if(episode===355){const isRemovedChapter=item=>String(item?.time||'')==='16:02';const csMatches=data.cs.filter(isRemovedChapter).length,skMatches=data.sk.filter(isRemovedChapter).length;if(csMatches!==1||skMatches!==1)throw new Error(`Episode 355 expected one 16:02 chapter per language, found cs=${csMatches}, sk=${skMatches}`);data.cs=data.cs.filter(item=>!isRemovedChapter(item));data.sk=data.sk.filter(item=>!isRemovedChapter(item));}return preserveTextAnswers(data);}
const content=JSON.parse(fs.readFileSync(CONTENT_FILE,'utf8'));content.nonquestions=content.nonquestions||{};content.nonquestions.episodes=content.nonquestions.episodes||{};for(const episode of EXTRAS)content.nonquestions.episodes[String(episode)]=readSummaryData(episode);fs.writeFileSync(CONTENT_FILE,JSON.stringify(content));console.log(`Added V2 nonquestions: ${EXTRAS.join(', ')}`);
// temp-verify-213: passed
import fs from 'node:fs';

const CONTENT_FILE='content-v2.json';
const EXTRAS=[290,292,293,294,296,297,298,299,301,302,303,304,305,306,307,308,309,310,311,312,315,317,318,320,321,322,323,324,325];

function readSummaryData(episode){
  const source=fs.readFileSync(`episode-${episode}-summary.js`,'utf8');
  const marker='const DATA=';
  const start=source.indexOf(marker);
  if(start<0)throw new Error(`DATA marker missing for episode ${episode}`);
  const from=start+marker.length;
  const end=source.indexOf(';',from);
  if(end<0)throw new Error(`DATA terminator missing for episode ${episode}`);
  const data=JSON.parse(source.slice(from,end));
  if(!Array.isArray(data.cs)||!Array.isArray(data.sk))throw new Error(`Invalid bilingual summary for episode ${episode}`);
  return data;
}

const content=JSON.parse(fs.readFileSync(CONTENT_FILE,'utf8'));
content.nonquestions=content.nonquestions||{};
content.nonquestions.episodes=content.nonquestions.episodes||{};
for(const episode of EXTRAS)content.nonquestions.episodes[String(episode)]=readSummaryData(episode);
fs.writeFileSync(CONTENT_FILE,JSON.stringify(content));
console.log(`Added V2 nonquestions: ${EXTRAS.join(', ')}`);

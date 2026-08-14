import fs from 'node:fs';

const path='app-v2.js';
let source=fs.readFileSync(path,'utf8');
if(!source.includes("function episodeDisplayNumber(episode)"))throw new Error('episodeDisplayNumber helper missing');

const replacements=[
  ["${episode.number||'–'}","${episodeDisplayNumber(episode)}"],
  ["(episode.number||'–')","episodeDisplayNumber(episode)"]
];
let changed=0;
for(const [from,to] of replacements){
  const count=source.split(from).length-1;
  if(count){source=source.split(from).join(to);changed+=count}
}
if(source.includes("episode.number||'–'"))throw new Error('Unpatched visible episode number remains');
if(!changed)throw new Error('No visible episode number was patched');
fs.writeFileSync(path,source);
console.log(`Patched ${changed} visible episode-number occurrence(s).`);

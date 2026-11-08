// Build a small, exact seek index from an MP3 already downloaded for validation.
// Usage: node tools/build-mp3-seek-index.mjs /path/audio.mp3 https://cdn/audio.mp3
import fs from 'node:fs';
import {MP3Frames} from '../continuous-audio.mjs';
const [file,url]=process.argv.slice(2);
if(!file||!/^https?:\/\//.test(url||''))throw Error('Pass an MP3 file and its full public enclosure URL');
const index={anchors:[]},scanner=new MP3Frames(index);
for await(const bytes of fs.createReadStream(file,{highWaterMark:1048576}))scanner.feed(bytes);
if(!index.anchors.length||!scanner.time)throw Error('No valid MP3 frames');
const path='audio-seek-index.json';
const data=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{version:1,entries:{}};
let last=-Infinity;
const anchors=index.anchors.filter(a=>{if(a.time-last<5)return false;last=a.time;return true}).map(a=>[a.offset,Number(a.time.toFixed(6))]);
data.entries[url]={size:fs.statSync(file).size,duration:Number(scanner.time.toFixed(6)),anchors};
fs.writeFileSync(path,JSON.stringify(data)+'\n');
console.log(JSON.stringify({file:url,size:data.entries[url].size,duration:data.entries[url].duration,anchors:anchors.length,indexBytes:fs.statSync(path).size}));

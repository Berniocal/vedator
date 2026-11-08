import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {MP3Frames} from '../../continuous-audio.mjs';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'android/app/src/main/assets/web');
fs.mkdirSync(out, {recursive:true});
const files = ['index.html','app-v2.js','content-v2.json','audio-seek-index.json','icon.svg','manifest.webmanifest','v2-ask-search.js','v2-ask-worker.js'];
for (const file of files) if(fs.existsSync(path.join(root,file))) fs.copyFileSync(path.join(root,file),path.join(out,file));
execFileSync(process.execPath,[path.join(root,'tools/prepare-production-index.mjs')],{cwd:out,stdio:'pipe'});
// Local bundled fallback never installs a competing browser service worker.
fs.writeFileSync(path.join(out,'sw.js'),'self.addEventListener("install",()=>self.skipWaiting());');
fs.writeFileSync(path.join(root,'android/app/src/main/assets/build-info.json'),JSON.stringify({source:process.env.GITHUB_SHA||'local',builtAt:new Date().toISOString()}));
console.log('Bundled web fallback prepared');
const testOut=path.join(root,'android/app/src/androidTest/assets');fs.mkdirSync(testOut,{recursive:true});
fs.writeFileSync(path.join(testOut,'tone.mp3'),Buffer.from(fs.readFileSync(path.join(root,'tools/continuous-tone-base64.txt'),'utf8').trim(),'base64'));
const tone=fs.readFileSync(path.join(testOut,'tone.mp3')),index={anchors:[]},scanner=new MP3Frames(index);scanner.feed(tone);
fs.writeFileSync(path.join(testOut,'tone-index.json'),JSON.stringify({size:tone.length,duration:scanner.time,anchors:index.anchors.map(a=>[a.offset,a.time])}));

import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'android/app/src/main/assets/web');
fs.mkdirSync(out, {recursive:true});
const files = ['index.html','app-v2.js','content-v2.json','audio-seek-index.json','icon.svg','manifest.webmanifest','v2-ask-search.js','v2-ask-worker.js'];
for (const file of files) if(fs.existsSync(path.join(root,file))) fs.copyFileSync(path.join(root,file),path.join(out,file));
// Local bundled fallback never installs a competing browser service worker.
fs.writeFileSync(path.join(out,'sw.js'),'self.addEventListener("install",()=>self.skipWaiting());');
fs.writeFileSync(path.join(root,'android/app/src/main/assets/build-info.json'),JSON.stringify({source:process.env.GITHUB_SHA||'local',builtAt:new Date().toISOString()}));
console.log('Bundled web fallback prepared');

import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const episode=Number(process.argv[2]);
assert(Number.isInteger(episode)&&episode>0,'Supply a positive episode number');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const names=['json','cs.srt','sk.srt'].map(ext=>`captions/episode-${episode}.${ext}`);
const assets=names.map(name=>({name,expected:digest(fs.readFileSync(name))}));
const captions=JSON.parse(fs.readFileSync(names[0],'utf8'));
const mapping=JSON.parse(fs.readFileSync('episode-videos.json','utf8')).find(row=>row.episode===episode);
assert.equal(mapping?.captionFile,names[0]);
assert.equal(mapping.guid,captions.guid);
let lastError;
for(let attempt=1;attempt<=12;attempt++){
  try{
    for(const asset of assets){
      const url=new URL(asset.name,'https://bernio.cz/vedator/');
      url.searchParams.set('verify_caption',asset.expected+'-'+attempt);
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(25000)});
      assert(response.ok,`${asset.name}: HTTP ${response.status}`);
      assert.equal(digest(Buffer.from(await response.arrayBuffer())),asset.expected,`${asset.name}: live file differs`);
    }
    console.log(JSON.stringify({ok:true,episode,cueCount:captions.cues.length,verified:names}));
    process.exit(0);
  }catch(error){
    lastError=error;
    console.error(`Episode ${episode} live verification ${attempt}/12: ${error.message}`);
    if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));
  }
}
throw lastError;

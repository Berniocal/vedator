import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const names=['captions/episode-364.json','captions/episode-364.cs.srt','captions/episode-364.sk.srt'];
const assets=names.map(name=>({name,expected:digest(fs.readFileSync(name))}));
const audit=html=>JSON.parse(html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/)?.[1]||'null');
const expectedAudit=audit(fs.readFileSync('sliby/index.html','utf8'));
assert(expectedAudit?.readingProgress.files.some(row=>row.episode===364));
let lastError;
for(let attempt=1;attempt<=12;attempt++){
  try{
    for(const asset of assets){
      const url=new URL(asset.name,'https://bernio.cz/vedator/');
      url.searchParams.set('verify_caption',asset.expected+'-'+attempt);
      const response=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
      assert(response.ok,`${asset.name}: HTTP ${response.status}`);
      assert.equal(digest(Buffer.from(await response.arrayBuffer())),asset.expected,`${asset.name}: live file differs`);
    }
    const url=new URL('https://bernio.cz/vedator/sliby/');
    url.searchParams.set('verify_caption',assets[0].expected+'-'+attempt);
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(25000)});
    assert(response.ok,`Sliby: HTTP ${response.status}`);
    assert.deepEqual(audit(await response.text()),expectedAudit,'Live Sliby audit differs from deployed source');
    const captions=JSON.parse(fs.readFileSync(names[0],'utf8'));
    console.log(JSON.stringify({ok:true,episode:364,cueCount:captions.cues.length,verified:assets.map(asset=>asset.name),sliby:true}));
    process.exit(0);
  }catch(error){
    lastError=error;
    console.error(`Episode 364 live verification ${attempt}/12: ${error.message}`);
    if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));
  }
}
throw lastError;

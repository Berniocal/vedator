import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { hash, readReport } from './update-sliby-episode.mjs';
export function verifyPromises(expected, actual) {
  const data=readReport(actual);
  assert.equal(data.schema,2,'Invalid live promises schema');
  assert.equal(hash(actual),hash(expected),'Live sliby/index.html differs from deployment artifact');
  assert.equal(new Set(data.findings.map(r=>JSON.stringify([r.candidate,r.tema]))).size,data.findings.length,'Duplicate personal keys');
  return {findings:data.findings.length,reviews:(data.episodeReviews||[]).length};
}
async function main() {
  const checkout=process.env.DEPLOY_CHECKOUT_SHA;
  assert.match(checkout||'',/^[a-f0-9]{40}$/,'Missing checkout SHA');
  const expected=fs.readFileSync('sliby/index.html','utf8');
  let lastError;
  for(let attempt=1;attempt<=12;attempt++) {
    try {
      const url=new URL('https://bernio.cz/vedator/sliby/');
      url.searchParams.set('verify_deploy',checkout+'-'+attempt);
      const response=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
      assert(response.ok,'Promises HTTP '+response.status);
      const bytes=await response.arrayBuffer();assert(bytes.byteLength>0&&bytes.byteLength<50*1024*1024,'Invalid response size');
      const result=verifyPromises(expected,new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      console.log('OVĚŘENO SLIBY: findings='+result.findings+', reviews='+result.reviews+', checkout='+checkout);return;
    }catch(error){lastError=error;console.error('Promises verification '+attempt+'/12: '+error.message);if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));}
  }
  throw new Error('NEOVĚŘENO SLIBY: '+lastError.message);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});

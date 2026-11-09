import fs from 'node:fs';
import crypto from 'node:crypto';
const source=fs.readFileSync('app-v2.js','utf8');
const start=source.indexOf('  function createAskSearchEngine(){');
const end=source.indexOf('  /* ASK_LOCAL_AI_V1',start);
if(start<0||end<0)throw Error('Canonical Ask engine markers missing');
const body=source.slice(start,end).trimEnd();
const hash=crypto.createHash('sha256').update(body).digest('hex').slice(0,16);
const escape="const esc = value => String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\n";
const output='// Generated from the canonical Ask engine in app-v2.js; do not edit directly.\n// Engine SHA256: '+hash+'\n'+escape+body.replace('function createAskSearchEngine(){','export function createVedatorAskSearchEngine(){')+'\n';
if(process.argv.includes('--check')){
  if(fs.readFileSync('test-ai-ask-engine.js','utf8')!==output)throw Error('Standalone AI Ask engine differs from the main app; run node tools/sync-ai-ask-engine.mjs');
}else fs.writeFileSync('test-ai-ask-engine.js',output);
console.log('Standalone AI uses the canonical Ask engine '+hash);

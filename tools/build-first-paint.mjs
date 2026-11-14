import fs from 'node:fs';
import assert from 'node:assert/strict';

// Very small, deliberately non-authoritative preview: the full report, FAQ
// index, playback state and personal overrides still load normally afterward.
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const html=fs.readFileSync('sliby/index.html','utf8');
const match=html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/);
assert(match,'Missing embedded Sliby audit data');
const report=JSON.parse(match[1]);
const compact=s=>String(s??'').replace(/\s+/g,' ').trim();
const trim=(s,max=220)=>{
  const v=compact(s);
  return v.length>max?v.slice(0,max-1).replace(/\s+\S*$/,'')+'…':v;
};
assert(Array.isArray(data.episodes)&&data.episodes.length>=20);
assert(Array.isArray(report.findings)&&report.findings.length>=20);
const episodes=[...data.episodes]
  .sort((a,b)=>new Date(b.date)-new Date(a.date))
  .slice(0,20)
  .map(e=>({
    number:e.unnumbered?(e.displayNumber||'speciál'):(e.displayNumber||e.number),
    date:e.date,
    title:trim(e.i18n?.cs?.title||e.title,190),
    description:trim(e.i18n?.cs?.description||e.description,260)
  }));
const sliby=report.findings
  .filter(r=>r.section==='episodes')
  .slice(-20).reverse()
  .map(r=>({
    title:trim(r.displayTema||r.compactTitle||r.tema,230),
    type:r.kategorie==='Sliby'?'Slib':'Nápad'
  }));
const questions=(Array.isArray(data.questions)?[...data.questions]:[])
  .sort((a,b)=>Number(b.episode||0)-Number(a.episode||0))
  .slice(0,20)
  .map(q=>({
    episode:Number(q.episode)||0,
    title:trim(q.i18n?.cs?.title||q.question||q.title||q.text||q.i18n?.sk?.title||'',230)
  })).filter(q=>q.title);
assert(episodes.length===20&&sliby.length===20);
const output={schema:1,episodes,sliby,questions};
const serialized=JSON.stringify(output);
assert(Buffer.byteLength(serialized)<85000,'Preview unexpectedly large');
fs.writeFileSync('first-paint.json',serialized);
console.log('Fast initial preview:',{episodes:episodes.length,sliby:sliby.length,questions:questions.length,bytes:Buffer.byteLength(serialized)});

import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const first=JSON.parse(fs.readFileSync('first-paint.json','utf8'));
const full=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
assert.equal(first.schema,1);
assert.equal(first.episodes.length,20);
assert.equal(first.sliby.length,20);
assert(Array.isArray(first.questions));
assert(Buffer.byteLength(JSON.stringify(first))<85000,'Fast preview has grown too large');
const fullIds=new Set(full.episodes.map(e=>String(e.displayNumber||e.number)));
for(const episode of first.episodes){
  assert(episode.title&&episode.description,'Preview episode has no visible content');
  assert(fullIds.has(String(episode.number)),'Preview episode does not exist in full catalog: '+episode.number);
}
const source=fs.readFileSync('sliby/index.html','utf8');
const m=source.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/);
assert(m);
const sliby=JSON.parse(m[1]);
const headings=new Set(sliby.findings.map(r=>String(r.displayTema||r.compactTitle||r.tema||'').replace(/\s+/g,' ').trim()));
for(const idea of first.sliby){
  assert(idea.title&&['Slib','Nápad'].includes(idea.type));
  assert([...headings].some(title=>title===idea.title||title.startsWith(idea.title.slice(0,-1))),'Preview card missing in source catalog: '+idea.title);
}
const app=fs.readFileSync('app-v2.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const card=fs.readFileSync('sliby/card-ui-v3.js','utf8');
new vm.Script(card);
assert(card.includes('const CARD_BATCH_SIZE=20'),'Full promises UI must render real cards in groups of 20');
assert(card.includes('if(generation!==renderGeneration)return'),'Old deferred batches must stop after filter changes');
assert(card.includes('requestIdleCallback(appendBatch'),'Promise rendering must yield to the browser');
assert(app.includes("bind();setView(window.VedatorEarlyView||'episodes');void askAiInitialize();"),'Startup should preserve a tab selected before full data loaded');
assert(app.includes('window.VedatorFirstPaintReady'),'Full-content request must let the fast preview load first');
const firstJs=fs.readFileSync('first-paint.js','utf8');
new vm.Script(firstJs);
assert(firstJs.includes('window.VedatorEarlyView=view;'),'Early tab click must be remembered');
assert(firstJs.includes('renderAskExamples(data.questions||[])'),'Ask preview should show questions without waiting for the search index');
assert(firstJs.includes('window.VedatorFirstPaintReady=fetch(previewUrl'),'App and preview must coordinate the first request');
assert(!app.includes("renderEpisodes();renderSeries();renderQuestions();renderNonQuestions();renderPlaylists();renderData();bind();"),'Startup still blocks on hidden views');
assert(app.includes('window.VedatorFirstPaint?.questions'),'Ask must show examples while loading its own index');
assert(html.includes('<script src="./first-paint.js" defer></script>'),'Initial preview script not loaded');
assert(html.includes('id="sliby-first-paint-v2"'),'Embedded Sliby has no preview');
console.log('PASS: 20 initial podcast cards, 20 promise previews, Ask examples, 20-card idle batches and lazy hidden views.');

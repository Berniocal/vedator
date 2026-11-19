'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('sliby/index.html','utf8');
const original=JSON.parse(html.match(/id="audit-data">([\s\S]*?)<\/script>/)[1]);
const review=require('../sliby/link-review.json');
const scope={URL};
vm.runInNewContext(fs.readFileSync('sliby/link-promises.js','utf8'),scope);
const api=scope.VedatorSlibyLinks,key=r=>JSON.stringify([r.candidate,r.tema]);
const data=structuredClone(original),statuses=data.findings.map(r=>r.stav);
api.apply(data,review);
assert.deepEqual(data.findings.map(key),original.findings.map(key));
assert.deepEqual(data.findings.map(r=>r.stav),statuses,'Finding a link never fulfils the promise');
assert.deepEqual(data.findings.map(r=>r.seconds),original.findings.map(r=>r.seconds));
assert.equal(new Set(review.entries.map(key)).size,71);
for(const entry of review.entries){
  const matches=data.findings.filter(row=>key(row)===key(entry));
  assert.equal(matches.length,1,'Review must match one real record: '+key(entry));
  assert.equal(matches[0].section,'links');
  assert.equal(data.archive.findings.find(row=>key(row)===key(entry)).section,'links');
  assert(entry.resources.length||entry.note,'Unresolved links need an explanation');
  assert(['present','missing','elsewhere'].includes(entry.descriptionState));
  assert(entry.resources.every(resource=>api.safeURL(resource.url)));
  assert(entry.resources.every(resource=>['description','found','related'].includes(resource.origin)));
}
assert.deepEqual(Array.from(data.sections.options,s=>s.id),['episodes','links','other']);
assert.deepEqual(Array.from(data.sections.options,s=>s.count),[272,71,558]);
assert.equal(data.findings.filter(r=>r.section==='links'&&r.stav==='Nesplněno').length,30);
assert.equal(data.findings.filter(r=>r.section==='links'&&r.stav!=='Nesplněno').length,41);
assert.notEqual(data.findings.find(r=>r.candidate===1366).section,'links','Privately sending a book link is not a description promise');
assert.notEqual(data.findings.find(r=>r.candidate===1848).section,'links','Publishing a form plus sending invitations remains a distinct organisational promise');
const after=JSON.stringify(data);api.apply(data,review);assert.equal(JSON.stringify(data),after,'Overlay is idempotent');
const catalog=JSON.parse(fs.readFileSync('episodes.json','utf8')).episodes;
const normalize=s=>decodeURIComponent(s).replace(/&amp;/g,'&').replace(/\s|%20/g,'');
for(const entry of review.entries)for(const resource of entry.resources){
  if(resource.origin!=='description')continue;
  const episode=catalog.find(e=>e.link===resource.sourceURL);
  assert(episode,'Description evidence must identify a real catalog entry');
  assert(normalize(episode.description).includes(normalize(resource.url).replace(/^tel:/,'')),resource.label+' is missing from its cited description');
}
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent=''}
 append(...items){this.children.push(...items)}
 setAttribute(key,value){this.attrs[key]=value}
}
const document={createElement:tag=>new Element(tag)};
const nodes=element=>[element,...element.children.flatMap(nodes)];
for(const row of data.findings.filter(r=>r.section==='links')){
 const rendered=api.render(document,row),all=nodes(rendered);
 const links=all.filter(e=>e.tag==='a');
 assert.equal(links.length,row.linkReview.resources.length+1,'Every resource and original description is clickable');
 assert(links.every(link=>link.target==='_blank'&&link.rel==='noopener noreferrer'));
 if(row.linkReview.resources.some(r=>r.origin!=='description'))assert(all.some(e=>e.textContent.includes('samo o sobě neznamená splnění')));
}
assert(!api.safeURL('javascript:alert(1)'));assert(!api.safeURL('data:text/html,evil'));
assert(api.safeURL('https://example.com'));assert(api.safeURL('mailto:test@example.com'));
assert.equal(api.render(document,data.findings.find(r=>r.section==='episodes')),null);
const {patchReport}=require('./patch-sliby-admin-runtime.cjs');
const patched=patchReport(html);
assert(patched.includes('VedatorSlibyLinks.apply(D,'));
assert(patched.indexOf('src="link-promises.js')<patched.indexOf('VedatorSlibyLinks.apply(D,'));
assert(patched.includes("section.id==='links'?'Odkazy'"));
assert(patched.includes("r.linkReview?.resources||[]"),'Search includes promised resource names');
assert(patched.includes("addEventListener(id==='q'?'input':'change',()=>render())"),'Search and status changes must use the current renderer');
new vm.Script(patched.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert.equal(patchReport(patched),patched);
const manual={};vm.runInNewContext(fs.readFileSync('sliby/admin-status.js','utf8'),manual);
manual.VedatorSlibyAdminStatus.apply(data,require('../sliby/admin-overrides.json'));
assert.equal(data.findings.filter(r=>r.section==='links'&&r.stav==='Budoucí slib').length,0);
assert.equal(data.findings.filter(r=>r.section==='links').length,71,'Manual status overlay retains the new section');
assert(fs.readFileSync('index.html','utf8').includes("if(record.section==='links')return true;"),'Episode topics must not hide selected link promises');
console.log('PASS: 71 exact link promises, 70 resources, three sections, original statuses/anchors, archive/export, safe clickable resources and description evidence.');

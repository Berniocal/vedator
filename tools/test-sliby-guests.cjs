'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('sliby/index.html','utf8');
const original=JSON.parse(html.match(/id="audit-data">([\s\S]*?)<\/script>/)[1]);
const review=require('../sliby/guest-review.json'),links=require('../sliby/link-review.json');
const scope={URL},key=row=>JSON.stringify([row.candidate,row.tema]);
for(const file of ['link-promises.js','guest-promises.js','admin-status.js'])vm.runInNewContext(fs.readFileSync('sliby/'+file,'utf8'),scope);
const data=structuredClone(original);
scope.VedatorSlibyLinks.apply(data,links);
scope.VedatorSlibyGuests.apply(data,review);
assert.equal(review.entries.length,38);
assert.equal(new Set(review.entries.map(key)).size,38);
for(const entry of review.entries){
 const source=original.findings.filter(row=>key(row)===key(entry));
 assert.equal(source.length,1,'Guest classification must match exactly one reviewed record');
 for(const catalog of [data,data.archive]){
  const matches=catalog.findings.filter(row=>key(row)===key(entry)||(row.mergedFrom||[]).some(member=>key(member)===key(entry)));
  assert.equal(matches.length,1,'Each original remains in exactly one card');
  assert.equal(matches[0].section,'guests');
 }
}
for(const catalog of [data,data.archive]){
 assert.equal(catalog.findings.length,original.findings.length-1);
 assert.equal(catalog.findings.filter(row=>row.section==='guests').length,37);
 assert.deepEqual(Array.from(catalog.sections.options,row=>row.id),['episodes','links','guests','other']);
 assert.deepEqual(Array.from(catalog.sections.options,row=>row.label),['Epizody','Odkazy','Hosté','Ostatní']);
 assert.equal(catalog.sections.options.reduce((sum,row)=>sum+row.count,0),catalog.findings.length);
}
for(const row of original.findings){
 const target=data.findings.find(item=>key(item)===key(row)||(item.mergedFrom||[]).some(member=>key(member)===key(row)));
 assert(target,'Every historical identity survives');
 const preserved=key(target)===key(row)?target:target.mergedFrom.find(item=>key(item)===key(row));
 assert.equal(preserved.stav,row.stav);assert.equal(preserved.timeURL,row.timeURL);assert.equal(preserved.seconds,row.seconds);
}
for(const id of [1089,1447,1453,1461,1539,1794,1818,1838,1918])assert.notEqual(data.findings.find(row=>row.candidate===id).section,'guests','Other shows, events and publication-only plans stay separate');
for(const id of [836,1720])assert.equal(data.findings.find(row=>row.candidate===id).stav,'Splněno později');
assert.equal(data.findings.find(row=>row.candidate===1755).stav,'Nesplněno','An earlier Juraj Tekel visit never fulfils a later invitation');
const combined=data.findings.find(row=>row.candidate===519);
assert.deepEqual(Array.from(combined.mergedFrom,row=>row.candidate),[519,1506]);
assert(combined.vysvetleni.includes(original.findings.find(row=>row.candidate===1506).vysvetleni));
const serialized=JSON.stringify(data);scope.VedatorSlibyGuests.apply(data,review);assert.equal(JSON.stringify(data),serialized,'Guest overlay is idempotent');
scope.VedatorSlibyAdminStatus.apply(data,require('../sliby/admin-overrides.json'));
assert.equal(data.findings.find(row=>row.candidate===959).stav,'Budoucí slib','Danica’s distant return remains a future promise');
assert.equal(data.findings.find(row=>row.candidate===1478).stav,'Budoucí slib','Brian Greene’s conditional return remains a future promise');
const legacy=original.findings.find(row=>row.candidate===1506);
const override={schema:1,items:{[key(legacy)]:{stav:'Splněno později',note:'Ruční kontrola',updatedAt:'2026-11-20T08:00:00Z'}}};
scope.VedatorSlibyAdminStatus.apply(data,override);assert.equal(combined.stav,'Splněno později','Admin ratings against a former duplicate survive');

// Execute the actual patched runtime and compact cards: exercise section/status
// controls, search, historical personal state, mentions and JSON export together.
const {patchReport}=require('./patch-sliby-admin-runtime.cjs'),patched=patchReport(html);
new vm.Script(patched.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(/guest-promises\.js\?v=[a-f0-9]{12}/.test(patched));
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.value='';this._text='';this.checked=false;this.hidden=false;this.readyState=0}
 set textContent(value){this._text=String(value);this.children=[]}get textContent(){return this._text+this.children.map(child=>typeof child==='string'?child:child.textContent).join('')}
 append(...children){for(const child of children)this.children.push(...(child.tag==='#fragment'?child.children:[child]))}
 replaceChildren(...children){this.children=[];this._text='';this.append(...children)}
 setAttribute(key,value){this.attrs[key]=String(value)}getAttribute(key){return this.attrs[key]??null}
 addEventListener(key,fn){this.listeners[key]=fn}click(){}remove(){}focus(){}showModal(){this.open=true}close(){this.open=false}
}
const elements={};for(const match of patched.matchAll(/id="([\w-]+)"/g))elements[match[1]]=new Element('div');
for(const id of ['audit-data','link-review-data','guest-review-data'])elements[id].textContent=patched.match(new RegExp('id="'+id+'">([\\s\\S]*?)<\\/script>'))[1];
const summary=['','Splněno později','Splněno už dříve','Nesplněno','Budoucí slib'].map(status=>{const element=new Element('button');element.dataset.status=status;return element});
const nodes=element=>[element,...element.children.filter(child=>child instanceof Element).flatMap(nodes)];
const document={body:new Element('body'),getElementById:id=>elements[id]||nodes(elements.cards).find(element=>element.id===id),createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment'),querySelector:()=>null,querySelectorAll:()=>summary};
const storage=new Map([['vedator-sliby-user-state-v1',JSON.stringify({schema:1,items:{[key(legacy)]:{fulfilled:true,updatedAt:'2026-11-20T08:00:00Z'}}})]]),blobs=[];
const context={URL:class extends URL{static createObjectURL(blob){blobs.push(blob);return 'blob:test'}static revokeObjectURL(){}},Blob,document,setTimeout:()=>{},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}};
vm.createContext(context);
for(const file of ['link-promises.js','guest-promises.js'])vm.runInContext(fs.readFileSync('sliby/'+file,'utf8'),context);
vm.runInContext(patched.match(/<script>([\s\S]*?)<\/script>/)[1],context);
vm.runInContext(fs.readFileSync('sliby/card-ui-v3.js','utf8'),context);
assert.deepEqual(elements.sections.children.map(element=>element.textContent),['Epizody','Odkazy','Hosté','Ostatní']);
for(const element of elements.sections.children){const input=element.children[0],checked=element.dataset.section==='guests';if(input.checked!==checked){input.checked=checked;input.listeners.change()}}
const cards=()=>elements.cards.children.filter(element=>element.tag==='article');
assert.equal(cards().length,37);
assert.equal(vm.runInContext('fulfilled(D.findings.find(row=>row.candidate===519))',context),true,'Personal ratings against the merged member survive');
for(const id of [753,1742,1755,519]){
 const card=cards().find(element=>Number(element.dataset.candidate)===id);
 assert(nodes(card).some(element=>element.className==='topic-toggle'&&element.textContent.includes('(2×)')),'Repeated guest invitation shows all mentions: '+id);
 assert.equal(nodes(card).filter(element=>element.className==='episode-mention').length,2);
}
elements.q.value='Pozvat Juraje Tekela na další návštěvu po heliu';elements.q.listeners.input();assert.equal(cards().length,1);
elements.status.value='Nesplněno';elements.status.listeners.change();assert.equal(cards().length,1);assert.equal(Number(cards()[0].dataset.candidate),1755);
elements.status.value='Splněno později';elements.status.listeners.change();assert.equal(cards().length,0);
elements.q.value='';elements.q.listeners.input();elements.status.value='';elements.status.listeners.change();
elements['export-json'].onclick();assert.equal(blobs.length,1);
blobs[0].text().then(text=>{const snapshot=JSON.parse(text);assert.equal(snapshot.findings.filter(row=>row.section==='guests').length,37);assert.deepEqual(snapshot.sections.options.map(row=>row.id),['episodes','links','guests','other']);console.log('PASS: 38 reviewed invitations in 37 guest cards; ordered sections, exact identities, repeated visits, search/status controls, legacy personal/admin ratings, archive and export.');}).catch(error=>{console.error(error);process.exitCode=1});
const admin=fs.readFileSync('sliby/admin/index.html','utf8');assert(admin.includes('VedatorSlibyGuests.apply(data,'));assert(admin.includes("row.section==='guests'?'Hosté'"));
assert(fs.readFileSync('index.html','utf8').includes("if(record.section==='guests')return true;"),'Episode topic filters never hide selected guest invitations');

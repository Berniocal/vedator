const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'sliby/index.html','utf8');
const data=JSON.parse(html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/)[1]);
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const KEY='vedator-sliby-user-state-v1',key=r=>JSON.stringify([r.candidate,r.tema]);
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.value='';this._text='';this.checked=false;this.hidden=false;this.currentTime=0;this.readyState=0}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('')}
 append(...items){for(const item of items)this.children.push(...(item.tag==='#fragment'?item.children:[item]))}
 replaceChildren(...items){this.children=[];this._text='';this.append(...items)}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}
 addEventListener(k,f){this.listeners[k]=f}click(){this.clicked=true}remove(){this.removed=true}focus(){this.focused=true}
}
function boot(storage=new Map(),options={}){
 const elements={};for(const m of html.matchAll(/id="([\w-]+)"/g))elements[m[1]]=new Element('div');elements['audit-data'].textContent=JSON.stringify(data);
 const summary=['','Splněno později','Splněno už dříve','Nesplněno'].map(status=>{const e=new Element('button');e.dataset.status=status;return e});
 const body=new Element('body'),events={},blobs=[],revoked=[],timeouts=[];
 const nodes=n=>[n,...n.children.filter(c=>c instanceof Element).flatMap(nodes)];
 const document={body,getElementById:id=>elements[id]||nodes(elements.cards).find(e=>e.id===id),createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment'),querySelectorAll:s=>{assert.equal(s,'.summary button');return summary}};
 const context={document,Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test-'+blobs.length},revokeObjectURL(url){revoked.push(url)}},setTimeout:f=>timeouts.push(f),window:{addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem(k){if(options.readError)throw Error('Storage unavailable');return storage.get(k)??null},setItem(k,v){if(options.writeError)throw Error('Storage full');storage.set(k,v)}}};
 vm.runInNewContext(script,context);
 const cards=()=>elements.cards.children.filter(e=>e.tag==='article');
 const card=r=>cards().find(e=>Number(e.dataset.candidate)===r.candidate&&e.children[1].children[0].textContent===r.tema);
 const selectSection=id=>{for(const e of elements.sections.children){const input=e.children[0],checked=e.dataset.section===id;if(input.checked!==checked){input.checked=checked;input.listeners.change()}}};
 const check=(r,value)=>{const input=nodes(card(r)).find(e=>e.tag==='input'&&e.type==='checkbox');assert(input);input.checked=value;input.listeners.change()};
 const remove=r=>nodes(card(r)).find(e=>e.tag==='button'&&e.textContent==='Smazat').onclick();
 return {elements,context,storage,events,blobs,body,timeouts,revoked,nodes,cards,card,selectSection,check,remove,options};
}
async function main(){
 const storage=new Map(),app=boot(storage),original=JSON.stringify(data);
 const pending=data.findings.find(r=>r.section==='episodes'&&r.stav==='Nesplněno');
 const done=data.findings.find(r=>r.section==='episodes'&&r.stav!=='Nesplněno');
 const other=data.findings.find(r=>r.section==='other');
 assert.equal(app.nodes(app.card(pending)).find(e=>e.type==='checkbox').checked,false);
 assert.equal(app.nodes(app.card(done)).find(e=>e.type==='checkbox').checked,true);
 const later=Number(app.elements.nlater.textContent);app.check(pending,true);
 assert.equal(Number(app.elements.nlater.textContent),later+1);
 assert(app.card(pending).textContent.includes('Vaše hodnocení: splněno'));
 assert(app.card(pending).textContent.includes('Původní výsledek auditu: Nesplněno'));
 app.elements.status.value='Splněno později';app.elements.status.listeners.change();assert(app.card(pending));
 app.elements.status.value='Nesplněno';app.elements.status.listeners.change();assert(!app.card(pending));
 app.elements.status.value='';app.elements.status.listeners.change();app.check(done,false);
 assert(app.card(done).textContent.includes('Vaše hodnocení: nesplněno'));
 let reloaded=boot(storage);assert(reloaded.nodes(reloaded.card(pending)).find(e=>e.type==='checkbox').checked);
 assert(!reloaded.nodes(reloaded.card(done)).find(e=>e.type==='checkbox').checked);
 app.remove(pending);assert(!app.card(pending));assert.equal(app.elements['show-deleted'].textContent,'Smazané (1)');
 reloaded=boot(storage);assert(!reloaded.card(pending));
 app.selectSection('other');app.check(other,true);app.remove(other);
 app.elements.q.value='no-match-on-purpose';app.elements.q.listeners.input();
 app.elements['export-json'].onclick();assert.equal(app.blobs.length,1);
 const downloaded=JSON.parse(await app.blobs[0].text());
 assert.equal(downloaded.format,'vedator-sliby-personal-export');
 assert.equal(downloaded.findings.length,data.findings.length-2);assert.equal(downloaded.deletedFindings.length,2);
 assert(downloaded.findings.some(r=>r.section==='episodes'));assert(downloaded.findings.some(r=>r.section==='other'));
 const deleted=downloaded.deletedFindings.find(r=>key(r)===key(pending));assert(deleted.fulfilled);assert(deleted.deleted);assert.equal(deleted.stav,'Splněno později');assert.equal(deleted.auditStatus,'Nesplněno');assert.equal(deleted.timeURL,pending.timeURL);
 assert.equal(downloaded.findings.find(r=>key(r)===key(done)).stav,'Nesplněno');
 assert.equal(downloaded.personalState.items[key(pending)].fulfilled,true);
 assert.equal(downloaded.sections.options.reduce((n,s)=>n+s.count,0),downloaded.findings.length);
 assert.equal(Object.values(downloaded.classification.statusCounts).reduce((a,b)=>a+b,0),downloaded.findings.length);
 assert(app.body.children.find(e=>e.tag==='a').clicked);assert(app.body.children.find(e=>e.tag==='a').removed);app.timeouts.forEach(f=>f());assert.equal(app.revoked.length,1);
 app.elements.q.value='';app.elements.q.listeners.input();app.selectSection('episodes');app.elements['show-deleted'].onclick();
 assert(app.card(pending));app.nodes(app.card(pending)).find(e=>e.tag==='button'&&e.textContent==='Obnovit').onclick();assert(!app.card(pending));
 app.elements['show-deleted'].onclick();assert(app.card(pending));assert(app.nodes(app.card(pending)).find(e=>e.type==='checkbox').checked);
 assert(boot(storage).card(pending));
 // Distinct topics that share a candidate id retain independent personal state.
 const siblings=data.findings.filter(r=>r.candidate===391);assert.equal(siblings.length,2);
 const duplicateApp=boot(new Map());duplicateApp.selectSection(siblings[0].section);duplicateApp.remove(siblings[0]);assert(duplicateApp.card(siblings[1]));assert(!duplicateApp.card(siblings[0]));
 // A second tab's change must survive a write and its storage event must redraw.
 const external=JSON.parse(storage.get(KEY));external.items[key(pending)].fulfilled=false;storage.set(KEY,JSON.stringify(external));
 app.events.storage({key:KEY});assert(!app.nodes(app.card(pending)).find(e=>e.type==='checkbox').checked);
 const newApp=boot(storage);app.check(pending,true);newApp.check(done,true);
 assert(JSON.parse(storage.get(KEY)).items[key(pending)].fulfilled);
 // Invalid / unavailable storage never breaks rendering; failed writes retain all edits for export.
 const broken=boot(new Map([[KEY,'not-json']]));assert(broken.cards().length>0);assert(broken.elements['save-status'].textContent.includes('nepodařilo'));
 const unavailable=boot(new Map(),{readError:true,writeError:true});unavailable.check(pending,true);unavailable.check(done,false);
 assert(unavailable.elements['save-status'].textContent.includes('nepodařilo'));
 unavailable.elements['export-json'].onclick();const fallback=JSON.parse(await unavailable.blobs[0].text());assert(fallback.findings.find(r=>key(r)===key(pending)).fulfilled);assert(!fallback.findings.find(r=>key(r)===key(done)).fulfilled);
 const quota=boot(new Map(),{writeError:true});quota.check(pending,true);quota.check(done,false);quota.elements['export-json'].onclick();const unsaved=JSON.parse(await quota.blobs[0].text());assert(unsaved.findings.find(r=>key(r)===key(pending)).fulfilled);assert(!unsaved.findings.find(r=>key(r)===key(done)).fulfilled);
 assert.equal(JSON.stringify(data),original,'Personal changes must never rewrite the audit source');
 console.log('PASS: fulfilled/unfulfilled overrides, counters/filters, reload persistence, independent shared ids, delete/restore, both-section JSON download, multi-tab merge, and storage failures.');
}
main().catch(e=>{console.error(e);process.exitCode=1});


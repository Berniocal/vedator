const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'sliby/index.html','utf8');
const data=JSON.parse(html.match(/<script type="application\/json" id="audit-data">([\s\S]*?)<\/script>/)[1]);
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.value='';this._text='';this.hidden=false;this.currentTime=0;this.readyState=0}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('')}
 append(...items){for(const item of items){if(item.tag==='#fragment')this.children.push(...item.children);else this.children.push(item)}}
 replaceChildren(...items){this.children=[];this._text='';this.append(...items)}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return k==='src'?this.src:this.attrs[k]??null}
 addEventListener(k,f){this.listeners[k]=f}load(){this.loadCount=(this.loadCount||0)+1;this.readyState=0;this.duration=NaN;this.currentTime=0}play(){this.playCount=(this.playCount||0)+1;this.played=true;return Promise.resolve()}pause(){this.played=false}
}
const elements={};for(const m of html.matchAll(/id="([\w-]+)"/g))elements[m[1]]=new Element('div');elements['audit-data'].textContent=JSON.stringify(data);
const buttons=['','Splněno později','Splněno už dříve','Nesplněno'].map(status=>{const e=new Element('button');e.dataset.status=status;return e});
const context={document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment'),querySelectorAll:s=>{assert.equal(s,'.summary button');return buttons}},Blob,URL,setTimeout};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
const count=()=>elements.cards.children.filter(n=>n.tag==='article').length;
const sections=elements.sections.children;
const toggle=(label,checked)=>{const input=label.children[0];if(input.checked!==checked){input.checked=checked;input.listeners.change()}};
const openSection=id=>{assert(sections.some(b=>b.dataset.section===id));for(const label of sections)toggle(label,label.dataset.section===id)};
const setCategory=value=>{for(const label of elements.categories.children)toggle(label,!value||label.dataset.category===value)};
const inSection=id=>data.findings.filter(r=>r.section===id);
const rendered=()=>elements.cards.children.filter(n=>n.tag==='article').map(card=>[Number(card.dataset.candidate),card.children[1].children[0].children.find(n=>n.className==='topic-toggle').textContent]);
const expected=rows=>rows.map(r=>[r.candidate,elements['compact-view'].checked?(r.compactTitle||r.displayTema||r.tema):(r.displayTema||r.tema)]);
// Split topics can share a candidate id; their archival records must remain distinct.
assert.deepEqual(data.archive.findings.map(r=>[r.candidate,r.tema]),data.findings.map(r=>[r.candidate,r.tema]));
assert.equal(data.sections.default,'episodes');
assert.deepEqual(data.sections.options.map(s=>s.id),['episodes','other']);
assert.equal(sections.length,2);
assert.deepEqual(rendered(),expected(inSection('episodes')));
assert.equal(sections.find(b=>b.dataset.section==='episodes').children[0].checked,true);
// Each section combines promises and ideas, classified by the thing proposed.
for(const section of ['episodes','other']){
 const categories=new Set(inSection(section).map(r=>r.kategorie));
 assert(categories.has('Sliby'));assert(categories.has('Návrhy / nápady'));
}
for(const candidate of [19,1047,195,217,1035,1045,210,1043,26,1049,1050,1054,1057,1077,1079,1081,1095,1096,121,126,1102,1107,1121,1125,1131,1132,1137,1148,1153,213,1162,1173,1363,1391,655,904,905,951,1174,1271,928,955,983,1010]){
 const rows=data.findings.filter(r=>r.candidate===candidate||(r.mergedFrom||[]).some(m=>m.candidate===candidate));assert(rows.length);assert(rows.every(r=>r.section==='episodes'));
}
for(const candidate of [1072,1080,1110,1126,1128,1145,1146,1147,1154,1155,1157,1158,1160,777,1111,1133,1141,1144,1041,28,1056,58,1071,1075,1092,135,1112,1115,167,184,1140,1143,1156,232,1167,1168,1169,1170,1172,1176,1179,1182,1185,1191,1192,1249,1263,1267,303,1274,1279,1284,1285,1286,1292,1295,1298,1305,1306,1308,1316,1318,1320,1322,1329,1330,1338,1348,1350,1356,1358,1359,1360,1361,1364,1370,1372,1403,1409,463,464,1411,1415,1417,1422,1425,1426,501,516,519,535,555,700,753,803,893,938]){
 const rows=data.findings.filter(r=>r.candidate===candidate||(r.mergedFrom||[]).some(m=>m.candidate===candidate));assert(rows.length);assert(rows.every(r=>r.section==='other'));
}
// Classification counts cover every record and follow content rather than event format.
assert.equal(data.sections.review.reviewedFindings,data.findings.length);
assert.equal(data.sections.options.reduce((n,s)=>n+s.count,0),data.findings.length);
for(const [field,counts] of [['kategorie',data.classification.categoryCounts],['stav',data.classification.statusCounts]]){
 for(const [value,total] of Object.entries(counts))assert.equal(total,data.findings.filter(r=>r[field]===value).length);
 assert.equal(Object.values(counts).reduce((n,total)=>n+total,0),data.findings.length);
}
const allNodes=n=>[n,...n.children.filter(c=>c instanceof Element).flatMap(allNodes)];
const links=[],seen=[];
for(const section of data.sections.options){
 openSection(section.id);const rows=inSection(section.id);
 assert.deepEqual(rendered(),expected(rows));seen.push(...rendered());
 assert.equal(section.count,rows.length);assert.equal(Number(elements.nfind.textContent),rows.length);
 for(const status of data.classification.statuses){elements.status.value=status;elements.status.listeners.change();assert.deepEqual(rendered(),expected(rows.filter(r=>r.stav===status)))}
 elements.status.value='';elements.status.listeners.change();
 const nodes=allNodes(elements.cards);links.push(...nodes.filter(n=>n.tag==='a'));assert(!nodes.some(n=>n.tag==='details'));
 for(const r of rows)assert(elements.cards.textContent.includes(r.vysvetleni));
 assert(!elements.cards.textContent.includes('Krátká doslovná formulace'));assert(!elements.cards.textContent.includes('Otevřít titulky'));
 buttons[3].onclick();assert.deepEqual(rendered(),expected(rows.filter(r=>r.stav==='Nesplněno')));buttons[0].onclick();
}
assert.equal(seen.length,data.findings.length);assert.equal(new Set(seen.map(r=>JSON.stringify(r))).size,data.findings.length);
assert(links.length>=data.findings.length);assert(links.every(a=>/^https:.*#t=\d/.test(a.href)));
// Two rows of native checkbox controls replace both old tabs and descriptions.
assert(!html.includes('id="read-state"'));assert(!html.includes('<select id="category"'));
assert(!html.includes('class="personal-help"'));assert(!html.includes('class="section-nav"'));
assert.equal(elements.categories.children.length,2);
assert.deepEqual(elements.categories.children.map(e=>e.textContent),['Sliby','Nápady']);
assert.deepEqual(sections.map(e=>e.textContent),['Epizody','Ostatní']);
for(const label of [...sections,...elements.categories.children]){assert.equal(label.tag,'label');assert.equal(label.children[0].type,'checkbox');assert(label.children[0].attrs['aria-label'])}
for(const section of ['episodes','other']){
 openSection(section);
 for(const category of ['',...data.classification.categories]){
  setCategory(category);
  const rows=inSection(section).filter(r=>!category||r.kategorie===category);
  assert.deepEqual(rendered(),expected(rows));
  assert.equal(Number(elements.nfind.textContent),rows.length);
  assert.equal(Number(elements.nlater.textContent),rows.filter(r=>r.stav==='Splněno později').length);
  assert.equal(Number(elements.nprior.textContent),rows.filter(r=>r.stav==='Splněno už dříve').length);
  assert.equal(Number(elements.nopen.textContent),rows.filter(r=>r.stav==='Nesplněno').length);
  for(const status of ['',...data.classification.statuses]){
   elements.status.value=status;elements.status.listeners.change();
   assert.deepEqual(rendered(),expected(rows.filter(r=>!status||r.stav===status)));
  }
  elements.status.value='';elements.q.value='Sagan';elements.q.listeners.input();
  const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  assert.deepEqual(rendered(),expected(rows.filter(r=>fold([r.displayTema||r.tema,r.tema,r.episodeLabel,r.sourceTitle,r.vysvetleni,r.outcomeNote,...(r.mergedFrom||[]).flatMap(m=>[m.tema,m.episodeLabel,m.sourceTitle,m.vysvetleni]),...r.targets.map(t=>t.title)].join(' ')).includes('sagan'))));
  elements.q.value='';elements.q.listeners.input();
 }
}
setCategory('Sliby');openSection('episodes');
assert.deepEqual(rendered(),expected(inSection('episodes').filter(r=>r.kategorie==='Sliby')));
setCategory('');
// All four checkbox combinations compose, including both scopes and no selection.
for(const e of sections)toggle(e,true);assert.equal(count(),data.findings.length);
for(const e of sections)toggle(e,false);assert.equal(count(),0);assert.equal(Number(elements.nfind.textContent),0);
openSection('episodes');for(const e of elements.categories.children)toggle(e,false);assert.equal(count(),0);
setCategory('');
// Searching never leaks matches from a different section.
openSection('episodes');elements.q.value='ponožky';elements.q.listeners.input();assert.equal(count(),0);
openSection('other');assert(count()>0);elements.q.value='';elements.q.listeners.input();openSection('episodes');
// Exercise the real report script against audio metadata and seek events.
const a=elements.audio,back=elements['audio-back'],forward=elements['audio-forward'];
const click=link=>link.listeners.click({button:0,preventDefault(){}});
for(const r of data.findings){
 assert.equal(Number(r.timeURL.split('#t=')[1]),r.seconds);
 const [h,m,s]=r.time.split(':').map(Number);assert.equal(h*3600+m*60+s,Math.floor(r.seconds));
}
for(const review of data.anchorReview||[]){
 const r=data.findings.flatMap(r=>r.mergedFrom||[r]).find(r=>r.candidate===review.candidate&&r.tema===review.tema);
 assert(r);assert.equal(r.seconds,review.seconds);assert.equal(r.time,review.time);
}
const first=links[0],r=data.findings[0];let prevented=false;
first.listeners.click({button:0,preventDefault(){prevented=true}});
assert(prevented);assert.equal(a.src,r.sourceRecording.audioURL);assert.equal(a.currentTime,0);
// Accumulate rapid presses from the requested offset while metadata is pending.
forward.onclick();forward.onclick();back.onclick();assert.equal(a.currentTime,0);
a.readyState=1;a.duration=20000;a.listeners.loadedmetadata();assert.equal(a.currentTime,r.seconds+10);assert(a.played);
a.pause();const plays=a.playCount;back.onclick();assert.equal(a.currentTime,r.seconds);assert(!a.played);assert.equal(a.playCount,plays);
a.currentTime=3;back.onclick();assert.equal(a.currentTime,0);
a.currentTime=95;a.duration=100;forward.onclick();assert.equal(a.currentTime,100);
a.duration=NaN;forward.onclick();assert.equal(a.currentTime,110);
// Repeated links to an already loaded recording use the newest start immediately.
a.duration=20000;click(first);assert.equal(a.currentTime,r.seconds);
const different=links.find(link=>link.href.split('#')[0]!==a.src);assert(different);
click(different);assert.equal(a.readyState,0);click(first);click(different);
const requested=Number(different.href.split('#t=')[1]);
back.onclick();back.onclick();forward.onclick();
a.readyState=1;a.duration=20000;a.listeners.loadedmetadata();assert.equal(a.currentTime,Math.max(0,Math.max(0,requested-10)-10)+10);
// A short recording clamps any requested start to its actual duration.
click(first);a.readyState=1;a.duration=5;a.listeners.loadedmetadata();assert.equal(a.currentTime,Math.min(5,r.seconds));
elements['audio-close'].onclick();assert(!a.played&&elements['audio-panel'].hidden);
buttons[2].onclick();assert.equal(count(),inSection('episodes').filter(r=>r.stav==='Splněno už dříve').length);assert.equal(buttons[2].attrs['aria-pressed'],'true');
console.log(`PASS: ${data.findings.length} records, four checkbox filters, both/neither scopes and categories, episode default, scoped counts/search/filters, time links, pending seeks, rapid ±10 s presses, duration bounds and paused playback.`);


const groups=data.findings.filter(r=>r.mergedFrom);
for(const id of [42,1353,1599,87])assert(groups.some(r=>r.candidate===id));
const originals=data.findings.flatMap(r=>r.mergedFrom||[r]);
assert.equal(new Set(originals.map(r=>JSON.stringify([r.candidate,r.tema]))).size,originals.length);
for(const r of groups){
 assert(r.mergedFrom.length>1);
 assert(r.mergedFrom.some(m=>m.candidate===r.candidate&&m.tema===r.tema));
 for(const m of r.mergedFrom){
  if(m.candidate!==r.candidate||m.tema!==r.tema)assert(!data.findings.some(row=>row.candidate===m.candidate&&row.tema===m.tema));
  assert(links.some(a=>a.href===m.timeURL),'Every original statement must retain its playback link');
 }
}
console.log('PASS: consolidated series preserve original statements and playback links without duplicate cards.');


assert.equal(elements['compact-view'].checked,true,'Compact is the default');
assert(elements.categories.children.every(label=>label.children[0].checked));
// Compact view changes presentation only; every item and action stays available.
elements.status.value='';elements.q.value='';for(const label of sections)toggle(label,true);setCategory('');
const totalBefore=count(),compact=elements['compact-view'];
compact.checked=true;compact.listeners.change();
assert.equal(count(),totalBefore);
for(const card of elements.cards.children.filter(n=>n.tag==='article')){
 assert.equal(card.children[0].hidden,true);
 const body=card.children[1],details=body.children.find(n=>n.className==='finding-details'),title=body.children[0].children.find(n=>n.className==='topic-toggle');
 assert(details.hidden);assert.equal(title.tag,'button');assert.equal(title.attrs['aria-expanded'],'false');
 assert(allNodes(body).some(n=>n.type==='checkbox'));assert(allNodes(body).some(n=>n.tag==='button'&&n.textContent==='Smazat'));
}
const compactCard=elements.cards.children.find(n=>n.tag==='article'),compactBody=compactCard.children[1],compactTitle=compactBody.children[0].children.find(n=>n.className==='topic-toggle'),compactDetails=compactBody.children.find(n=>n.className==='finding-details');
compactTitle.listeners.click();assert.equal(compactDetails.hidden,false);assert.equal(compactCard.children[0].hidden,false);assert.equal(compactTitle.attrs['aria-expanded'],'true');
compactTitle.listeners.click();assert(compactDetails.hidden);assert(compactCard.children[0].hidden);assert.equal(compactTitle.attrs['aria-expanded'],'false');
compact.checked=false;compact.listeners.change();assert.equal(count(),totalBefore);
for(const card of elements.cards.children.filter(n=>n.tag==='article')){assert.equal(card.children[0].hidden,false);assert.equal(card.children[1].children.find(n=>n.className==='finding-details').hidden,false)}
console.log('PASS: compact view preserves all records and actions, title toggles details, full view expands everything.');

compact.checked=true;compact.listeners.change();
const playCard=elements.cards.children.find(n=>n.tag==='article'),playBody=playCard.children[1],play=playBody.children.find(n=>n.className==='finding-actions').children.find(n=>n.className==='promise-play'),playDetails=playBody.children.find(n=>n.className==='finding-details');
const playRow=data.findings.find(r=>r.candidate===Number(playCard.dataset.candidate));
assert(play&&!play.hidden);assert(playDetails.hidden);a.readyState=0;play.listeners.click();assert(playDetails.hidden,'Playing must not expand details');
assert.equal(a.src,playRow.sourceRecording.audioURL);a.readyState=1;a.duration=20000;a.listeners.loadedmetadata();assert.equal(a.currentTime,playRow.seconds);assert(a.played);
console.log('PASS: compact default and a separate large play button seek to the promise without expanding details.');

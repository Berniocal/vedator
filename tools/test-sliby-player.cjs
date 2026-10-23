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
const count=()=>elements.cards.children.length;
assert.equal(count(),data.findings.length);
for(const status of data.classification.statuses){elements.status.value=status;elements.status.listeners.change();assert.equal(count(),data.findings.filter(r=>r.stav===status).length)}
elements.status.value='';
for(const category of data.classification.categories){elements.cat.value=category;elements.cat.listeners.change();assert.equal(count(),data.findings.filter(r=>r.kategorie===category).length)}
elements.cat.value='';elements['read-state'].value='done';elements['read-state'].listeners.change();assert.equal(count(),data.findings.filter(r=>r.fullRead).length);
elements['read-state'].value='';elements.q.value='feynman';elements.q.listeners.input();assert(count()>0&&count()<data.findings.length);
elements.q.value='';elements.q.listeners.input();assert.equal(count(),data.findings.length);
const allNodes=n=>[n,...n.children.filter(c=>c instanceof Element).flatMap(allNodes)];
const nodes=allNodes(elements.cards),links=nodes.filter(n=>n.tag==='a');assert(links.length>=data.findings.length);assert(links.every(a=>/^https:.*#t=\d/.test(a.href)));assert(!nodes.some(n=>n.tag==='details'));
for(const r of data.findings)assert(elements.cards.textContent.includes(r.vysvetleni));
assert(!elements.cards.textContent.includes('Krátká doslovná formulace'));assert(!elements.cards.textContent.includes('Otevřít titulky'));
// Exercise the real report script against audio metadata and seek events.
const a=elements.audio,back=elements['audio-back'],forward=elements['audio-forward'];
const click=link=>link.listeners.click({button:0,preventDefault(){}});
for(const r of data.findings){
 assert.equal(Number(r.timeURL.split('#t=')[1]),r.seconds);
 const [h,m,s]=r.time.split(':').map(Number);assert.equal(h*3600+m*60+s,Math.floor(r.seconds));
}
for(const review of data.anchorReview||[]){
 const r=data.findings.find(r=>r.candidate===review.candidate&&r.tema===review.tema);
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
buttons[2].onclick();assert.equal(count(),data.findings.filter(r=>r.stav==='Splněno už dříve').length);assert.equal(buttons[2].attrs['aria-pressed'],'true');
console.log(`PASS: ${data.findings.length} records, filters, time links, pending seeks, rapid ±10 s presses, duration bounds and paused playback.`);

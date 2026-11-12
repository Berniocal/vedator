const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  const slibyOrderOptions=');
const end=html.indexOf('  // Per-item completion/deletion',start);
assert(start>0&&end>start,'Embedded Sliby selector script must exist');
const factory=new vm.Script('(function(iframe){\n'+html.slice(start,end)+'\nreturn {slibyOrderOptions,installOrderSelector};\n})').runInNewContext();
const records=[
  {index:1,sourceRecording:{date:'2020-01-01'},seconds:2,mentions:4},
  {index:2,sourceRecording:{date:'2021-01-01'},seconds:2,mentions:1},
  {index:3,sourceRecording:{date:'2022-01-01'},seconds:2,mentions:2},
  {index:4,sourceRecording:{date:'2023-01-01'},seconds:2,mentions:4},
];
const iframe={contentWindow:{
  sectionRows:()=>records.slice(),
  promiseMentions:r=>Array(r.mentions).fill(null),
  render(){this.lastRendered=this.sectionRows().map(r=>r.index)}
}};
let selector;
const toolbar={appendChild(element){selector=element}};
const status={closest:()=>toolbar,setAttribute(name,value){this[name]=value}};
const doc={
  getElementById:id=>id==='status'?status:id==='vedator-sliby-order'?selector:null,
  createElement:tag=>({
    tag,value:'',textContent:'',children:[],listeners:{},
    setAttribute(name,value){this[name]=value},
    appendChild(child){this.children.push(child);if(this.tag==='select'&&!this.value)this.value=child.value},
    addEventListener(name,fn){this.listeners[name]=fn}
  })
};
const {slibyOrderOptions,installOrderSelector}=factory(iframe);
installOrderSelector(doc);
assert.deepEqual(Array.from(slibyOrderOptions,pair=>pair[0]),['newest','oldest','most','least']);
assert.deepEqual(selector.children.map(o=>o.textContent),[
  'Nejnovější první','Nejstarší první','Nejvícekrát slíbené','Nejméněkrát slíbené']);
assert.equal(status.hidden,true);
assert.deepEqual(iframe.contentWindow.sectionRows().map(r=>r.index),[4,3,2,1]);
for(const [choice,expected] of [
  ['oldest',[1,2,3,4]],
  ['most',[4,1,3,2]],
  ['least',[2,3,4,1]],
  ['newest',[4,3,2,1]],
]){
  selector.value=choice;
  selector.listeners.change();
  assert.deepEqual(iframe.contentWindow.lastRendered,expected,choice+' sorting');
}
installOrderSelector(doc);
assert.equal(selector.children.length,4,'Selector must not be installed twice');
// Both new choices must survive the embedded-view preference round trip.
assert(html.includes("order:slibyOrderOptions.some(([value])=>value===order.value)?order.value:'newest'"));
assert(html.includes("order.value=slibyOrderOptions.some(([value])=>value===saved.order)?saved.order:'newest'"));
console.log('PASS: four Sliby sort modes, mention counts, date tie-breaking, selector reload and saved preferences.');

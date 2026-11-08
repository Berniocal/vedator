// AI Vedátor – samostatný experiment. Není načítán hlavní aplikací.
"use strict";
const MODEL = "Xenova/multilingual-e5-small";
// Transformers.js 3.8.1 uses the default browser Cache Storage named "transformers-cache".
const CACHE_KEY = "transformers-cache";
const OLD_CACHE_KEY = "vedator-ai-model-v1";
const MODEL_CACHES = [CACHE_KEY, OLD_CACHE_KEY];
function modelPath(req){
  try{return decodeURIComponent(String(req.url||req)).toLowerCase();}catch{return String(req.url||req).toLowerCase();}
}
function isVedatorModelFile(req){return modelPath(req).includes("/xenova/multilingual-e5-small/");}
function isVedatorModelWeights(req){
  return isVedatorModelFile(req) && /\/onnx\/model_(?:quantized|int8|uint8|q8)\.onnx(?:[?#]|$)/.test(modelPath(req));
}
const DB_NAME = "vedator-ai-index-v1";
// V telefonu se indexuje jen malý předvýběr, ne všech 5 000+ shrnutí.
const CANDIDATE_LIMIT = 24;
const BATCH_SIZE = 3;
const EMBED_CHARS = 480;
const MODEL_LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const $ = id => document.getElementById(id);
const state = { installed:false, busy:false, entries:[], vectors:new Map(), extractor:null, dbPromise:null, library:null, dataReady:false, remoteDownload:false };
const clean = value => String(value == null ? "" : value).replace(/\\[()[\]]/g," ").replace(/[{}$]/g," ").replace(/\s+/g," ").trim();
const norm = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const tokens = value => new Set((norm(value).match(/[\p{L}\p{N}]{3,}/gu) || []).filter(x=>!["jak","proc","proč","kdy","kde","ktery","který","jaky","jaký","jsou","jsem","toto","podle","vedator","vedátor"].includes(x)));
const sleepFrame = () => new Promise(resolve => setTimeout(resolve,0));
function status(id,message,kind=""){const el=$(id);el.textContent=message;el.className="status"+(kind?" "+kind:"");}
function setBusy(value){
  state.busy=value;
  $("install").disabled=value || state.installed;
  $("remove").disabled=value || !state.installed;
  $("ask").disabled=value || !state.installed || !state.dataReady;
  $("question").disabled=value;
}
function fmtTime(seconds){let n=Math.max(0,Math.round(Number(seconds)||0));return Math.floor(n/3600)?Math.floor(n/3600)+":"+String(Math.floor(n%3600/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"):Math.floor(n/60)+":"+String(n%60).padStart(2,"0");}
function parseTime(s){const a=String(s||"").match(/\d+/g)?.map(Number)||[];return a.length===3?a[0]*3600+a[1]*60+a[2]:a.length===2?a[0]*60+a[1]:0;}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function makeEntry(id,kind,episode,order,raw,seconds,time,episodeName){
  const title=clean(raw.title||"");
  const points=(Array.isArray(raw.points)?raw.points:[]).map(clean).filter(Boolean);
  if(!title && !points.length)return null;
  const passage=(title+". "+points.join(" ")).slice(0,1300);
  return {id,kind,episode,order,title,points,seconds:Number(seconds)||parseTime(time),time:time||"",episodeName,passage,key:id+":"+hash(passage)};
}
function buildEntries(data){
  const names=new Map((data.episodes||[]).map(e=>[Number(e.number),clean(e.i18n?.cs?.title||e.title||"")]));
  const entries=[];
  for(const q of data.questions||[]){
    const episode=Number(q.episode),order=Number(q.order)||0,copy=q.i18n?.cs||q;
    const entry=makeEntry("q:"+episode+":"+order,"question",episode,order,copy,q.seconds,q.sourceTime||q.time,names.get(episode)||"");
    if(entry)entries.push(entry);
  }
  for(const [episodeKey,langs] of Object.entries(data.nonquestions?.episodes||{})){
    const episode=Number(episodeKey),items=langs.cs||langs.sk||[];
    if(!Array.isArray(items))continue;
    items.forEach((item,order)=>{
      const entry=makeEntry("n:"+episode+":"+order,"nonquestion",episode,order,item,item.seconds,item.sourceTime||item.time,names.get(episode)||"");
      if(entry)entries.push(entry);
    });
  }
  return entries;
}
async function getCache(){
  if(!("caches" in window))throw Error("Prohlížeč nepodporuje úložiště modelu (Cache Storage).");
  return await caches.open(CACHE_KEY);
}
async function cacheInstalled(){
  if(!("caches" in window))return false;
  const available=await caches.keys();
  for(const name of MODEL_CACHES){
    if(!available.includes(name))continue;
    const cache=await caches.open(name);
    const requests=await cache.keys();
    if(requests.some(isVedatorModelWeights))return true;
  }
  return false;
}
async function removeCachedModelFiles(){
  const available=await caches.keys();
  for(const name of MODEL_CACHES){
    if(!available.includes(name))continue;
    const cache=await caches.open(name);
    const files=(await cache.keys()).filter(isVedatorModelFile);
    for(const request of files)await cache.delete(request);
    // Never delete the entire shared cache. Other models may be stored in it.
    if(name===OLD_CACHE_KEY && !(await cache.keys()).length)await caches.delete(name);
  }
}
async function refreshModelStatus(){
  state.installed=await cacheInstalled();
  $("model-status").textContent=state.installed?"✓ Model je uložený v tomto prohlížeči":"Model není stažený";
  status("search-status",state.installed?"Můžeš se zeptat. Při prvním dotazu se připraví index shrnutí.":"Pro AI hledání nejdříve stiskni Stáhnout AI.");
  setBusy(state.busy);
}
async function loadLibrary(){
  if(state.library)return state.library;
  const lib=await import(MODEL_LIBRARY);
  lib.env.useBrowserCache=true;
  // This library version uses the shared default cache. Deletion is scoped to MODEL only.
  lib.env.allowLocalModels=false;
  lib.env.allowRemoteModels=true;
  // Zabránit vysoké paralelizaci WASM na mobilech s omezenou RAM.
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  // Při běžném vyhledávání nedovolíme model tiše znovu stáhnout.
  lib.env.fetch=async (url,options)=>{
    const address=String(url?.url||url);
    if(!state.remoteDownload && address.includes("multilingual-e5-small"))throw Error("Soubor modelu chybí. Stáhni AI znovu ručně.");
    return fetch(url,options);
  };
  state.library=lib;
  return lib;
}
async function loadExtractor(allowDownload){
  if(state.extractor)return state.extractor;
  const lib=await loadLibrary();
  state.remoteDownload=Boolean(allowDownload);
  try{
    const extractor=await lib.pipeline("feature-extraction",MODEL,{
      dtype:"q8",device:"wasm",
      progress_callback: p=>{
        if(!allowDownload)return;
        const progress=$("download-progress");
        if(p.status==="progress" && Number.isFinite(p.progress)){
          progress.classList.remove("hidden");progress.value=Math.max(0,Math.min(100,p.progress));
          status("download-status","Stahuji "+String(p.file||"model")+" · "+Math.round(p.progress)+" %");
        }else if(p.status==="initiate" || p.status==="download" || p.status==="done"){
          status("download-status",p.status==="done"?"Načteno: "+String(p.file||"soubor"):"Připravuji "+String(p.file||"model"));
        }
      }
    });
    state.extractor=extractor;
    return extractor;
  }finally{state.remoteDownload=false;}
}
async function install(){
  if(state.busy)return;
  setBusy(true);
  $("download-progress").value=0;
  $("download-progress").classList.remove("hidden");
  status("download-status","Připojuji se ke zdroji AI modelu…");
  try{
    await getCache();
    await loadExtractor(true);
    state.installed=await cacheInstalled();
    if(!state.installed)throw Error("Model byl načten, ale prohlížeč nepotvrdil jeho trvalé uložení. Ověř volné místo nebo povolení ukládání dat.");
    $("model-status").textContent="✓ Model je uložený v tomto prohlížeči";
    $("download-progress").value=100;
    status("download-status","AI byla stažena a uložena. Můžeš začít hledat.","ok");
    status("search-status","Připraveno. AI bude porovnávat jen vybrané pasáže, nikoli celý katalog.");
  }catch(e){status("download-status","Stažení selhalo: "+(e.message||e),"error");state.installed=await cacheInstalled();}
  finally{setBusy(false);}
}
function openDb(){
  if(state.dbPromise)return state.dbPromise;
  if(!("indexedDB" in window))return Promise.resolve(null);
  state.dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore("vectors",{keyPath:"key"});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  }).catch(e=>{console.warn("AI index nebude trvale uložen",e);return null;});
  return state.dbPromise;
}
async function loadSavedVectors(keys){
  // Čteme jen vektory pro aktuálních 24 kandidátů; nikdy celé historické úložiště.
  const missing=[...new Set(keys)].filter(key=>!state.vectors.has(key));
  if(!missing.length)return;
  const db=await openDb();if(!db)return;
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("vectors","readonly");
    const store=tx.objectStore("vectors");
    for(const key of missing){
      const req=store.get(key);
      req.onsuccess=()=>{if(req.result?.vector)state.vectors.set(key,req.result.vector);};
    }
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||Error("Index nebylo možné přečíst."));
  });
}
async function saveVectors(entries,vectors){
  const db=await openDb();if(!db)return;
  // Jedna transakce za dávku místo samostatné transakce pro každý řádek.
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("vectors","readwrite");
    const store=tx.objectStore("vectors");
    entries.forEach((entry,i)=>store.put({key:entry.key,vector:vectors[i]}));
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||Error("Index nebylo možné uložit."));
  });
}
async function deleteDb(){
  if(state.dbPromise){const db=await state.dbPromise;db?.close();state.dbPromise=null;}
  if(!("indexedDB" in window))return;
  await new Promise((resolve,reject)=>{
    const req=indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(Error("Index je otevřený v jiné záložce. Zavři ji a zkus to znovu."));
  });
}
async function removeModel(){
  if(state.busy||!state.installed)return;
  if(!confirm("Smazat staženou AI a index shrnutí z tohoto prohlížeče? Ostatních dat Vedátora se to nedotkne."))return;
  setBusy(true);
  try{
    if(state.extractor?.dispose)await state.extractor.dispose();
    state.extractor=null;
    await removeCachedModelFiles();
    await deleteDb();
    state.vectors.clear();
    state.installed=await cacheInstalled();
    if(state.installed)throw Error("Některé soubory modelu zůstaly uložené.");
    $("results").classList.add("hidden");
    $("model-status").textContent="Model není stažený";
    $("download-progress").classList.add("hidden");
    status("download-status","AI a její index byly smazány. Hlavní aplikace zůstala beze změny.","ok");
    status("search-status","Pokud chceš znovu hledat, stáhni AI ručně.");
  }catch(e){status("download-status","Smazání se nepodařilo úplně dokončit: "+(e.message||e),"error");state.installed=await cacheInstalled();}
  finally{setBusy(false);}
}
function stemToken(value){
  const x=norm(value);
  if(x.length>=8)return x.slice(0,5);
  if(x.length>=5)return x.slice(0,4);
  return x;
}
const RELATED_TERMS=[
  ["cerna","cerny","cerne","diry","dira","dirou","horizont","singularita","gravitace"],
  ["svetlo","foton","zareni","elektromagneticke"],
  ["cas","dilatace","relativita","casoprostor"],
  ["vesmir","kosmos","kosmicky","galaxie"],
  ["slunce","slunecni","hvezda"],
  ["atom","elektron","proton","jadro"],
  ["teplota","teplo","zahrivani","chlazeni"],
  ["rychlost","zrychleni","pohyb"],
  ["pamet","mozek","neuron","vedomi"],
  ["dna","gen","genetika","genom"],
  ["evoluce","prirodni","vyber","mutace"],
  ["energie","prace","vykon"]
].map(group=>new Set(group.map(stemToken)));
const entryTermCache=new WeakMap();
function entryTerms(entry){
  let termSet=entryTermCache.get(entry);
  if(!termSet){
    termSet={title:new Set([...tokens(entry.title)].map(stemToken)),full:new Set([...tokens(entry.passage)].map(stemToken))};
    entryTermCache.set(entry,termSet);
  }
  return termSet;
}
function queryTermWeights(question){
  const terms=[...tokens(question)].map(stemToken);
  const weights=new Map();
  for(const term of terms)weights.set(term,1);
  // Příbuzná slova dostanou nižší váhu než skutečné slovo z otázky.
  for(const group of RELATED_TERMS){
    if(!terms.some(term=>group.has(term)))continue;
    for(const term of group)if(!weights.has(term))weights.set(term,.20);
  }
  return weights;
}
function lexicalScore(question,entry,weights){
  weights=weights||queryTermWeights(question);
  if(!weights.size)return 0;
  const terms=entryTerms(entry);
  let score=0,matched=0;
  for(const [term,weight] of weights){
    if(terms.title.has(term)){score+=weight*1.8;matched++;}
    else if(terms.full.has(term)){score+=weight;matched++;}
  }
  const phrase=norm(question).trim();
  if(phrase.length>=8 && norm(entry.passage).includes(phrase))score+=2;
  // Oceňujeme pokrytí více různých slov a souvislost v titulku.
  return matched?score + Math.min(matched,5)*.10:0;
}
function shortlist(question){
  const weights=queryTermWeights(question);
  const matches=state.entries.map(entry=>({entry,lexical:lexicalScore(question,entry,weights)}))
    .filter(item=>item.lexical>0)
    .sort((a,b)=>b.lexical-a.lexical || b.entry.episode-a.entry.episode);
  return matches.slice(0,CANDIDATE_LIMIT);
}
function showPreliminary(candidates){
  if(candidates.length)renderResults(candidates.slice(0,5).map(item=>({entry:item.entry,score:item.lexical})),
    "Rychle nalezené související pasáže. AI teď zpřesňuje jejich pořadí.",true);
}
async function embed(texts){
  const out=await state.extractor(texts,{pooling:"mean",normalize:true});
  const batch=texts.length;
  const dimension=out.data.length/batch;
  if(!Number.isInteger(dimension)||dimension<8)throw Error("Neočekávaný rozměr vektoru modelu.");
  const result=[];
  for(let i=0;i<batch;i++)result.push(new Float32Array(out.data.slice(i*dimension,(i+1)*dimension)));
  if(typeof out.dispose==="function")out.dispose();
  return result;
}
async function prepareCandidateVectors(candidates){
  const entries=candidates.map(item=>item.entry);
  const progress=$("index-progress");
  progress.classList.remove("hidden");
  await loadSavedVectors(entries.map(item=>item.key));
  const missing=entries.filter(entry=>!state.vectors.has(entry.key));
  let indexed=entries.length-missing.length;
  progress.value=Math.round(indexed*100/entries.length);
  if(!missing.length){status("search-status","Nalezené pasáže už jsou v místní mezipaměti.");return;}
  status("search-status","AI porovnává jen "+entries.length+" vybraných pasáží (nikoli všech "+state.entries.length+").");
  for(let i=0;i<missing.length;i+=BATCH_SIZE){
    const batch=missing.slice(i,i+BATCH_SIZE);
    // Delší shrnutí jsou pro model omezena, původní úplný text zůstává pro odpověď.
    const vectors=await embed(batch.map(e=>"passage: "+e.passage.slice(0,EMBED_CHARS)));
    for(let j=0;j<batch.length;j++)state.vectors.set(batch[j].key,vectors[j]);
    try{await saveVectors(batch,vectors);}catch(error){console.warn("AI vektory se neuložily, vyhledávání pokračuje",error);}
    indexed+=batch.length;
    progress.value=Math.round(indexed*100/entries.length);
    status("search-status","Zpřesňuji výsledky pomocí AI: "+indexed+" / "+entries.length+".");
    await sleepFrame();
  }
  progress.value=100;
}
function dot(a,b){let n=0;for(let i=0;i<Math.min(a.length,b.length);i++)n+=a[i]*b[i];return n;}
function summarize(entry){
  const points=entry.points.filter(Boolean);
  const unique=[];
  for(const p of points){const t=p.replace(/^\s*[-•]\s*/,"").trim();if(t && !unique.some(a=>norm(a)===norm(t)))unique.push(t);}
  return unique.slice(0,3);
}
function sourceLink(entry){
  return "./index.html#"+entry.kind+"="+encodeURIComponent(entry.episode)+":"+encodeURIComponent(entry.order);
}
function renderResults(ranked,heading,preliminary=false){
  $("results").classList.remove("hidden");$("sources").replaceChildren();$("answer").replaceChildren();
  const title=document.createElement("p");title.className="small muted";title.textContent=heading;$("answer").append(title);
  const items=ranked.slice(0,5);
  const seen=new Set();
  for(const item of items.slice(0,3)){
    const e=item.entry,points=summarize(e);
    if(!points.length)continue;
    const excerpt=points.join(" ").slice(0,560);
    if(seen.has(excerpt))continue;seen.add(excerpt);
    const p=document.createElement("p");p.textContent=excerpt;$("answer").append(p);
  }
  if(!seen.size){const p=document.createElement("p");p.textContent="K tématu jsem našel tyto pasáže. Otevři jednotlivá shrnutí pro podrobnosti.";$("answer").append(p);}
  $("result-count").textContent=preliminary?"Předběžné výsledky":items.length+" nalezených pasáží";
  items.forEach((item,i)=>{
    const e=item.entry;
    const card=document.createElement("article");card.className="card";
    const top=document.createElement("div");top.className="grid-line";
    const meta=document.createElement("span");meta.className="small muted";meta.textContent=(i+1)+". Díl "+e.episode+" · "+(e.kind==="question"?"Otázka":"Shrnutí")+" · "+(e.time||fmtTime(e.seconds));top.append(meta);
    const title=document.createElement("h2");title.className="source-title";title.textContent=e.title;
    const description=document.createElement("p");description.className="source-body";description.textContent=e.points.slice(0,4).join(" ").slice(0,650);
    const link=document.createElement("a");link.className="source-link";link.href=sourceLink(e);link.target="_blank";link.rel="noopener";link.textContent="↗ Otevřít tuto pasáž v aplikaci";
    card.append(top,title,description,link);$("sources").append(card);
  });
}
async function ask(question){
  if(state.busy||!state.installed||!state.dataReady)return;
  setBusy(true);
  $("results").classList.add("hidden");
  $("index-progress").classList.add("hidden");
  try{
    if(!await cacheInstalled())throw Error("Model už není uložen. Stáhni ho znovu ručně.");
    const candidates=shortlist(question);
    if(!candidates.length){
      status("search-status","Ve shrnutích jsem nenašel související pojmy. Zkus otázku upřesnit nebo použít jiné výrazy.");
      return;
    }
    showPreliminary(candidates);
    status("search-status","Načítám místní AI pro upřesnění výsledků…");
    await sleepFrame();
    await loadExtractor(false);
    // Dotaz nejdřív; žádný velký index ani tisíce výpočtů.
    const query=(await embed(["query: "+question]))[0];
    await prepareCandidateVectors(candidates);
    const scored=candidates.map(item=>({
      entry:item.entry,
      score:dot(query,state.vectors.get(item.entry.key)) + Math.min(.06,item.lexical*.01)
    })).sort((a,b)=>b.score-a.score);
    renderResults(scored.slice(0,5),
      "Významově seřazené pasáže z vybraných shrnutí. Texty níže jsou převzaté ze zdrojových shrnutí.");
    status("search-status","Hotovo. Bez indexování celého katalogu, další dotazy mohou využít uložené výpočty.","ok");
  }catch(e){
    status("search-status","AI vyhledávání selhalo: "+(e.message||e),"error");
    console.error(e);
  }finally{setBusy(false);}
}
async function start(){
  $("theme").addEventListener("click",()=>{
    const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem("vedator-ui-theme-v1",next);}catch{}
  });
  $("install").addEventListener("click",install);
  $("remove").addEventListener("click",removeModel);
  $("ask-form").addEventListener("submit",e=>{e.preventDefault();const value=$("question").value.trim();if(value)ask(value);});
  await refreshModelStatus();
  try{
    const r=await fetch("./content-v2.json",{cache:"no-store"});
    if(!r.ok)throw Error("HTTP "+r.status);
    const data=await r.json();
    state.entries=buildEntries(data);
    if(!state.entries.length)throw Error("Nenalezena žádná použitelná shrnutí.");
    state.dataReady=true;
    status("catalog-status","Katalog připraven: "+state.entries.length+" pasáží (otázky a shrnutí).","ok");
  }catch(e){status("catalog-status","Katalog nelze načíst: "+(e.message||e),"error");}
  setBusy(false);
}
start().catch(e=>{console.error(e);status("catalog-status","Chyba aplikace: "+(e.message||e),"error");});

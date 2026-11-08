/* Runs at the end of the existing app closure, only inside the signed Android app.
 * The web app on bernio.cz is never changed by this adapter. */
if (window.VedatorNative && typeof window.VedatorNative.postMessage === 'function') {
  const nativeSend = value => window.VedatorNative.postMessage(JSON.stringify(value));
  let nativeClock = {time:0,duration:0,playing:false,ready:false,ended:false,speed:1};
  let nativeQueue = null, nativePendingToken = '', nativeBootstrapped = false;
  let nativeDownloads = {}, nativeStorageSent = '', nativeRestoreRequested = false;
  const nativeAudio = playerNodes().audio;
  const nativeValues = () => {
    const out={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('vedator'))out[key]=localStorage.getItem(key)}return out;
  };
  const nativeSyncStorage = () => {
    if(!nativeBootstrapped)return;const values=nativeValues(),json=JSON.stringify(values);
    if(json!==nativeStorageSent){nativeStorageSent=json;nativeSend({action:'storage',values})}
  };
  function nativeMergeData(values){
    for(const [key,value] of Object.entries(values||{})){
      if(typeof value!=='string')continue;
      if(key===PROGRESS_KEY||key===COLLECTION_KEY){
        const local=readJson(key,{});let remote;try{remote=JSON.parse(value)}catch{continue}
        for(const [id,record] of Object.entries(remote))if(!local[id]||(Number(record.updatedAt)||0)>(Number(local[id].updatedAt)||0))local[id]=record;
        writeJson(key,local);
      }else if(key===LAST_PLAYBACK_KEY){let remote;try{remote=JSON.parse(value)}catch{continue}if((remote.updatedAt||0)>(readJson(key,{})?.updatedAt||0))localStorage.setItem(key,value)}
      else if(localStorage.getItem(key)===null)localStorage.setItem(key,value);
    }
    loadUserData();
  }
  function nativeContext(queue,index){
    if(!queue?.items?.length)return null;
    const items=queue.items.map(item=>({id:item.id||'episode:'+item.number,ref:item.ref||epRef(item.number),episode:episodeByNumber(item.number),start:Number(item.start)||0}));
    if(items.some(item=>!item.episode))return null;
    return {...(queue.context||{type:'episodes',id:'android',label:'Vedátor'}),items,index};
  }
  function nativeApplySnapshot(snapshot){
    if(!state.data||!snapshot)return;
    const queue=snapshot.queue,token=String(queue?.token||'');
    if(nativePendingToken&&token!==nativePendingToken)return;
    const index=Number(snapshot.index)||0,context=nativeContext(queue,index);
    if(!context)return;
    const changed=!nativeQueue||nativeQueue.token!==token||state.context?.index!==index||Number(state.current?.episode?.number)!==Number(context.items[index]?.episode?.number);
    if(changed){
      if(state.current&&nativeClock.ready)saveProgress(true,Boolean(snapshot.automatic));
      state.context=context;const item=context.items[index];if(!item)return;
      state.current={episode:item.episode,key:episodeKey(item.episode.number),itemRef:item.ref};state.lastSavedSecond=-1;
    }
    nativeQueue=queue;nativePendingToken='';nativeClock=snapshot;state.speed=Number(snapshot.speed)||1;
    syncPlayer();if(snapshot.ready)saveProgress(false,Boolean(snapshot.ended));
    const help=playerNodes().help;if(snapshot.error)help.textContent=snapshot.error;
    else if(snapshot.buffering&&!help.dataset.questionNav)help.textContent=text('Načítám zvuk…','Načítavam zvuk…');
  }
  window.__vedatorNativeReceive = message => {
    if(message.kind==='bootstrap'){
      nativeMergeData(message.values);nativeBootstrapped=true;nativeDownloads=message.downloads||{};
      if(message.snapshot?.queue?.items?.length)nativeApplySnapshot(message.snapshot);
      else if(nativeRestoreRequested)nativeRestoreOriginal().catch(console.warn);
      nativeSyncStorage();return;
    }
    if(message.kind==='snapshot')nativeApplySnapshot(message.snapshot);
    if(message.kind==='data'){nativeMergeData(message.values);nativeDownloads=message.downloads||nativeDownloads;syncPlayer()}
    if(message.kind==='message'){const help=playerNodes().help;if(help)help.textContent=message.text;else $('#status-v2').textContent=message.text}
  };
  // Keep the existing display/progress code; all sound and transport live in Media3.
  Object.defineProperties(nativeAudio,{
    currentTime:{configurable:true,get:()=>Number(nativeClock.time)||0,set:value=>seekPlayback(value)},
    duration:{configurable:true,get:()=>Number(nativeClock.duration)||NaN},
    paused:{configurable:true,get:()=>!nativeClock.playing},
    ended:{configurable:true,get:()=>Boolean(nativeClock.ended)},
    readyState:{configurable:true,get:()=>nativeClock.ready?4:0},
    playbackRate:{configurable:true,get:()=>Number(nativeClock.speed)||1,set:value=>{nativeClock.speed=Number(value)||1;nativeSend({action:'speed',speed:nativeClock.speed})}}
  });
  nativeAudio.play=()=>{nativeSend({action:'play'});return Promise.resolve()};
  nativeAudio.pause=()=>nativeSend({action:'pause'});
  nativeAudio.load=()=>{};
  canStartContinuous=()=>false;
  installParityMediaSession=()=>{};
  resumePendingAudioWhenVisible=()=>{};
  playbackClock=()=>({time:Number(nativeClock.time)||0,duration:Number(nativeClock.duration)||0,available:Number(nativeClock.duration)||0,ready:Boolean(nativeClock.ready)});
  openPlayback=async function(episode,{start=null,context=null,itemRef='',autoplay=true}={}){
    if(!episode?.enclosure)return;
    if(!nativeBootstrapped){$('#status-v2').textContent=text('Připojuji přehrávač…','Pripájam prehrávač…');return}
    saveProgress(true,false);legacyVisualSetPlayerCollapsed(false);
    const key=episodeKey(episode.number),record=state.progress[key]||{};
    let target=start;if(target===null)target=Number(record.currentTime)>10&&(!record.completed||record.replaying)?Number(record.currentTime):0;
    state.current={episode,key,itemRef:itemRef||epRef(episode.number)};state.context=context;state.lastSavedSecond=-1;
    const sourceItems=context?.items?.length?context.items:[{id:'episode:'+episode.number,episode,start:0,ref:state.current.itemRef}];
    const items=sourceItems.map(item=>({number:Number(item.episode.number),start:Math.max(0,Number(item.start)||0),ref:item.ref||epRef(item.episode.number),id:item.id||'episode:'+item.episode.number}));
    const token='phone-'+Date.now()+'-'+Math.random().toString(36).slice(2);nativePendingToken=token;
    nativeQueue={items,index:context?.index||0,token,context:context?{type:context.type,id:context.id,label:context.label}:null};
    nativeClock={time:Math.max(0,Number(target)||0),duration:Number(record.duration)||0,playing:autoplay,ready:false,ended:false,speed:state.speed};
    syncPlayer();rememberLastPlayback(nativeClock.time);nativeSyncStorage();
    nativeSend({...nativeQueue,action:'queue',position:nativeClock.time,autoplay,speed:state.speed});
  };
  restartCurrentAudio=function(){if(!state.current)return;nativeSend({action:nativeClock.playing?'pause':'play'})};
  seekPlayback=function(seconds){const target=Math.max(0,Number(seconds)||0);nativeClock={...nativeClock,time:target};nativeSend({action:'seek',time:target});rememberLastPlayback(target);syncPlayer()};
  navigateContext=function(delta){if(!state.context)return;nativeSend({action:'navigate',delta})};
  changeSpeed=function(){const speeds=[1,1.25,1.5,1.75,2,.75];state.speed=speeds[(speeds.indexOf(state.speed)+1)%speeds.length];nativeClock.speed=state.speed;nativeSend({action:'speed',speed:state.speed});syncPlayer()};
  closePlayer=function(){saveProgress(true,false);nativeSend({action:'stop'});nativeQueue=null;nativeClock={time:0,duration:0,playing:false,ready:false};state.current=null;state.context=null;syncPlayer()};
  const nativeSyncPlayerOriginal=syncPlayer;
  syncPlayer=function(...args){
    nativeSyncPlayerOriginal(...args);if(!state.current)return;
    const button=playerNodes().offline,status=nativeDownloads[episodeKey(state.current.episode.number)];
    button.textContent=status?.ready?'✓ Offline':status?.failed?text('Stáhnout znovu','Stiahnuť znova'):status?'Offline '+(status.total>0?Math.floor(status.bytes/status.total*100)+' %':'…'):'📱 Offline';
  };
  toggleOffline=async function(){if(!state.current)return;const number=Number(state.current.episode.number),status=nativeDownloads[episodeKey(number)];if(status&&!status.failed&&!confirm(text('Odstranit offline kopii nebo zrušit stahování?','Odstrániť offline kópiu alebo zrušiť sťahovanie?')))return;nativeSend({action:'offline',number})};
  downloadCurrentMp3=async function(){if(state.current)nativeSend({action:'download',number:Number(state.current.episode.number)})};
  exportData=function(){nativeSyncStorage();nativeSend({action:'export',data:JSON.stringify({app:'vedator',formatVersion:1,exportedAt:new Date().toISOString(),data:{playbackProgress:state.progress,playlists:state.playlists}})})};
  const nativeImportOriginal=importBackup;
  importBackup=async function(file){await nativeImportOriginal(file);nativeSend({action:'replaceStorage',values:nativeValues()});nativeStorageSent=JSON.stringify(nativeValues())};
  clearAllData=async function(){
    if(!confirm(text('Opravdu smazat všechna data Vedátoru v této aplikaci včetně offline epizod?','Naozaj zmazať všetky dáta Vedátora v tejto aplikácii vrátane offline epizód?')))return;
    closePlayer();for(const key of Object.keys(nativeValues()))localStorage.removeItem(key);state.progress={};state.playlists=[];state.collectionProgress={};state.offlineIndex={};nativeDownloads={};nativeSend({action:'clear'});nativeStorageSent='{}';loadUserData();rerenderLanguage();
  };
  const nativeRestoreOriginal=restoreLastPlayback;
  restoreLastPlayback=async function(){nativeRestoreRequested=true;if(!nativeBootstrapped)return false;if(nativeQueue?.items?.length)return true;return nativeRestoreOriginal()};
  window.addEventListener('vedator-v2-ready',()=>{nativeSend({action:'ready',values:nativeValues()})},{once:true});
  window.addEventListener('pagehide',nativeSyncStorage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)nativeSyncStorage()});
  setInterval(nativeSyncStorage,2000);
  document.documentElement.dataset.vedatorNative='1';
}

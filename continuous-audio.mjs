// Isolated continuous-stream experiment. Never replaces a source at an episode boundary.
export class ContinuousAudio extends EventTarget {
  constructor(audio,{lead=180,keepBehind=45,chunkSize=262144,fetcher=globalThis.fetch.bind(globalThis),log=()=>{},systemTimeline='episode'}={}){
    super();Object.assign(this,{audio,lead,keepBehind,chunkSize,fetcher,log,systemTimeline});this.session=null;
    const events=['timeupdate','playing','pause','waiting','stalled','ended','error','ratechange'];
    if(systemTimeline==='stream')events.push('loadedmetadata','durationchange');
    for(const event of events)audio.addEventListener(event,()=>this.onAudio(event));
    if(systemTimeline==='stream'){
      document.addEventListener('visibilitychange',()=>{
        if(!this.session)return;
        this.mediaSnapshot('visibility');
        if(!document.hidden)this.updateMediaSession(true);
      });
      globalThis.addEventListener('pageshow',()=>{if(this.session)this.updateMediaSession(true)});
    }
    if(globalThis.navigator?.mediaSession){
      const systemSeekBy=delta=>systemTimeline==='stream'?this.seekTimeline(this.audio.currentTime+delta):this.seekBy(delta);
      const handlers={play:()=>this.play(),pause:()=>this.pause(),seekbackward:d=>systemSeekBy(-(d.seekOffset||10)),seekforward:d=>systemSeekBy(d.seekOffset||10),seekto:d=>systemTimeline==='stream'?this.seekTimeline(d.seekTime):this.seek(d.seekTime)};
      for(const [action,handler] of Object.entries(handlers))try{navigator.mediaSession.setActionHandler(action,handler)}catch{}
    }
  }
  emit(type,detail={}){this.dispatchEvent(new CustomEvent(type,{detail}))}
  write(message){this.log(message);this.emit('update')}
  static supported(){return Boolean(globalThis.MediaSource?.isTypeSupported('audio/mpeg'))}
  start(items,{quick=false,tailBytes=524288}={}){
    if(!ContinuousAudio.supported())throw Error('Tento prohlížeč nepodporuje souvislé přehrávání MP3 přes MSE. Zkus Chrome.');
    if(!items.length||items.some(item=>!item.url))throw Error('Vyber alespoň jeden dostupný díl.');
    this.stop();
    const media=new MediaSource(),url=URL.createObjectURL(media),controller=new AbortController();
    const s={media,url,controller,items:items.map(item=>({...item})),parts:[],index:0,loadIndex:0,offset:0,quick,tailBytes,buffer:null,pumping:false,failed:false,complete:false,wantPlay:true,wake:new Set(),sourceChanges:1,transitionCount:0};
    this.session=s;
    const opened=new Promise((resolve,reject)=>{
      const cleanup=()=>{media.removeEventListener('sourceopen',open);controller.signal.removeEventListener('abort',abort)};
      const open=()=>{cleanup();resolve()};
      const abort=()=>{cleanup();reject(new DOMException('Stopped','AbortError'))};
      media.addEventListener('sourceopen',open,{once:true});controller.signal.addEventListener('abort',abort,{once:true});
    });
    this.audio.src=url;this.audio.preload='auto';
    this.write('START: jeden MediaSource, '+items.length+' dílů; rychlý test='+quick+'; systemTimeline='+this.systemTimeline);
    this.emit('track',{item:s.items[0],index:0,quick});
    // Keep play() in the user's click. Awaiting the network first loses activation.
    this.play();
    opened.then(()=>{
      if(this.session!==s)return;
      s.buffer=media.addSourceBuffer('audio/mpeg');s.buffer.mode='sequence';
      media.duration=Infinity;
      return this.pump(s);
    }).catch(error=>{if(this.session===s&&!controller.signal.aborted)this.fail(s,error)});
    return s;
  }
  stop(){
    const s=this.session;if(!s)return;
    this.session=null;s.wantPlay=false;s.controller.abort();for(const wake of s.wake)wake();
    this.audio.pause();this.audio.removeAttribute('src');this.audio.load();URL.revokeObjectURL(s.url);
    try{navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null;navigator.mediaSession.setPositionState?.()}catch{}
    this.write('STOP: proud ukončen uživatelem');
  }
  play(){
    const s=this.session;if(!s)return;s.wantPlay=true;
    try{Promise.resolve(this.audio.play()).catch(error=>{
      if(this.session!==s||!s.wantPlay)return;
      this.write('PLAY CHYBA '+error.name+': '+error.message);
      this.emit('problem',{message:'Přehrávání se nespustilo: '+error.name+' — '+error.message});
    })}catch(error){this.fail(s,error)}
  }
  pause(){const s=this.session;if(s)s.wantPlay=false;this.audio.pause()}
  ranges(){const b=this.session?.buffer?.buffered;const ranges=[];if(b)for(let i=0;i<b.length;i++)ranges.push([b.start(i),b.end(i)]);return ranges}
  bufferEnd(){const ranges=this.ranges();return ranges.at(-1)?.[1]||0}
  ahead(){return Math.max(0,this.bufferEnd()-(this.audio.currentTime||0))}
  part(){const s=this.session;return s?.parts.find(part=>part.index===s.index)||null}
  position(){const p=this.part();return p?Math.max(0,this.audio.currentTime-p.start):0}
  seek(seconds){
    const s=this.session,p=this.part();if(!s||!p||!Number.isFinite(seconds))return false;
    return this.seekTimeline(p.start+Math.max(0,seconds));
  }
  seekTimeline(seconds){
    const s=this.session;if(!s||!Number.isFinite(seconds))return false;
    const absolute=Math.max(0,seconds);
    if(this.ranges().some(([start,end])=>absolute>=start&&absolute<end-.03)){
      const destination=s.parts.findLast(p=>absolute>=p.start&&(p.end==null||absolute<p.end));
      this.audio.currentTime=absolute;
      if(destination&&destination.index!==s.index){s.index=destination.index;this.emit('track',{item:s.items[s.index],index:s.index,quick:s.quick&&s.index===0})}
      this.write('POSUN ve stejném proudu na '+absolute.toFixed(1)+' s');this.onAudio('timeupdate');return true;
    }
    // Do not fall back to a new native MP3 source when a seek is unavailable.
    this.emit('problem',{message:'Tato pozice ještě není načtená, nebo už byla uvolněna z paměti. Poslech pokračuje ve stejném proudu.'});
    this.write('POSUN mimo buffer odmítnut; zvukový zdroj zachován');return false;
  }
  seekBy(seconds){return this.seek(this.position()+seconds)}
  onAudio(event){
    const s=this.session;if(!s)return;
    for(const wake of [...s.wake])wake();
    if(event==='error'){
      const e=this.audio.error;this.fail(s,Error('Dekodér '+(e?.code||'?')+': '+(e?.message||'neznámá chyba')));return;
    }
    const time=this.audio.currentTime||0;
    // The media element keeps playing: only the logical episode and metadata change.
    while(s.index<s.items.length-1){
      const prior=s.parts.find(part=>part.index===s.index),next=s.parts.find(part=>part.index===s.index+1);
      if(prior?.end==null||!next||time<prior.end)break;
      s.index++;s.transitionCount++;
      this.write('PŘECHOD '+s.items[s.index-1].number+' → '+s.items[s.index].number+'; src beze změny; hidden='+document.hidden);
      this.emit('track',{item:s.items[s.index],index:s.index,quick:false});
    }
    if(event==='playing'||event==='waiting'||event==='stalled'||event==='pause'||event==='ended')this.write(event.toUpperCase()+' t='+time.toFixed(2)+' ahead='+this.ahead().toFixed(1)+' hidden='+document.hidden);
    if(event==='pause'&&this.audio.paused)s.wantPlay=false;
    if(event==='ended')s.wantPlay=false;
    this.updateMediaSession();
    if(this.systemTimeline==='stream'&&(s.snapshotIndex!==s.index||Date.now()-(s.snapshotTime||0)>30000))this.mediaSnapshot('playback');
    this.emit('update');
  }
  mediaSnapshot(reason){
    const s=this.session;if(!s)return;s.snapshotIndex=s.index;s.snapshotTime=Date.now();
    this.write('MEDIA '+reason+' '+JSON.stringify({episode:s.items[s.index]?.number,hidden:document.hidden,paused:this.audio.paused,ended:this.audio.ended,readyState:this.audio.readyState,time:this.audio.currentTime,duration:String(this.audio.duration),declaredState:globalThis.navigator?.mediaSession?.playbackState,timeline:this.systemTimeline,position:s.lastMediaPosition||null,ahead:this.ahead()}));
  }
  updateMediaSession(force=false){
    const s=this.session,session=globalThis.navigator?.mediaSession;if(!s||!session)return;
    const item=s.items[s.index],p=this.part();
    try{
      // Declare playing after playback actually starts, not before loading audio.
      const playbackState=this.audio.paused||this.audio.ended?'paused':'playing';
      if(this.systemTimeline!=='stream'||force||s.declaredState!==playbackState){session.playbackState=playbackState;s.declaredState=playbackState}
      if((force||s.metadataIndex!==s.index)&&typeof MediaMetadata!=='undefined'){
        session.metadata=new MediaMetadata({title:item.title,artist:'Vedátorský podcast — souvislý test',artwork:[{src:new URL('./icon-512.png',location.href).href,sizes:'512x512',type:'image/png'}]});s.metadataIndex=s.index;
      }
      if(this.systemTimeline==='stream'){
        // The OS controls ONE MSE stream, not a finite episode followed by a reset.
        // Keep its position on the native timeline. Infinity is the standard
        // representation until endOfStream gives the whole queue a finite end.
        const duration=this.audio.duration>0?this.audio.duration:Infinity;
        const position=Math.min(duration,Math.max(0,this.audio.currentTime||0)),playbackRate=this.audio.playbackRate||1;
        session.setPositionState?.({duration,position,playbackRate});
        s.lastMediaPosition={duration:String(duration),position,playbackRate};
      }else{
        if(p?.end!=null){const duration=p.end-p.start;if(duration>0)session.setPositionState?.({duration,position:Math.min(duration,this.position()),playbackRate:this.audio.playbackRate})}
        else session.setPositionState?.();
      }
    }catch(error){
      if(this.systemTimeline==='stream'){
        const key=error.name+': '+error.message;if(key!==s.mediaError){s.mediaError=key;this.write('MEDIA API CHYBA '+key)}
      }
    }
  }
  async mutation(s,operation){
    if(this.session!==s||s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
    return new Promise((resolve,reject)=>{
      const b=s.buffer,signal=s.controller.signal;
      const cleanup=()=>{b.removeEventListener('updateend',done);b.removeEventListener('error',error);signal.removeEventListener('abort',abort)};
      const done=()=>{cleanup();resolve()};
      const error=()=>{cleanup();reject(Error('SourceBuffer odmítl zvuková data'))};
      const abort=()=>{cleanup();reject(new DOMException('Stopped','AbortError'))};
      b.addEventListener('updateend',done,{once:true});b.addEventListener('error',error,{once:true});signal.addEventListener('abort',abort,{once:true});
      try{operation(b)}catch(e){cleanup();reject(e)}
    });
  }
  waitForRoom(s){
    if(this.ahead()<this.lead)return Promise.resolve();
    return new Promise(resolve=>{
      const check=()=>{if(this.session!==s||s.controller.signal.aborted||this.ahead()<this.lead){s.wake.delete(check);resolve()}};
      s.wake.add(check);check();
    });
  }
  async prune(s,emergency=false){
    const cut=this.audio.currentTime-(emergency?8:this.keepBehind),first=this.ranges()[0]?.[0];
    if(first!==undefined&&cut>first+5)await this.mutation(s,b=>b.remove(first,cut));
  }
  async append(s,bytes){
    await this.prune(s);
    try{await this.mutation(s,b=>b.appendBuffer(bytes))}catch(error){
      if(error.name!=='QuotaExceededError')throw error;
      await this.prune(s,true);await this.mutation(s,b=>b.appendBuffer(bytes));
    }
    this.emit('update');
  }
  async request(s,url,headers={},headersOnly=false){
    let last;
    for(let attempt=0;attempt<3;attempt++){
      if(s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
      const controller=new AbortController(),abort=()=>controller.abort();
      s.controller.signal.addEventListener('abort',abort,{once:true});
      const timeout=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await this.fetcher(url,{mode:'cors',cache:'no-store',headers,signal:controller.signal});
        if(response.status===416){await response.body?.cancel();return {status:416,bytes:new Uint8Array()}}
        if(!response.ok)throw Error('HTTP '+response.status);
        if(headersOnly){const size=Number(response.headers.get('content-length'))||0;await response.body?.cancel();return {size}}
        // A Range server must not send a larger response than the requested block.
        // If it ignores Range (200), stream it incrementally rather than buffer the whole MP3.
        if(response.status===200)return {status:200,response};
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.length>this.chunkSize)throw Error('Server vrátil příliš velký MP3 blok');
        const range=response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
        if(range&&headers.Range&&Number(range[1])!==Number(headers.Range.match(/bytes=(\d+)/)?.[1]))throw Error('Server vrátil jinou část MP3, než byla požadována');
        return {status:response.status,bytes,total:range?Number(range[3]):0};
      }catch(error){
        if(s.controller.signal.aborted)throw error;
        last=error;this.write('SÍŤ pokus '+(attempt+1)+'/3: '+error.name+' '+error.message);
      }finally{
        // The streamed 200 response is cancelled through its reader in pump().
        clearTimeout(timeout);s.controller.signal.removeEventListener('abort',abort);
      }
    }
    throw last;
  }
  async tailOffset(s,item){
    // Content-Length is CORS-safelisted. Content-Range usually is not exposed by Podbean.
    const {size}=await this.request(s,item.url,{},true);
    if(!size)throw Error('Server nesdělil velikost MP3 pro rychlý test. Zvol přehrání celého dílu.');
    const offset=Math.max(0,size-s.tailBytes);s.firstSize=size;this.write('RYCHLÝ TEST: posledních '+(size-offset)+' B prvního dílu');return offset;
  }
  async pump(s){
    if(s.pumping||this.session!==s||s.complete)return;s.pumping=true;s.failed=false;
    try{
      while(s.loadIndex<s.items.length&&this.session===s&&!s.controller.signal.aborted){
        const item=s.items[s.loadIndex];let part=s.parts.find(p=>p.index===s.loadIndex);
        if(!part){
          if(s.loadIndex===0&&s.quick)s.offset=await this.tailOffset(s,item);
          part={index:s.loadIndex,start:this.bufferEnd(),end:null,bytes:0,sourceSize:s.loadIndex===0?s.firstSize||0:0};s.parts.push(part);
          this.write('NAČÍTÁM díl '+item.number+'; timeline='+part.start.toFixed(3)+'; byte='+s.offset);
        }
        await this.waitForRoom(s);if(this.session!==s||s.controller.signal.aborted)return;
        const from=s.offset,result=await this.request(s,item.url,{Range:'bytes='+from+'-'+(from+this.chunkSize-1)});
        if(this.session!==s||s.controller.signal.aborted){await result.response?.body?.cancel();return}
        let eof=result.status===416;
        if(result.status===200){
          if(from!==0){await result.response.body?.cancel();throw Error('Server nepodporuje pokračování po částech (ignoruje Range).')}
          const reader=result.response.body.getReader();
          const cancel=()=>{reader.cancel().catch(()=>{})};s.controller.signal.addEventListener('abort',cancel,{once:true});
          try{
            while(this.session===s&&!s.controller.signal.aborted){
              await this.waitForRoom(s);
              if(this.session!==s||s.controller.signal.aborted)return;
              let timedOut=false;
              const readTimer=setTimeout(()=>{timedOut=true;void reader.cancel()},20000);
              let chunk;try{chunk=await reader.read()}finally{clearTimeout(readTimer)}
              if(timedOut)throw Error('Server přestal posílat zvuková data');
              const {done,value}=chunk;if(done){eof=true;break}
              await this.append(s,value);s.offset+=value.length;part.bytes+=value.length;
            }
          }finally{s.controller.signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{})}
        }else if(result.bytes.length){
          await this.append(s,result.bytes);s.offset+=result.bytes.length;part.bytes+=result.bytes.length;
          if(result.total)part.sourceSize=result.total;
          eof=result.bytes.length<this.chunkSize||(part.sourceSize>0&&s.offset>=part.sourceSize);
        }else eof=true;
        if(this.session!==s||s.controller.signal.aborted)return;
        if(eof){
          if(!part.bytes)throw Error('MP3 neobsahuje žádná zvuková data');
          part.end=this.bufferEnd();this.write('PŘIPRAVEN KONEC dílu '+item.number+' na '+part.end.toFixed(3)+' s');
          s.loadIndex++;s.offset=0;this.emit('update');
        }
      }
      if(this.session===s&&!s.controller.signal.aborted&&s.loadIndex===s.items.length){
        s.complete=true;s.media.endOfStream();this.write('CELÝ PLAYLIST PŘIPOJEN; endOfStream až po posledním dílu');
      }
    }catch(error){if(this.session===s&&!s.controller.signal.aborted)this.fail(s,error)}
    finally{s.pumping=false}
  }
  fail(s,error){
    if(this.session!==s)return;s.failed=true;
    this.write('CHYBA '+error.name+': '+error.message+'; src zachován; byte='+s.offset+'; hidden='+document.hidden);
    this.emit('problem',{message:error.message+' Načtená část může dohrát. Tlačítko „Zkusit načítání znovu“ zachová stejný proud.'});
  }
  retry(){const s=this.session;if(s&&!this.audio.error&&s.media.readyState==='open'){this.write('OBNOVUJI NAČÍTÁNÍ bez změny zdroje');void this.pump(s);if(s.wantPlay)this.play()}}
}

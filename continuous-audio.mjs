// Every episode boundary stays within one MSE stream, including after a seek.
// Sparse MP3 frame positions let a manual seek restart MSE at an exact audio
// position without falling back to a native source that ends between episodes.
export class MP3Frames {
  constructor(index,{offset=0,time=0}={}){Object.assign(this,{index,offset,time,pending:new Uint8Array(),skip:0})}
  feed(bytes){
    const data=new Uint8Array(this.pending.length+bytes.length);data.set(this.pending);data.set(bytes,this.pending.length);
    let i=0;
    if(this.offset===0&&data.length>=3&&data[0]===73&&data[1]===68&&data[2]===51){
      if(data.length<10){this.pending=data;return}
      this.skip=10;for(let j=6;j<10;j++)this.skip+=(data[j]&127)*2**(7*(9-j));
      if(data[3]===4&&(data[5]&16))this.skip+=10;
    }
    if(this.skip){const take=Math.min(data.length,this.skip);i+=take;this.skip-=take}
    while(i+4<=data.length&&!this.skip){
      const a=data[i+1],b=data[i+2],version=(a>>3)&3,rateIndex=(b>>2)&3;
      if(data[i]!==255||(a&224)!==224||((a>>1)&3)!==1||version===1||rateIndex===3){i++;continue}
      const table=version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
      const bitrate=table[b>>4]||0;if(!bitrate){i++;continue}
      const rate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4);
      const length=Math.floor((version===3?144000:72000)*bitrate/rate)+((b>>1)&1);
      if(i+length>data.length)break;
      const offset=this.offset+i,last=this.index.anchors.at(-1);
      if(!last||offset>last.offset&&this.time-last.time>=.5)this.index.anchors.push({offset,time:this.time});
      this.time+=(version===3?1152:576)/rate;i+=length;
    }
    this.offset+=i;this.pending=data.slice(i);
  }
}

export class ContinuousAudio extends EventTarget {
  constructor(audio,{lead=180,keepBehind=45,chunkSize=262144,fetcher=globalThis.fetch.bind(globalThis),log=()=>{},systemTimeline='episode',seekTimeout=20000,cacheLimit=8*1048576}={}){
    super();Object.assign(this,{audio,lead,keepBehind,chunkSize,fetcher,log,systemTimeline,seekTimeout,cacheLimit});this.session=null;this.indexes=new Map();this.rangeCache=new Map();this.cacheBytes=0;this.resolvedUrls=new Map();
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
  start(items,{quick=false,tailBytes=524288,initialIndex=0,seekTo=null,autoplay=true,indexes=this.indexes}={}){
    if(!ContinuousAudio.supported())throw Error('Tento prohlížeč nepodporuje souvislé přehrávání MP3 přes MSE. Zkus Chrome.');
    if(!items.length||items.some(item=>!item.url))throw Error('Vyber alespoň jeden dostupný díl.');
    this.stop();
    const media=new MediaSource(),url=URL.createObjectURL(media),controller=new AbortController();
    const s={media,url,controller,items:items.map(item=>({...item})),parts:[],index:initialIndex,loadIndex:initialIndex,offset:0,quick:quick&&initialIndex===0,tailBytes,buffer:null,pumping:false,failed:false,complete:false,wantPlay:autoplay,wake:new Set(),sourceChanges:1,transitionCount:0,indexes,seekTo,locating:seekTo!=null};
    this.session=s;
    if(seekTo!=null)s.seekTimer=setTimeout(()=>{
      if(this.session!==s||s.seekTo==null)return;
      s.controller.abort();for(const wake of s.wake)wake();
      this.fail(s,Error('Načtení zvoleného času trvá příliš dlouho. Zkus posun znovu.'));
    },this.seekTimeout);
    const opened=new Promise((resolve,reject)=>{
      const cleanup=()=>{media.removeEventListener('sourceopen',open);controller.signal.removeEventListener('abort',abort)};
      const open=()=>{cleanup();resolve()};
      const abort=()=>{cleanup();reject(new DOMException('Stopped','AbortError'))};
      media.addEventListener('sourceopen',open,{once:true});controller.signal.addEventListener('abort',abort,{once:true});
    });
    this.audio.src=url;this.audio.preload='auto';this.audio.load();
    this.write('START: jeden MediaSource, '+items.length+' dílů; rychlý test='+quick+'; systemTimeline='+this.systemTimeline);
    this.emit('track',{item:s.items[initialIndex],index:initialIndex,quick:s.quick});
    // Keep play() in the user's click. Awaiting the network first loses activation.
    if(autoplay&&seekTo==null)this.play();
    opened.then(async()=>{
      if(this.session!==s)return;
      if(seekTo!=null){
        const found=await this.locate(s,s.items[initialIndex],seekTo);
        if(this.session!==s||s.controller.signal.aborted)return;
        s.offset=found.offset;s.seekOrigin=found.time;s.seekTo=found.target;s.locating=false;s.seekApproximate=Boolean(found.approximate);s.prefetch=found.prefetch;
      }
      s.buffer=media.addSourceBuffer('audio/mpeg');s.buffer.mode='sequence';
      media.duration=Infinity;
      return this.pump(s);
    }).catch(error=>{if(this.session===s&&!controller.signal.aborted)this.fail(s,error)});
    return s;
  }
  stop(){
    const s=this.session;if(!s)return;
    this.session=null;s.wantPlay=false;clearTimeout(s.seekTimer);s.controller.abort();for(const wake of s.wake)wake();
    this.audio.pause();this.audio.removeAttribute('src');this.audio.load();URL.revokeObjectURL(s.url);
    try{navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null;navigator.mediaSession.setPositionState?.()}catch{}
    this.write('STOP: proud ukončen uživatelem');
  }
  play(){
    const s=this.session;if(!s)return;s.wantPlay=true;
    if(s.seekTo!=null)return;
    const token=s.playToken=(s.playToken||0)+1;
    try{Promise.resolve(this.audio.play()).catch(error=>{
      if(this.session!==s||!s.wantPlay||s.playToken!==token)return;
      this.write('PLAY CHYBA '+error.name+': '+error.message);
      this.emit('problem',{message:'Přehrávání se nespustilo: '+error.name+' — '+error.message});
    })}catch(error){this.fail(s,error)}
  }
  pause(){const s=this.session;if(s){s.wantPlay=false;s.playToken=(s.playToken||0)+1}this.audio.pause();this.emit('update')}
  ranges(){const b=this.session?.buffer?.buffered;const ranges=[];if(b)for(let i=0;i<b.length;i++)ranges.push([b.start(i),b.end(i)]);return ranges}
  bufferEnd(){const ranges=this.ranges();return ranges.at(-1)?.[1]||0}
  ahead(){return Math.max(0,this.bufferEnd()-(this.audio.currentTime||0))}
  part(){const s=this.session;return s?.parts.find(part=>part.index===s.index)||null}
  position(){const s=this.session,p=this.part();return s?.seekTo!=null?s.seekTo:p?Math.max(0,this.audio.currentTime-p.start):0}
  indexFor(s,item){let index=s.indexes.get(item.url);if(!index){index={anchors:[],duration:0,size:0};s.indexes.set(item.url,index)}return index}
  async loadSeekIndex(s,item,index){
    // Optional exact indexes are small static data, fetched only when seeking.
    // They never delay initial playback or application startup.
    if(!this.seekIndexPromise)this.seekIndexPromise=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
      try{
        const response=await this.fetcher(new URL('./audio-seek-index.json',import.meta.url).href,{cache:'no-cache',signal:controller.signal});
        if(!response.ok)return null;const data=await response.json();return data.version===1?data:null;
      }catch{return null}finally{clearTimeout(timer)}
    })();
    const data=await this.seekIndexPromise,entry=data?.entries?.[item.url];
    if(this.session!==s||s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
    if(!entry||!Array.isArray(entry.anchors)||!entry.anchors.length||!(entry.duration>0)||!(entry.size>0))return;
    if(index.size&&index.size!==entry.size||index.duration&&Math.abs(index.duration-entry.duration)>.2)return;
    const anchors=entry.anchors.map(([offset,time])=>({offset,time}));
    if(anchors.some((a,i)=>!Number.isFinite(a.time)||!Number.isSafeInteger(a.offset)||a.offset<0||a.offset>=entry.size||a.time<0||a.time>entry.duration||i&&(a.offset<=anchors[i-1].offset||a.time<=anchors[i-1].time)))return;
    index.anchors=anchors;index.duration=entry.duration;index.size=entry.size;index.complete=entry.duration-anchors.at(-1).time<10;
  }
  seekTable(bytes,total=0){
    const u32=i=>((bytes[i]*16777216)+(bytes[i+1]<<16)+(bytes[i+2]<<8)+bytes[i+3])>>>0;
    for(let i=0;i<Math.min(bytes.length-120,262144);i++){
      const a=bytes[i+1],b=bytes[i+2],version=(a>>3)&3,ri=(b>>2)&3;
      if(bytes[i]!==255||(a&224)!==224||((a>>1)&3)!==1||version===1||ri===3)continue;
      const rate=[44100,48000,32000][ri]/(version===3?1:version===2?2:4),mono=(bytes[i+3]>>6)===3;
      const base=i+4+(version===3?(mono?17:32):(mono?9:17));
      for(const j of [base,base+2]){
        if(j+116>bytes.length)continue;
        const tag=String.fromCharCode(...bytes.subarray(j,j+4)),flags=u32(j+4);
        if((tag!=='Xing'&&tag!=='Info')||(flags&7)!==7)continue;
        const frames=u32(j+8),size=u32(j+12),duration=frames*(version===3?1152:576)/rate,toc=Array.from(bytes.subarray(j+16,j+116));
        if(duration>0&&size>0&&toc.every((v,k)=>!k||v>=toc[k-1]))return {kind:'xing',offset:i,size,duration,toc};
      }
    }
    // Check complete consecutive frames before treating a headerless file as
    // constant bitrate; a Xing duration alone does not establish CBR.
    if(total>0){
      let offset=0;if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51){offset=10;for(let j=6;j<10;j++)offset+=(bytes[j]&127)*2**(7*(9-j));if(bytes[3]===4&&(bytes[5]&16))offset+=10}
      const first=offset;let bitrate=0,signature='',count=0;
      while(offset+4<=bytes.length&&count<64){
        const a=bytes[offset+1],b=bytes[offset+2],version=(a>>3)&3,ri=(b>>2)&3;
        if(bytes[offset]!==255||(a&224)!==224||((a>>1)&3)!==1||version===1||ri===3)break;
        const next=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[b>>4]||0,sig=version+':'+ri;
        if(!next||count&&(next!==bitrate||sig!==signature))return null;
        bitrate=next;signature=sig;
        const rate=[44100,48000,32000][ri]/(version===3?1:version===2?2:4),length=Math.floor((version===3?144000:72000)*bitrate/rate)+((b>>1)&1);
        if(offset+length>bytes.length)break;offset+=length;count++;
      }
      if(count>=12)return {kind:'cbr',offset:first,size:total-first,duration:(total-first)*8/(bitrate*1000)};
    }
    return null;
  }
  async fastSeek(s,item,index,target){
    const table=index.seekTable;if(!table)return null;
    const origin=Math.max(0,target-.75),pct=Math.min(99.999999,100*origin/table.duration);
    const slot=Math.floor(pct),fraction=pct-slot;
    const relative=table.kind==='xing'?((table.toc[slot]+((slot===99?256:table.toc[slot+1])-table.toc[slot])*fraction)/256):origin/table.duration;
    const from=Math.max(table.offset,Math.min(table.offset+table.size-4096,table.offset+Math.floor(relative*table.size)));
    this.write('PŘÍMÉ HLEDÁNÍ: '+table.kind+' díl '+item.number+'; byte='+from);
    const probeSize=Math.min(this.chunkSize,65536),result=await this.request(s,item.url,{Range:'bytes='+from+'-'+(from+probeSize-1)});
    if(this.session!==s||s.controller.signal.aborted){await result.response?.body?.cancel();throw new DOMException('Stopped','AbortError')}
    if(result.status!==206){await result.response?.body?.cancel();return null}
    const bytes=result.bytes,header=i=>{
      if(i+4>bytes.length)return null;
      const a=bytes[i+1],b=bytes[i+2],version=(a>>3)&3,ri=(b>>2)&3;
      if(bytes[i]!==255||(a&224)!==224||((a>>1)&3)!==1||version===1||ri===3)return null;
      const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[b>>4];if(!bitrate)return null;
      const rate=[44100,48000,32000][ri]/(version===3?1:version===2?2:4);
      return Math.floor((version===3?144000:72000)*bitrate/rate)+((b>>1)&1);
    };
    for(let i=0;i<Math.min(bytes.length-4,8192);i++){
      const first=header(i),second=first&&header(i+first),third=second&&header(i+first+second);
      if(first&&second&&third){
        const offset=from+i,time=origin+i/(table.size/table.duration);
        return {offset,time,target,approximate:table.kind==='xing',prefetch:{...result,bytes:bytes.subarray(i),eof:from+bytes.length>=table.offset+table.size}};
      }
    }
    return null;
  }
  async locate(s,item,target){
    const index=this.indexFor(s,item);
    await this.loadSeekIndex(s,item,index);
    if(index.duration)target=Math.min(target,Math.max(0,index.duration-.1));
    let anchor=index.anchors.findLast(a=>a.time<=Math.max(0,target-.75));
    // Already indexed audio needs just one range request from a nearby frame.
    if(anchor&&(index.complete||index.anchors.at(-1).time>=target))return {...anchor,target};
    if(!index.seekTable){
      const head=await this.request(s,item.url,{Range:'bytes=0-'+(this.chunkSize-1)});
      if(head.status===206)index.seekTable=this.seekTable(head.bytes,head.total||index.size);
      else await head.response?.body?.cancel();
    }
    if(index.seekTable){const fast=await this.fastSeek(s,item,index,target);if(fast)return fast}
    anchor=anchor||{offset:0,time:0};let offset=anchor.offset;
    const scan=new MP3Frames(index,anchor),blockSize=Math.max(this.chunkSize,1048576);let lastReport=0;
    this.write('HLEDÁM POZICI dílu '+item.number+' na '+target.toFixed(1)+' s');
    while(this.session===s&&!s.controller.signal.aborted){
      const result=await this.request(s,item.url,{Range:'bytes='+offset+'-'+(offset+blockSize-1)},false,blockSize);
      if(this.session!==s||s.controller.signal.aborted){await result.response?.body?.cancel();throw new DOMException('Stopped','AbortError')}
      if(result.total)index.size=result.total;
      let eof=result.status===416;
      if(result.status===200){
        // A server ignoring Range must be read from zero, without buffering the
        // whole MP3. Frame positions still remain exact for variable bitrate.
        const reader=result.response.body.getReader(),fresh=new MP3Frames(index);
        const cancel=()=>{void reader.cancel().catch(()=>{})};s.controller.signal.addEventListener('abort',cancel,{once:true});
        try{
          while(!s.controller.signal.aborted){
            let timedOut=false;const timer=setTimeout(()=>{timedOut=true;cancel()},20000);let chunk;try{chunk=await reader.read()}finally{clearTimeout(timer)}
            if(timedOut)throw Error('Server přestal posílat zvuková data při hledání času');
            if(chunk.done){eof=true;break}fresh.feed(chunk.value);
            if(fresh.time>target+.1)break;
          }
          if(eof)index.duration=fresh.time;
        }finally{s.controller.signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{})}
        if(s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
        if(eof&&index.duration)target=Math.min(target,Math.max(0,index.duration-.1));
        break;
      }else if(result.bytes.length){
        scan.feed(result.bytes);offset+=result.bytes.length;
        eof=result.bytes.length<blockSize||index.size>0&&offset>=index.size;
      }else eof=true;
      if(eof){index.duration=scan.time;if(index.duration)target=Math.min(target,Math.max(0,index.duration-.1));break}
      if(scan.time>target+.1)break;
      if(Date.now()-lastReport>1000){lastReport=Date.now();this.write('HLEDÁNÍ POZICE: připraveno '+scan.time.toFixed(0)+' / '+target.toFixed(0)+' s')}
    }
    if(!index.anchors.length)throw Error('V MP3 se nepodařilo najít zvukovou pozici.');
    anchor=index.anchors.findLast(a=>a.time<=Math.max(0,target-.75))||index.anchors[0];
    return {...anchor,target};
  }
  seek(seconds){
    const s=this.session,p=this.part();
    if(!s||!Number.isFinite(seconds)||seconds<0||seconds>86400)return false;
    const known=p?.end!=null?p.end-p.start:p?.durationHint||this.indexFor(s,s.items[s.index]).duration;
    if(known&&seconds>known)return false;
    if(p&&s.seekTo==null){
      const absolute=p.start+seconds;
      if(this.ranges().some(([start,end])=>absolute>=start&&absolute<end-.03)){
        this.audio.currentTime=absolute;this.write('POSUN ve stejném proudu na '+seconds.toFixed(1)+' s');this.onAudio('timeupdate');return true;
      }
    }
    return this.seekStream(s.index,seconds);
  }
  seekTimeline(seconds){
    const s=this.session;if(!s||!Number.isFinite(seconds)||seconds<0)return false;
    const destination=s.parts.findLast(p=>seconds>=p.start&&(p.end==null||seconds<p.end));
    if(destination&&destination.index!==s.index){s.index=destination.index;this.emit('track',{item:s.items[s.index],index:s.index,quick:false})}
    return this.seek(Math.max(0,seconds-(destination?.start||this.part()?.start||0)));
  }
  seekStream(index,seconds){
    const s=this.session;if(!s)return false;
    const speed=this.audio.playbackRate,changes=s.sourceChanges,transitions=s.transitionCount;
    const next=this.start(s.items,{initialIndex:index,seekTo:seconds,autoplay:s.wantPlay,indexes:s.indexes});
    next.sourceChanges=changes+1;next.transitionCount=transitions;
    this.audio.playbackRate=speed;
    this.write('POSUN v MSE: díl '+next.items[index].number+' na '+seconds.toFixed(1)+' s; souvislé navazování zachováno');
    return true;
  }
  seekBy(seconds){return this.seek(Math.max(0,this.position()+seconds))}
  onAudio(event){
    const s=this.session;if(!s)return;
    for(const wake of [...s.wake])wake();
    if(event==='error'){
      const e=this.audio.error;this.fail(s,Error('Dekodér '+(e?.code||'?')+': '+(e?.message||'neznámá chyba')));return;
    }
    const time=this.audio.currentTime||0;
    // The media element keeps playing: only the logical episode and metadata change.
    while(s.seekTo==null&&s.index<s.items.length-1){
      const prior=s.parts.find(part=>part.index===s.index),next=s.parts.find(part=>part.index===s.index+1);
      if(prior?.end==null||!next||time<prior.end)break;
      s.index++;s.transitionCount++;
      this.write('PŘECHOD '+s.items[s.index-1].number+' → '+s.items[s.index].number+'; src beze změny; hidden='+document.hidden);
      this.emit('track',{item:s.items[s.index],index:s.index,quick:false});
    }
    if(event==='playing'||event==='waiting'||event==='stalled'||event==='pause'||event==='ended')this.write(event.toUpperCase()+' t='+time.toFixed(2)+' ahead='+this.ahead().toFixed(1)+' hidden='+document.hidden);
    // User pause is recorded by pause(); an internal source reset must not
    // overwrite playback intent while locating/starting a manual seek.
    if(event==='ended')s.wantPlay=false;
    // Warm the small seek map only once audible playback already has room.
    if(s.seekTo==null&&this.ahead()>3&&!this.seekIndexPromise)void this.loadSeekIndex(s,s.items[s.index],this.indexFor(s,s.items[s.index])).catch(()=>{});
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
    if(s.seekTo!=null||this.ahead()<this.lead)return Promise.resolve();
    return new Promise(resolve=>{
      const check=()=>{if(this.session!==s||s.controller.signal.aborted||s.seekTo!=null||this.ahead()<this.lead){s.wake.delete(check);resolve()}};
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
    if(s.seekTo!=null&&this.bufferEnd()>s.seekTo-(s.seekOrigin||0)+.05){
      const target=s.seekTo-(s.seekOrigin||0);this.audio.currentTime=Math.max(0,target);s.seekTo=null;clearTimeout(s.seekTimer);
      this.write('POSUN PŘIPRAVEN: souvislý MSE proud');
      if(s.wantPlay)this.play();else this.updateMediaSession(true);
    }
    this.emit('update');
  }
  cachedRange(url,headers){
    const match=headers.Range?.match(/^bytes=(\d+)-(\d+)$/);if(!match)return null;
    const from=Number(match[1]),end=Number(match[2]);
    for(const [key,entry] of this.rangeCache){
      if(entry.url!==url||entry.from>from||entry.from+entry.bytes.length<=from)continue;
      if(Date.now()-entry.time>300000){this.rangeCache.delete(key);this.cacheBytes-=entry.bytes.length;continue}
      const to=Math.min(end+1,entry.from+entry.bytes.length);
      // Do not mistake a cached partial prefix for the end of the file.
      if(to<end+1&&to!==entry.total)continue;
      this.rangeCache.delete(key);this.rangeCache.set(key,entry);
      const bytes=entry.bytes.subarray(from-entry.from,to-entry.from);
      return {status:206,bytes,total:entry.total,eof:entry.total>0&&to>=entry.total};
    }
    return null;
  }
  rememberRange(url,headers,bytes,total){
    const match=headers.Range?.match(/^bytes=(\d+)-(\d+)$/);if(!match||!bytes.length||bytes.length>this.cacheLimit)return;
    const key=url+'|'+match[1],prior=this.rangeCache.get(key);
    if(prior)this.cacheBytes-=prior.bytes.length;
    const stored=bytes.slice();this.rangeCache.delete(key);this.rangeCache.set(key,{url,from:Number(match[1]),bytes:stored,total,time:Date.now()});this.cacheBytes+=stored.length;
    while(this.cacheBytes>this.cacheLimit||this.rangeCache.size>128){const [oldKey,entry]=this.rangeCache.entries().next().value;this.cacheBytes-=entry.bytes.length;this.rangeCache.delete(oldKey)}
  }
  async request(s,url,headers={},headersOnly=false,maxBytes=this.chunkSize,onChunk=null){
    if(s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
    const cached=!headersOnly&&this.cachedRange(url,headers);
    if(cached){
      if(onChunk){await onChunk(cached.bytes,cached.total);return {...cached,bytes:new Uint8Array(),streamed:true,received:cached.bytes.length}}
      return cached;
    }
    let last;
    for(let attempt=0;attempt<3;attempt++){
      if(s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
      const controller=new AbortController(),abort=()=>controller.abort();
      s.controller.signal.addEventListener('abort',abort,{once:true});
      let timeout=setTimeout(()=>controller.abort(),20000),delivered=0;
      try{
        const direct=this.resolvedUrls.get(url),target=direct&&direct.until>Date.now()?direct.url:url;
        const options={method:headersOnly?'HEAD':'GET',mode:'cors',cache:'default',headers,signal:controller.signal};
        let response=await this.fetcher(target,options);
        // CDN URLs may be signed. An expired/rejected direct URL is resolved
        // again through the original enclosure, never left stuck in the cache.
        if(!response.ok&&response.status!==416&&target!==url){await response.body?.cancel();this.resolvedUrls.delete(url);response=await this.fetcher(url,options)}
        if(response.status===416){await response.body?.cancel();return {status:416,bytes:new Uint8Array()}}
        if(!response.ok)throw Error('HTTP '+response.status);
        if(response.url&&response.url!==url&&/^https?:/.test(response.url))this.resolvedUrls.set(url,{url:response.url,until:Date.now()+120000});
        if(headersOnly){const size=Number(response.headers.get('content-length'))||0;await response.body?.cancel();return {size}}
        if(response.status===200)return {status:200,response,total:Number(response.headers.get('content-length'))||0};
        const range=response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
        if(range&&headers.Range&&Number(range[1])!==Number(headers.Range.match(/bytes=(\d+)/)?.[1]))throw Error('Server vrátil jinou část MP3, než byla požadována');
        const total=range?Number(range[3]):this.indexes.get(url)?.size||0;
        if(onChunk&&response.body){
          const reader=response.body.getReader(),chunks=[];let received=0;
          try{
            while(true){
              const {done,value}=await reader.read();if(done)break;
              clearTimeout(timeout);timeout=setTimeout(()=>controller.abort(),20000);
              received+=value.length;if(received>maxBytes)throw Error('Server vrátil příliš velký MP3 blok');
              chunks.push(value);delivered+=value.length;
              await onChunk(value,total);
            }
          }finally{await reader.cancel().catch(()=>{})}
          const bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
          const fullSize=total||this.indexes.get(url)?.size||0;this.rememberRange(url,headers,bytes,fullSize);
          return {status:206,bytes:new Uint8Array(),total:fullSize,streamed:true,received};
        }
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.length>maxBytes)throw Error('Server vrátil příliš velký MP3 blok');
        this.rememberRange(url,headers,bytes,total);
        return {status:response.status,bytes,total};
      }catch(error){
        if(s.controller.signal.aborted)throw error;
        // Appended bytes must never be appended a second time by an automatic
        // retry. pump has advanced its offset so the explicit retry can resume.
        if(delivered)throw error;
        last=error;this.write('SÍŤ pokus '+(attempt+1)+'/3: '+error.name+' '+error.message);
      }finally{clearTimeout(timeout);s.controller.signal.removeEventListener('abort',abort)}
    }
    throw last;
  }
  async tailOffset(s,item){
    // Content-Length is CORS-safelisted. Content-Range usually is not exposed by Podbean.
    const index=this.indexFor(s,item),size=index.size||(await this.request(s,item.url,{},true)).size;
    if(!size)throw Error('Server nesdělil velikost MP3 pro rychlý test. Zvol přehrání celého dílu.');
    const offset=Math.max(0,size-s.tailBytes);s.firstSize=size;this.write('RYCHLÝ TEST: posledních '+(size-offset)+' B prvního dílu');return offset;
  }
  durationHint(bytes,total=0){
    // Xing/Info headers contain a frame count. Reading this first-buffer hint
    // avoids another audio element or a metadata network request at startup.
    const u32=i=>((bytes[i]*16777216)+(bytes[i+1]<<16)+(bytes[i+2]<<8)+bytes[i+3])>>>0;
    for(let i=0;i<Math.min(bytes.length-48,262144);i++){
      if(bytes[i]!==255||(bytes[i+1]&224)!==224||((bytes[i+1]>>1)&3)!==1)continue;
      const version=(bytes[i+1]>>3)&3,rateIndex=(bytes[i+2]>>2)&3;if(version===1||rateIndex===3)continue;
      const rate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4),mono=(bytes[i+3]>>6)===3;
      const base=i+4+(version===3?(mono?17:32):(mono?9:17));
      for(const j of [base,base+2]){
        if(j+12>bytes.length)continue;
        const tag=String.fromCharCode(...bytes.subarray(j,j+4));
        if((tag==='Info'||tag==='Xing')&&(u32(j+4)&1)){
          const duration=u32(j+8)*(version===3?1152:576)/rate;
          if(duration>0&&duration<604800)return duration;
        }
      }
    }
    // Some newer CBR exports have no Xing header. Use the response's existing
    // size only after checking consecutive MP3 frames with the same bitrate.
    let offset=0;
    if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51){
      offset=10;for(let i=6;i<10;i++)offset+=(bytes[i]&127)*2**(7*(9-i));
      if(bytes[3]===4&&(bytes[5]&16))offset+=10;
    }
    const first=offset;let count=0,bitrate=0,signature='';
    while(offset+4<=bytes.length&&count<64){
      const a=bytes[offset+1],b=bytes[offset+2],version=(a>>3)&3,rateIndex=(b>>2)&3;
      if(bytes[offset]!==255||(a&224)!==224||((a>>1)&3)!==1||version===1||rateIndex===3)break;
      const table=version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
      const nextBitrate=table[b>>4]||0,nextSignature=version+':'+rateIndex;
      if(!nextBitrate||(count&&(nextBitrate!==bitrate||nextSignature!==signature)))return 0;
      bitrate=nextBitrate;signature=nextSignature;
      const rate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4);
      offset+=Math.floor((version===3?144000:72000)*bitrate/rate)+((b>>1)&1);count++;
    }
    const duration=(total-first)*8/(bitrate*1000);
    return count>=12&&duration>0&&duration<604800?duration:0;
  }
  readDurationHint(s,part,bytes){
    // Streaming reads can split a large ID3 tag before the first MP3 frame.
    const prior=part.headerBytes||new Uint8Array(),take=Math.min(bytes.length,262144-prior.length);
    const header=new Uint8Array(prior.length+take);header.set(prior);header.set(bytes.subarray(0,take),prior.length);part.headerBytes=header;
    part.durationHint=this.durationHint(header,part.sourceSize);
    const index=this.indexFor(s,s.items[part.index]);index.seekTable=this.seekTable(header,part.sourceSize)||index.seekTable;
    if(index.seekTable)index.size=index.seekTable.offset+index.seekTable.size;
    if(part.durationHint)this.indexFor(s,s.items[part.index]).duration=part.durationHint;
    if(part.durationHint){part.headerBytes=null;return}
    // Podbean's CORS policy can hide Content-Range. A background HEAD provides
    // the full size for headerless CBR exports without delaying audio or startup.
    if(part.sourceSize||part.durationRequested)return;
    part.durationRequested=true;
    void this.request(s,part.url,{},true).then(({size})=>{
      if(this.session!==s||s.controller.signal.aborted||!size)return;
      part.sourceSize=size;const index=this.indexFor(s,s.items[part.index]);index.size=size;index.seekTable=this.seekTable(part.headerBytes||header,size)||index.seekTable;part.durationHint=this.durationHint(part.headerBytes||header,size);
      if(part.durationHint){part.headerBytes=null;this.indexFor(s,s.items[part.index]).duration=part.durationHint}this.emit('update');
    }).catch(()=>{});
  }
  async pump(s){
    if(s.pumping||this.session!==s||s.complete)return;s.pumping=true;s.failed=false;
    try{
      while(s.loadIndex<s.items.length&&this.session===s&&!s.controller.signal.aborted){
        const item=s.items[s.loadIndex];let part=s.parts.find(p=>p.index===s.loadIndex);
        if(!part){
          if(s.loadIndex===0&&s.quick)s.offset=await this.tailOffset(s,item);
          const index=this.indexFor(s,item),origin=s.parts.length===0?s.seekOrigin||0:0;
          part={index:s.loadIndex,approximate:s.parts.length===0&&s.seekApproximate,url:item.url,start:this.bufferEnd()-origin,end:null,bytes:0,sourceOffset:s.offset,sourceSize:index.size||(s.loadIndex===0?s.firstSize||0:0),durationHint:index.duration};
          if(!s.quick||s.loadIndex!==0)part.scanner=new MP3Frames(part.approximate?{anchors:[]}:index,{offset:s.offset,time:origin});
          s.parts.push(part);
          this.write('NAČÍTÁM díl '+item.number+'; timeline='+part.start.toFixed(3)+'; byte='+s.offset);
        }
        await this.waitForRoom(s);if(this.session!==s||s.controller.signal.aborted)return;
        const consume=async(bytes,total=0)=>{
          if(this.session!==s||s.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
          if(total)part.sourceSize=total;
          if(!part.durationHint&&part.sourceOffset===0&&part.bytes<262144)this.readDurationHint(s,part,bytes);
          part.scanner?.feed(bytes);await this.append(s,bytes);s.offset+=bytes.length;part.bytes+=bytes.length;
        };
        const from=s.offset,result=s.prefetch||await this.request(s,item.url,{Range:'bytes='+from+'-'+(from+this.chunkSize-1)},false,this.chunkSize,consume);s.prefetch=null;
        if(this.session!==s||s.controller.signal.aborted){await result.response?.body?.cancel();return}
        let eof=result.status===416;
        if(result.status===200){
          const reader=result.response.body.getReader();
          const cancel=()=>{reader.cancel().catch(()=>{})};s.controller.signal.addEventListener('abort',cancel,{once:true});
          let skipped=0;
          try{
            while(this.session===s&&!s.controller.signal.aborted){
              await this.waitForRoom(s);
              if(this.session!==s||s.controller.signal.aborted)return;
              let timedOut=false;
              const readTimer=setTimeout(()=>{timedOut=true;void reader.cancel()},20000);
              let chunk;try{chunk=await reader.read()}finally{clearTimeout(readTimer)}
              if(timedOut)throw Error('Server přestal posílat zvuková data');
              let {done,value}=chunk;if(done){eof=true;break}
              if(skipped<from){const take=Math.min(value.length,from-skipped);value=value.subarray(take);skipped+=take;if(!value.length)continue}
              if(!part.durationHint&&part.sourceOffset===0&&part.bytes<262144)this.readDurationHint(s,part,value);
              part.scanner?.feed(value);await this.append(s,value);s.offset+=value.length;part.bytes+=value.length;
            }
          }finally{s.controller.signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{})}
        }else if(result.streamed){
          eof=result.eof??(result.received<this.chunkSize||(part.sourceSize>0&&s.offset>=part.sourceSize));
        }else if(result.bytes.length){
          if(result.total)part.sourceSize=result.total;
          if(!part.durationHint&&part.sourceOffset===0&&part.bytes<262144)this.readDurationHint(s,part,result.bytes);
          part.scanner?.feed(result.bytes);await this.append(s,result.bytes);s.offset+=result.bytes.length;part.bytes+=result.bytes.length;
          eof=result.eof??(result.bytes.length<this.chunkSize||(part.sourceSize>0&&s.offset>=part.sourceSize));
        }else eof=true;
        if(this.session!==s||s.controller.signal.aborted)return;
        if(eof){
          if(!part.bytes)throw Error('MP3 neobsahuje žádná zvuková data');
          if(part.scanner){if(!part.approximate){const index=this.indexFor(s,item);index.duration=part.scanner.time;index.size=s.offset;index.complete=true}part.scanner=null}
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
    if(this.session!==s)return;clearTimeout(s.seekTimer);s.failed=true;
    this.write('CHYBA '+error.name+': '+error.message+'; src zachován; byte='+s.offset+'; hidden='+document.hidden);
    this.emit('problem',{message:error.message+' Načtená část může dohrát. Tlačítko „Zkusit načítání znovu“ zachová stejný proud.'});
  }
  retry(){const s=this.session;if(s?.seekTo!=null){this.seekStream(s.index,s.seekTo);return}if(s&&!this.audio.error&&s.media.readyState==='open'){this.write('OBNOVUJI NAČÍTÁNÍ bez změny zdroje');void this.pump(s);if(s.wantPlay)this.play()}}
}


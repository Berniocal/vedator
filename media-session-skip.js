(()=>{
  if(window.__vedatorMediaSessionSkipV2)return;
  window.__vedatorMediaSessionSkipV2=true;
  if(!('mediaSession'in navigator))return;

  function install(){
    const audio=document.querySelector('.vedator-audio-card audio');
    if(!audio)return false;

    const seek=delta=>{
      const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:Infinity;
      audio.currentTime=Math.max(0,Math.min(duration,audio.currentTime+delta));
      updatePosition();
    };

    const updatePosition=()=>{
      try{
        if(!Number.isFinite(audio.duration)||audio.duration<=0)return;
        navigator.mediaSession.setPositionState({
          duration:audio.duration,
          playbackRate:audio.playbackRate||1,
          position:Math.max(0,Math.min(audio.duration,audio.currentTime||0))
        });
      }catch(error){}
    };

    const registerActions=()=>{
      try{navigator.mediaSession.setActionHandler('previoustrack',null)}catch(error){}
      try{navigator.mediaSession.setActionHandler('nexttrack',null)}catch(error){}
      try{navigator.mediaSession.setActionHandler('seekbackward',()=>seek(-10))}catch(error){}
      try{navigator.mediaSession.setActionHandler('seekforward',()=>seek(10))}catch(error){}
      try{navigator.mediaSession.setActionHandler('seekto',details=>{
        if(typeof details.seekTime!=='number')return;
        const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:Infinity;
        audio.currentTime=Math.max(0,Math.min(duration,details.seekTime));
        updatePosition();
      })}catch(error){}
      updatePosition();
    };

    audio.addEventListener('play',()=>{
      try{navigator.mediaSession.playbackState='playing'}catch(error){}
      registerActions();
    });
    audio.addEventListener('pause',()=>{
      try{navigator.mediaSession.playbackState='paused'}catch(error){}
      updatePosition();
    });
    audio.addEventListener('loadedmetadata',registerActions);
    audio.addEventListener('durationchange',registerActions);
    audio.addEventListener('ratechange',updatePosition);
    audio.addEventListener('seeked',updatePosition);
    audio.addEventListener('timeupdate',updatePosition);

    registerActions();
    return true;
  }

  if(!install())new MutationObserver((_,observer)=>{if(install())observer.disconnect()}).observe(document.body,{childList:true,subtree:true});
})();
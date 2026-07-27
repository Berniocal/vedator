(()=>{
  if(window.__vedatorSlovakUi)return;
  window.__vedatorSlovakUi=true;

  const exact=new Map([
    ['Vše','Všetko'],['Epizody','Epizódy'],['Série','Série'],['Playlisty','Playlisty'],
    ['Mimozemský život','Mimozemský život'],['Kosmologie','Kozmológia'],['Temná energie','Tmavá energia'],
    ['Černé díry','Čierne diery'],['Kvantová fyzika','Kvantová fyzika'],['Relativita','Relativita'],
    ['Astronomie','Astronómia'],['Biologie a medicína','Biológia a medicína'],['Matematika','Matematika'],
    ['Technologie a AI','Technológie a AI'],['Země a příroda','Zem a príroda'],['Chemie a materiály','Chémia a materiály'],
    ['Společnost a psychologie','Spoločnosť a psychológia'],['Přehrát','Prehrať'],['Číst více','Čítať viac'],
    ['Číst méně','Čítať menej'],['Nejnovější','Najnovšie'],['Nejstarší','Najstaršie'],
    ['Podle čísla dílu','Podľa čísla dielu'],['Podle počtu dílů','Podľa počtu dielov'],
    ['Podle abecedy','Podľa abecedy'],['Podle stáří prvního dílu','Podľa veku prvého dielu'],
    ['Načítám epizody…','Načítavam epizódy…'],['Načítám katalog…','Načítavam katalóg…'],
    ['Moje playlisty','Moje playlisty'],['Playlist je prázdný.','Playlist je prázdny.'],
    ['Instalovat','Inštalovať'],['Předchozí','Predchádzajúci'],['Další','Ďalší'],['Stáhnout','Stiahnuť'],
    ['Rychlost','Rýchlosť'],['Pozastavit','Pozastaviť']
  ]);

  const attrMap=new Map([
    ['Hledat česky nebo slovensky: černé/čierne díry, vesmír…','Hľadať po slovensky: čierne diery, vesmír…'],
    ['Předchozí díl','Predchádzajúci diel'],['Další díl','Ďalší diel'],['Přehrát','Prehrať'],
    ['Pozastavit','Pozastaviť'],['O 10 sekund zpět','O 10 sekúnd späť'],['O 10 sekund dopředu','O 10 sekúnd dopredu']
  ]);

  function translateTextNode(node){
    const raw=node.nodeValue;
    const trimmed=raw?.trim();
    if(!trimmed)return;
    const translated=exact.get(trimmed);
    if(!translated||translated===trimmed)return;
    node.nodeValue=raw.replace(trimmed,translated);
  }

  function translateElement(el){
    if(el.nodeType!==1)return;
    if(el.matches('input[placeholder]')){
      const value=el.getAttribute('placeholder');
      if(attrMap.has(value))el.setAttribute('placeholder',attrMap.get(value));
    }
    for(const attr of ['aria-label','title']){
      const value=el.getAttribute?.(attr);
      if(value&&attrMap.has(value))el.setAttribute(attr,attrMap.get(value));
    }
    for(const node of el.childNodes){
      if(node.nodeType===3)translateTextNode(node);
    }
  }

  function translateCount(){
    const count=document.querySelector('#count');
    if(!count)return;
    count.textContent=count.textContent
      .replace(/\bepizod\b/g,'epizód')
      .replace(/\bdílů\b/g,'dielov')
      .replace(/\bdíl\b/g,'diel')
      .replace(/\bsérií\b/g,'sérií')
      .replace(/\bsérie\b/g,'séria');
  }

  function apply(root=document){
    root.querySelectorAll?.('button,option,strong,.topic,.tab,.status,.vedator-playlist-empty,.vedator-playlist-count,input,[aria-label],[title]').forEach(translateElement);
    translateCount();
  }

  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;observer.disconnect();apply();observer.observe(document.body,{childList:true,subtree:true,characterData:true})});
  };
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  apply();
})();
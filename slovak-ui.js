(()=>{
  if(window.__vedatorLanguageSwitch)return;
  window.__vedatorLanguageSwitch=true;

  const KEY='vedator-ui-language-v1';
  let language='sk';
  try{language=localStorage.getItem(KEY)==='cz'?'cz':'sk'}catch{}

  const T={
    title:{sk:'Vedátorský podcast podľa tém',cz:'Vedátorský podcast podle témat'},
    eyebrow:{sk:'Neoficiálny tematický katalóg',cz:'Neoficiální tematický katalog'},
    search:{sk:'Hľadať',cz:'Hledat'},
    tabs:{episodes:{sk:'Epizódy',cz:'Epizody'},series:{sk:'Série',cz:'Série'},questions:{sk:'Otázky',cz:'Otázky'},playlists:{sk:'Playlisty',cz:'Playlisty'},data:{sk:'Moje dáta',cz:'Moje data'}},
    topics:{
      'Vše':['Všetko','Vše'],'Všetko':['Všetko','Vše'],'FAQ':['FAQ','FAQ'],
      'Mimozemský život':['Mimozemský život','Mimozemský život'],'Kosmologie':['Kozmológia','Kosmologie'],'Kozmológia':['Kozmológia','Kosmologie'],
      'Temná energie':['Tmavá energia','Temná energie'],'Tmavá energia':['Tmavá energia','Temná energie'],'Černé díry':['Čierne diery','Černé díry'],'Čierne diery':['Čierne diery','Černé díry'],
      'Kvantová fyzika':['Kvantová fyzika','Kvantová fyzika'],'Relativita':['Relativita','Relativita'],'Astronomie':['Astronómia','Astronomie'],'Astronómia':['Astronómia','Astronomie'],
      'Biologie a medicína':['Biológia a medicína','Biologie a medicína'],'Biológia a medicína':['Biológia a medicína','Biologie a medicína'],'Matematika':['Matematika','Matematika'],
      'Technologie a AI':['Technológie a AI','Technologie a AI'],'Technológie a AI':['Technológie a AI','Technologie a AI'],'Země a příroda':['Zem a príroda','Země a příroda'],'Zem a príroda':['Zem a príroda','Země a příroda'],
      'Chemie a materiály':['Chémia a materiály','Chemie a materiály'],'Chémia a materiály':['Chémia a materiály','Chemie a materiály'],'Společnost a psychologie':['Spoločnosť a psychológia','Společnost a psychologie'],'Spoločnosť a psychológia':['Spoločnosť a psychológia','Společnost a psychologie'],
      'Vesmír':['Vesmír','Vesmír'],'Relativita a gravitace':['Relativita a gravitácia','Relativita a gravitace'],'Relativita a gravitácia':['Relativita a gravitácia','Relativita a gravitace'],
      'Technologie':['Technológie','Technologie'],'Technológie':['Technológie','Technologie'],'Chemie':['Chémia','Chemie'],'Chémia':['Chémia','Chemie'],'Ostatní':['Ostatné','Ostatní'],'Ostatné':['Ostatné','Ostatní']
    },
    options:{
      new:{sk:'Najnovšie',cz:'Nejnovější'},old:{sk:'Najstaršie',cz:'Nejstarší'},number:{sk:'Podľa čísla dielu',cz:'Podle čísla dílu'},
      count:{sk:'Podľa počtu dielov',cz:'Podle počtu dílů'},alpha:{sk:'Podľa abecedy',cz:'Podle abecedy'},first:{sk:'Podľa veku prvého dielu',cz:'Podle stáří prvního dílu'}
    },
    backup:{
      heading:{sk:'Záloha dát aplikácie',cz:'Záloha dat aplikace'},
      intro:{sk:'Uložte si rozpočúvané a vypočuté epizódy spolu s vlastnými playlistami do jedného JSON súboru. Súbor sa vytvorí priamo v tomto zariadení a nikam sa neodosiela.',cz:'Uložte si rozposlouchané a poslechnuté epizody spolu s vlastními playlisty do jednoho souboru JSON. Soubor se vytvoří přímo v tomto zařízení a nikam se neodesílá.'},
      export:{sk:'Stiahnuť zálohu',cz:'Stáhnout zálohu'},import:{sk:'Načítať zálohu',cz:'Načíst zálohu'},
      privacy:{sk:'Súkromie:',cz:'Soukromí:'},privacyText:{sk:' export aj import prebiehajú iba lokálne v prehliadači. Žiadne údaje sa neposielajú na žiadny server.',cz:' export i import probíhají pouze místně v prohlížeči. Žádné údaje se neposílají na žádný server.'}
    }
  };

  const style=document.createElement('style');
  style.textContent=`.vedator-header-actions{display:flex;align-items:center;gap:10px}.vedator-language-switch{display:flex;padding:3px;border:1px solid rgba(255,255,255,.42);border-radius:12px;background:rgba(255,255,255,.12)}.vedator-language-switch button{border:0;border-radius:8px;padding:7px 10px;background:transparent;color:rgba(255,255,255,.76);font-weight:850;cursor:pointer}.vedator-language-switch button.active{background:#fff;color:#29205f;box-shadow:0 2px 8px rgba(0,0,0,.16)}@media(max-width:550px){.vedator-header-actions{gap:6px}.vedator-language-switch button{padding:6px 8px}.vedator-language-switch{padding:2px}}`;
  document.head.append(style);

  function installSwitch(){
    if(document.querySelector('.vedator-language-switch'))return;
    const header=document.querySelector('header .header-row');if(!header)return;
    const install=document.querySelector('#installApp'),actions=document.createElement('div'),toggle=document.createElement('div');
    actions.className='vedator-header-actions';toggle.className='vedator-language-switch';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Jazyk aplikácie / Jazyk aplikace');
    toggle.innerHTML='<button type="button" data-lang="sk">SK</button><button type="button" data-lang="cz">CZ</button>';
    if(install){install.before(actions);actions.append(toggle,install)}else{actions.append(toggle);header.append(actions)}
    toggle.onclick=e=>{const b=e.target.closest('button[data-lang]');if(b)setLanguage(b.dataset.lang)};
  }

  function topicKey(button){return button.dataset.topic||button.dataset.vedatorTopicKey||button.textContent.trim()}
  function langIndex(){return language==='sk'?0:1}

  function translateCount(){
    const el=document.querySelector('#count');if(!el)return;
    const raw=el.textContent.trim();let m;
    if((m=raw.match(/^(?:Nalezeno|Nájdených)\s+(\d+)\s+z\s+(\d+)\s+(?:epizod|epizód)$/i)))el.textContent=language==='sk'?`Nájdených ${m[1]} z ${m[2]} epizód`:`Nalezeno ${m[1]} z ${m[2]} epizod`;
    else if((m=raw.match(/^(?:Nalezeno|Nájdených)\s+(\d+)\s+(?:sérií|serii|sérií)$/i)))el.textContent=language==='sk'?`Nájdených ${m[1]} sérií`:`Nalezeno ${m[1]} sérií`;
    else if((m=raw.match(/^(\d+)\s+(?:otázek|otázok)$/i)))el.textContent=language==='sk'?`${m[1]} otázok`:`${m[1]} otázek`;
    else if(/Lokálna záloha dát|Lokální záloha dat/i.test(raw))el.textContent=language==='sk'?'Lokálna záloha dát':'Lokální záloha dat';
    else if(/Načítávám|Načítavam|Načítám/.test(raw))el.textContent=language==='sk'?'Načítavam epizódy…':'Načítám epizody…';
  }

  function translateDates(){
    let list=[];try{list=Array.isArray(episodes)?episodes:[]}catch{}
    document.querySelectorAll('#episodes article').forEach(article=>{
      const date=article.querySelector('.date'),title=article.querySelector('h2')?.textContent.trim();if(!date||!title)return;
      const ep=list.find(x=>String(x.title||'').trim()===title);if(!ep?.date)return;
      const parsed=new Date(ep.date);if(Number.isNaN(parsed.getTime()))return;
      date.textContent=new Intl.DateTimeFormat(language==='sk'?'sk-SK':'cs-CZ',{day:'numeric',month:'long',year:'numeric'}).format(parsed);
    });
  }

  function translateBackup(){
    const card=document.querySelector('.vedator-data-card');if(!card)return;
    const b=T.backup,head=card.querySelector('h2'),intro=card.querySelector('p'),exp=card.querySelector('.vedator-data-export'),imp=card.querySelector('.vedator-data-import'),note=card.querySelector('.vedator-data-note');
    if(head)head.textContent=b.heading[language];if(intro)intro.textContent=b.intro[language];if(exp)exp.textContent=b.export[language];if(imp)imp.textContent=b.import[language];
    if(note){const html=`<strong>${b.privacy[language]}</strong>${b.privacyText[language]}`;if(note.innerHTML!==html)note.innerHTML=html}
  }

  function translatePlaylistHeading(){
    const el=document.querySelector('.vedator-playlist-toolbar strong');if(el)el.textContent='Moje playlisty';
  }

  function translateDynamicBackupStatus(){
    const s=document.querySelector('.vedator-data-status');if(!s||!s.textContent.trim())return;let x=s.textContent,m;
    if((m=x.match(/Záloha (?:bola vytvorená|byla vytvořena):\s*(\d+)\s+epizód[^\d]+(\d+)\s+playlistov/i)))s.textContent=language==='sk'?`Záloha bola vytvorená: ${m[1]} epizód a ${m[2]} playlistov.`:`Záloha byla vytvořena: ${m[1]} epizod a ${m[2]} playlistů.`;
    else if(/Import bol zrušený|Import byl zrušen/i.test(x))s.textContent=language==='sk'?'Import bol zrušený.':'Import byl zrušen.';
    else if(/Záloha bola úspešne načítaná|Záloha byla úspěšně načtena/i.test(x))s.textContent=language==='sk'?'Záloha bola úspešne načítaná. Aplikácia sa obnoví…':'Záloha byla úspěšně načtena. Aplikace se obnoví…';
    else if(/Súbor nie je platný JSON|Soubor není platný JSON/i.test(x))s.textContent=language==='sk'?'Súbor nie je platný JSON.':'Soubor není platný JSON.';
  }

  function apply(){
    installSwitch();document.documentElement.lang=language==='sk'?'sk':'cs';document.title=T.title[language];
    const title=document.querySelector('header h1'),eyebrow=document.querySelector('header .eyebrow'),search=document.querySelector('#search');
    if(title)title.textContent=T.title[language];if(eyebrow)eyebrow.textContent=T.eyebrow[language];if(search)search.placeholder=T.search[language];
    document.querySelectorAll('.tabs .tab').forEach(b=>{const x=T.tabs[b.dataset.view];if(x)b.textContent=x[language]});
    document.querySelectorAll('.topics .topic').forEach(b=>{const key=topicKey(b);if(!b.dataset.vedatorTopicKey)b.dataset.vedatorTopicKey=key;const x=T.topics[key]||T.topics[b.textContent.trim()];if(x)b.textContent=x[langIndex()]});
    document.querySelectorAll('select option').forEach(o=>{const x=T.options[o.value];if(x)o.textContent=x[language]});
    document.querySelectorAll('.vedator-language-switch button').forEach(b=>{const active=b.dataset.lang===language;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    translateCount();translateDates();translatePlaylistHeading();translateBackup();translateDynamicBackupStatus();
  }

  let timer=0;
  const observer=new MutationObserver(records=>{
    if(!records.some(record=>record.addedNodes.length||record.removedNodes.length))return;
    clearTimeout(timer);
    timer=setTimeout(runApply,60);
  });
  const observe=()=>observer.observe(document.body,{childList:true,subtree:true});
  function runApply(){
    clearTimeout(timer);
    observer.disconnect();
    try{apply()}finally{observe()}
  }
  function setLanguage(next){
    language=next==='cz'?'cz':'sk';
    try{localStorage.setItem(KEY,language)}catch{}
    runApply();
    window.dispatchEvent(new CustomEvent('vedatorlanguagechange',{detail:{language}}));
  }
  window.vedatorUiLanguage=()=>language;

  runApply();
})();
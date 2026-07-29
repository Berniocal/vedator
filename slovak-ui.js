(()=>{
  if(window.__vedatorLanguageSwitch)return;
  window.__vedatorLanguageSwitch=true;

  const KEY='vedator-ui-language-v1';
  const translations={
    title:{sk:'Vedátorský podcast podľa tém',cz:'Vedátorský podcast podle témat'},
    eyebrow:{sk:'Neoficiálny tematický katalóg',cz:'Neoficiální tematický katalog'},
    tabs:{
      episodes:{sk:'Epizódy',cz:'Epizody'},
      series:{sk:'Série',cz:'Série'},
      questions:{sk:'Otázky',cz:'Otázky'},
      playlists:{sk:'Playlisty',cz:'Playlisty'}
    },
    topics:{
      'Vše':{sk:'Všetko',cz:'Vše'},
      'Všetko':{sk:'Všetko',cz:'Vše'},
      'FAQ':{sk:'FAQ',cz:'FAQ'},
      'Mimozemský život':{sk:'Mimozemský život',cz:'Mimozemský život'},
      'Kosmologie':{sk:'Kozmológia',cz:'Kosmologie'},
      'Kozmológia':{sk:'Kozmológia',cz:'Kosmologie'},
      'Temná energie':{sk:'Tmavá energia',cz:'Temná energie'},
      'Tmavá energia':{sk:'Tmavá energia',cz:'Temná energie'},
      'Černé díry':{sk:'Čierne diery',cz:'Černé díry'},
      'Čierne diery':{sk:'Čierne diery',cz:'Černé díry'},
      'Kvantová fyzika':{sk:'Kvantová fyzika',cz:'Kvantová fyzika'},
      'Relativita':{sk:'Relativita',cz:'Relativita'},
      'Astronomie':{sk:'Astronómia',cz:'Astronomie'},
      'Astronómia':{sk:'Astronómia',cz:'Astronomie'},
      'Biologie a medicína':{sk:'Biológia a medicína',cz:'Biologie a medicína'},
      'Biológia a medicína':{sk:'Biológia a medicína',cz:'Biologie a medicína'},
      'Matematika':{sk:'Matematika',cz:'Matematika'},
      'Technologie a AI':{sk:'Technológie a AI',cz:'Technologie a AI'},
      'Technológie a AI':{sk:'Technológie a AI',cz:'Technologie a AI'},
      'Země a příroda':{sk:'Zem a príroda',cz:'Země a příroda'},
      'Zem a príroda':{sk:'Zem a príroda',cz:'Země a příroda'},
      'Chemie a materiály':{sk:'Chémia a materiály',cz:'Chemie a materiály'},
      'Chémia a materiály':{sk:'Chémia a materiály',cz:'Chemie a materiály'},
      'Společnost a psychologie':{sk:'Spoločnosť a psychológia',cz:'Společnost a psychologie'},
      'Spoločnosť a psychológia':{sk:'Spoločnosť a psychológia',cz:'Společnost a psychologie'},
      'Vesmír':{sk:'Vesmír',cz:'Vesmír'},
      'Černé díry':{sk:'Čierne diery',cz:'Černé díry'},
      'Relativita a gravitace':{sk:'Relativita a gravitácia',cz:'Relativita a gravitace'},
      'Relativita a gravitácia':{sk:'Relativita a gravitácia',cz:'Relativita a gravitace'},
      'Biologie a medicína':{sk:'Biológia a medicína',cz:'Biologie a medicína'},
      'Technologie':{sk:'Technológie',cz:'Technologie'},
      'Technológie':{sk:'Technológie',cz:'Technologie'},
      'Země a příroda':{sk:'Zem a príroda',cz:'Země a příroda'},
      'Chemie':{sk:'Chémia',cz:'Chemie'},
      'Chémia':{sk:'Chémia',cz:'Chemie'},
      'Ostatní':{sk:'Ostatné',cz:'Ostatní'},
      'Ostatné':{sk:'Ostatné',cz:'Ostatní'}
    }
  };

  let language='sk';
  try{language=localStorage.getItem(KEY)==='cz'?'cz':'sk'}catch{}

  const style=document.createElement('style');
  style.textContent=`
    .vedator-header-actions{display:flex;align-items:center;gap:10px}
    .vedator-language-switch{display:flex;padding:3px;border:1px solid rgba(255,255,255,.42);border-radius:12px;background:rgba(255,255,255,.12)}
    .vedator-language-switch button{border:0;border-radius:8px;padding:7px 10px;background:transparent;color:rgba(255,255,255,.76);font-weight:850;cursor:pointer}
    .vedator-language-switch button.active{background:#fff;color:#29205f;box-shadow:0 2px 8px rgba(0,0,0,.16)}
    @media(max-width:550px){.vedator-header-actions{gap:6px}.vedator-language-switch button{padding:6px 8px}.vedator-language-switch{padding:2px}}
  `;
  document.head.append(style);

  function installSwitch(){
    if(document.querySelector('.vedator-language-switch'))return;
    const header=document.querySelector('header .header-row');
    if(!header)return;
    const install=document.querySelector('#installApp');
    const actions=document.createElement('div');
    actions.className='vedator-header-actions';
    const toggle=document.createElement('div');
    toggle.className='vedator-language-switch';
    toggle.setAttribute('role','group');
    toggle.setAttribute('aria-label','Jazyk aplikácie / Jazyk aplikace');
    toggle.innerHTML='<button type="button" data-lang="sk">SK</button><button type="button" data-lang="cz">CZ</button>';
    if(install){install.before(actions);actions.append(toggle,install)}else{actions.append(toggle);header.append(actions)}
    toggle.addEventListener('click',event=>{
      const button=event.target.closest('button[data-lang]');
      if(!button)return;
      setLanguage(button.dataset.lang);
    });
  }

  function topicKey(button){
    return button.dataset.topic||button.dataset.vedatorTopicKey||button.textContent.trim();
  }

  function apply(){
    installSwitch();
    document.documentElement.lang=language==='sk'?'sk':'cs';
    document.title=translations.title[language];
    const title=document.querySelector('header h1');if(title)title.textContent=translations.title[language];
    const eyebrow=document.querySelector('header .eyebrow');if(eyebrow)eyebrow.textContent=translations.eyebrow[language];

    document.querySelectorAll('.tabs .tab').forEach(button=>{
      const key=button.dataset.view;
      if(translations.tabs[key])button.textContent=translations.tabs[key][language];
    });

    document.querySelectorAll('.topics .topic').forEach(button=>{
      const key=topicKey(button);
      if(!button.dataset.vedatorTopicKey)button.dataset.vedatorTopicKey=key;
      const item=translations.topics[key]||translations.topics[button.textContent.trim()];
      if(item)button.textContent=item[language];
    });

    document.querySelectorAll('.vedator-language-switch button').forEach(button=>{
      const active=button.dataset.lang===language;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function setLanguage(next){
    language=next==='cz'?'cz':'sk';
    try{localStorage.setItem(KEY,language)}catch{}
    apply();
    window.dispatchEvent(new CustomEvent('vedatorlanguagechange',{detail:{language}}));
  }

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  });
  observer.observe(document.body,{childList:true,subtree:true});
  apply();
})();
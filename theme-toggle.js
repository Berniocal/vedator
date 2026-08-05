(()=>{
  if(window.__vedatorThemeToggle)return;
  window.__vedatorThemeToggle=true;

  const STORAGE_KEY='vedatorTheme';
  const style=document.createElement('style');
  style.textContent=`
    .header-actions{display:flex;flex-direction:column;align-items:flex-end;gap:9px;min-width:138px}
    .theme-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:.82rem;font-weight:750;cursor:pointer;user-select:none}
    .theme-switch input{position:absolute;opacity:0;pointer-events:none}
    .theme-switch__track{position:relative;flex:0 0 auto;width:38px;height:22px;border-radius:999px;background:rgba(255,255,255,.28);transition:.2s}
    .theme-switch__track::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.35);transition:.2s}
    .theme-switch input:checked+.theme-switch__track{background:#8b7ee8}
    .theme-switch input:checked+.theme-switch__track::after{transform:translateX(16px)}
    .theme-switch:focus-within{outline:2px solid rgba(255,255,255,.75);outline-offset:2px}
    .vedator-header-actions{justify-content:flex-end;max-width:100%;flex-wrap:nowrap}
    .vedator-header-actions .install-app{order:0;width:auto;flex:0 1 auto}
    .vedator-header-actions .vedator-language-switch{order:1;flex:0 0 auto}

    html.theme-dark{color-scheme:dark;--bg:#0d111b;--card:#171d2a;--ink:#edf2ff;--muted:#aab4c8;--line:#30394b;--accent:#7c6ee6;--accent2:#29244b}
    html.theme-dark body{background:var(--bg);color:var(--ink)}
    html.theme-dark .panel,html.theme-dark article,html.theme-dark .series-card{background:var(--card);border-color:var(--line);box-shadow:0 8px 30px rgba(0,0,0,.25)}
    html.theme-dark .search,html.theme-dark .sort,html.theme-dark .topic,html.theme-dark .tab{background:#1d2534;color:var(--ink);border-color:var(--line)}
    html.theme-dark .topic.active,html.theme-dark .tab.active{background:#3a326d;color:#f3f0ff;border-color:#8b7ee8;box-shadow:0 0 0 1px rgba(139,126,232,.18) inset}
    html.theme-dark .search::placeholder{color:#8994a9}
    html.theme-dark .desc,html.theme-dark .episode-summary-body{color:#c8d0df}
    html.theme-dark .tag{background:#29264c;color:#c7c0ff}
    html.theme-dark .secondary{color:var(--ink);border-color:var(--line)}
    html.theme-dark .episode-summary,html.theme-dark .series-card[open]>summary{background:#1c2331;border-color:var(--line)}
    html.theme-dark .summary-title,html.theme-dark .person-name{color:var(--ink)}
    html.theme-dark .series-body a{color:#b9b0ff}
    html.theme-dark .episode-title{color:var(--muted)}
    html.theme-dark .vedator-audio-modal{background:#0d111b;color:#edf2ff}
    html.theme-dark .vedator-audio-modal__shell,html.theme-dark .vedator-audio-card{background:#171d2a;color:#edf2ff;border-color:#30394b}
    html.theme-dark .vedator-audio-modal__content{background:linear-gradient(160deg,#0d111b,#201c3a)}
    html.theme-dark .vedator-audio-card__kicker,html.theme-dark .vedator-audio-card__help,html.theme-dark .vedator-audio-seek-times{color:#aab4c8}
    html.theme-dark .vedator-audio-seek-box{background:#1c2331;border-color:#30394b}
    html.theme-dark .vedator-audio-seek-label{color:#c7c0ff}
    html.theme-dark .vedator-audio-seek::-webkit-slider-runnable-track{background:#4a426f}
    html.theme-dark .vedator-audio-seek::-moz-range-track{background:#4a426f}
    @media(max-width:550px){
      .header-row{flex-direction:column;align-items:stretch;gap:14px}
      .header-row>div:first-child{width:100%;min-width:0}
      .header-row h1{max-width:none}
      .header-actions{width:auto;min-width:0;max-width:100%;align-self:flex-end;align-items:flex-end}
      .theme-switch{width:auto;min-height:42px;font-size:.82rem;padding:8px 10px}
      .vedator-header-actions{width:auto;max-width:100%;justify-content:flex-end}
      .vedator-header-actions .install-app{width:auto;min-height:42px;padding:9px 11px;font-size:.9rem}
    }
  `;
  document.head.appendChild(style);

  const headerRow=document.querySelector('.header-row');
  const originalInstallButton=document.querySelector('#installApp');
  if(!headerRow)return;

  let installButton=null;
  if(originalInstallButton){
    installButton=originalInstallButton.cloneNode(true);
    originalInstallButton.replaceWith(installButton);
    installButton.classList.add('hidden');
  }

  const actions=document.createElement('div');
  actions.className='header-actions';
  headerRow.appendChild(actions);

  const label=document.createElement('label');
  label.className='theme-switch';
  label.innerHTML=`<span class="theme-switch__text">Tmavý režim</span><input type="checkbox" aria-label="Tmavý režim"><span class="theme-switch__track" aria-hidden="true"></span>`;
  actions.appendChild(label);
  if(installButton)actions.appendChild(installButton);

  const checkbox=label.querySelector('input');
  const text=label.querySelector('.theme-switch__text');

  function preferredDark(){
    const stored=localStorage.getItem(STORAGE_KEY);
    if(stored==='dark')return true;
    if(stored==='light')return false;
    return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(dark,save=true){
    document.documentElement.classList.toggle('theme-dark',dark);
    checkbox.checked=dark;
    text.textContent=dark?'Světlý režim':'Tmavý režim';
    if(save){
      try{localStorage.setItem(STORAGE_KEY,dark?'dark':'light')}catch(error){}
    }
  }

  checkbox.addEventListener('change',()=>applyTheme(checkbox.checked,true));
  applyTheme(preferredDark(),false);

  if(!installButton)return;

  let deferredInstallPrompt=null;
  const userAgent=navigator.userAgent||'';
  const isIos=/iphone|ipad|ipod/i.test(userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isIosSafari=isIos&&/safari/i.test(userAgent)&&!/crios|fxios|edgios|opios/i.test(userAgent);
  const isInstalled=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

  function updateInstallButton(){
    const available=!isInstalled()&&(Boolean(deferredInstallPrompt)||isIos);
    installButton.classList.toggle('hidden',!available);
    installButton.textContent=isIos?'Přidat na plochu':'Instalovat aplikaci';
    installButton.setAttribute('aria-label',installButton.textContent);
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredInstallPrompt=event;
    updateInstallButton();
  });

  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;
    updateInstallButton();
  });

  installButton.addEventListener('click',async()=>{
    if(isInstalled()){
      updateInstallButton();
      return;
    }

    if(deferredInstallPrompt){
      const prompt=deferredInstallPrompt;
      deferredInstallPrompt=null;
      updateInstallButton();
      try{
        await prompt.prompt();
        await prompt.userChoice;
      }catch(error){
        console.warn('Instalační dialog se nepodařilo otevřít.',error);
      }
      return;
    }

    if(isIos){
      alert(isIosSafari
        ?'V Safari klepněte na Sdílet a potom na Přidat na plochu.'
        :'Pro přidání aplikace na plochu otevřete tuto stránku v Safari. Potom klepněte na Sdílet a na Přidat na plochu.');
    }
  });

  updateInstallButton();
})();

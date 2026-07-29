(()=>{
  if(window.__vedatorTranslationExtension)return;
  window.__vedatorTranslationExtension=true;

  const language=()=>window.vedatorUiLanguage?.()==='cz'?'cz':'sk';
  const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};

  const SERIES={
    'Hľadanie mimozemského života':{sk:'Hľadanie mimozemského života',cz:'Hledání mimozemského života'},
    'FAQ – dobré otázky':{sk:'FAQ – dobré otázky',cz:'FAQ – dobré otázky'},
    'Rozhovory o vesmíre':{sk:'Rozhovory o vesmíre',cz:'Rozhovory o vesmíru'},
    'Žijem vedu':{sk:'Žijem vedu',cz:'Žiji vědou'},
    'Genetický speciál':{sk:'Genetický špeciál',cz:'Genetický speciál'},
    'Genetický špeciál':{sk:'Genetický špeciál',cz:'Genetický speciál'},
    'Nobelovy ceny':{sk:'Nobelove ceny',cz:'Nobelovy ceny'},
    'Nobelove ceny':{sk:'Nobelove ceny',cz:'Nobelovy ceny'},
    'Ig Nobelovy ceny':{sk:'Ig Nobelove ceny',cz:'Ig Nobelovy ceny'},
    'Ig Nobelove ceny':{sk:'Ig Nobelove ceny',cz:'Ig Nobelovy ceny'},
    'Matematika':{sk:'Matematika',cz:'Matematika'},
    'Teorie her':{sk:'Teória hier',cz:'Teorie her'},
    'Teória hier':{sk:'Teória hier',cz:'Teorie her'},
    'Rozhovory v angličtině':{sk:'Rozhovory v angličtine',cz:'Rozhovory v angličtině'},
    'Rozhovory v angličtine':{sk:'Rozhovory v angličtine',cz:'Rozhovory v angličtině'},
    'Internet':{sk:'Internet',cz:'Internet'},
    'Vedátorský špeciál':{sk:'Vedátorský špeciál',cz:'Vedátorský speciál'},
    'Vedátorský speciál':{sk:'Vedátorský špeciál',cz:'Vedátorský speciál'},
    'Černé díry':{sk:'Čierne diery',cz:'Černé díry'},
    'Čierne diery':{sk:'Čierne diery',cz:'Černé díry'},
    'Tmavá hmota a energie':{sk:'Tmavá hmota a energia',cz:'Temná hmota a energie'},
    'Tmavá hmota a energia':{sk:'Tmavá hmota a energia',cz:'Temná hmota a energie'},
    'Temná hmota a energie':{sk:'Tmavá hmota a energia',cz:'Temná hmota a energie'},
    'Částice':{sk:'Častice',cz:'Částice'},
    'Častice':{sk:'Častice',cz:'Částice'},
    'Roky ve vědě':{sk:'Roky vo vede',cz:'Roky ve vědě'},
    'Roky vo vede':{sk:'Roky vo vede',cz:'Roky ve vědě'},
    'Vědci':{sk:'Vedci',cz:'Vědci'},
    'Vedci':{sk:'Vedci',cz:'Vědci'},
    'Vědkyně':{sk:'Vedkyne',cz:'Vědkyně'},
    'Vedkyne':{sk:'Vedkyne',cz:'Vědkyně'}
  };

  const DATA={
    heading:{sk:'Záloha dát aplikácie',cz:'Záloha dat aplikace'},
    intro:{sk:'Uložte si rozpočúvané a vypočuté epizódy spolu s vlastnými playlistami do jedného JSON súboru. Súbor sa vytvorí priamo v tomto zariadení a nikam sa neodosiela.',cz:'Uložte si rozposlouchané a poslechnuté epizody spolu s vlastními playlisty do jednoho souboru JSON. Soubor se vytvoří přímo v tomto zařízení a nikam se neodesílá.'},
    export:{sk:'Stiahnuť zálohu',cz:'Stáhnout zálohu'},
    import:{sk:'Načítať zálohu',cz:'Načíst zálohu'},
    privacy:{sk:'Súkromie:',cz:'Soukromí:'},
    privacyText:{sk:' export aj import prebiehajú iba lokálne v prehliadači. Žiadne údaje sa neposielajú na žiadny server.',cz:' export i import probíhají pouze místně v prohlížeči. Žádné údaje se neposílají na žádný server.'},
    count:{sk:'Lokálna záloha dát',cz:'Lokální záloha dat'}
  };

  function translateSeries(){
    const lang=language();
    document.querySelectorAll('#series .series-card>summary>span:first-child').forEach(node=>{
      const original=node.dataset.vedatorSeriesKey||node.textContent.trim();
      const item=SERIES[original]||SERIES[node.textContent.trim()];
      if(!item)return;
      if(!node.dataset.vedatorSeriesKey)node.dataset.vedatorSeriesKey=original;
      setText(node,item[lang]);
    });
  }

  function translateData(){
    const lang=language(),card=document.querySelector('.vedator-data-card');
    if(!card)return;
    setText(card.querySelector('h2'),DATA.heading[lang]);
    setText(card.querySelector('p'),DATA.intro[lang]);
    setText(card.querySelector('.vedator-data-export'),DATA.export[lang]);
    setText(card.querySelector('.vedator-data-import'),DATA.import[lang]);
    const note=card.querySelector('.vedator-data-note');
    const noteHtml=`<strong>${DATA.privacy[lang]}</strong>${DATA.privacyText[lang]}`;
    if(note&&note.innerHTML!==noteHtml)note.innerHTML=noteHtml;
    const count=document.querySelector('#count');
    if(count&&/Lokálna záloha dát|Lokální záloha dat/.test(count.textContent))setText(count,DATA.count[lang]);
    const status=card.querySelector('.vedator-data-status');
    if(!status||!status.textContent.trim())return;
    const raw=status.textContent.trim();let match;
    if((match=raw.match(/Záloha (?:bola vytvorená|byla vytvořena):\s*(\d+)\s+epizód?\s+a\s+(\d+)\s+playlistov?\.?/i)))setText(status,lang==='sk'?`Záloha bola vytvorená: ${match[1]} epizód a ${match[2]} playlistov.`:`Záloha byla vytvořena: ${match[1]} epizod a ${match[2]} playlistů.`);
    else if(/Import bol zrušený|Import byl zrušen/i.test(raw))setText(status,lang==='sk'?'Import bol zrušený.':'Import byl zrušen.');
    else if(/Záloha bola úspešne načítaná|Záloha byla úspěšně načtena/i.test(raw))setText(status,lang==='sk'?'Záloha bola úspešne načítaná. Aplikácia sa obnoví…':'Záloha byla úspěšně načtena. Aplikace se obnoví…');
    else if(/Súbor nie je platný JSON|Soubor není platný JSON/i.test(raw))setText(status,lang==='sk'?'Súbor nie je platný JSON.':'Soubor není platný JSON.');
    else if(/Zálohu sa nepodarilo načítať|Zálohu se nepodařilo načíst/i.test(raw))setText(status,lang==='sk'?'Zálohu sa nepodarilo načítať.':'Zálohu se nepodařilo načíst.');
  }

  function apply(){translateSeries();translateData()}
  let queued=false;
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply()})}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('vedatorlanguagechange',apply);
  window.addEventListener('vedatorcontentchange',apply);
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="data"],[data-view="series"]'))requestAnimationFrame(apply)},true);
  apply();
})();

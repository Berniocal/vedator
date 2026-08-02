(()=>{
  if(window.__vedatorSpecialSeriesTranslations)return;
  window.__vedatorSpecialSeriesTranslations=true;

  const SPECIALS=[
    {skTitle:'Rozhovory o vesmíre 1 – Horúci vesmír',csTitle:'Rozhovory o vesmíru 1 – Horký vesmír',csDescription:`Samuel a Norbert Werner probírají novinky z astrofyziky, horký plyn a kosmickou pavučinu, která vyplňuje viditelný vesmír. Vysvětlují, proč je plyn ve vesmíru horký, kam směřuje a jakou roli v tomto procesu hrají černé díry.`},
    {skTitle:'Rozhovory o vesmíre 2 – Demokratizácia vesmíru',csTitle:'Rozhovory o vesmíru 2 – Demokratizace vesmíru',csDescription:`Samuel a Norbert Werner se věnují demokratizaci vesmíru – tomu, jak se kosmický výzkum zpřístupňuje firmám i výzkumným institucím. Mluví o malých družicích, návratu na Měsíc a plánech společnosti SpaceX na cestu k Marsu.`},
    {skTitle:'Rozhovory o vesmíre 3 – Extrémne čierne diery',csTitle:'Rozhovory o vesmíru 3 – Extrémní černé díry',csDescription:`Samuel a Norbert Werner mluví o extrémně velkých i extrémně malých černých dírách. Vysvětlují vznik supermasivních černých děr, jejich vliv na okolí a možnost existence mikroskopických černých děr.`},
    {skTitle:'Rozhovory o vesmíre 4 – Vesmírna pavučina',csTitle:'Rozhovory o vesmíru 4 – Vesmírná pavučina',csDescription:`Samuel a Norbert Werner vysvětlují rozměry vesmíru a strukturu kosmické pavučiny. Zabývají se také tím, proč je její jemná vlákna tak obtížné pozorovat.`},
    {skTitle:'Rozhovory o vesmíre 5 – Vesmír plný exoplanét',csTitle:'Rozhovory o vesmíru 5 – Vesmír plný exoplanet',csDescription:`Samuel, Norbert Werner a Marek Skarka diskutují o exoplanetách. Vysvětlují, co exoplanety jsou, kolik jich ve vesmíru může být a jakými metodami je dokážeme objevovat a zkoumat.`},
    {skTitle:'Rozhovory o vesmíre 11 – O živote hviezd',csTitle:'Rozhovory o vesmíru 11 – O životě hvězd',csDescription:`Hvězdy jsou základními stavebními kameny viditelného vesmíru. Samuel, Norbert Werner a Zdeněk Mikulášek probírají typy hvězd, jejich vývoj a zvláštnosti, kterým stále úplně nerozumíme.`},
    {skTitle:'Rozhovory o vesmíre 13 – Rádiové galaxie',csTitle:'Rozhovory o vesmíru 13 – Rádiové galaxie',csDescription:`Samuel, Norbert Werner a jeho studenti vysvětlují, jak pozorujeme vesmír pomocí rádiových vln. Mluví o rázových vlnách, měření výkonu výtrysků a o tom, jak vypadá rádiový vesmír.`},
    {skTitle:'Rozhovory o vesmíre 14 – Dve strany Mesiaca',csTitle:'Rozhovory o vesmíru 14 – Dvě strany Měsíce',csDescription:`Samuel, Norbert Werner a Pavol Gabzdyl probírají vznik Měsíce, rozdíly mezi jeho přivrácenou a odvrácenou stranou a důvody, proč se vyplatí Měsíc dále zkoumat přímo na jeho povrchu.`},
    {skTitle:'Rozhovory o vesmíre 15 – Raný vesmír',csTitle:'Rozhovory o vesmíru 15 – Raný vesmír',csDescription:`Norbert Werner, Samuel a Tereza Jeřábková diskutují o raném vesmíru. Zabývají se vznikem prvních struktur, chováním temné hmoty a otázkami, které otevřela pozorování Webbova vesmírného dalekohledu.`},

    {skTitle:'Žijem vedu špeciál 1 – Petra Hamerlík',csTitle:'Žiji vědu – speciál 1: Petra Hamerlík',csDescription:`Dominika Fričová a Michal Tomek hovoří s Petrou Hamerlík o novinkách ve výzkumu rakoviny, vedení vědeckého týmu v Dánsku a slaďování vědecké kariéry s péčí o dítě.`},
    {skTitle:'Žijem vedu špeciál 2 – Marek Schwendt',csTitle:'Žiji vědu – speciál 2: Marek Schwendt',csDescription:`Marek Schwendt je slovenský vědec působící na University of Florida. Věnuje se buněčným a molekulárním příčinám závislostí a v rozhovoru popisuje svou cestu k vědě, vznik závislostí i osobní život vědce v zahraničí.`},
    {skTitle:'Žijem vedu špeciál 3 – Michal Mokrý',csTitle:'Žiji vědu – speciál 3: Michal Mokrý',csDescription:`Michal Mokrý je slovenský vědec působící v Nizozemsku. Původně vystudoval medicínu, nyní zkoumá gastrointestinální a kardiovaskulární systém a přibližuje svou výzkumnou práci i pohled na slovenskou vědu.`},
    {skTitle:'Žijem vedu špeciál 4 – Peter Vereš',csTitle:'Žiji vědu – speciál 4: Peter Vereš',csDescription:`Dominika Fričová a Michal Tomek hovoří s astronomem Peterem Verešem. Rozhovor sleduje jeho cestu od studia v Bratislavě přes Havajskou univerzitu a laboratoř NASA JPL až po práci v Harvard-Smithsonian Center for Astrophysics.`},
    {skTitle:'Žijem vedu špeciál 5 – Jakub Betinský',csTitle:'Žiji vědu – speciál 5: Jakub Betinský',csDescription:`Jakub Betinský vystudoval mezinárodní vztahy, politickou ekonomii a filozofii a věnuje se filozofii jazyka a metaetice. Je zakladatelem podcastu Pravidelná dávka, spoluzakladatelem Kvanta idejí a vyučuje filozofii i lékařskou etiku.`},

    {skTitle:'Genetický špeciál 1 – Evolúcia, genetika a naša DNA',csTitle:'Genetický speciál 1 – Evoluce, genetika a naše DNA',csDescription:`Samuel hovoří s profesorem Jurajem Krajčovičem o evoluci člověka, molekulární biologii a o tom, jak evoluce ovlivnila a stále ovlivňuje lidskou DNA.`},
    {skTitle:'Genetický špeciál 2 – Genetika a bioinformatika',csTitle:'Genetický speciál 2 – Genetika a bioinformatika',csDescription:`Samuel a docent Tomáš Vinař probírají, jak se DNA čte, jak rozumíme jejímu obsahu a proč v genetice a bioinformatice probíhá tak rychlý technologický pokrok.`},
    {skTitle:'Genetický špeciál 3 – Genetika a jej vplyv na výživu a stravovanie',csTitle:'Genetický speciál 3 – Genetika a její vliv na výživu a stravování',csDescription:`Samuel a nutriční expertka Petronela Forišek Paulová diskutují o dědičnosti obezity, vlivu genů na stravování a významu chutí i individuálně nastavené výživy.`},
    {skTitle:'Genetický špeciál 4 – O prevencii a jej súvise s genetikou',csTitle:'Genetický speciál 4 – O prevenci a jejím vztahu ke genetice',csDescription:`Peter Celec a Samuel Kováčik rozebírají vztah genetiky a prevence, význam personalizované medicíny, pravidelných screeningů a možné proměny zdravotní péče v dalších desetiletích.`},
    {skTitle:'Genetický špeciál 5 – Gény, cviky a zranenia',csTitle:'Genetický speciál 5 – Geny, cvičení a zranění',csDescription:`Samuel a fyzioterapeut Tomáš Malárik diskutují o genetických predispozicích k bolestem a zraněním, vhodné četnosti cvičení a o tom, kdy mohou být užitečné genetické testy.`},
    {skTitle:'Genetický špeciál 6 – Genetika a vzhľad',csTitle:'Genetický speciál 6 – Genetika a vzhled',csDescription:`Samuel a dermatoveneroložka Jana Chudíková vysvětlují, jak genetika ovlivňuje vzhled a stav kůže, proč vznikají vrásky a jak se o největší lidský orgán správně starat.`},
    {skTitle:'Genetický špeciál 7 – Prečo je dobré poznať svoje gény?',csTitle:'Genetický speciál 7 – Proč je dobré znát své geny?',csDescription:`Samuel a genetik Filip Uhrin vysvětlují, jak se čte genetická informace, co z ní lze spolehlivě vyčíst a jak mohou genetické poznatky ovlivnit náš život. Dostanou se i k otázce, jaké geny by mohli mít mimozemšťané.`},

    {skTitle:'Vedátorský špeciál – Dungeon Vedátor',csTitle:'Vedátorský speciál – Dungeon Vedátor',csDescription:`Jozef a Samuel diskutují o knižním fenoménu Dungeon Crawler Carl, proměně moderní literatury, morálce mimozemských civilizací a biologických důvodech, proč nás přitahují násilné a hororové příběhy.`},
    {skTitle:'Vedátorský špeciál – Ako znie vesmír?',csTitle:'Vedátorský speciál – Jak zní vesmír?',csDescription:`Jaké by to bylo, kdybychom vesmír mohli nejen pozorovat, ale také poslouchat? Jozef a Samuel vysvětlují, co je možné ve vakuu slyšet a jak lze vesmírná data převádět na zvuk.`},
    {skTitle:'Vedátorský špeciál – Kúsky reality',csTitle:'Vedátorský speciál – Kousky reality',csDescription:`Kousky reality navazují na Obyčejné zázraky a zaměřují se na nejpodivnější jevy moderní fyziky: cestování v čase, vznik vesmíru, strukturu prostoru, relativitu a kvantovou fyziku.`},
    {skTitle:'Vedátorský špeciál – Zelená energia',csTitle:'Vedátorský speciál – Zelená energie',csDescription:`Jozef, Samuel a Marek Tomeš ze ZSE diskutují o principech zelené energie, šedé energii, obnovitelných zdrojích a způsobech, jak zvyšovat povědomí o jejich významu.`},
    {skTitle:'Vedátorský špeciál – Vďaka čomu sú jadrové elektrárne bezpečné?',csTitle:'Vedátorský speciál – Díky čemu jsou jaderné elektrárny bezpečné?',csDescription:`Samuel a specialista na hodnocení jaderné bezpečnosti Viktor Majerník vysvětlují příčiny známých jaderných havárií a bezpečnostní principy, které mají zabránit jejich opakování.`},
    {skTitle:'Vedátorský špeciál – Obyčajné zázraky (ukážka z knihy)',csTitle:'Vedátorský speciál – Obyčejné zázraky (ukázka z knihy)',csDescription:`Ukázka ze Samuelovy knihy Obyčejné zázraky vysvětluje fyziku každodenních věcí: růst stromů, vznik oblaků, déšť nebo plamen svíčky. Text načetla Miroslava Frankovská.`},
    {skTitle:'Vedátorský špeciál – Astrológia',csTitle:'Vedátorský speciál – Astrologie',csDescription:`Jozef a Samuel se s nadhledem dívají na astrologii. Ptají se, zda mohou hvězdy a planety ovlivňovat naše životy, a porovnávají astrologická tvrzení s vědeckými poznatky.`},
    {skTitle:'Vedátorský špeciál – Prečo je v nealko pive alkohol?',csTitle:'Vedátorský speciál – Proč je v nealkoholickém pivu alkohol?',csDescription:`Jozef, Samuel a sládek Ján Píry vysvětlují výrobu nealkoholického piva, důvody přítomnosti malého množství alkoholu a to, zda se může projevit při dechové zkoušce.`},
    {skTitle:'Vedátorský špeciál – Udržateľnosť, prípadová štúdia: IKEA',csTitle:'Vedátorský speciál – Udržitelnost, případová studie: IKEA',csDescription:`Jozef, Samuel a Vladimír Víšek z IKEA diskutují o praktickém zavádění udržitelnosti, snižování uhlíkové stopy, ekologičtější výrobě a možnostech ovlivňování spotřebitelského chování.`},
    {skTitle:'Vedátorský špeciál – Prenos signálu vzduchom',csTitle:'Vedátorský speciál – Přenos signálu vzduchem',csDescription:`Jozef, Samuel a Matúš Turcsány vysvětlují přenos mobilního a internetového signálu, rozdíl mezi vedením kabelem a šířením vzduchem, Shannonovu teorii informace a bezpečnost sítí 5G.`}
  ];

  const SERIES_PAIRS=[
    ['Hľadanie mimozemského života','Hledání mimozemského života'],
    ['Rozhovory o vesmíre','Rozhovory o vesmíru'],
    ['Žijem vedu','Žiji vědu'],
    ['Genetický špeciál','Genetický speciál'],
    ['Vedátorský špeciál','Vedátorský speciál'],
    ['Tmavá hmota a energie','Temná hmota a energie']
  ];

  const COMMON_TEXT_PAIRS=[
    ['Máme vonku novú knihu, Rozhovory o vesmíre','Vydali jsme novou knihu Rozhovory o vesmíru'],
    ['Máme novú knihu – Rozhovory o vesmíre','Máme novou knihu – Rozhovory o vesmíru'],
    ['Knihu Rozhovory o vesmíre môžete podporiť cez Startlab','Knihu Rozhovory o vesmíru můžete podpořit prostřednictvím Startlabu'],
    ['Knihu Rozhovory vo vesmíre môžete podporiť cez Startlab','Knihu Rozhovory o vesmíru můžete podpořit prostřednictvím Startlabu'],
    ['Bonusové epizódy a extra obsah k podcastom nájdete na','Bonusové epizody a další obsah k podcastům najdete na'],
    ['Samuelova nová kniha už je v predaji','Samuelova nová kniha už je v prodeji'],
    ['Otázky nám môžete nahrávať tu','Otázky nám můžete nahrávat zde'],
    ['Podcastové hrnčeky a ponožky nájdete na stránke','Podcastové hrnky a ponožky najdete na stránce'],
    ['Podcastové hrnčeky a ponožky nájdete na stránke','Podcastové hrnky a ponožky najdete na stránce'],
    ['Podcastové hrnčeky či ponožky nájdete na stránke','Podcastové hrnky či ponožky najdete na stránce'],
    ['Podcastové hrnčeky nájdete na stránke','Podcastové hrnky najdete na stránce'],
    ['Vedátora môžete podporiť cez stránku Patreon','Vedátora můžete podpořit prostřednictvím Patreonu'],
    ['Podcast môžete počúvať aj cez','Podcast můžete poslouchat také přes'],
    ['Vedátora nájdete aj na','Vedátora najdete také na'],
    ['Všetko ostatné nájdete tu','Všechno ostatní najdete zde'],
    ['Tento podcast vzniká v spolupráci s denníkom SME.','Tento podcast vzniká ve spolupráci s deníkem SME.'],
    ['Podcast vznikol v spolupráci s denníkom SME.','Podcast vznikl ve spolupráci s deníkem SME.'],
    ['Podcast vzniká v spolupráci s denníkom SME.','Podcast vzniká ve spolupráci s deníkem SME.'],
    ['Podcast vzniká v spolupráci so SME.','Podcast vzniká ve spolupráci se SME.'],
    ['Podcast vzniká v spolupráci so SME a MUNI Brno.','Podcast vzniká ve spolupráci se SME a MUNI Brno.'],
    ['Podcast vzniká v spolupráci so SME a združením Žijem vedu.','Podcast vzniká ve spolupráci se SME a sdružením Žiji vědu.'],
    ['Video verziu podcastu s doplňujúcou grafikou nájdete na','Videoverzi podcastu s doplňující grafikou najdete na'],
    ['Video verziu podcastu s doplňujúcou grafikou nájdete na','Videoverzi podcastu s doplňující grafikou najdete na'],
    ['Video verziu nájdete na stránke','Videoverzi najdete na stránce'],
    ['Video rozhovoru nájdete na','Video rozhovoru najdete na'],
    ['Spomínaná štúdia','Zmíněná studie'],
    ['Spomínané video','Zmíněné video'],
    ['Spomínaná kniha','Zmíněná kniha'],
    ['Spomínaný článok','Zmíněný článek'],
    ['Spomínaný strom života','Zmíněný strom života'],
    ['Hlasovať za nás môžete v súťaži Podcast roka','Hlasovat pro nás můžete v soutěži Podcast roku'],
    ['S investovaním je spojené riziko.','S investováním je spojeno riziko.'],
    ['Rozhovory o vesmíre','Rozhovory o vesmíru'],
    ['Genetický špeciál','Genetický speciál'],
    ['Vedátorský špeciál','Vedátorský speciál']
  ].sort((a,b)=>b[0].length-a[0].length);

  const normalize=value=>String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const BY_TITLE=new Map();
  for(const item of SPECIALS){
    BY_TITLE.set(normalize(item.skTitle),item);
    BY_TITLE.set(normalize(item.csTitle),item);
  }

  const ORIGINALS=new Map();
  const normalizeLanguage=value=>{
    const lang=String(value||'').toLowerCase();
    if(lang.startsWith('sk'))return 'sk';
    if(lang.startsWith('cs')||lang.startsWith('cz'))return 'cs';
    return '';
  };
  const language=()=>{
    try{const ui=normalizeLanguage(window.vedatorUiLanguage?.());if(ui)return ui}catch(_){}
    const html=normalizeLanguage(document.documentElement.lang);
    if(html)return html;
    try{
      return normalizeLanguage(localStorage.getItem('vedator-ui-language-v1')||localStorage.getItem('vedator-ui-language'))||'cs';
    }catch(_){return 'cs'}
  };

  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);

  function translatedSpecialDescription(original,summary){
    const root=document.createElement('div');
    root.innerHTML=String(original||'');
    const links=[];
    const seen=new Set();
    for(const link of root.querySelectorAll('a[href]')){
      const href=String(link.getAttribute('href')||'').trim();
      if(!href||seen.has(href))continue;
      seen.add(href);
      const label=(link.textContent||href).trim()||href;
      links.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
    }
    return `<p>${escapeHtml(summary)}</p>${links.length?`<p><strong>Odkazy:</strong><br>${links.join('<br>')}</p>`:''}`;
  }

  function replaceDirectional(value,pairs,toCzech){
    let result=String(value||'');
    for(const [sk,cs] of pairs){
      const from=toCzech?sk:cs;
      const to=toCzech?cs:sk;
      if(result.includes(from))result=result.split(from).join(to);
    }
    return result;
  }

  function translateCommonHtml(html,toCzech){
    if(typeof html!=='string'||!html)return html;
    const template=document.createElement('template');
    template.innerHTML=html;
    const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode()))node.nodeValue=replaceDirectional(node.nodeValue,COMMON_TEXT_PAIRS,toCzech);
    return template.innerHTML;
  }

  function patchSeriesTests(){
    try{
      if(typeof FIXED_SERIES==='undefined'||!Array.isArray(FIXED_SERIES))return;
      for(const series of FIXED_SERIES){
        if(series.__vedatorSpecialBilingualTest)continue;
        const key=normalize(series.name);
        let extra=null;
        if(key==='hladanie mimozemskeho zivota'||key==='hledani mimozemskeho zivota')extra=e=>/hledani mimozemskeho zivota|hladanie mimozemskeho zivota/.test(normalize(e?.title));
        if(key==='rozhovory o vesmire'||key==='rozhovory o vesmiru')extra=e=>/rozhovory o vesmir[eu]/.test(normalize(e?.title));
        if(key==='zijem vedu'||key==='ziji vedu')extra=e=>/zijem vedu|ziji vedu/.test(normalize(e?.title));
        if(key==='geneticky special')extra=e=>normalize(e?.title).includes('geneticky special');
        if(key==='vedatorsky special')extra=e=>normalize(e?.title).includes('vedatorsky special');
        if(!extra)continue;
        const originalTest=series.test;
        series.test=episode=>{
          try{if(typeof originalTest==='function'&&originalTest(episode))return true}catch(_){}
          return extra(episode);
        };
        series.__vedatorSpecialBilingualTest=true;
      }
    }catch(_){}
  }

  function applyTranslations(){
    const toCzech=language()==='cs';
    let list=null;
    try{list=Array.isArray(window.episodes)?window.episodes:(typeof episodes!=='undefined'&&Array.isArray(episodes)?episodes:null)}catch(_){}
    if(list){
      for(const episode of list){
        let original=ORIGINALS.get(episode);
        let item=original?.item||BY_TITLE.get(normalize(episode?.title));
        if(item&&!original){
          original={item,title:String(episode.title||item.skTitle),description:String(episode.description||'')};
          ORIGINALS.set(episode,original);
        }
        if(item&&original){
          episode.title=toCzech?item.csTitle:original.title;
          episode.description=toCzech?translatedSpecialDescription(original.description,item.csDescription):original.description;
        }
        if(typeof episode.description==='string')episode.description=translateCommonHtml(episode.description,toCzech);
      }
    }

    patchSeriesTests();
    try{
      if(typeof FIXED_SERIES!=='undefined'&&Array.isArray(FIXED_SERIES)){
        for(const series of FIXED_SERIES)series.name=replaceDirectional(series.name,SERIES_PAIRS,toCzech);
      }
    }catch(_){}
  }

  function refresh(){
    applyTranslations();
    try{if(typeof render==='function')render()}catch(_){}
    window.dispatchEvent(new Event('vedatorcontentchange'));
  }

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;applyTranslations()});
  };

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('vedatorlanguagechange',refresh);
  window.addEventListener('vedatorcontentchange',schedule);
  applyTranslations();
})();

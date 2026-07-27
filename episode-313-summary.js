(()=>{
  if(window.__vedatorEpisode313Summary)return;
  window.__vedatorEpisode313Summary=true;

  const QUESTIONS=[
    {time:'1:40',title:'Proč se nám zdá, že čas plyne rychleji, když stárneme?',points:['Mozek ukládá méně nových vzpomínek, takže se roky zpětně zdají kratší.','Dětství je plné nových podnětů, zatímco dospělost bývá rutinnější.','Méně výrazných milníků znamená subjektivně kratší období.']},
    {time:'4:15',title:'Co by se stalo, kdyby se Země přestala otáčet?',points:['Okamžitě by vznikly extrémní větry dosahující až tisíců kilometrů za hodinu.','Oceány by se přelily směrem k rovníku.','Den by trval půl roku světla a půl roku tmy.','Magnetické pole by se změnilo nebo mohlo zaniknout.']},
    {time:'7:02',title:'Proč mají některé planety prstence a jiné ne?',points:['Prstence vznikají z rozbitých měsíců nebo materiálu uvnitř Rocheovy meze.','Jupiter a Saturn mají silnou gravitaci, která umožňuje stabilní prstence.','Země prstenec nemá, protože Měsíc je příliš daleko a jeho oběžná dráha je stabilní.']},
    {time:'9:40',title:'Může být vesmír živý?',points:['Záleží na tom, jak přesně definujeme život.','Vesmír vytváří emergentní struktury, které se vyvíjejí.','Nemá ale metabolismus ani reprodukci, takže v biologickém smyslu živý není.']},
    {time:'12:10',title:'Proč se světlo ohýbá kolem černé díry, když fotony nemají hmotnost?',points:['Nejde o sílu působící na hmotnost.','Černá díra zakřivuje časoprostor a foton následuje zakřivenou geodetickou dráhu.','Einsteinova obecná relativita popisuje ohyb světla přesněji než Newtonova teorie.']},
    {time:'14:55',title:'Co by se stalo, kdyby se Slunce okamžitě vypnulo?',points:['Světlo by k Zemi přestalo přicházet po přibližně osmi minutách.','Také změna gravitačního vlivu by se projevila až po osmi minutách.','Planety by se pak vydaly po přímých drahách do prostoru.','Země by během několika týdnů začala zamrzat.']},
    {time:'17:20',title:'Proč se nám zdají hvězdy malé, když jsou obrovské?',points:['Hvězdy jsou extrémně daleko, takže mají nepatrnou úhlovou velikost.','Atmosféra způsobuje jejich blikání a vnímáme je jako bodové zdroje.','Planety obvykle neblikají, protože mají větší úhlový průměr.']},
    {time:'19:40',title:'Jak funguje GPS, když se satelity pohybují a čas se jim zpomaluje?',points:['GPS musí opravovat účinky speciální relativity způsobené pohybem satelitů.','Zároveň opravuje účinky obecné relativity kvůli jejich výšce nad Zemí.','Bez těchto korekcí by chyba polohy narůstala o kilometry denně.']},
    {time:'22:05',title:'Může být gravitace tah místo zakřivení?',points:['Newtonovská gravitace se dá chápat jako tahová síla.','Einstein ji popsal jako zakřivení časoprostoru.','V běžných podmínkách dávají obě teorie podobné výsledky, ale v extrémech se liší.']},
    {time:'24:50',title:'Proč se nám zdá, že vesmír je prázdný, když je plný částic?',points:['Většina prostoru je extrémně řídká.','I v mezihvězdném prostoru je jen několik atomů na krychlový centimetr.','Vnímáme hlavně husté struktury, jako jsou planety a hvězdy.']},
    {time:'27:30',title:'Může být čas cestovatelný?',points:['Do budoucnosti lze cestovat pomocí relativistického zpomalení času.','Cestování do minulosti vede k paradoxům.','Existují teoretické modely s uzavřenými časovými křivkami, ale neznáme fyzikálně uskutečnitelný způsob.']},
    {time:'30:10',title:'Co je největší záhada současné fyziky?',points:['Temná hmota.','Temná energie.','Kvantová gravitace.','Spojení obecné relativity a kvantové mechaniky.']}
  ];

  function isEpisode313(article){return /\bpodcast\s+313\b/i.test(article?.querySelector('h2')?.textContent||'')}

  function install(article){
    if(!isEpisode313(article)||article.querySelector('.episode-summary'))return;
    const details=document.createElement('details');
    details.className='episode-summary';
    const summary=document.createElement('summary');
    summary.textContent='Shrnutí dílu';
    const body=document.createElement('div');
    body.className='episode-summary-body';

    for(const item of QUESTIONS){
      const block=document.createElement('div');
      block.className='summary-block';
      const time=document.createElement('div');time.className='summary-time';time.textContent=item.time;
      const title=document.createElement('div');title.className='summary-title';title.textContent=item.title;
      block.append(time,title);
      const list=document.createElement('ul');
      for(const point of item.points){const li=document.createElement('li');li.textContent=point;list.appendChild(li)}
      block.appendChild(list);body.appendChild(block);
    }
    const note=document.createElement('div');note.className='summary-note';note.textContent='Kliknutím na čas se epizoda spustí přímo u dané otázky.';
    body.appendChild(note);details.append(summary,body);article.appendChild(details);
  }

  const episodes=document.querySelector('#episodes');
  if(!episodes)return;
  episodes.querySelectorAll('article').forEach(install);
  new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('article'))install(node);
      node.querySelectorAll?.('article').forEach(install);
    }
  }).observe(episodes,{childList:true});
})();
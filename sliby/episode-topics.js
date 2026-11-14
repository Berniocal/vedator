'use strict';
// First reviewed batch of episode-promise topics (2026-11-14).
// These are manually checked, UNIQUE consolidated promise headings from
// sliby/duplicate-review.json, NOT automatic keyword guesses.
// Leave all other episode promises "Nezařazené" until individually reviewed.
(function exposeReviewedEpisodePromiseTopics(root){
  const topics=[
    ['space','Vesmír a kosmologie'],
    ['blackholes','Černé díry'],
    ['alienlife','Hledání mimozemského života'],
    ['darkenergy','Temná hmota a energie'],
    ['missions','Kosmonautika a vesmírné mise'],
    ['quantum','Kvantový svět'],
    ['particles','Částice a částicová fyzika'],
    ['biology','Biologie'],
    ['brain','Mozek a mysl'],
    ['informatics','Informatika a AI'],
    ['math','Matematika'],
    ['energy','Energie a energetika'],
    ['climate','Klima a životní prostředí'],
    ['scifi','Věda ve sci-fi'],
    ['people','Osobnosti vědy'],
    ['nobel','Nobelovy ceny']
  ];
  // Match BOTH the original candidate ID and the human-reviewed display
  // heading. A new/colliding ID or similarly worded promise is not classified.
  const reviewed=[
    [31,'Enrico Fermi jako osobnost',['people']],
    [35,'Kvantové počítače',['quantum']],
    [1044,'Wow! signál',['space','alienlife']],
    [1063,'Tmavá energie',['darkenergy']],
    [19,'Einsteinův zázračný rok',['people']],
    [1062,'Penroseův proces',['blackholes']],
    // The fiction-focused book-club promises concern different works;
    // both remain separate records, not combined by the topic filter.
    [195,'Problém tří těles – první čtenářský klub',['scifi']],
    [195,'Příběhy tvého života – čtenářský klub',['scifi']],
    [195,'Kniha Billa Gatese o klimatické katastrofě',['climate']],
    [271,'Leonhard Euler jako osobnost',['math','people']],
    [396,'Carl Friedrich Gauss jako osobnost',['math','people']],
    [1061,'Hawkingovo záření a teplota černých děr',['blackholes']],
    [1035,'Thoriové a solné reaktory',['energy']],
    [1037,'Nepovedené kosmické mise a vědecké projekty',['missions']],
  ];
  // Second small hand-reviewed batch: the original audit's episode promises
  // and their explanatory text were inspected individually. Ambiguous offers,
  // loose allusions and promises outside actual future episodes are excluded.
  const audited=[
    [1042,'Zlatá deska Voyageru a kódování obrázků',['missions']],
    [42,'Série o hledání mimozemského života',['alienlife']],
    [51,'V hledání života opustit Sluneční soustavu',['alienlife']],
    [1057,'Digitální forma lidstva a budoucnost civilizace v mimozemské sérii',['alienlife']],
    [63,'Rádiové signály při hledání mimozemských civilizací',['alienlife']],
    [1060,'Drakeova rovnice v příští části mimozemské série',['alienlife']],
    [1069,'Malé černé díry jako možná tmavá hmota',['blackholes','darkenergy']],
    [1070,'Kosmologická krize: různá měření rychlosti rozpínání',['space']],
    [87,'Doplnit sérii všech částic standardního modelu',['particles']],
    [92,'Kvarky a gluony',['particles']],
    [1079,'Ukázat význam symetrií v částicové fyzice, zejména u fotonu',['particles']],
    [120,'Supersymetrie',['particles']],
    [1113,'Pozvat odborníka k buněčnému rotoru a tvorbě ATP',['biology']],
    [1121,'Šifrování s veřejným klíčem a role prvočísel',['informatics','math']],
    [1129,'Nobelovy ceny za rok 2021 jako další epizoda',['nobel']],
    [1136,'Díl po experimentálním potvrzení mikroskopických černých děr',['blackholes']],
    [181,'John von Neumann jako osobnost',['people']],
    [1152,'Druhý díl o existenci matematiky po dostudování cizích pohledů',['math']],
    [213,'Další diskuse o Problému tří těles',['scifi']],
    [217,'Fotografování exoplanet pomocí Slunce jako čočky',['space']],
    [234,'Budoucí rozbor povídky spojené s jiným chováním světla',['scifi']],
    [1198,'Vrátit se k tmavé hmotě po nových výsledcích Webbova teleskopu',['darkenergy']],
    [1228,'Samostatná epizoda o normálním rozdělení v roce 2023',['math']],
    [1242,'Samostatný díl o elektricky nabitých černých dírách',['blackholes']],
    [1272,'Samostatná epizoda o warpovém pohonu',['scifi']],
    [304,'Iontové pohony a alternativní kosmické pohony',['missions']],
    [1283,'Další přehled novinek z Webbova teleskopu',['space']],
    [313,'Primordiální černé díry, ideálně do dvou měsíců',['blackholes']],
    [335,'Silná jaderná interakce v sérii o částicích',['particles']],
    [1296,'Samostatně vysvětlit kalibrační teorii',['particles']],
    [336,'Sjednocování fyzikálních sil / elektroslabá síla',['particles']],
    [340,'Druhý temný věk vesmíru',['space']],
    [342,'Bikamerální mysl a původ lidského vědomí',['brain']],
    [1340,'Samostatně probrat Nobelovy ceny2023',['nobel']],
    [382,'Jedna z osobností poslední Fermatovy věty',['people','math']],
    [391,'Nikola Tesla – připravovaný portrét',['people']],
    [1353,'Velká kniha o klimatu – průběžná podcastová série',['climate']]
  ];
  const byKey=new Map([...reviewed,...audited].map(([candidate,title,ids])=>[JSON.stringify([candidate,title]),ids]));
  function topicsFor(record){
    // This first pass categorizes only genuine promises; proposals/ideas wait.
    if(!record||record.section!=='episodes'||record.kategorie!=='Sliby')return [];
    const label=record.displayTema||record.compactTitle||record.tema||'';
    return byKey.get(JSON.stringify([Number(record.candidate),label]))||[];
  }
  root.VedatorSlibyEpisodeTopics=Object.freeze({
    topics:Object.freeze(topics.map(([id,label])=>Object.freeze({id,label}))),
    reviewed:Object.freeze(reviewed.map(([candidate,title,ids])=>Object.freeze({candidate,title,ids:Object.freeze([...ids])}))),
    audited:Object.freeze(audited.map(([candidate,title,ids])=>Object.freeze({candidate,title,ids:Object.freeze([...ids])}))),
    topicsFor
  });
})(typeof window==='undefined'?globalThis:window);

'use strict';
// First reviewed batch of episode-promise topics (2026-11-14).
// These are manually checked, UNIQUE consolidated promise headings from
// sliby/duplicate-review.json, NOT automatic keyword guesses.
// Leave all other episode promises "Nezařazené" until individually reviewed.
(function exposeReviewedEpisodePromiseTopics(root){
  // Eight broad sections, deliberately fewer than the podcast's series/topics.
  // Source assignments can retain precise terms, while the UI stays manageable.
  const topics=[
    ['space','Vesmír'],
    ['physics','Fyzika a energie'],
    ['math','Matematika'],
    ['life','Biologie a člověk'],
    ['tech','Technologie a AI'],
    ['earth','Klima a Země'],
    ['people','Vědci a ocenění'],
    ['culture','Kultura a sci-fi']
  ];
  const parent={
    space:'space',blackholes:'space',alienlife:'space',darkenergy:'space',missions:'space',
    quantum:'physics',particles:'physics',energy:'physics',physics:'physics',
    math:'math',
    biology:'life',brain:'life',life:'life',
    informatics:'tech',tech:'tech',
    climate:'earth',earth:'earth',
    people:'people',nobel:'people',
    scifi:'culture',culture:'culture'
  };
  const groupIds=ids=>[...new Set(ids.map(id=>parent[id]).filter(Boolean))];
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
  // Third review, 14 Nov 2026: verified from the original audit's actual
  // promise title and explanation, not from the episode where it was spoken.
  // Do NOT infer assignments for short follow-up answers, private Labák
  // bonuses, announcements of lectures/articles or conditional links.
  const nextBatch=[
    [1051,"Radiometrické datování pomocí uhlíku 14",["physics"]],
    [1054,"Odkud plyne zákon zachování energie",["physics"]],
    [1078,"Výjimky z dolní hranice teploty: záporná absolutní teplota",["physics"]],
    [1082,"Příští zvukový kvíz: deset evropských ptáků",["life"]],
    [1103,"Námořní hodiny: závod o určování polohy na moři",["tech"]],
    [1105,"Pravidlo četnosti v jazyce – pravděpodobně Zipfův zákon",["math"]],
    [137,"Vakuum a co je ve skutečnosti prázdný prostor",["physics"]],
    [1107,"Revidovat díl o červích dírách, pokud se potvrdí ER = EPR",["space","physics"]],
    [1123,"Celá série o Einsteinovi a jeho fyzice",["physics"]],
    [162,"Einsteinova obecná relativita / teorie gravitace",["physics"]],
    [1149,"Odložená epizoda o laserech po posluchačském návrhu",["physics"]],
    [210,"Fyzika stínů a jejich vznik",["physics"]],
    [1174,"Živý podcast Jak cestovat časem v Byte&Byte – konkrétní téma a lístky",["physics"]],
    [241,"Hawkingovy vědecké sázky",["people"]],
    [1271,"Historky z vědeckého podsvětí 2 v Bite & Byte",["people"]],
    [349,"Absolutní nula a jak se k ní přiblížit",["physics"]],
    [418,"Pět knižních doporučení jako další samostatná epizoda",["culture"]],
    [1369,"Tmavá hmota 3 po jejím skutečném objevu",["space"]],
    [1374,"Život na neobvyklých místech ve vesmíru",["space"]],
    [429,"Je matematika vymyšlená? – připomenutý dluh",["math"]],
    [437,"Aharonovův–Bohmův jev, až za něj bude Nobelova cena",["physics"]],
    [1391,"Vrátit se příští říjen k Nobelovým tipům",["people"]],
    [1399,"Samostatná úvodní epizoda o prvočíslech",["math"]],
    [449,"Goldbachova hypotéza znovu, až bude vyřešena",["math"]],
    [1446,"Steven Chu o laserovém chlazení a budoucnosti energetiky",["physics","people"]],
    [1447,"Profilový rozhovor s Frankem o astronomii, SETI a teleskopu",["space","people"]],
    [1448,"Kip Thorne o časové symetrii slučování černých děr",["space","people"]],
    [1449,"Carole Mundell o gama záblescích a evropských vesmírných misích",["space","people"]],
    [1453,"Rozhovory s Joelem Parkerem z mise Lucy",["space"]],
    [607,"Věda o kovářství",["tech"]],
    [612,"Knižní tipy na Vánoce",["culture"]],
    [1599,"Série o miléniových problémech",["math"]],
    [740,"LISA a její výsledky kolem roku 2037",["space"]],
    [771,"Magnetary – připomenutý nevyřízený díl",["space"]],
    [1872,"Samostatná epizoda o zachytávání CO₂ – carbon capture",["earth"]],
    [836,"Juraj Tekel znovu přijde povídat o heliu",["physics"]],
    [1034,"Vánoční D&D speciál – Smrtonosná pasca: Exlaris",["culture"]],
    [1717,"Jak se váží molekuly a izotopy",["physics"]],
    [904,"Jaderná fúze uvnitř hvězd",["space","physics"]],
    [919,"Lev Landau",["people"]],
    [1727,"Po předpremiéře natočit rozbor Poslední šance se spoilery",["culture"]],
    [928,"Fraktální dimenze na živém natáčení",["math"]],
    [1740,"Zveřejnit už natočenou epizodu o dopaminu",["life"]],
    [1748,"Kofein: původ v rostlinách a domluva kavárenské epizody",["life"]],
    [1774,"Samostatná epizoda o Penroseově cyklickém vesmíru",["space"]],
    [1775,"Velký třesk jako spleť červích děr",["space"]],
    [1795,"Druhý díl reprodukční dvojice: Vajíčka",["life"]],
    [1797,"Živé natáčení 29. září v Bohema baru – později Carl Sagan",["people"]],
    [1818,"Vydat rozhovor o fotografování zatmění s českým specialistou",["space"]],
    [1820,"Živý portrét Roberta Hooka v keramickém studiu",["people"]],
    [1880,"Připravit přehled Nobelových cen 2026",["people"]],
    [1010,"Rozhovory o vesmíru o kometě a dalších nebeských poutnících",["space"]],
    [1932,"Rozšířit portréty žen ve vědě přibližně na dvacet dílů",["people"]]
  ];
  const byKey=new Map([...reviewed,...audited,...nextBatch].map(([candidate,title,ids])=>[JSON.stringify([candidate,title]),ids]));
  function topicsFor(record){
    // This first pass categorizes only genuine promises; proposals/ideas wait.
    if(!record||record.section!=='episodes'||record.kategorie!=='Sliby')return [];
    const label=record.displayTema||record.compactTitle||record.tema||'';
    return groupIds(byKey.get(JSON.stringify([Number(record.candidate),label]))||[]);
  }
  root.VedatorSlibyEpisodeTopics=Object.freeze({
    topics:Object.freeze(topics.map(([id,label])=>Object.freeze({id,label}))),
    reviewed:Object.freeze(reviewed.map(([candidate,title,ids])=>Object.freeze({candidate,title,ids:Object.freeze([...ids])}))),
    audited:Object.freeze(audited.map(([candidate,title,ids])=>Object.freeze({candidate,title,ids:Object.freeze([...ids])}))),
    nextBatch:Object.freeze(nextBatch.map(([candidate,title,ids])=>Object.freeze({candidate,title,ids:Object.freeze([...ids])}))),
    groupIds,groupFor:id=>parent[id]||null,
    topicsFor
  });
})(typeof window==='undefined'?globalThis:window);

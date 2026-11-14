'use strict';
// First reviewed batch of episode-promise topics (2026-11-14).
// These are manually checked, UNIQUE consolidated promise headings from
// sliby/duplicate-review.json, NOT automatic keyword guesses.
// Leave all other episode promises "Nezařazené" until individually reviewed.
(function exposeReviewedEpisodePromiseTopics(root){
  const topics=[
    ['space','Vesmír a kosmologie'],
    ['blackholes','Černé díry'],
    ['darkenergy','Temná hmota a energie'],
    ['missions','Kosmonautika a vesmírné mise'],
    ['quantum','Kvantový svět'],
    ['math','Matematika'],
    ['energy','Energie a energetika'],
    ['climate','Klima a životní prostředí'],
    ['scifi','Věda ve sci-fi'],
    ['people','Osobnosti vědy']
  ];
  // Match BOTH the original candidate ID and the human-reviewed display
  // heading. A new/colliding ID or similarly worded promise is not classified.
  const reviewed=[
    [31,'Enrico Fermi jako osobnost',['people']],
    [35,'Kvantové počítače',['quantum']],
    [1044,'Wow! signál',['space']],
    [1063,'Tmavá energie',['darkenergy']],
    [19,'Einsteinův zázračný rok',['people']],
    [37,'Žijeme v počítačové simulaci?',['scifi']],
    [1052,'Hubbleův teleskop',['space','missions']],
    [1062,'Penroseův proces',['blackholes']],
    [73,'Roger Penrose jako osobnost',['people']],
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
    [1187,'Další novinky z Webbova teleskopu (původní avízo)',['space']]
  ];
  const byKey=new Map(reviewed.map(([candidate,title,ids])=>[JSON.stringify([candidate,title]),ids]));
  function topicsFor(record){
    if(!record||record.section!=='episodes')return [];
    const label=record.displayTema||record.compactTitle||record.tema||'';
    return byKey.get(JSON.stringify([Number(record.candidate),label]))||[];
  }
  root.VedatorSlibyEpisodeTopics=Object.freeze({
    topics:Object.freeze(topics.map(([id,label])=>Object.freeze({id,label}))),
    reviewed:Object.freeze(reviewed.map(([candidate,title,ids])=>Object.freeze({candidate,title,ids:Object.freeze([...ids])}))),
    topicsFor
  });
})(typeof window==='undefined'?globalThis:window);

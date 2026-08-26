import fs from 'node:fs';

const FILE='content-v2.json';
const SERIES_FILE='series.json';
const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const episodes=Array.isArray(data.episodes)?data.episodes:[];
const seriesConfig=JSON.parse(fs.readFileSync(SERIES_FILE,'utf8'));

const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const FAQ_EPISODES=new Set([346,340,337,332,326,319,313,300,295,289,284,278,272,270,263,257,248,244,226,218,211,203,190,179,170,158,143,138,133,128,119,112,100,89,82,75,69,60,51,35,26,17]);
const SPECIAL_SERIES_ID_RULES=[
  [/^rozhovory o vesmire (\d+)\b/,1700],
  [/^geneticky special (\d+)\b/,1800],
  [/^zijem vedu special (\d+)\b/,1900]
];
const SPECIAL_ALIAS_BASES={vesmir:1700,genetika:1800,veda:1900};

const fail=message=>{throw new Error(`${SERIES_FILE}: ${message}`)};
const episodeDate=episode=>new Date(episode?.date||0).getTime()||0;

// Starší RSS položky speciálních sérií nemají číslo Vedátorského podcastu.
// Stabilní interní ID vzniká při buildu, takže aplikace za běhu nic nedohledává.
const usedEpisodeNumbers=new Set(episodes.map(episode=>Number(episode.number)).filter(number=>number>0));
for(const episode of episodes){
  if(Number(episode.number)>0)continue;
  const value=norm(episode.title);
  for(const [pattern,base] of SPECIAL_SERIES_ID_RULES){
    const match=value.match(pattern);
    if(!match)continue;
    const displayNumber=Number(match[1]);
    if(!Number.isInteger(displayNumber)||displayNumber<1||displayNumber>99)throw new Error(`Invalid special episode ordinal in ${episode.title}`);
    const number=base+displayNumber;
    if(number>=2048||usedEpisodeNumbers.has(number))throw new Error(`Special episode id collision: ${number} (${episode.title})`);
    episode.number=number;
    episode.displayNumber=displayNumber;
    usedEpisodeNumbers.add(number);
    break;
  }
}

const byNumber=new Map();
const byNumberAll=new Map();
for(const episode of episodes){
  const number=Number(episode.number);
  if(!byNumber.has(number))byNumber.set(number,episode);
  if(!byNumberAll.has(number))byNumberAll.set(number,[]);
  byNumberAll.get(number).push(episode);
}

function resolveEpisodeRef(raw,seriesName){
  if(typeof raw==='number'){
    if(!Number.isInteger(raw)||raw<=0)fail(`Série „${seriesName}“ obsahuje neplatné číslo dílu: ${raw}`);
    if(!byNumber.has(raw))fail(`Série „${seriesName}“ odkazuje na neexistující díl ${raw}`);
    return raw;
  }
  if(typeof raw!=='string')fail(`Série „${seriesName}“ obsahuje neplatný odkaz na díl`);
  const match=raw.trim().toLowerCase().match(/^(vesmir|genetika|veda):(\d+)$/);
  if(!match)fail(`Série „${seriesName}“ obsahuje neznámý odkaz „${raw}“. Použij číslo podcastu nebo vesmir:N, genetika:N, veda:N.`);
  const ordinal=Number(match[2]);
  if(!Number.isInteger(ordinal)||ordinal<1||ordinal>99)fail(`Série „${seriesName}“ obsahuje neplatný speciální díl „${raw}“`);
  const number=SPECIAL_ALIAS_BASES[match[1]]+ordinal;
  const episode=byNumber.get(number);
  if(!episode)fail(`Série „${seriesName}“ odkazuje na neexistující speciální díl „${raw}“`);
  if(Number(episode.displayNumber)!==ordinal)fail(`Speciální díl „${raw}“ má nekonzistentní zobrazované číslo`);
  return number;
}

if(!Array.isArray(seriesConfig))fail('kořen souboru musí být JSON pole sérií');
const result=[];
const seenCs=new Set();
const seenSk=new Set();

for(const [index,item] of seriesConfig.entries()){
  if(!item||typeof item!=='object'||Array.isArray(item))fail(`položka ${index+1} musí být objekt`);
  const unknown=Object.keys(item).filter(key=>!['cs','sk','episodes','people','kind','legacyNames'].includes(key));
  if(unknown.length)fail(`Série ${index+1} obsahuje neznámé pole: ${unknown.join(', ')}`);
  const cs=String(item.cs||'').trim();
  const sk=String(item.sk||'').trim();
  if(!cs||!sk)fail(`Série ${index+1} musí mít neprázdné „cs“ i „sk“`);
  if(seenCs.has(norm(cs)))fail(`Český název série „${cs}“ je v seznamu vícekrát`);
  if(seenSk.has(norm(sk)))fail(`Slovenský název série „${sk}“ je v seznamu vícekrát`);
  seenCs.add(norm(cs));seenSk.add(norm(sk));
  if(!Array.isArray(item.episodes)||item.episodes.length<1)fail(`Série „${cs}“ musí obsahovat alespoň jeden díl; pro smazání série smaž celý blok`);
  if(item.people!==undefined&&typeof item.people!=='boolean')fail(`Série „${cs}“ má neplatné „people“; použij true/false`);
  const kind=item.kind===undefined?'series':String(item.kind).trim();
  if(kind!=='series'&&kind!=='topic')fail(`Položka „${cs}“ má neplatné „kind“; použij series/topic`);
  const legacyNames=item.legacyNames===undefined?[]:item.legacyNames;
  if(!Array.isArray(legacyNames)||legacyNames.some(name=>typeof name!=='string'||!name.trim()))fail(`Položka „${cs}“ má neplatné „legacyNames“`);
  if(new Set(legacyNames.map(norm)).size!==legacyNames.length)fail(`Položka „${cs}“ má duplicitní „legacyNames“`);

  const refs=item.episodes.map(raw=>resolveEpisodeRef(raw,cs));
  if(new Set(refs).size!==refs.length)fail(`Série „${cs}“ obsahuje stejný odkaz na díl vícekrát`);
  // Jeden podcastový number může ve starém RSS výjimečně existovat vícekrát.
  // Jeden zápis v series.json proto zachová všechny odpovídající zdrojové položky,
  // stejně jako dosavadní filtrování, aby migrace neměnila existující UI.
  const sorted=refs.flatMap(number=>byNumberAll.get(number)||[]).sort((a,b)=>episodeDate(a)-episodeDate(b));
  result.push({
    name:cs,
    i18n:{cs,sk},
    kind,
    episodes:sorted.map(episode=>Number(episode.number)),
    ...(legacyNames.length?{legacyNames:legacyNames.map(name=>name.trim())}:{}),
    ...(item.people?{people:true}:{})
  });
}

// FAQ je systémová série: její členství musí zůstat shodné s kanonickým FAQ seznamem,
// jinak by série a záložka Otázky ukazovaly odlišný obsah.
const faq=result.find(series=>series.name==='FAQ – dobré otázky');
if(!faq)fail('systémová série „FAQ – dobré otázky“ nesmí být smazána');
const faqActual=new Set(faq.episodes.map(Number));
if(faqActual.size!==FAQ_EPISODES.size||[...FAQ_EPISODES].some(number=>!faqActual.has(number))){
  fail('systémová série „FAQ – dobré otázky“ musí přesně odpovídat kanonickému seznamu FAQ dílů');
}

result.sort((a,b)=>(a.kind==='series'?0:1)-(b.kind==='series'?0:1)||b.episodes.length-a.episodes.length||String(a.name).localeCompare(String(b.name),'cs'));
data.series=result;
data.meta={...(data.meta||{}),legacyParity:{
  fixedSeries:result.filter(series=>series.kind==='series'&&!series.people).length,
  scientistSeries:result.filter(series=>series.kind==='series'&&series.people).length,
  automaticSeries:0,
  totalSeries:result.filter(series=>series.kind==='series').length,
  totalTopics:result.filter(series=>series.kind==='topic').length,
  totalCollections:result.length,
  faqEpisodes:FAQ_EPISODES.size,
  source:SERIES_FILE
}};
fs.writeFileSync(FILE,JSON.stringify(data));
console.log(JSON.stringify(data.meta.legacyParity,null,2));

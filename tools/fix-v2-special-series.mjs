import fs from 'node:fs';

function patchFile(path,replacements){
  let source=fs.readFileSync(path,'utf8');
  let changed=false;
  for(const {label,from,to,all=false} of replacements){
    if(source.includes(to))continue;
    const count=source.split(from).length-1;
    if(all){
      if(count<1)throw new Error(`${path}: nenalezen očekávaný úsek pro ${label}`);
      source=source.split(from).join(to);
    }else{
      if(count!==1)throw new Error(`${path}: ${label} očekáván právě jednou, nalezen ${count}x`);
      source=source.replace(from,to);
    }
    changed=true;
  }
  if(changed)fs.writeFileSync(path,source);
  console.log(`${path}: ${changed?'upraveno':'už opraveno'}`);
}

patchFile('tools/build-content-v2.mjs',[
  {
    label:'stabilní interní čísla speciálních epizod',
    from:"const episodeTranslationData=collectEpisodeTranslations();\nconst episodes=sourceEpisodes.map(e=>{\n  const number=Number(e.number)||0;\n  const base={\n    number,\n    title:String(e.title||''),",
    to:"const episodeTranslationData=collectEpisodeTranslations();\nconst positiveSourceNumbers=new Set(sourceEpisodes.map(e=>Number(e.number)||0).filter(number=>number>0));\nconst usedSpecialNumbers=new Set();\nfunction specialEpisodeIdentity(title){\n  const value=String(title||'');\n  const rules=[\n    [/^Rozhovory o vesmíre\\s+(\\d+)\\b/i,1700],\n    [/^Genetický špeciál\\s+(\\d+)\\b/i,1800],\n    [/^Žijem vedu špeciál\\s+(\\d+)\\b/i,1900]\n  ];\n  for(const [pattern,base] of rules){\n    const match=value.match(pattern);if(!match)continue;\n    const displayNumber=Number(match[1]);\n    if(!Number.isInteger(displayNumber)||displayNumber<1||displayNumber>99)throw new Error(`Invalid special episode ordinal in ${value}`);\n    const number=base+displayNumber;\n    if(number>=2048||positiveSourceNumbers.has(number)||usedSpecialNumbers.has(number))throw new Error(`Special episode id collision: ${number} (${value})`);\n    usedSpecialNumbers.add(number);\n    return {number,displayNumber};\n  }\n  return null;\n}\nconst episodes=sourceEpisodes.map(e=>{\n  const special=Number(e.number)>0?null:specialEpisodeIdentity(e.title);\n  const number=Number(e.number)||special?.number||0;\n  const base={\n    number,\n    ...(special?{displayNumber:special.displayNumber}:{}),\n    title:String(e.title||''),"
  }
]);

patchFile('tools/augment-v2-full-descriptions.mjs',[
  {
    label:'mapování RSS epizod podle stabilního id',
    from:"const rawByNumber=new Map(sourceEpisodes.map(episode=>[Number(episode.number)||0,episode]));\nconst data=JSON.parse(read('content-v2.json'));",
    to:"const rawById=new Map(sourceEpisodes.map(episode=>[String(episode.id||''),episode]).filter(([id])=>id));\nconst rawByNumber=new Map(sourceEpisodes.filter(episode=>Number(episode.number)>0).map(episode=>[Number(episode.number),episode]));\nconst data=JSON.parse(read('content-v2.json'));"
  },
  {
    label:'výběr RSS epizody podle id',
    from:"  const raw=rawByNumber.get(Number(episode.number)||0);if(!raw)continue;",
    to:"  const raw=rawById.get(String(episode.id||''))||rawByNumber.get(Number(episode.number)||0);if(!raw)continue;"
  }
]);

patchFile('app-v2.js',[
  {
    label:'zobrazované číslo speciální epizody',
    from:"  function questionCopy(question){",
    to:"  function episodeDisplayNumber(episode){return Number(episode?.displayNumber)||Number(episode?.number)||'–'}\n  function questionCopy(question){"
  },
  {
    label:'číslo epizody na kartách',
    from:"(episode.number||'–')",
    to:"episodeDisplayNumber(episode)",
    all:true
  },
  {
    label:'číslo epizody v playlistu',
    from:"subtitle:`${text('Díl','Diel')} ${episode.number}`",
    to:"subtitle:`${text('Díl','Diel')} ${episodeDisplayNumber(episode)}`"
  },
  {
    label:'řazení podle zobrazovaného čísla',
    from:"      if(sort==='number')return(Number(b.episode.number)||0)-(Number(a.episode.number)||0);",
    to:"      if(sort==='number')return(Number(episodeDisplayNumber(b.episode))||0)-(Number(episodeDisplayNumber(a.episode))||0);"
  },
  {
    label:'číslo epizody uvnitř série',
    from:"text('Díl','Diel')+' '+number+': '+esc(copy.title)",
    to:"text('Díl','Diel')+' '+episodeDisplayNumber(episode)+': '+esc(copy.title)"
  }
]);

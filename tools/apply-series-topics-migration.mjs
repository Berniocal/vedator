import fs from 'node:fs';

const replaceOnce=(source,from,to,label)=>{
  if(!source.includes(from))throw new Error(`Nenalezen marker: ${label}`);
  return source.replace(from,to);
};

let app=fs.readFileSync('app-v2.js','utf8');
app=replaceOnce(app,
  "  function seriesLabel(series){return series?.i18n?.[contentLang()]||series?.name||text('Série','Séria')}\n",
  "  function seriesLabel(series){return series?.i18n?.[contentLang()]||series?.name||text('Série','Séria')}\n  function seriesKind(series){return series?.kind==='topic'?'topic':'series'}\n  function seriesCollectionKeys(series){\n    const names=[series?.name,...(Array.isArray(series?.legacyNames)?series.legacyNames:[])].filter(Boolean);\n    return [...new Set(names.map(name=>'series:'+norm(name)))];\n  }\n  function seriesCollectionId(series){\n    const keys=seriesCollectionKeys(series),existing=keys.find(key=>state.collectionProgress[key]&&typeof state.collectionProgress[key]==='object');\n    return existing||keys[0]||'series:';\n  }\n",
  'series helpers');
app=replaceOnce(app,
  "    const collection=state.collectionProgress['series:'+norm(series?.name||'')];",
  "    const collection=state.collectionProgress[seriesCollectionId(series)];",
  'series progress storage');
app=replaceOnce(app,
  "    return {type:'series',id:`series:${norm(series.name)}`,label:seriesLabel(series),items,index};",
  "    return {type:'series',id:seriesCollectionId(series),label:seriesLabel(series),items,index};",
  'series context storage id');

const resumeStart=app.indexOf('  function seriesResumeLabel(info){');
const resumeEnd=app.indexOf('\n  function seriesProgressLabel',resumeStart);
if(resumeStart<0||resumeEnd<0)throw new Error('Nenalezen seriesResumeLabel');
app=app.slice(0,resumeStart)+`  function seriesResumeLabel(info,series){
    const topic=seriesKind(series)==='topic';
    if(info.finished)return topic?text('Přehrát téma znovu','Prehrať tému znova'):text('Přehrát znovu','Prehrať znova');
    if(info.started)return topic?text('Pokračovat v tématu','Pokračovať v téme'):text('Pokračovat v sérii','Pokračovať v sérii');
    return topic?text('Začít téma','Začať tému'):text('Začít sérii','Začať sériu');
  }`+app.slice(resumeEnd);
app=app.replaceAll('seriesResumeLabel(info)','seriesResumeLabel(info,series)');

app=replaceOnce(app,
  "series:text('Série','Série')",
  "series:text('Série a témata','Série a témy')",
  'series tab label');
app=replaceOnce(app,
  "slug(series.name)===target||oldSeriesKey(series)===target",
  "slug(series.name)===target||(series.legacyNames||[]).some(name=>slug(name)===target)||oldSeriesKey(series)===target",
  'legacy deep links');
app=replaceOnce(app,
  "  function finalSeriesCollection(series){return finalCollectionRecord(['series:'+norm(series.name),'series:'+finalCollectionNorm(series.name),'series:'+finalCollectionNorm(seriesLabel(series))])}",
  "  function finalSeriesCollection(series){const names=[series?.name,...(Array.isArray(series?.legacyNames)?series.legacyNames:[]),seriesLabel(series)].filter(Boolean),ids=[...seriesCollectionKeys(series),...names.map(name=>'series:'+finalCollectionNorm(name))];return finalCollectionRecord([...new Set(ids)])}",
  'legacy collection progress aliases');
app=replaceOnce(app,
  "      const series=(state.data?.series||[]).find(item=>'series:'+norm(item.name)===snapshot.id)||null;",
  "      const series=(state.data?.series||[]).find(item=>seriesCollectionKeys(item).includes(snapshot.id)||'series:'+finalCollectionNorm(item.name)===snapshot.id||(item.legacyNames||[]).some(name=>'series:'+finalCollectionNorm(name)===snapshot.id))||null;",
  'last playback legacy series id');

const renderStart=app.indexOf('  function renderSeries(){',app.indexOf('  function sortedParitySeries(){'));
const renderEnd=app.indexOf('\n\n  function parityQuestionTopics',renderStart);
if(renderStart<0||renderEnd<0)throw new Error('Nenalezen aktivní renderSeries');
const renderReplacement=`  function ensureSeriesTopicStyles(){
    if(document.querySelector('style[data-v2-series-topics]'))return;
    const style=document.createElement('style');style.dataset.v2SeriesTopics='1';
    style.textContent='#series-v2 .series-group-v2{grid-column:1/-1;min-width:0;margin:0 0 20px}#series-v2 .series-group-title-v2{margin:16px 2px 10px;font-size:.9rem;line-height:1.2;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}#series-v2 .series-group-v2:first-child .series-group-title-v2{margin-top:2px}#series-v2 .series-group-grid-v2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%}#series-v2 .series-group-grid-v2 .series[open]{grid-column:1/-1}@media(max-width:700px){#series-v2 .series-group-grid-v2{grid-template-columns:minmax(0,1fr)}#series-v2 .series-group-grid-v2 .series,#series-v2 .series-group-grid-v2 .series[open]{grid-column:auto}}';
    document.head.appendChild(style);
  }
  function renderSeries(){
    const groups=sortedParitySeries(),box=$('#series-v2');box.replaceChildren();ensureSeriesTopicStyles();
    const sections=[['series',text('Série','Série')],['topic',text('Témata','Témy')]];
    for(const [kind,label] of sections){
      const items=groups.filter(({series})=>seriesKind(series)===kind);if(!items.length)continue;
      const section=document.createElement('section');section.className='series-group-v2';section.dataset.seriesKind=kind;
      const heading=document.createElement('h2');heading.className='series-group-title-v2';heading.textContent=label;section.appendChild(heading);
      const grid=document.createElement('div');grid.className='series-group-grid-v2';section.appendChild(grid);
      for(const {series,index} of items){
        const info=seriesProgressInfo(series),details=document.createElement('details');details.className='series searchable';details.dataset.seriesIndex=String(index);details.dataset.seriesKind=kind;details.dataset.search=norm(seriesLabel(series));
        const progressHint=info.finished?(kind==='topic'?text('Téma je dokončené.','Téma je dokončená.'):text('Série je dokončená.','Séria je dokončená.')):text('Průběh se ukládá automaticky.','Priebeh sa ukladá automaticky.');
        details.innerHTML='<summary><strong>'+esc(seriesLabel(series))+'</strong><span class="series-progress-summary-v2"><span>'+series.episodes.length+' '+text('dílů','dielov')+'</span><span class="series-progress-label-v2">'+esc(seriesProgressLabel(info))+'</span></span>'+shareButton('series',slug(series.name))+'</summary><div class="series-progress-box-v2"><div class="series-progress-main-v2"><progress class="series-progress-bar-v2" max="100" value="'+info.percent+'"></progress><small>'+esc(progressHint)+'</small></div><button type="button" class="series-resume-v2" data-series-index="'+index+'" data-item-index="'+info.resumeIndex+'">'+esc(seriesResumeLabel(info,series))+'</button></div>';
        grid.appendChild(details);
      }
      box.appendChild(section);
    }
    const seriesCount=groups.filter(({series})=>seriesKind(series)==='series').length,topicCount=groups.length-seriesCount;
    $('#count-v2').textContent=seriesCount+' '+text('sérií','sérií')+' · '+topicCount+' '+text('témat','tém');
  }`;
app=app.slice(0,renderStart)+renderReplacement+app.slice(renderEnd);
fs.writeFileSync('app-v2.js',app);

let augment=fs.readFileSync('tools/augment-v2-parity-content.mjs','utf8');
augment=replaceOnce(augment,
  "  const unknown=Object.keys(item).filter(key=>!['cs','sk','episodes','people'].includes(key));",
  "  const unknown=Object.keys(item).filter(key=>!['cs','sk','episodes','people','kind','legacyNames'].includes(key));",
  'series config fields');
augment=replaceOnce(augment,
  "  if(item.people!==undefined&&typeof item.people!=='boolean')fail(`Série „${cs}“ má neplatné „people“; použij true/false`);\n\n  const refs=item.episodes.map(raw=>resolveEpisodeRef(raw,cs));",
  "  if(item.people!==undefined&&typeof item.people!=='boolean')fail(`Série „${cs}“ má neplatné „people“; použij true/false`);\n  const kind=item.kind===undefined?'series':String(item.kind).trim();\n  if(kind!=='series'&&kind!=='topic')fail(`Položka „${cs}“ má neplatné „kind“; použij series/topic`);\n  const legacyNames=item.legacyNames===undefined?[]:item.legacyNames;\n  if(!Array.isArray(legacyNames)||legacyNames.some(name=>typeof name!=='string'||!name.trim()))fail(`Položka „${cs}“ má neplatné „legacyNames“`);\n  if(new Set(legacyNames.map(norm)).size!==legacyNames.length)fail(`Položka „${cs}“ má duplicitní „legacyNames“`);\n\n  const refs=item.episodes.map(raw=>resolveEpisodeRef(raw,cs));",
  'kind validation');
augment=replaceOnce(augment,
  "  result.push({\n    name:cs,\n    i18n:{cs,sk},\n    episodes:sorted.map(episode=>Number(episode.number)),\n    ...(item.people?{people:true}:{})\n  });",
  "  result.push({\n    name:cs,\n    i18n:{cs,sk},\n    kind,\n    episodes:sorted.map(episode=>Number(episode.number)),\n    ...(legacyNames.length?{legacyNames:legacyNames.map(name=>name.trim())}:{}),\n    ...(item.people?{people:true}:{})\n  });",
  'built collection shape');
augment=replaceOnce(augment,
  "result.sort((a,b)=>b.episodes.length-a.episodes.length||String(a.name).localeCompare(String(b.name),'cs'));",
  "result.sort((a,b)=>(a.kind==='series'?0:1)-(b.kind==='series'?0:1)||b.episodes.length-a.episodes.length||String(a.name).localeCompare(String(b.name),'cs'));",
  'collection sorting');
const metaStart=augment.indexOf('data.meta={...(data.meta||{}),legacyParity:{');
const metaEnd=augment.indexOf('\n}};',metaStart);
if(metaStart<0||metaEnd<0)throw new Error('Nenalezen legacyParity metadata block');
const metaReplacement=`data.meta={...(data.meta||{}),legacyParity:{
  fixedSeries:result.filter(series=>series.kind==='series'&&!series.people).length,
  scientistSeries:result.filter(series=>series.kind==='series'&&series.people).length,
  automaticSeries:0,
  totalSeries:result.filter(series=>series.kind==='series').length,
  totalTopics:result.filter(series=>series.kind==='topic').length,
  totalCollections:result.length,
  faqEpisodes:FAQ_EPISODES.size,
  source:SERIES_FILE
}};`;
augment=augment.slice(0,metaStart)+metaReplacement+augment.slice(metaEnd+4);
fs.writeFileSync('tools/augment-v2-parity-content.mjs',augment);

let workflow=fs.readFileSync('.github/workflows/update-podcast-feed.yml','utf8');
workflow=replaceOnce(workflow,
  "      - 'tools/test-v2-faq-integrity.mjs'\n",
  "      - 'tools/test-v2-faq-integrity.mjs'\n      - 'tools/test-v2-series-topics.mjs'\n",
  'update workflow trigger');
workflow=replaceOnce(workflow,
  "          node tools/test-v2-faq-integrity.mjs\n          node tools/build-production-sw.mjs",
  "          node tools/test-v2-faq-integrity.mjs\n          node tools/test-v2-series-topics.mjs\n          node tools/build-production-sw.mjs",
  'update workflow test');
fs.writeFileSync('.github/workflows/update-podcast-feed.yml',workflow);

let guide=fs.readFileSync('V2-MAINTENANCE.md','utf8');
guide=replaceOnce(guide,
  '- série `Vědci` a `Vědkyně` mají navíc `"people": true`, aby se zachovalo speciální formátování jmen.\n',
  '- `"kind": "series"` označuje skutečný cyklus/formát; `"kind": "topic"` tematickou kolekci. Obě se za běhu chovají stejně a jsou stále součástí jediného `content-v2.json`;\n- `"legacyNames": ["Starý název"]` používej při přejmenování kolekce, aby zůstaly funkční staré deep-linky, poslední přehrávání a uložený průběh;\n- série `Vědci` a `Ženy ve vědě` a téma `Osobnosti vědy` mají `"people": true`, aby se zachovalo speciální formátování jmen.\n',
  'maintenance guide series metadata');
fs.writeFileSync('V2-MAINTENANCE.md',guide);

console.log('Migrace série/témata aplikována do zdrojů.');

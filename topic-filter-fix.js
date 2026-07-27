(()=>{
  if(window.__vedatorTopicFilterFix)return;
  window.__vedatorTopicFilterFix=true;

  try{
    const extraMath=[
      'štatistika','štatistický','štatistická','štatistické','štatistickú','štatistických','štatisticky',
      'pravdepodobnosť','pravdepodobnostné','pravdepodobnostný','pravdepodobnostná',
      'exponenciálne rozdelenie','exponenciálny','exponenciálna','exponenciálne',
      'normálne rozdelenie','normálny rozptyl','gaussovo rozdelenie','gaussovské rozdelenie',
      'rozdelenie pravdepodobnosti','priemer','medián','modus','rozptyl','variancia',
      'štandardná odchýlka','smerodajná odchýlka','kombinatorika','permutácia','kombinácia',
      'logaritmus','logaritmický','regresia','korelácia','náhodná veličina'
    ];
    TOPICS.Matematika=[...new Set([...(TOPICS.Matematika||[]),...extraMath])];
  }catch(error){console.warn('Nepodarilo sa rozšíriť matematické kľúčové slová',error)}

  function strictTopicLevel(ep,queries){
    if(!queries.length)return 0;
    const title=norm(ep.title),desc=norm(cleanHtml(ep.description));
    if(queries.some(q=>title.includes(q)))return 0;
    if(queries.some(q=>desc.includes(q)))return 2;
    return 99;
  }

  try{
    categories=function(ep){
      const txt=norm(ep.title+' '+cleanHtml(ep.description));
      return Object.entries(TOPICS)
        .filter(([key,words])=>key!=='Vše'&&words.some(word=>txt.includes(norm(word))))
        .map(([key])=>key);
    };

    filtered=function(){
      const queries=expandedQuery(document.querySelector('#search').value);
      const topics=selectedTopicQueries();
      return episodes
        .map(ep=>{
          const searchMatch=matchLevel(ep,queries);
          const topicMatch=strictTopicLevel(ep,topics);
          return {...ep,cats:categories(ep),searchMatch,topicMatch};
        })
        .filter(ep=>(!queries.length||ep.searchMatch<99)&&(!topics.length||ep.topicMatch<99));
    };
  }catch(error){console.warn('Nepodarilo sa opraviť tematické filtrovanie',error)}
})();
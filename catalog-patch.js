(()=>{
  if(window.__vedatorCatalogPatch)return;
  window.__vedatorCatalogPatch=true;

  const MATHEMATICS_EPISODES=[91,93,98,113,115,116,117,118,156,181,198,201,216,249,282,286,328,329,336];
  const MATHEMATICS_SET=new Set(MATHEMATICS_EPISODES);
  const FAQ_EXTRA_EPISODES=new Set([138,300]);

  const style=document.createElement('style');
  style.textContent=`
    .series-card>summary{justify-content:flex-start!important}
    .series-count{margin-left:auto!important;text-align:right;min-width:4.6rem}
  `;
  document.head.appendChild(style);

  if(typeof FIXED_SERIES==='undefined'||typeof filtered!=='function'||typeof categories!=='function')return;

  const faqSeries=FIXED_SERIES.find(series=>series.name==='FAQ – dobré otázky');
  if(faqSeries){
    const originalFaqTest=faqSeries.test;
    faqSeries.test=episode=>originalFaqTest(episode)||FAQ_EXTRA_EPISODES.has(Number(episode.number));
  }

  if(!FIXED_SERIES.some(series=>series.name==='Matematika')){
    FIXED_SERIES.push({
      name:'Matematika',
      test:episode=>MATHEMATICS_SET.has(Number(episode.number))
    });
  }

  const originalCategories=categories;
  categories=function(episode){
    const result=originalCategories(episode);
    if(MATHEMATICS_SET.has(Number(episode.number))&&!result.includes('Matematika'))result.push('Matematika');
    return result;
  };

  const originalFiltered=filtered;
  filtered=function(){
    if(active!=='Matematika')return originalFiltered();

    const queries=expandedQuery(document.querySelector('#search').value);
    return episodes
      .filter(episode=>MATHEMATICS_SET.has(Number(episode.number)))
      .map(episode=>{
        const searchMatch=matchLevel(episode,queries);
        return {...episode,cats:categories(episode),searchMatch,topicMatch:0};
      })
      .filter(episode=>!queries.length||episode.searchMatch<99);
  };

  if(Array.isArray(episodes)&&episodes.length&&typeof render==='function')render();
})();

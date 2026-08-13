import fs from 'node:fs';

const path='app-v2.js';
let source=fs.readFileSync(path,'utf8');
const marker='/* V2_LAYOUT_SERIES_STATE_FIX_V1 */';
if(source.includes(marker)){
  console.log('Layout/series state patch already present.');
  process.exit(0);
}

const block=String.raw`

  /* V2_LAYOUT_SERIES_STATE_FIX_V1 */
  function seriesCollectionProgressInfoV2(series){
    const episodes=(series?.episodes||[]).map(number=>episodeByNumber(number)).filter(Boolean),total=episodes.length;
    const collection=finalSeriesCollection(series)||{},items=collection.items&&typeof collection.items==='object'?collection.items:{};
    const entries=episodes.map(episode=>{
      let absolute='';try{absolute=new URL(episode.enclosure,location.href).href}catch{}
      const ids=['episode:'+episode.number,absolute?'audio:'+absolute:''].filter(Boolean),id=ids.find(value=>items[value])||ids[0];
      return {episode,id,record:finalSeriesItemRecord(collection,episode)||{}};
    });
    const completed=entries.filter(entry=>entry.record.completed).length;
    const heard=entries.filter(entry=>finalHeard(entry.record)).length;
    const progressSum=entries.reduce((sum,entry)=>sum+(entry.record.completed?100:Math.max(0,Math.min(100,Number(entry.record.percent)||0))),0);
    const percent=total?Math.round(progressSum/total):0;
    let resumeIndex=-1;
    if(collection.lastItemId){
      const last=entries.findIndex(entry=>entry.id===collection.lastItemId);
      if(last>=0){
        if(!entries[last].record.completed)resumeIndex=last;
        else if(last+1<entries.length){const relative=entries.slice(last+1).findIndex(entry=>!entry.record.completed);if(relative>=0)resumeIndex=last+1+relative}
      }
    }
    if(resumeIndex<0)resumeIndex=entries.findIndex(entry=>!entry.record.completed&&finalHeard(entry.record));
    if(resumeIndex<0)resumeIndex=entries.findIndex(entry=>!entry.record.completed);
    if(resumeIndex<0)resumeIndex=0;
    const started=Boolean(collection.lastItemId)||heard>0;
    const finished=total>0&&completed===total;
    return {episodes,records:entries,total,completed,heard,percent,resumeIndex,started,finished};
  }
  seriesProgressInfo=seriesCollectionProgressInfoV2;

  function installCompactCountSortAndCollapsedTop(){
    if(document.querySelector('style[data-v2-layout-series-state-fix]'))return;
    const style=document.createElement('style');style.dataset.v2LayoutSeriesStateFix='1';style.textContent=[
      '.status-row{align-items:center!important;flex-wrap:nowrap!important;gap:10px!important}',
      '.status-row #count-v2{margin-right:0!important;flex:1 1 auto!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      '.status-row .parity-sort-v2{width:auto!important;max-width:min(50vw,220px)!important;flex:0 1 220px!important}',
      'body.player-collapsed-v2 #back-top-v2{bottom:calc(max(14px,env(safe-area-inset-bottom)) + 57px)!important;right:max(14px,env(safe-area-inset-right))!important}',
      '@media(max-width:700px){.status-row{font-size:.88rem!important;margin:10px 2px!important}.status-row .parity-sort-v2{width:auto!important;max-width:50vw!important;flex:0 1 50vw!important;min-height:40px!important;font-size:.9rem!important;padding:7px 30px 7px 10px!important}body.player-collapsed-v2 #back-top-v2{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 55px)!important;right:12px!important}}'
    ].join('');document.head.appendChild(style);
  }
  installCompactCountSortAndCollapsedTop();
`;

const end='\n})();';
const at=source.lastIndexOf(end);
if(at<0)throw new Error('Could not find final app closure');
source=source.slice(0,at)+block+source.slice(at);
fs.writeFileSync(path,source);
console.log('Layout, collapsed back-to-top and series-state patch applied.');

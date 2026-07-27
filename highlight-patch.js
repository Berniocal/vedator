(()=>{
  if(window.__vedatorHighlightPatch)return;
  window.__vedatorHighlightPatch=true;

  const style=document.createElement('style');
  style.textContent=`
    mark.vedator-match{background:#ffe66b;color:inherit;border-radius:.28em;padding:.03em .12em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
    html.theme-dark mark.vedator-match{background:#8a6d00;color:#fff4b3}
  `;
  document.head.appendChild(style);

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function currentTerms(){
    const query=document.querySelector('#search')?.value?.trim()||'';
    if(query){
      return [...new Set([query,...query.split(/\s+/)].map(normalize).filter(term=>term.length>=2))]
        .sort((a,b)=>b.length-a.length);
    }

    try{
      if(typeof active==='string'&&active!=='Vše'&&typeof TOPICS!=='undefined'){
        const topicTerms=Array.isArray(TOPICS[active])?TOPICS[active]:[];
        return [...new Set([active,...topicTerms].map(normalize).filter(term=>term.length>=2))]
          .sort((a,b)=>b.length-a.length);
      }
    }catch(error){}
    return [];
  }

  function normalizedTextWithMap(text){
    let normalized='';
    const map=[];
    for(let i=0;i<text.length;i++){
      const part=normalize(text[i]);
      normalized+=part;
      for(let j=0;j<part.length;j++)map.push(i);
    }
    return {normalized,map};
  }

  function rangesFor(text,terms){
    const {normalized,map}=normalizedTextWithMap(text);
    const ranges=[];
    for(const term of terms){
      let from=0;
      while(from<normalized.length){
        const index=normalized.indexOf(term,from);
        if(index<0)break;
        const start=map[index];
        const end=(map[index+term.length-1]??start)+1;
        if(!ranges.some(range=>start<range.end&&end>range.start))ranges.push({start,end});
        from=index+Math.max(1,term.length);
      }
    }
    return ranges.sort((a,b)=>a.start-b.start);
  }

  function plainDescription(value){
    const box=document.createElement('div');
    box.innerHTML=String(value||'');
    return (box.textContent||'').replace(/\s+/g,' ').trim();
  }

  function episodeForArticle(article){
    const title=article.querySelector('h2')?.textContent?.trim();
    if(!title)return null;
    try{
      if(typeof episodes!=='undefined'&&Array.isArray(episodes)){
        const number=title.match(/\bpodcast\s+(\d+)\b/i)?.[1];
        if(number){
          const byNumber=episodes.find(item=>String(item.number)===number);
          if(byNumber)return byNumber;
        }
        return episodes.find(item=>String(item.title||'').trim()===title)||null;
      }
    }catch(error){}
    return null;
  }

  function excerptAroundMatch(text,terms){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return 'Popis není k dispozici.';
    if(!terms.length)return clean.length>330?clean.slice(0,327).trimEnd()+'…':clean;

    const {normalized,map}=normalizedTextWithMap(clean);
    let matchIndex=-1;
    let matchLength=0;
    for(const term of terms){
      const index=normalized.indexOf(term);
      if(index>=0&&(matchIndex<0||index<matchIndex)){
        matchIndex=index;
        matchLength=term.length;
      }
    }
    if(matchIndex<0)return clean.length>330?clean.slice(0,327).trimEnd()+'…':clean;

    const matchStart=map[matchIndex]??0;
    const matchEnd=(map[matchIndex+matchLength-1]??matchStart)+1;
    let start=Math.max(0,matchStart-115);
    let end=Math.min(clean.length,Math.max(matchEnd+180,start+330));

    while(start>0&&!/\s/.test(clean[start-1]))start--;
    while(end<clean.length&&!/\s/.test(clean[end]))end++;

    return (start>0?'…':'')+clean.slice(start,end).trim()+(end<clean.length?'…':'');
  }

  function unwrapMarks(root){
    root.querySelectorAll('mark.vedator-match').forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent||'')));
    root.normalize();
  }

  function highlightElement(element,terms){
    const text=element.textContent||'';
    const ranges=rangesFor(text,terms);
    if(!ranges.length)return;

    const fragment=document.createDocumentFragment();
    let position=0;
    for(const range of ranges){
      if(range.start>position)fragment.append(document.createTextNode(text.slice(position,range.start)));
      const mark=document.createElement('mark');
      mark.className='vedator-match';
      mark.textContent=text.slice(range.start,range.end);
      fragment.append(mark);
      position=range.end;
    }
    if(position<text.length)fragment.append(document.createTextNode(text.slice(position)));
    element.replaceChildren(fragment);
  }

  const episodesBox=document.querySelector('#episodes');
  if(!episodesBox)return;

  let timer=0;
  const observer=new MutationObserver(()=>schedule());

  function apply(){
    observer.disconnect();
    const terms=currentTerms();

    episodesBox.querySelectorAll('article').forEach(article=>{
      const title=article.querySelector('h2');
      const desc=article.querySelector('.desc');
      if(title)unwrapMarks(title);
      if(desc){
        unwrapMarks(desc);
        const episode=episodeForArticle(article);
        if(episode)desc.textContent=excerptAroundMatch(plainDescription(episode.description),terms);
      }
      if(terms.length){
        if(title)highlightElement(title,terms);
        if(desc)highlightElement(desc,terms);
      }
    });

    observer.observe(episodesBox,{childList:true,subtree:true});
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(apply,0);
  }

  document.querySelector('#search')?.addEventListener('input',schedule);
  document.querySelector('#topics')?.addEventListener('click',schedule);
  document.querySelector('#episodeSort')?.addEventListener('change',schedule);
  observer.observe(episodesBox,{childList:true,subtree:true});
  schedule();
})();
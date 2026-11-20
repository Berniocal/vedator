'use strict';
// A reviewed overlay keeps historical record keys, playback anchors and ratings.
(function exposeLinkPromises(root){
  const key=row=>JSON.stringify([row.candidate,row.tema]);
  function safeURL(value){
    try{return ['https:','http:','mailto:','tel:'].includes(new URL(value).protocol)}catch{return false}
  }
  function apply(data,review){
    if(review?.schema!==1||!Array.isArray(review.entries))throw Error('Neplatný katalog odkazových slibů');
    const entries=new Map(review.entries.map(entry=>[key(entry),entry]));
    for(const catalog of [data,data.archive].filter(Boolean)){
      for(const row of catalog.findings||[]){
        const entry=entries.get(key(row));
        if(!entry)continue;
        row.section='links';
        row.sectionReason='Příslib odkazu nebo doprovodného podkladu do veřejného popisu epizody.';
        row.linkReview=entry;
      }
      catalog.sections={...catalog.sections,options:[
        {id:'episodes',label:'Epizody'},
        {id:'links',label:'Odkazy'},
        {id:'other',label:'Ostatní'}
      ].map(section=>({...section,count:(catalog.findings||[]).filter(row=>row.section===section.id).length})),
      linkReview:{date:review.date,reviewFile:'sliby/link-review.json',rule:review.rule}};
    }
    return data;
  }
  function render(document,row){
    const review=row.linkReview;
    if(!review)return null;
    const make=(tag,text,cls)=>{
      const element=document.createElement(tag);
      if(text!==undefined)element.textContent=text;
      if(cls)element.className=cls;
      return element;
    };
    const section=make('section',undefined,'promise-links');
    section.setAttribute('aria-label','Slíbené odkazy');
    const state={present:'Odkaz nebo kontakt je v popisu epizody.',elsewhere:'Odkaz je doložený v popisu jiného dílu.',missing:'V ověřeném popisu epizody odkaz chybí.'};
    section.append(make('p',state[review.descriptionState],'promise-link-state'));
    const resources=(review.resources||[]).filter(resource=>safeURL(resource.url));
    if(resources.length){
      const list=make('ul',undefined,'promise-link-list');
      for(const resource of resources){
        const item=make('li');
        const link=make('a',resource.label);
        link.href=resource.url;link.target='_blank';link.rel='noopener noreferrer';
        item.append(link);
        const provenance=resource.origin==='description'?'Z popisu dílu '+resource.episode:
          resource.origin==='found'?'Dohledáno pro tuto aplikaci':'Dohledaný související zdroj';
        item.append(make('span',provenance,'promise-link-origin'));
        if(resource.note)item.append(make('p',resource.note,'promise-link-note'));
        list.append(item);
      }
      section.append(list);
    }else section.append(make('p','Přesný odkaz se zatím nepodařilo dohledat.','promise-link-note'));
    if(review.note)section.append(make('p',review.note,'promise-link-note'));
    if(resources.some(resource=>resource.origin!=='description'))section.append(make('p',
      'Dohledání odkazu zde samo o sobě neznamená splnění slibu přidat jej do popisu epizody.','promise-link-note'));
    if(safeURL(review.descriptionURL)){
      const source=make('a','Popis původní epizody');
      source.href=review.descriptionURL;source.target='_blank';source.rel='noopener noreferrer';
      section.append(source);
    }
    return section;
  }
  root.VedatorSlibyLinks={apply,render,safeURL};
})(typeof globalThis==='object'?globalThis:this);

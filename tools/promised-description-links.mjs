// Supplement only this application's full descriptions. The RSS catalog and
// the moderators' promise ratings remain authoritative and unchanged.
const key=row=>JSON.stringify([row.candidate,row.tema]);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decodeHref=value=>String(value).replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'");
function webURL(value){
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&Boolean(url.hostname)}catch{return false}
}

export function collectPromisedDescriptionLinks(review,findings){
  if(review?.schema!==1||!Array.isArray(review.entries))throw Error('Invalid promised-link review');
  const actual=new Map(findings.map(row=>[key(row),row])),byEpisode=new Map();
  for(const entry of review.entries){
    const row=actual.get(key(entry));
    if(!row||row.stav!=='Nesplněno'||entry.descriptionState==='present')continue;
    if(!webURL(entry.descriptionURL))throw Error('Missing source episode for promised link '+key(entry));
    for(const resource of entry.resources||[]){
      if(!webURL(resource.url))continue;
      if(!['description','found','related'].includes(resource.origin))throw Error('Unknown promised-link provenance');
      if(!byEpisode.has(entry.descriptionURL))byEpisode.set(entry.descriptionURL,[]);
      const resources=byEpisode.get(entry.descriptionURL);
      if(resources.some(item=>item.url===resource.url))continue;
      resources.push({candidate:row.candidate,tema:row.tema,label:resource.label,url:resource.url,
        origin:resource.origin,...(resource.note?{note:resource.note}:{})});
    }
  }
  return byEpisode;
}

export function missingPromisedDescriptionLinks(copy,resources){
  const rich=String(copy.fullDescriptionHtml||'');
  const present=new Set([...rich.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(match=>decodeHref(match[1]??match[2])));
  const additions=[];
  for(const resource of resources){
    if(!webURL(resource.url)||present.has(resource.url))continue;
    present.add(resource.url);additions.push(resource);
  }
  return additions;
}

export function appendPromisedDescriptionLinks(copy,resources,language='cs'){
  const rich=String(copy.fullDescriptionHtml||''),plain=String(copy.fullDescription||'');
  const additions=missingPromisedDescriptionLinks(copy,resources);
  if(!additions.length)return {...copy};
  const sk=language==='sk';
  const heading=sk?'Sľúbený odkaz nájdený pomocou AI':'Slíbený odkaz nalezený pomocí AI';
  const related=sk?'Súvisiaci zdroj; presná zhoda so sľúbeným podkladom nie je potvrdená.':
    'Související zdroj; přesná shoda se slíbeným podkladem není potvrzena.';
  const noteFor=resource=>resource.origin==='related'?related:resource.note||'';
  const html=additions.map(resource=>{
    const note=noteFor(resource);
    return '<p><strong>'+heading+'</strong><br>'+escapeHtml(resource.label)+'<br>'+
      '<a href="'+escapeHtml(resource.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(resource.url)+'</a>'+
      (note?'<br><em>'+escapeHtml(note)+'</em>':'')+'</p>';
  }).join('\n');
  const text=additions.map(resource=>[heading,resource.label,resource.url,noteFor(resource)].filter(Boolean).join('\n')).join('\n\n');
  return {...copy,fullDescriptionHtml:rich+'\n'+html,fullDescription:plain+'\n\n'+text};
}

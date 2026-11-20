'use strict';
// Exact reviewed identities preserve stored ratings and source playback anchors.
(function exposeGuestPromises(root){
  const key=row=>JSON.stringify([row.candidate,row.tema]);
  function apply(data,review){
    if(review?.schema!==1||!Array.isArray(review.entries)||!Array.isArray(review.merges))throw Error('Neplatný katalog pozvání hostů');
    const entries=new Set(review.entries.map(key));
    for(const catalog of [data,data.archive].filter(Boolean)){
      for(const row of catalog.findings||[]){
        if(!entries.has(key(row)))continue;
        row.section='guests';
        row.sectionReason='Pozvání nebo návrat konkrétního člověka či odborného hosta do podcastu.';
      }
      for(const group of review.merges){
        const target=catalog.findings.find(row=>row.candidate===group.root&&entries.has(key(row)));
        const member=catalog.findings.find(row=>row.candidate===group.member&&entries.has(key(row)));
        if(!target||!member)continue;
        const originals=new Map();
        for(const row of [target,member])for(const original of [row,...(row.mergedFrom||[])]){
          const copy={...original};delete copy.mergedFrom;
          originals.set(key(copy),copy);
        }
        target.mergedFrom=Array.from(originals.values());
        target.mergeNote=group.note;
        target.vysvetleni+=' '+member.vysvetleni;
        catalog.findings=catalog.findings.filter(row=>row!==member);
      }
      catalog.sections={...catalog.sections,options:[
        {id:'episodes',label:'Epizody'},
        {id:'links',label:'Odkazy'},
        {id:'guests',label:'Hosté'},
        {id:'other',label:'Ostatní'}
      ].map(section=>({...section,count:(catalog.findings||[]).filter(row=>row.section===section.id).length})),
      guestReview:{date:review.date,reviewFile:'sliby/guest-review.json',rule:review.rule}};
      if(catalog.classification){
        for(const [field,counts] of [['kategorie','categoryCounts'],['stav','statusCounts']]){
          const result={};
          for(const row of catalog.findings)result[row[field]]=(result[row[field]]||0)+1;
          catalog.classification[counts]=result;
        }
      }
    }
    return data;
  }
  root.VedatorSlibyGuests={apply};
})(typeof globalThis==='object'?globalThis:this);

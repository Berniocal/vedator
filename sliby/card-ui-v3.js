'use strict';
// Production-only view for the large, data-bearing Sliby report.
// Loaded after the original report runtime: reuses its search, persistence,
// deletion dialog, manual GitHub overrides and audio player without copying data.
(function installSimplifiedPromiseCards(){
  if(typeof render!=='function'||typeof promiseMentions!=='function')return;
  // Old saved view choices must never re-enable the verbose presentation.
  compactMode=true;

  // Keep the three utility actions in their original report-actions container,
  // but place them behind one small native-looking settings disclosure.
  const installSettingsMenu=()=>{
    const actions=document.querySelector('.report-actions');
    if(!actions||document.getElementById('promise-settings'))return;
    const buttons=['export-json','show-deleted','reset-defaults']
      .map(id=>document.getElementById(id)).filter(Boolean);
    if(!buttons.length)return;
    const details=document.createElement('details');
    details.id='promise-settings';
    details.className='promise-settings';
    const summary=document.createElement('summary');
    const emoji=document.createElement('span');
    emoji.textContent='⚙️';emoji.setAttribute('aria-hidden','true');
    summary.append(emoji);
    summary.setAttribute('aria-label','Nastavení slibů');
    const menu=document.createElement('div');
    menu.className='promise-settings-menu';
    buttons.forEach(button=>menu.append(button));
    details.append(summary,menu);
    details.addEventListener('click',event=>{
      if(event.target.closest('button'))details.open=false;
    });
    document.addEventListener('click',event=>{
      if(details.open&&!details.contains(event.target))details.open=false;
    });
    actions.prepend(details);
  };
  installSettingsMenu();

  render=function renderSimplifiedPromiseCards(){
    const q=fold(el('q').value.trim()),st=el('status').value;
    const hitNode=(tag,text,cls)=>searchNode(tag,text,q,cls);
    const inSection=sectionRows().filter(r=>selectedCategories.has(r.kategorie));
    el('nfind').textContent=inSection.length;
    el('nlater').textContent=inSection.filter(r=>r.stav==='Splněno později').length;
    el('nprior').textContent=inSection.filter(r=>r.stav==='Splněno už dříve').length;
    el('nopen').textContent=inSection.filter(r=>r.stav==='Nesplněno').length;
    const future=el('nfuture');
    if(future)future.textContent=inSection.filter(r=>r.stav==='Budoucí slib').length;
    for(const [id,key,selected] of [['categories','category',selectedCategories],['sections','section',selectedSections]]){
      for(const option of el(id).children){
        const checked=selected.has(option.dataset[key]);
        option.children[0].checked=checked;
        option.className='filter-option'+(checked?' is-selected':'');
      }
    }
    el('show-deleted').textContent=showDeleted?'Zpět na aktivní záznamy':'Smazané ('+D.findings.filter(r=>personal(r).deleted===true).length+')';
    el('show-deleted').setAttribute('aria-pressed',String(showDeleted));
    el('save-status').textContent=storageProblem;
    const matches=new Map();
    const rows=inSection.filter(r=>{
      if(st&&r.stav!==st)return false;
      if(!q)return true;
      const match=searchMatch(r,q);
      if(match)matches.set(recordKey(r),match);
      return !!match;
    });
    if(q)rows.sort((a,b)=>matches.get(recordKey(a)).priority-matches.get(recordKey(b)).priority);
    el('shown').textContent='Zobrazeno '+rows.length+' z '+inSection.length+' různých slibů a nápadů · Počet zmínek: '+rows.reduce((sum,r)=>sum+promiseMentions(r).length,0)+(showDeleted?' · Smazané':'');
    document.querySelectorAll('.summary button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===st)));

    const frag=document.createDocumentFragment();
    for(const r of rows){
      const card=node('article',undefined,'finding compact');
      card.dataset.candidate=r.candidate;
      // The existing delete/restore focus handler expects source then main.
      // Keep an invisible placeholder; never show the redundant left column.
      const source=node('div',undefined,'source');
      source.hidden=true;
      const body=node('div',undefined,'finding-main');
      const heading=node('h3');
      const titleButton=hitNode('button',findingLabel(r),'topic-toggle');
      const open=expandedKeys.has(recordKey(r));
      titleButton.id='topic-'+r.index;
      titleButton.type='button';
      titleButton.setAttribute('aria-expanded',String(open));
      titleButton.setAttribute('aria-controls','details-'+r.index);
      // The status is visible in the compact row only. Expanded rows keep
      // the existing editable checkbox/status control instead.
      const statusText=fulfilled(r)?'Splněno':r.stav==='Budoucí slib'?'Budoucí slib':'Nesplněno';
      const statusKind=fulfilled(r)?'fulfilled':r.stav==='Budoucí slib'?'future':'unfulfilled';
      const statusBadge=node('span',statusText,'promise-compact-status is-'+statusKind);
      statusBadge.hidden=open;
      heading.append(titleButton,statusBadge);
      body.append(heading);
      const details=node('div',undefined,'finding-details');
      details.id='details-'+r.index;
      details.hidden=!open;
      titleButton.addEventListener('click',()=>{
        const key=recordKey(r);
        if(expandedKeys.has(key))expandedKeys.delete(key);
        else expandedKeys.add(key);
        const expanded=expandedKeys.has(key);
        details.hidden=!expanded;
        statusBadge.hidden=expanded;
        titleButton.setAttribute('aria-expanded',String(expanded));
      });

      // A single status label doubles as the actual editable checkbox.
      const actions=node('div',undefined,'finding-actions');
      const label=node('label',undefined,'completion-label');
      const checkbox=node('input');
      checkbox.type='checkbox';
      checkbox.id='complete-'+r.index;
      checkbox.checked=fulfilled(r);
      checkbox.setAttribute('aria-label','Splněno: '+findingTitle(r));
      checkbox.addEventListener('change',()=>{
        setPersonal(r,{fulfilled:checkbox.checked});
        el(checkbox.id)?.focus?.({preventScroll:true});
      });
      label.append(checkbox,node('span',fulfilled(r)?'Splněno':'Nesplněno'));
      const remove=node('button',showDeleted?'Obnovit':'Smazat',showDeleted?'restore-button':'delete-button');
      remove.type='button';
      remove.setAttribute('aria-label',(showDeleted?'Obnovit: ':'Smazat: ')+findingTitle(r));
      remove.onclick=()=>requestDelete(r);
      actions.append(label,remove);
      details.append(actions);

      if(r.vysvetleni)details.append(hitNode('p',r.vysvetleni,'explanation'));
      // Only the episodes where this exact promise/idea was voiced.
      // Do not mix in target/fulfilment episodes or audit uncertainty boxes.
      const mentions=promiseMentions(r);
      if(mentions.length){
        const list=node('ul',undefined,'episode-mentions');
        for(const mention of mentions){
          const item=node('li',undefined,'episode-mention');
          item.append(hitNode('span',mention.sourceTitle||mention.sourceRecording.title,'episode-title'));
          item.append(timeLink(mention.time,mention.timeURL,mention.sourceRecording,mention.seconds));
          list.append(item);
        }
        details.append(list);
      }
      body.append(details);
      card.append(source,body);
      frag.append(card);
    }
    if(!rows.length)frag.append(node('p','Těmto filtrům neodpovídá žádný záznam.','empty'));
    el('cards').replaceChildren(frag);
  };
  render();
})();

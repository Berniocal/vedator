const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const scope = {};
vm.runInNewContext(fs.readFileSync('sliby/admin-status.js','utf8'), scope);
const lib = scope.VedatorSlibyAdminStatus;
const source = fs.readFileSync('sliby/index.html','utf8');
const {patchReport}=require('./patch-sliby-admin-runtime.cjs');
const patched=patchReport(source);
assert.equal(patchReport(patched),patched,'Pages wiring is idempotent');
new vm.Script(patched.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(patched.includes('<script src="admin-status.js"></script>'));
assert(/episode-topics\.js\?v=[a-f0-9]{12}/.test(patched),'Reviewed episode topic map must load with a cache-busting hash');
assert(/card-ui-v3\.css\?v=[a-f0-9]{12}/.test(patched),'Promise card CSS should use its content hash to avoid old PWA styles');
assert(/card-ui-v3\.js\?v=[a-f0-9]{12}/.test(patched),'Promise card JS should use its content hash to avoid old PWA scripts');
assert(patched.includes("fetch('admin-overrides.json'"));
assert(patched.includes('VedatorSlibyAdminStatus.apply(D,overrides)'));
const admin = fs.readFileSync('sliby/admin/index.html','utf8');
const adminInline=admin.match(/<script>([\s\S]*?)<\/script>/);
assert(adminInline,'Admin inline script must not close prematurely');
new vm.Script(adminInline[1]);
assert(admin.includes('api.github.com/repos/Berniocal/vedator/contents/sliby/admin-overrides.json'));
assert(admin.includes("'Authorization': 'Bearer ' + token"));
assert(!admin.includes('localStorage.setItem') && !admin.includes('sessionStorage.setItem'));
assert(admin.includes('sha:latest.sha'));
assert(admin.includes('encodeContent('));
const original = [{candidate:31,tema:'Fermi',stav:'Nesplněno',mergedFrom:[
  {candidate:1066,tema:'Fermi člověk'}, {candidate:338,tema:'Fermi vědec'}]},
  {candidate:22,tema:'Jiné',stav:'Nesplněno'}];
const data = {findings:structuredClone(original),archive:{findings:structuredClone(original)},
  classification:{statuses:['Nesplněno','Splněno později','Splněno už dříve']}};
const entry={stav:'Splněno později',note:'Díl 300',updatedAt:'2026-11-12T05:00:00Z'};
const doc={schema:1,items:{[JSON.stringify([1066,'Fermi člověk'])]:entry}};
assert.equal(lib.keys(data.findings[0]).length,3);
assert.equal(lib.resolve(data.findings[0],doc).stav,entry.stav);
assert.equal(lib.apply(data,doc),2);
assert.equal(data.findings[0].stav,'Splněno později');
assert.equal(data.archive.findings[0].stav,'Splněno později');
assert.equal(data.findings[0].adminNote,'Díl 300');
assert.equal(data.findings[1].stav,'Nesplněno');
assert.equal(data.classification.statusCounts['Splněno později'],1);
assert.throws(()=>lib.check({schema:1,items:{'x':{stav:'neplatné'}}}));
assert.equal(lib.resolve(data.findings[0],{schema:1,items:{}}),null);

const catalogStart='<script type="application/json" id="audit-data">';
const dataStart=source.indexOf(catalogStart)+catalogStart.length;
const dataEnd=source.indexOf('</'+'script>',dataStart);
assert(dataStart>=catalogStart.length&&dataEnd>dataStart);
const actual=JSON.parse(source.slice(dataStart,dataEnd));
const overrides=JSON.parse(fs.readFileSync('sliby/admin-overrides.json','utf8'));
assert(lib.validStatuses.has('Budoucí slib'));
assert(patched.includes('id="nfuture"')&&patched.includes("r.stav==='Budoucí slib'?'future'"));
assert(admin.includes('<option value="future">Budoucí sliby</option>'));
assert(admin.includes("state==='Splněno později'||state==='Splněno už dříve'"));
lib.apply(actual,overrides);
const futureIds=[437,449,740,951,959,1107,1136,1173,1235,1251,1273,1326,1369,1375,1388,1434,1444,1472,1478];
assert.equal(actual.findings.filter(r=>r.stav==='Budoucí slib').length,futureIds.length);
assert(actual.classification.statuses.includes('Budoucí slib'));
for(const id of futureIds){
  const row=actual.findings.find(r=>r.candidate===id);
  assert(row,'Future promise not found: '+id);
  assert.equal(row.stav,'Budoucí slib');
  assert(row.adminNote,'Future promise missing rationale: '+id);
}
assert.equal(actual.classification.statusCounts['Budoucí slib'],futureIds.length);
const nearTermIds=[1458,1461,1504,1557,1783,1819];
for(const id of nearTermIds){
 const row=actual.findings.find(r=>r.candidate===id);
 assert(row,'Previously future record not found: '+id);
 assert.equal(row.stav,'Nesplněno','Near-term promise is not long-term future: '+id);
}

console.log('PASS: admin override validation, merged identity matching, durable status on live and archived rows, PAT safety checks, and future status reporting.');

const compactJs=fs.readFileSync('sliby/card-ui-v3.js','utf8');
const compactCss=fs.readFileSync('sliby/card-ui-v3.css','utf8');
new vm.Script(compactJs);
assert(compactJs.includes("document.createElement('details')"),'Utility actions belong to a collapsible menu');
assert(compactJs.includes("details.id='promise-settings'"),'Settings menu has stable ID');
assert(compactJs.includes("['export-json','show-deleted','reset-defaults']"),'All existing actions remain available');
assert(compactJs.includes("emoji.textContent='⚙️'"),'Only a small gear must be visible');
assert(!compactJs.includes("title.textContent='Nastavení'"),'Settings text must not appear next to the gear');
assert(compactJs.includes("summary.setAttribute('aria-label','Nastavení slibů')"),'Icon-only control remains accessible');
assert(compactJs.includes("r.stav==='Budoucí slib'?'Budoucí slib':'Nesplněno'"),'Collapsed cards distinguish future promises');
assert(compactJs.includes("statusBadge.hidden=open"),'Expanded cards must not repeat the collapsed status');
assert(compactJs.includes("statusBadge.hidden=expanded"),'Toggling an item must show/hide the status badge');
assert(compactCss.includes('.promise-compact-status[hidden]{display:none!important}'));
assert(compactCss.includes('.promise-settings-menu'),'Settings menu receives layout');
console.log('PASS: icon-only settings menu and collapsed/expanded promise status.');

const appHtml=fs.readFileSync('index.html','utf8');
const syncScript=appHtml.match(/<script id="vedator-sliby-theme-sync">([\s\S]*?)<\/script>/);
assert(syncScript,'Sliby integration bridge must be present');
new vm.Script(syncScript[1]);
assert(appHtml.includes('const embeddedLayoutCSS='));
assert(appHtml.includes('html body #vedator-sliby-status-filters{display:flex!important;flex-wrap:nowrap!important'),'Status controls must appear in their own second horizontal row');
assert(appHtml.includes('html body #vedator-sliby-episode-topics{display:flex!important;flex-wrap:nowrap!important'),'Episode topic controls must occupy a third horizontal row');
assert(appHtml.includes('html body #vedator-sliby-episode-topics[hidden]{display:none!important}'),'Hide third row when Episodes are not selected');
assert(appHtml.includes('installSlibyEpisodeTopics(doc);'),'Install curated topic filters after status filters');
assert(appHtml.includes("if(record.section!=='episodes'||(record.kategorie!=='Sliby'&&record.kategorie!=='Návrhy / nápady'))return false;"),'Topic filters may only expose promises and ideas on episodes');
assert(appHtml.includes("const promiseCategoryEnabled=()=>doc.querySelector("),'Topic row must track the actual Sliby category');
assert(appHtml.includes("row.hidden=!episodeTopicsEnabled()"),'Third row remains available for both promises and ideas when Epizody are selected');
assert(appHtml.includes("const ideaCategoryEnabled=()=>doc.querySelector("),'The ideas category is recognized for third-row filtering');
assert(appHtml.includes("episodeSectionEnabled()&&(promiseCategoryEnabled()||ideaCategoryEnabled())"),'Topic row appears for either episode content type');
assert(appHtml.includes("selected==='unclassified'?!matched.length:matched.includes(selected)"),'Unclassified promises must remain reachable');
assert(appHtml.includes("episodeTopic:doc.querySelector("),'Topic selection must be stored');
assert(appHtml.includes("#vedator-sliby-episode-topics button,#show-deleted"),'Topic button clicks must update stored preferences');
const reviewedScript=fs.readFileSync('sliby/episode-topics.js','utf8');
const topicSandbox={};
vm.runInNewContext(reviewedScript,topicSandbox);
const topicApi=topicSandbox.VedatorSlibyEpisodeTopics;
const existingReview=JSON.parse(fs.readFileSync('sliby/duplicate-review.json','utf8'));
const getRootCandidate=member=>Array.isArray(member)?Number(member[0]):Number(member);
assert(topicApi.reviewed.length>=12,'Initial carefully reviewed topic batch should be substantial');
assert.equal(topicApi.topics.length,8,'Broad promise taxonomy should contain eight groups, fewer than podcast topics');
assert(topicApi.topics.some(t=>t.label==='Vesmír')&&topicApi.topics.some(t=>t.label==='Věda a vědci'),'Closely related fine topics should be merged');
assert.deepEqual(Array.from(topicApi.groupIds(['blackholes','darkenergy','missions'])),['space'],'Black holes, dark energy and missions belong to Vesmír');
assert.deepEqual(Array.from(topicApi.groupIds(['quantum','particles'])),['physics'],'Quantum and particle physics share a broad category');
assert(appHtml.includes('const migratedTopic=catalog.groupFor(oldTopic);'),'Old saved selections must migrate to the broad taxonomy');
assert(topicApi.audited.length>=30,'Second manual audit must include substantial verified episode promises');
assert.equal(topicApi.nextBatch.length,53,'Third review must contain exactly 53 individually checked episode promises');
const assignments=[...topicApi.reviewed,...topicApi.audited,...topicApi.nextBatch];
assert.equal(assignments.length,104,'All prior categorization must remain plus the third reviewed batch');
const keys=new Set(assignments.map(item=>JSON.stringify([item.candidate,item.title])));
assert.equal(keys.size,assignments.length,'One classification per unique promise identity');
const validGroups=new Set(topicApi.topics.map(topic=>topic.id));
const nonPromisesInTopicBatch=[];
for(const item of assignments){
  if(topicApi.reviewed.includes(item))assert(existingReview.groups.some(group=>group.title===item.title&&getRootCandidate(group.members[0])===item.candidate),'Duplicate-review assignment must be documented: '+item.title);
  const matches=actual.findings.filter(row=>Number(row.candidate)===item.candidate&&(row.displayTema||row.compactTitle||row.tema)===item.title);
  assert.equal(matches.length,1,'Curated assignment must exist exactly once in the live report: '+item.title);
  assert.equal(matches[0].section,'episodes','Only real promises on episodes may be tagged: '+item.title);
  if(matches[0].kategorie!=='Sliby')nonPromisesInTopicBatch.push({candidate:item.candidate,title:item.title,actual:matches[0].kategorie});
  const record={candidate:item.candidate,displayTema:item.title,section:'episodes',kategorie:'Sliby'};
  const broad=Array.from(topicApi.groupIds(item.ids));
  assert(broad.length>0&&broad.every(id=>validGroups.has(id)),'Every assignment must map to a known broad topic: '+item.title);
  assert.deepEqual(Array.from(topicApi.topicsFor(record)),broad,'Broad topic must preserve fine-grained review evidence');
  assert.equal(topicApi.topicsFor({...record,section:'other'}).length,0,'Never categorize non-episode promises');
  assert.equal(topicApi.topicsFor({...record,kategorie:'Návrhy / nápady'}).length,0,'Do not classify ideas as promised episodes');
  assert.equal(topicApi.topicsFor({...record,candidate:item.candidate+200000}).length,0,'An identical title with a different identity must not match');
}
assert.equal(topicApi.topicsFor({section:'episodes',kategorie:'Sliby',candidate:999999,tema:'Žádný známý slib'}).length,0,'Unreviewed episode promises are not classified by guesswork');
assert.equal(topicApi.ideaBatch.length,72,'Earlier manual review must retain 72 episode ideas');
assert.equal(topicApi.ideaBatch2.length,81,'New manual review must add 81 episode ideas');
assert.equal(topicApi.ideaBatch3.length,14,'Third review leaves 6 unclear or joking suggestions unclassified');
assert.equal(topicApi.ideaBatch4.length,4,'Fourth review leaves 6 hypothetical or unclear suggestions unclassified');
const allIdeaAssignments=[...topicApi.ideaBatch,...topicApi.ideaBatch2,...topicApi.ideaBatch3,...topicApi.ideaBatch4];
assert.equal(allIdeaAssignments.length,171,'Only the 12 deliberately reverted assignments are excluded');
const ideaKeys=new Set();
for(const item of allIdeaAssignments){
  const key=JSON.stringify([item.candidate,item.title]);
  assert(!ideaKeys.has(key),'Duplicate idea assignment: '+item.title);
  ideaKeys.add(key);
  const found=actual.findings.filter(row=>Number(row.candidate)===item.candidate&&(row.displayTema||row.compactTitle||row.tema)===item.title);
  assert.equal(found.length,1,'Reviewed idea must exist exactly once in the published catalog: '+item.title);
  assert.equal(found[0].section,'episodes','Never assign non-episode ideas: '+item.title);
  assert.equal(found[0].kategorie,'Návrhy / nápady','Never silently convert an idea to a promise: '+item.title);
  const actualGroups=Array.from(topicApi.topicsFor(found[0]));
  const expectedGroups=Array.from(topicApi.groupIds(item.ids));
  assert.deepEqual(actualGroups,expectedGroups,'Reviewed idea must match its selected topics: '+item.title);
  assert(expectedGroups.length>=1&&expectedGroups.every(id=>validGroups.has(id)),'Unknown broad topic: '+item.title);
  assert.equal(topicApi.topicsFor({...found[0],kategorie:'Sliby'}).length,0,'Idea must never leak into the promises category');
  assert.equal(topicApi.topicsFor({...found[0],section:'other'}).length,0,'Idea must never leak to non-episode section');
}
assert.equal(topicApi.topicsFor({section:'episodes',kategorie:'Návrhy / nápady',candidate:999999,tema:'Nezařazený námět'}).length,0,'No automatic topic guessing for proposals');
const returnedToUnclassified=[
  [1104,'Albert Michelson jako neurčitý teaser'],
  [1114,'Teaser na fyziku plování a loď v malém množství vody'],
  [1116,'Maxwell: nejisté připomenutí připravovaného dílu'],
  [1293,'Možný návrat k vakuové disperzi světla'],
  [1379,'Vztah entropie a života jako vlastní téma'],
  [455,'Stárnutí a jeho mnoho příčin'],
  [10,'Viry jako téma celého podcastu – nejasný závěrečný dovětek'],
  [1040,'Hranice sluneční soustavy – nejistá zmínka o dalším podcastu'],
  [1241,'Znovu probrat vznik kauzality po upřesnění otázky'],
  [1388,'Zahrnout Murakamiho, pokud dostane Nobelovu cenu'],
  [951,'Nová fyzika určující konečnou velikost černých děr'],
  [1891,'Pozvat Neila deGrasse Tysona a probrat s ním Carla Sagana']
];
for(const [candidate,title] of returnedToUnclassified){
  const original=actual.findings.find(row=>row.candidate===candidate&&(row.displayTema||row.compactTitle||row.tema)===title);
  assert(original,'Original record must remain in catalog: '+title);
  assert.equal(original.section,'episodes','The original section must remain unchanged');
  assert.equal(original.kategorie,'Návrhy / nápady','Return to unclassified must not delete or relabel original idea');
  assert.equal(topicApi.topicsFor(original).length,0,'Do not topic-filter a joke, garbled hint or hypothetical idea: '+title);
}

console.log('PASS: '+allIdeaAssignments.length+' real episode ideas categorized independently of the '+assignments.length+' episode promises.');
assert.deepEqual(nonPromisesInTopicBatch,[],'Topic batch must omit these reviewed ideas until the next phase: '+JSON.stringify(nonPromisesInTopicBatch));
console.log('PASS: '+assignments.length+' documented episode-promise assignments across '+topicApi.topics.length+' broad groups, no ideas or other-section promises.');
const episodeIdeas=actual.findings.filter(row=>row.section==='episodes'&&row.kategorie==='Návrhy / nápady');
assert.equal(episodeIdeas.length,204,'A new audit may change the source catalog; update classification deliberately if the count changes');
assert.equal(episodeIdeas.length-allIdeaAssignments.length,33,'33 ambiguous, joking or non-episode items remain accessible as Nezařazené');

assert(appHtml.includes('html body .summary,html body .summary+.personal-help{display:none!important}'),'Old big status summary must be hidden');
assert(appHtml.includes("['fulfilled','Splněné'],['unfulfilled','Nesplněné'],['future','Budoucí sliby']"),'Only three combined status group choices are offered');
assert(appHtml.includes("record.stav==='Splněno později'||record.stav==='Splněno už dříve'?'fulfilled'"),'Fulfilled earlier and later are one choice');
assert(appHtml.includes("return originalSectionRows().filter(record=>selected.has(statusGroupOf(record)))"),'Multiple independent statuses filter cards together');
assert(appHtml.includes("statusGroups:[...doc.querySelectorAll("),'Independent choices must persist');
assert(appHtml.includes('installSlibyStatusFilters(doc);'),'New status group controls must be installed before memory restoration');
assert(appHtml.includes("status.value=''; // Status multi-selection"),'Legacy single-status filter must not interfere with selected combinations');
assert(appHtml.includes('html body :is(#categories,#sections,#vedator-sliby-status-filters,#vedator-sliby-episode-topics) .filter-option{'),'Both category and section pills must match tabs in the main application');
assert(appHtml.includes('html body :is(#categories,#sections,#vedator-sliby-status-filters,#vedator-sliby-episode-topics) .filter-option.is-selected'),'Active category and section must have pill states');
assert(appHtml.includes('html body :is(#categories,#sections,#vedator-sliby-status-filters,#vedator-sliby-episode-topics) .filter-option input{position:absolute'),'Keep accessible native filter selection while hiding checkbox decoration');
assert(appHtml.includes('html body .filter-groups{display:flex!important;align-items:center!important;flex-wrap:nowrap!important'),'Category and section filters must be in ONE shared row');
assert(appHtml.includes('html body :is(#categories,#sections){display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important'),'Both groups must sit side by side without wrapping');
assert(appHtml.includes('overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch'),'The combined row must scroll horizontally on mobile');
assert(appHtml.includes('padding:8px 12px!important;border:1px solid var(--line,#d4d8e2)!important;border-radius:999px!important'),'Filter buttons match the native topic-v2 pill design');
assert(appHtml.includes('html[data-theme="dark"] body :is(#categories,#sections,#vedator-sliby-status-filters,#vedator-sliby-episode-topics) .filter-option.is-selected'),'Both selected pills must work in dark theme');
const embedTag=appHtml.match(/<iframe id="sliby-frame-v2"[^>]*>/)?.[0];
assert(embedTag,'Sliby iframe exists');
assert(embedTag.includes('data-src="./sliby/"'),'Sliby source is deferred until tab selection');
assert(embedTag.includes('data-sliby-ready="false"'),'Sliby starts visually unready');
assert(!/\ssrc=/.test(embedTag),'No old initial iframe page may load before styled content');
assert(appHtml.includes('#sliby-frame-v2:not([data-sliby-ready="true"]){opacity:0;pointer-events:none}'));
assert(appHtml.includes("if(next)startSlibyOnce()"));
assert(appHtml.includes("iframe.dataset.slibyReady='true'"));
assert.equal((syncScript[1].match(/iframe\.src\s*=/g)||[]).length,1,'Iframe must navigate exactly once');
assert(!syncScript[1].includes("iframe.getAttribute('src')"),'Do not reload the initially requested iframe');
assert(appHtml.includes('sliby-loading-v2'),'Pending report shows a loading indicator');
assert(appHtml.includes('html body main>header{display:none!important}'));
assert(appHtml.includes('html body .toolbar #q{display:none!important}'));
assert(appHtml.includes("const mainSearch=document.getElementById('search-v2')"));
assert(appHtml.includes("child.dispatchEvent(new iframe.contentWindow.Event('input',{bubbles:true}))"));
assert(appHtml.includes("window.addEventListener('vedatorviewchange',handleViewChange)"));
assert(appHtml.includes("window.addEventListener('vedator-v2-ready',()=>{"),'Background tabs are scheduled after initial app load');
assert(appHtml.includes("requestIdleCallback(startSlibyOnce,{timeout:4500})"),'The heavy Sliby iframe should start during browser idle time');
assert(appHtml.includes("setTimeout(startSlibyOnce,1800)"),'Browsers without requestIdleCallback still preload later');
assert(appHtml.includes("document.getElementById('sliby-first-paint-v2')?.setAttribute('hidden','')"),'The initial Sliby preview must disappear when the full iframe is ready');
assert(appHtml.includes("if(next)startSlibyOnce()"),'Clicking before preloading starts still opens Sliby immediately');
const appJs=fs.readFileSync('app-v2.js','utf8');
assert(appJs.includes("window.addEventListener('vedator-v2-ready',prewarmAskIndex,{once:true})"),'Ask search index must start building in the background');
assert(appJs.includes("if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1500})"),'Ask prewarming should yield to the first paint');
assert(appJs.includes('const readyTabLists=new Map()'),'Already mounted lists should not be rebuilt on every tab switch');
for(const tab of ['episodes','questions','nonquestions','series'])assert(appJs.includes("alreadyRenderedTab('"+tab+"',key,"),'Cache should preserve mounted '+tab+' list');
assert(!appHtml.includes('body.vedator-sliby-active main > .panel > .controls,\nbody.vedator-sliby-active'));
const sw=fs.readFileSync('sw.js','utf8');
assert(/APP_CACHE\s*=\s*["']vedator-v[23]-/.test(sw),'PWA must have a named app cache');
console.log('PASS: Sliby integrated header, filters, native search bridge, preserved view and PWA cache.');

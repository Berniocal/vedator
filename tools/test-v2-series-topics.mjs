import fs from 'node:fs';

const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const config=JSON.parse(fs.readFileSync('series.json','utf8'));
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const app=fs.readFileSync('app-v2.js','utf8');

assert(Array.isArray(config),'series.json must be an array');
const actualSeries=config.filter(item=>(item.kind||'series')==='series');
const topics=config.filter(item=>item.kind==='topic');
assert(actualSeries.length===21,`Expected 21 series, got ${actualSeries.length}`);
assert(topics.length===20,`Expected 20 topics, got ${topics.length}`);

const byName=new Map(config.map(item=>[item.cs,item]));
for(const name of ['FAQ – dobré otázky','Rozhovory o vesmíru','Rozhovory v angličtině','Žiji vědu','Roky ve vědě','Ženy ve vědě','Vědci','Nobelovy ceny','Ig Nobelovy ceny','Teorie her','Genetický speciál','Hledání mimozemského života','Teorie strun','Klimatická změna','Udržitelnost: (ne) je to velká věda','Internet','Umělá inteligence','Nové řešení Fermiho paradoxu','STARMUS','Miléniové problémy','Budoucnost zdravotnictví']){
  assert(byName.get(name)?.kind==='series',`Missing series: ${name}`);
}
for(const name of ['Matematika','Vesmír a kosmologie','Černé díry','Temná hmota a energie','Kosmonautika a vesmírné mise','Kvantový svět','Částice a částicová fyzika','Biologie','Zvířata','Člověk a zdraví','Mozek a mysl','Chemie a materiály','Informatika a AI','Ekonomie, peníze a riziko','Klima a životní prostředí','Energie a energetika','Země, počasí a oceány','Jak funguje věda','Věda ve sci-fi','Osobnosti vědy']){
  assert(byName.get(name)?.kind==='topic',`Missing topic: ${name}`);
}

const women=byName.get('Ženy ve vědě');
assert(women?.people===true,'Women in science must retain people formatting');
assert(women?.legacyNames?.includes('Vědkyně'),'Women in science must preserve the old Vědkyně storage/deep-link alias');
assert(!women.episodes.includes(199),'Mise Lucy must not be classified as a woman scientist');
for(const number of [141,240,265])assert(women.episodes.includes(number),`Women in science is missing episode ${number}`);
const scientists=byName.get('Vědci');
for(const number of [236,238,242,250,253,256,267])assert(scientists.episodes.includes(number),`Vědci is missing episode ${number}`);
const particles=byName.get('Částice a částicová fyzika');
assert(particles?.legacyNames?.includes('Částice'),'Renamed particle topic must preserve old Částice alias');

const built=Array.isArray(data.series)?data.series:[];
assert(built.length===41,`Expected 41 built collections, got ${built.length}`);
assert(built.filter(item=>item.kind==='series').length===21,'Built data lost series/topic split');
assert(built.filter(item=>item.kind==='topic').length===20,'Built data lost topic entries');
assert(built.find(item=>item.name==='Ženy ve vědě')?.legacyNames?.includes('Vědkyně'),'Built data lost Vědkyně legacy alias');
assert(built.find(item=>item.name==='Částice a částicová fyzika')?.legacyNames?.includes('Částice'),'Built data lost Částice legacy alias');

for(const key of ['vedatorPlaybackProgressV1','vedator-user-playlists-v1','vedatorCollectionProgressV1','vedatorOfflineAudioIndexV1','vedator-ui-language-v1','vedatorSortPreferencesV1']){
  assert(app.includes(key),`Existing user-data key changed or disappeared: ${key}`);
}
assert(app.includes('seriesCollectionId'),'Series/topic progress compatibility helper is missing');
assert(app.includes('legacyNames'),'Legacy collection aliases are not handled by the app');
assert(!/fetch\([^\n]*series\.json/i.test(app),'app-v2.js must not fetch series.json at runtime');
assert(!/fetch\([^\n]*topics\.json/i.test(app),'app-v2.js must not fetch a separate topics file at runtime');

console.log(JSON.stringify({ok:true,series:actualSeries.length,topics:topics.length,total:config.length,userDataKeysPreserved:true,runtimeRequestsAdded:false},null,2));

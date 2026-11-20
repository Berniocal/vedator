import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {collectPromisedDescriptionLinks,missingPromisedDescriptionLinks,appendPromisedDescriptionLinks} from './promised-description-links.mjs';

const html=fs.readFileSync('sliby/index.html','utf8');
const audit=JSON.parse(html.match(/id="audit-data">([\s\S]*?)<\/script>/)[1]);
const statusScope={};vm.runInNewContext(fs.readFileSync('sliby/admin-status.js','utf8'),statusScope);
statusScope.VedatorSlibyAdminStatus.apply(audit,JSON.parse(fs.readFileSync('sliby/admin-overrides.json','utf8')));
const review=JSON.parse(fs.readFileSync('sliby/link-review.json','utf8'));
const grouped=collectPromisedDescriptionLinks(review,audit.findings);
const resources=[...grouped.values()].flat();
assert(grouped.size>0&&resources.length>0);
for(const resource of resources)assert(audit.findings.some(row=>row.candidate===resource.candidate&&row.tema===resource.tema&&row.stav==='Nesplněno'));
const fixture={schema:1,entries:[
  {candidate:1,tema:'Done',descriptionURL:'https://example.com/1',descriptionState:'missing',resources:[{url:'https://example.com/done',label:'Done',origin:'found'}]},
  {candidate:2,tema:'Later',descriptionURL:'https://example.com/2',descriptionState:'elsewhere',resources:[{url:'https://example.com/later',label:'Later',origin:'description'}]},
  {candidate:3,tema:'Already present',descriptionURL:'https://example.com/3',descriptionState:'present',resources:[{url:'https://example.com/present',label:'Present',origin:'description'}]}
]};
const fixtureRows=fixture.entries.map(entry=>({...entry,stav:entry.candidate===1?'Splněno později':'Nesplněno'}));
assert.deepEqual([...collectPromisedDescriptionLinks(fixture,fixtureRows).keys()],['https://example.com/2'],'Exclude fulfilled or already present links, include links found in other descriptions');
const originalStatuses=JSON.stringify(audit.findings.map(row=>row.stav));
const copy={fullDescriptionHtml:'<p>Original <a href="https://example.com/original">source</a></p>',fullDescription:'Original source'};
const synthetic=[{label:'A < B & "C"',url:'https://example.com/a?x=1&y=2',origin:'related'}];
const result=appendPromisedDescriptionLinks(copy,synthetic,'cs');
assert(result.fullDescriptionHtml.startsWith(copy.fullDescriptionHtml+'\n'),'Additions must follow all original paragraphs');
assert(result.fullDescriptionHtml.includes('A &lt; B &amp; &quot;C&quot;'));
assert(result.fullDescriptionHtml.includes('href="https://example.com/a?x=1&amp;y=2"'));
assert(result.fullDescriptionHtml.includes('přesná shoda'));
assert(result.fullDescription.endsWith('Související zdroj; přesná shoda se slíbeným podkladem není potvrzena.'));
assert.deepEqual(appendPromisedDescriptionLinks(result,synthetic,'cs'),result,'Applying the same links twice is idempotent');
assert.deepEqual(appendPromisedDescriptionLinks(copy,[{url:'javascript:alert(1)',label:'bad',origin:'found'}]),copy);
const changed=audit.findings.map(row=>row.candidate===1183?{...row,stav:'Splněno později'}:row);
assert(![...collectPromisedDescriptionLinks(review,changed).values()].flat().some(r=>r.candidate===1183),'Current/admin status overrides old review status');
assert.equal(JSON.stringify(audit.findings.map(row=>row.stav)),originalStatuses);

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const raw=JSON.parse(fs.readFileSync('episodes.json','utf8')).episodes;
let count=0;
let appendedCount=0;
for(const episode of data.episodes){
  const source=raw.find(row=>row.id===episode.id);
  assert(source);
  const additions=missingPromisedDescriptionLinks({fullDescriptionHtml:source.description},grouped.get(episode.link)||[]);
  if(!additions.length){assert(!episode.aiPromisedLinks?.length);continue}
  count++;appendedCount+=additions.length;assert.deepEqual(episode.aiPromisedLinks,additions);
  for(const [language,bundle] of [['sk',episode],['cs',episode.i18n?.cs],['sk',episode.i18n?.sk]]){
    assert(bundle,'Affected episode needs both language copies');
    const heading=language==='cs'?'Slíbený odkaz nalezený pomocí AI':'Sľúbený odkaz nájdený pomocou AI';
    assert(bundle.fullDescription.includes(heading));
    const last=additions.at(-1);
    assert(bundle.fullDescription.includes(last.url));
    assert(bundle.fullDescriptionHtml.endsWith('</p>'));
    for(const resource of additions){
      const escaped=resource.url.replaceAll('&','&amp;');
      assert(bundle.fullDescriptionHtml.includes('href="'+escaped+'"'),resource.label+' must be clickable in '+language);
    }
  }
  assert(source&&!source.description.includes('Slíbený odkaz nalezený pomocí AI'),'RSS descriptions must remain untouched');
}
assert.equal(data.source.aiPromisedLinkEpisodeCount,count);assert.equal(data.source.aiPromisedLinkCount,appendedCount);
console.log(`PASS: ${appendedCount} appended links from ${new Set(resources.map(row=>row.candidate)).size} unfulfilled promises in ${count} bilingual full descriptions; safe URLs, uncertainty, preserved RSS/status and repeatable builds.`);

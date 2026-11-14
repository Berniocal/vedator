// Reapply the lightweight admin-status adapter to the generated Pages artifact.
// Keep the multi-megabyte audit-data HTML untouched in Git history.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const assetHash = name => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(__dirname,'..','sliby',name)))
  .digest('hex').slice(0,12);
function patchReport(html) {
  assert(html.length > 1000000, 'Unexpectedly short report');
  if (html.includes('<!-- sliby-admin-runtime -->')) return html;
  function one(before,after) {
    assert.equal(html.split(before).length - 1, 1, 'Unexpected source layout: ' + before.slice(0,85));
    html=html.replace(before,after);
  }
  one("<script>\n'use strict';\nconst D=JSON.parse(document.getElementById('audit-data').textContent)",
      '<!-- sliby-admin-runtime -->\n<script src="admin-status.js"></script>\n<script>\n\'use strict\';\nconst D=JSON.parse(document.getElementById(\'audit-data\').textContent)');
  one("  if(r.mergeNote)details.append(hitNode('p',r.mergeNote,'personal-note'));",
      "  if(r.mergeNote)details.append(hitNode('p',r.mergeNote,'personal-note'));\n"+
      "  if(r.adminNote)details.append(hitNode('p','Ruční ověření: '+r.adminNote,'personal-note'));");

  // Fourth status: externally conditioned promises or deliberately distant review dates.
  one('<button data-status="Nesplněno" aria-pressed="false"><strong id="nopen"></strong><span>Nesplněno</span></button>',
      '<button data-status="Nesplněno" aria-pressed="false"><strong id="nopen"></strong><span>Nesplněno</span></button>\n'+
      '<button data-status="Budoucí slib" aria-pressed="false"><strong id="nfuture"></strong><span>Budoucí sliby</span></button>');
  one('</section>\n<div class="report-actions">',
      '</section>\n<p class="personal-help">Budoucí sliby čekají na vzdálený termín nebo na událost, která ještě nenastala. Nejde o běžné nesplněné závazky.</p>\n<div class="report-actions">');
  one('</style></head>',
      '@media(min-width:701px){.summary{grid-template-columns:repeat(5,minmax(0,1fr))}}\n'+
      '.chip.future{background:#e5ebfb;color:#374e91}\n'+
      'html[data-theme="dark"] .chip.future{background:#29355b;color:#c7d6ff}\n</style></head>');
  one("function fulfilled(r){const value=personal(r).fulfilled;return typeof value==='boolean'?value:r.stav!=='Nesplněno'}",
      "function fulfilled(r){const value=personal(r).fulfilled;return typeof value==='boolean'?value:r.stav==='Splněno později'||r.stav==='Splněno už dříve'}");
  one("function effective(r){return {...r,auditStatus:r.stav,stav:fulfilled(r)?(r.stav==='Splněno už dříve'?'Splněno už dříve':'Splněno později'):'Nesplněno'}}",
      "function effective(r){return {...r,auditStatus:r.stav,stav:fulfilled(r)?(r.stav==='Splněno už dříve'?'Splněno už dříve':'Splněno později'):(typeof personal(r).fulfilled==='boolean'?'Nesplněno':r.stav==='Budoucí slib'?'Budoucí slib':'Nesplněno')}}");
  one("for(const v of D.classification.statuses){const o=node('option',v)",
      "if(!D.classification.statuses.includes('Budoucí slib'))D.classification.statuses.push('Budoucí slib');\nfor(const v of D.classification.statuses){const o=node('option',v)");
  one("el('nopen').textContent=inSection.filter(r=>r.stav==='Nesplněno').length;",
      "el('nopen').textContent=inSection.filter(r=>r.stav==='Nesplněno').length;el('nfuture').textContent=inSection.filter(r=>r.stav==='Budoucí slib').length;");
  one("r.stav==='Splněno už dříve'?'prior':'no'","r.stav==='Splněno už dříve'?'prior':r.stav==='Budoucí slib'?'future':'no'");
  one("render();\n</script></body></html>",
      "render();\n"+
      "// Separate, durable manual ratings override the automatically rebuilt audit.\n"+
      "if(typeof fetch==='function'&&typeof window!=='undefined'&&window.VedatorSlibyAdminStatus){\n"+
      " fetch('admin-overrides.json',{cache:'no-store'}).then(response=>{\n"+
      "  if(!response.ok)throw Error('HTTP '+response.status);\n"+
      "  return response.json();\n"+
      " }).then(overrides=>{\n"+
      "  window.VedatorSlibyAdminStatus.apply(D,overrides);\n"+
      "  render();\n"+
      " }).catch(error=>console.warn('Ruční opravy Slibů se nepodařilo načíst:',error.message));\n"+
      "}\n</script></body></html>");
  // Keep the 6.4 MB audit report unmodified in Git; its published view is
  // a separate, small client-side layer. Existing status, search, audio and
  // manual admin overrides continue to work without duplicating the data.
  one('</style></head>',
      '</style><link rel="stylesheet" href="card-ui-v3.css?v='+assetHash('card-ui-v3.css')+'"></head>');
  one('</script></body></html>',
      '</script><script src="card-ui-v3.js?v='+assetHash('card-ui-v3.js')+'"></script></body></html>');
  return html;
}
if(require.main===module){
  const path='sliby/index.html';
  fs.writeFileSync(path,patchReport(fs.readFileSync(path,'utf8')));
  process.stdout.write('Sliby admin overrides connected to Pages output.\n');
}
module.exports={patchReport};

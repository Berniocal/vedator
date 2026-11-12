// Reapply the lightweight admin-status adapter to the generated Pages artifact.
// Keep the multi-megabyte audit-data HTML untouched in Git history.
const fs = require('node:fs');
const assert = require('node:assert/strict');
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
  return html;
}
if(require.main===module){
  const path='sliby/index.html';
  fs.writeFileSync(path,patchReport(fs.readFileSync(path,'utf8')));
  process.stdout.write('Sliby admin overrides connected to Pages output.\n');
}
module.exports={patchReport};

import fs from 'node:fs';

const path='app-v2.js';
let source=fs.readFileSync(path,'utf8');

if(!source.includes('/* V2_PLAYER_NAVIGATION_CONTROLS_V1 */'))throw new Error('Player navigation block not found');
if(source.includes('playerNavOriginalSetPlayerCollapsed')){
  console.log('Back-to-top collapse fix already present.');
  process.exit(0);
}

const oldCollapsed="else if(expand&&!expand.hidden){const rect=expand.getBoundingClientRect();bottom=Math.max(14,Math.ceil(window.innerHeight-rect.top)+9)+'px'}";
const newCollapsed="else if(expand&&!expand.hidden){const rect=expand.getBoundingClientRect(),style=getComputedStyle(expand),base=Math.max(0,parseFloat(style.bottom)||0);bottom=Math.max(14,Math.ceil(base+rect.height+9))+'px'}";
if(!source.includes(oldCollapsed))throw new Error('Collapsed position code not found');
source=source.replace(oldCollapsed,newCollapsed);

const queueLine='  function queuePlayerFloatingPositions(){if(playerFloatingFrame)return;playerFloatingFrame=requestAnimationFrame(syncPlayerFloatingPositions)}';
if(!source.includes(queueLine))throw new Error('Floating position queue function not found');
const collapseWrapper=`${queueLine}\n\n  const playerNavOriginalSetPlayerCollapsed=legacyVisualSetPlayerCollapsed;\n  legacyVisualSetPlayerCollapsed=function(collapsed){\n    const result=playerNavOriginalSetPlayerCollapsed(collapsed);\n    queuePlayerFloatingPositions();\n    requestAnimationFrame(queuePlayerFloatingPositions);\n    return result;\n  };`;
source=source.replace(queueLine,collapseWrapper);

const oldColor="'#back-top-v2{bottom:var(--vedator-back-bottom,max(14px,env(safe-area-inset-bottom)))!important;background:#7c3aed!important;color:#fff!important;border-color:#a78bfa!important;box-shadow:0 8px 24px rgba(76,29,149,.28)!important}',";
const newColor="'#back-top-v2{bottom:var(--vedator-back-bottom,max(14px,env(safe-area-inset-bottom)))!important;background:linear-gradient(180deg,#55449a,#3f307b)!important;color:#fff!important;border-color:#8f80ff!important;box-shadow:0 6px 18px rgba(31,22,69,.34)!important}',";
if(!source.includes(oldColor))throw new Error('Back-to-top base color rule not found');
source=source.replace(oldColor,newColor);

const oldHover="'#back-top-v2:hover{background:#6d28d9!important;border-color:#c4b5fd!important}',";
const newHover="'#back-top-v2:hover{background:linear-gradient(180deg,#5f4da7,#49378a)!important;border-color:#a99fff!important}',";
if(!source.includes(oldHover))throw new Error('Back-to-top hover color rule not found');
source=source.replace(oldHover,newHover);

const oldDark="'html[data-theme=\"dark\"] #back-top-v2{background:#6d28d9!important;border-color:#a78bfa!important;color:#fff!important}',";
const newDark="'html[data-theme=\"dark\"] #back-top-v2{background:linear-gradient(180deg,#51408f,#3a2c70)!important;border-color:#9788ff!important;color:#fff!important}',";
if(!source.includes(oldDark))throw new Error('Back-to-top dark color rule not found');
source=source.replace(oldDark,newDark);

fs.writeFileSync(path,source);
console.log('Back-to-top collapse position and color patched.');

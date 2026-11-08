import fs from 'node:fs';
const file='app-v2.js',start='  /* CONTINUOUS_AUDIO_ENGINE_BEGIN */',end='  /* CONTINUOUS_AUDIO_ENGINE_END */';
const source=fs.readFileSync('continuous-audio.mjs','utf8').trim().replace('export class ContinuousAudio','class ContinuousAudio');
const block=start+'\n'+source.split('\n').map(line=>'  '+line).join('\n')+'\n'+end;
const app=fs.readFileSync(file,'utf8'),begin=app.indexOf(start),finish=app.indexOf(end);
const next=begin>=0&&finish>begin?app.slice(0,begin)+block+app.slice(finish+end.length):app.replace('  function currentOfflineRecord()',block+'\n\n  function currentOfflineRecord()');
if(next===app){console.log('Continuous player engine is synchronized');process.exit(0)}
if(process.argv.includes('--check'))throw Error('Run node tools/sync-continuous-player.mjs to synchronize the embedded engine');
if(!next.includes(start))throw Error('Continuous player insertion marker not found');
fs.writeFileSync(file,next);
console.log('Embedded continuous engine updated; no additional runtime request');

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
const root=process.cwd();
const require=createRequire(path.resolve(process.env.VEDATOR_TEST_DEPS||root,'package.json'));
const puppeteer=require('puppeteer-core');
const episodeNumber=Number(process.env.VEDATOR_AUDIT_EPISODE);
if(!Number.isInteger(episodeNumber)||!process.env.VEDATOR_AUDIT_AUDIO_FILE)throw new Error('Set VEDATOR_AUDIT_EPISODE and VEDATOR_AUDIT_AUDIO_FILE to the downloaded production MP3');
const data=JSON.parse(fs.readFileSync(root+'/content-v2.json','utf8'));
const episode=data.episodes.find(e=>Number(e.number)===episodeNumber);
const audit=JSON.parse(fs.readFileSync(root+'/summary-audits/episode-'+episodeNumber+'.json','utf8'));
if(data.questions.some(q=>Number(q.episode)===episodeNumber))throw new Error('FAQ episodes are outside this audit');
const mp3=fs.readFileSync(process.env.VEDATOR_AUDIT_AUDIO_FILE);
const mp3Sha256=crypto.createHash('sha256').update(mp3).digest('hex');
if(mp3Sha256!==audit.source.audioSha256||episode.enclosure!==audit.source.audioUrl)throw new Error('Audio does not match the recorded production source');
const mathRoot=path.dirname(require.resolve('mathjax-full/package.json'));
const mime={'.js':'application/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+'/')||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;const results=[];
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await (require('@sparticuz/chromium').default||require('@sparticuz/chromium')).executablePath(),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--single-process','--mute-audio'],headless:'shell',pipe:true});
 const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.setRequestInterception(true);
 page.on('request',req=>{
  if(req.url().startsWith(origin))return req.continue();
  if(req.url()===episode.enclosure){
   const range=req.headers().range?.match(/^bytes=(\d+)-(\d*)$/);
   if(range){
    const start=Number(range[1]),end=Math.min(mp3.length-1,range[2]?Number(range[2]):mp3.length-1);
    return req.respond({status:206,contentType:'audio/mpeg',headers:{'accept-ranges':'bytes','content-range':`bytes ${start}-${end}/${mp3.length}`,'content-length':String(end-start+1)},body:mp3.subarray(start,end+1)});
   }
   return req.respond({status:200,contentType:'audio/mpeg',headers:{'accept-ranges':'bytes','content-length':String(mp3.length)},body:mp3});
  }
  const prefix='https://cdn.jsdelivr.net/npm/mathjax@3/es5/';
  if(req.url().startsWith(prefix)){
   const file=path.resolve(mathRoot,'es5',req.url().slice(prefix.length));
   if(fs.existsSync(file))return req.respond({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  }
  return req.abort();
 });
 // Native media load, decode, duration, seeking, play and pause are preserved.
 await page.goto(origin+'/#episode='+episodeNumber,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1');
 for(const [language,buttonLang] of [['cs','cz'],['sk','sk']]){
  await page.click('[data-lang="'+buttonLang+'"]');
  for(const surface of ['summary','nonquestions']){
   for(const [index,ch] of data.nonquestions.episodes[String(episodeNumber)][language].entries()){
    await page.evaluate(()=>{const close=document.querySelector('#player-close-v2');if(close?.getClientRects().length)close.click()});
    await page.evaluate(hash=>{location.hash=hash},surface==='summary'?'#episode='+episodeNumber:'#nonquestion='+episodeNumber+':'+index);
    const summary='#episodes-v2 article[data-episode="'+episodeNumber+'"] .episode-summary-v2';
    if(surface==='summary'){await page.waitForSelector(summary);await page.$eval(summary,s=>{s.open=true})}
    const selector=surface==='summary'?summary+' .episode-chapter-play-v2[data-seconds="'+ch.seconds+'"]':'#nonquestions-v2 .question-card .play[data-episode="'+episodeNumber+'"][data-seconds="'+ch.seconds+'"]';
    await page.waitForSelector(selector);
    await page.locator(selector).setWaitForStableBoundingBox(true).click();
    await page.waitForFunction(({url,seconds})=>{const a=document.querySelector('#audio-v2');return a.src===url&&a.readyState>=1&&Math.abs(a.currentTime-seconds)<1},{timeout:20000},{url:episode.enclosure,seconds:ch.seconds}).catch(async error=>{throw new Error(`${language}/${surface}/${index}: ${JSON.stringify(await page.$eval('#audio-v2',a=>({src:a.src,time:a.currentTime,duration:a.duration,readyState:a.readyState,networkState:a.networkState,error:a.error?.message,help:document.querySelector('#player-help-v2')?.textContent})))}: ${error.message}`)});
    const result=await page.$eval('#audio-v2',a=>{a.pause();return {src:a.src,currentTime:a.currentTime,duration:a.duration,readyState:a.readyState}});
    if(Math.abs(result.duration-audit.source.audioDurationSeconds)>1)throw new Error('Wrong decoded recording length');
    results.push({index,language,surface,time:ch.time,seconds:ch.seconds,...result});
   }
  }
 }
 if(process.env.VEDATOR_AUDIT_BROWSER_OUTPUT)fs.writeFileSync(process.env.VEDATOR_AUDIT_BROWSER_OUTPUT,JSON.stringify({ok:true,episode:episodeNumber,mediaStub:false,mp3Sha256,mp3ServedFromExactDownloadedProductionFile:true,directListening:false,results},null,2));
 console.log(JSON.stringify({ok:true,physicalClicks:results.length,mediaStub:false,realMP3Decoded:true,maxPlaybackClockDifferenceSeconds:Math.max(...results.map(r=>Math.abs(r.currentTime-r.seconds)))},null,2));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}

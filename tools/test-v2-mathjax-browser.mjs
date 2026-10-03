import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

const root=process.cwd();
const require=createRequire(path.resolve(process.env.VEDATOR_TEST_DEPS||root,'package.json'));
const puppeteer=require('puppeteer-core');
const chromiumModule=require('@sparticuz/chromium');
const chromium=chromiumModule.default||chromiumModule;
const mathRoot=path.dirname(require.resolve('mathjax-full/package.json'));
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const audits=fs.existsSync('summary-audits')?fs.readdirSync('summary-audits').filter(file=>/^episode-\d+\.json$/.test(file)).map(file=>JSON.parse(fs.readFileSync('summary-audits/'+file,'utf8'))):[];
const seekResults=[];
const expressions=new Set();
function collect(copy){for(const value of [copy?.title,...(copy?.points||[])])if(typeof value==='string')for(const match of value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g))expressions.add(match[1]||match[2])}
for(const question of data.questions){collect(question);Object.values(question.i18n||{}).forEach(collect)}
for(const languages of Object.values(data.nonquestions.episodes))for(const rows of Object.values(languages))if(Array.isArray(rows))rows.forEach(collect);
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2'};
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){response.writeHead(404);response.end();return}
  response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const errors=[];
let mathScriptRequests=0;
try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await chromium.executablePath(),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-software-rasterizer'],headless:'shell',pipe:true});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request',request=>{
    if(request.url().startsWith(origin))return request.continue();
    const prefix='https://cdn.jsdelivr.net/npm/mathjax@3/es5/';
    if(request.url().startsWith(prefix)){
      const relative=request.url().slice(prefix.length).split('?')[0];
      if(relative==='tex-chtml.js')mathScriptRequests++;
      const file=path.resolve(mathRoot,'es5',relative);
      if(fs.existsSync(file))return request.respond({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    }
    return request.abort();
  });
  await page.evaluateOnNewDocument(()=>{
    localStorage.setItem('vedator-ui-language-v1','cz');
    HTMLMediaElement.prototype.play=()=>Promise.resolve();
    HTMLMediaElement.prototype.pause=()=>{};
    HTMLMediaElement.prototype.load=function(){this.currentTime=0;queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')))};
    Object.defineProperty(HTMLMediaElement.prototype,'duration',{get:()=>7200});
  });
  await page.goto(origin+'/#episode=153',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1');
  assert(mathScriptRequests===0,'MathJax loaded before any summary was opened');
  const waitCompiled=async selector=>{
    await page.waitForFunction(selector=>{
      const root=document.querySelector(selector);if(!root)return false;
      const nodes=[...root.querySelectorAll('.math-tex-v2')];
      return nodes.length>0&&nodes.every(node=>node.querySelector('mjx-container'));
    },{timeout:20000},selector).catch(async error=>{throw new Error(`${error.message}: ${selector} ${JSON.stringify(await page.$eval(selector,root=>({text:root.textContent.slice(0,250),formulas:root.querySelectorAll('.math-tex-v2').length,rendered:root.querySelectorAll('mjx-container').length})))}`)});
    const result=await page.$eval(selector,root=>({formulas:root.querySelectorAll('mjx-container').length,errors:root.querySelectorAll('mjx-merror,[data-mjx-error]').length,broken:root.querySelectorAll('.math-tex-v2 mark').length,raw:[...root.querySelectorAll('.math-tex-v2')].some(node=>/\\[()[\]]/.test(node.textContent))}));
    assert(!result.errors&&!result.broken&&!result.raw,`Invalid rendered math: ${selector} ${JSON.stringify(result)}`);
    return result.formulas;
  };
  const episodeSummary=episode=>`#episodes-v2 article[data-episode="${episode}"] .episode-summary-v2`;
  const cases=[...new Set([153,175,158,163,187,195,201,282,340,356,89,...audits.map(audit=>audit.episode)])];
  const checkSeek=async(selector,episode,seconds)=>{
    const enclosure=data.episodes.find(row=>Number(row.number)===Number(episode)).enclosure;
    await page.evaluate(()=>{const close=document.querySelector('#player-close-v2');if(close&&close.getClientRects().length)close.click()});
    // Deep-link navigation and closing the player can move the long summary.
    // Wait for a stable button before issuing the physical pointer click.
    await page.locator(selector).setWaitForStableBoundingBox(true).click();
    await page.waitForFunction(({enclosure,seconds})=>{const audio=document.querySelector('#audio-v2');return audio?.src===enclosure&&audio.currentTime===seconds},{timeout:5000},{enclosure,seconds}).catch(async error=>{throw new Error(`Seek failed ${selector} expected=${seconds}: ${JSON.stringify(await page.$eval('#audio-v2',audio=>({src:audio.src,time:audio.currentTime,duration:audio.duration,readyState:audio.readyState,help:document.querySelector('#player-help-v2')?.textContent})))}`)});
    return page.$eval('#audio-v2',audio=>audio.currentTime);
  };
  let renderedCases=0;
  for(const lang of ['cz','sk']){
    await page.click(`[data-lang="${lang}"]`);
    for(const episode of cases){
      await page.evaluate(episode=>{location.hash='#episode='+episode},episode);
      const selector=episodeSummary(episode);
      await page.waitForSelector(selector);
      await page.$eval(selector,summary=>{summary.open=true});
      const formulaCount=await page.$eval(selector,summary=>summary.querySelectorAll('.math-tex-v2').length);
      if(formulaCount)await waitCompiled(selector);
      const audit=audits.find(audit=>Number(audit.episode)===Number(episode));
      if(audit){
        for(const [index,proof] of audit.chapters.entries()){
          await page.$eval(selector,summary=>{summary.open=true});
          const seconds=proof.time.split(':').reduce((total,part)=>total*60+Number(part),0);
          const button=`${selector} .episode-chapter-play-v2[data-seconds="${seconds}"]`;
          const label=await page.$eval(button,button=>button.textContent);
          assert(label.includes(proof.time),`Displayed summary time differs in ${episode}:${index}:${lang}`);
          const currentTime=await checkSeek(button,episode,seconds);
          seekResults.push({episode,index,lang,surface:'summary',time:proof.time,seconds,currentTime});
        }
      }
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert(overflow<=1,`Math overflow on mobile in episode ${episode}: ${overflow}px`);
      renderedCases++;
    }
  }
  for(const lang of ['cz','sk']){
    await page.click(`[data-lang="${lang}"]`);
    for(const audit of audits){
      for(const [index,proof] of audit.chapters.entries()){
        const seconds=proof.time.split(':').reduce((total,part)=>total*60+Number(part),0);
        await page.evaluate(({episode,index})=>{location.hash='#nonquestion='+episode+':'+index},{episode:audit.episode,index});
        const button=`#nonquestions-v2 .question-card .play[data-episode="${audit.episode}"][data-seconds="${seconds}"]`;
        await page.waitForSelector(button);
        const label=await page.$eval(button,button=>button.closest('.question-card').querySelector('.meta').textContent);
        assert(label.includes(proof.time),`Displayed nonquestion time differs in ${audit.episode}:${index}:${lang}`);
        const currentTime=await checkSeek(button,audit.episode,seconds);
        seekResults.push({episode:audit.episode,index,lang,surface:'nonquestions',time:proof.time,seconds,currentTime});
      }
    }
  }
  await page.click('[data-lang="cz"]');
  for(const [view,query] of [['nonquestions','Euler'],['nonquestions','mc²'],['questions','10^32']]){
    await page.click(`.tab-v2[data-view="${view}"]`);
    await page.$eval('#search-v2',(input,query)=>{input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}))},query);
    await waitCompiled(`#${view}-v2`);
  }
  const allFormulas=await page.evaluate(async expressions=>{
    const root=document.createElement('div');root.id='mathjax-expression-audit';
    for(const expression of expressions){const node=document.createElement('div');node.textContent='\\('+expression+'\\)';root.appendChild(node)}
    document.body.appendChild(root);
    await MathJax.startup.promise;await MathJax.typesetPromise([root]);
    const result={rendered:root.querySelectorAll('mjx-container').length,errors:root.querySelectorAll('mjx-merror,[data-mjx-error]').length};
    MathJax.typesetClear([root]);root.remove();return result;
  },[...expressions]);
  assert(allFormulas.rendered===expressions.size&&!allFormulas.errors,'Some summary formulas failed actual MathJax typesetting');
  assert(mathScriptRequests===1,`MathJax script loaded ${mathScriptRequests} times`);
  assert(errors.length===0,'Browser errors: '+errors.join('; '));
  if(process.env.VEDATOR_AUDIT_BROWSER_OUTPUT)fs.writeFileSync(process.env.VEDATOR_AUDIT_BROWSER_OUTPUT,JSON.stringify({ok:true,mediaStub:true,audioSynchronizationVerifiedByThisTest:false,seekResults},null,2));
  console.log(JSON.stringify({ok:true,mathjaxVersion:require('mathjax-full/package.json').version,uniqueFormulas:expressions.size,renderedCases,languages:['cs','sk'],searchPreservesFormulas:true,lazyLoad:true,singleMathJaxScript:true,mobileWidth:390,noMathErrors:true,auditedSummarySeekClicks:seekResults.length},null,2));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}

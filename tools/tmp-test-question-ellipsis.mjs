import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer((request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname==='/'?'/v2.html':new URL(request.url,'http://127.0.0.1').pathname);
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root)||!fs.existsSync(file)){response.writeHead(404);response.end('not found');return}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(response);
  }catch(error){response.writeHead(500);response.end(String(error))}
});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));

const executablePath=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(fs.existsSync);
assert(executablePath,'Chromium/Chrome nenalezen');
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});

async function inspectView(view){
  await page.click(`.tab-v2[data-view="${view}"]`);
  await new Promise(resolve=>setTimeout(resolve,1200));
  return page.evaluate((view)=>{
    const root=document.querySelector(view==='questions'?'#questions-v2':'#nonquestions-v2');
    const lastVisibleRect=answer=>{
      const bounds=answer.getBoundingClientRect(),walker=document.createTreeWalker(answer,NodeFilter.SHOW_TEXT);let best=null;
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.nodeValue?.trim()||node.parentElement?.closest('.question-ellipsis-v2'))continue;
        const range=document.createRange();range.selectNodeContents(node);
        for(const rect of range.getClientRects()){
          if(rect.width<=0||rect.height<=0||rect.top<bounds.top-1||rect.bottom>bounds.bottom+1)continue;
          if(!best||rect.bottom>best.bottom+1||(Math.abs(rect.bottom-best.bottom)<=1&&rect.right>best.right))best={right:rect.right,top:rect.top,bottom:rect.bottom};
        }
      }
      return best;
    };
    const errors=[],clipped=[];let shortWithMarker=0;
    for(const card of root.querySelectorAll('.question-card')){
      const answer=card.querySelector('.question-answer'),button=card.querySelector('.question-more'),marker=card.querySelector('.question-ellipsis-v2');
      if(!answer||!button)continue;
      const hasMore=!button.classList.contains('hidden');
      if(!hasMore){if(marker&&!marker.hidden)shortWithMarker++;continue}
      if(!marker||marker.hidden){errors.push({item:card.dataset.item,reason:'missing-marker'});continue}
      const line=lastVisibleRect(answer),box=answer.getBoundingClientRect(),dot=marker.getBoundingClientRect();
      if(!line){errors.push({item:card.dataset.item,reason:'missing-visible-line'});continue}
      const expectedLeft=Math.min(box.right-dot.width,line.right+2),dx=Math.abs(dot.left-expectedLeft),dy=Math.abs(dot.top-line.top);
      clipped.push({item:card.dataset.item,dx,dy});
      if(dx>5||dy>4||dot.right>box.right+1)errors.push({item:card.dataset.item,reason:'misplaced',dx,dy,lineRight:line.right,dotLeft:dot.left,dotTop:dot.top,lineTop:line.top,answerRight:box.right});
    }
    return{view,cards:root.querySelectorAll('.question-card').length,clipped:clipped.length,shortWithMarker,errors,maxDx:clipped.length?Math.max(...clipped.map(x=>x.dx)):0,maxDy:clipped.length?Math.max(...clipped.map(x=>x.dy)):0,firstClipped:clipped[0]?.item||''};
  },view);
}

try{
  await page.goto('http://127.0.0.1:4173/v2.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1',{timeout:15000});

  const questions=await inspectView('questions');
  const nonquestions=await inspectView('nonquestions');
  for(const result of [questions,nonquestions]){
    assert(result.cards>0,`${result.view}: žádné karty`);
    assert(result.clipped>0,`${result.view}: žádná zkrácená karta pro kontrolu`);
    assert(result.shortWithMarker===0,`${result.view}: výpustka se ukazuje i u krátké odpovědi`);
    assert(result.errors.length===0,`${result.view}: chybné výpustky ${JSON.stringify(result.errors.slice(0,5))}`);
  }

  await page.click('.tab-v2[data-view="questions"]');await new Promise(resolve=>setTimeout(resolve,120));
  await page.evaluate(id=>document.querySelector(`.question-card[data-item="${CSS.escape(id)}"] .question-more`)?.click(),questions.firstClipped);
  await new Promise(resolve=>setTimeout(resolve,80));
  const markerVisibleAfterOpen=await page.evaluate(id=>{const marker=document.querySelector(`.question-card[data-item="${CSS.escape(id)}"] .question-ellipsis-v2`);return Boolean(marker&&!marker.hidden)},questions.firstClipped);
  assert(!markerVisibleAfterOpen,'Výpustka zůstala po otevření odpovědi');

  console.log(JSON.stringify({ok:true,questions:{cards:questions.cards,clipped:questions.clipped,maxDx:Number(questions.maxDx.toFixed(2)),maxDy:Number(questions.maxDy.toFixed(2))},nonquestions:{cards:nonquestions.cards,clipped:nonquestions.clipped,maxDx:Number(nonquestions.maxDx.toFixed(2)),maxDy:Number(nonquestions.maxDy.toFixed(2))},opensCleanly:true},null,2));
}finally{
  await page.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}

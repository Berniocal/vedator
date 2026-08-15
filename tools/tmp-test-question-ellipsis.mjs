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

try{
  await page.goto('http://127.0.0.1:4173/v2.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1',{timeout:15000});
  await page.click('.tab-v2[data-view="questions"]');
  await new Promise(resolve=>setTimeout(resolve,1200));

  const result=await page.evaluate(()=>{
    const lastVisibleRect=answer=>{
      const bounds=answer.getBoundingClientRect(),walker=document.createTreeWalker(answer,NodeFilter.SHOW_TEXT);let best=null;
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.nodeValue?.trim()||node.parentElement?.closest('.question-ellipsis-v2'))continue;
        const range=document.createRange();range.selectNodeContents(node);
        for(const rect of range.getClientRects()){
          if(rect.width<=0||rect.height<=0||rect.top<bounds.top-1||rect.bottom>bounds.bottom+1)continue;
          if(!best||rect.bottom>best.bottom+1||(Math.abs(rect.bottom-best.bottom)<=1&&rect.right>best.right))best={right:rect.right,top:rect.top};
        }
      }
      return best;
    };
    for(const card of document.querySelectorAll('#questions-v2 .question-card')){
      const answer=card.querySelector('.question-answer'),button=card.querySelector('.question-more'),marker=card.querySelector('.question-ellipsis-v2');
      if(!answer||!button||button.classList.contains('hidden')||!marker||marker.hidden)continue;
      const line=lastVisibleRect(answer),box=answer.getBoundingClientRect(),dot=marker.getBoundingClientRect();
      if(line&&line.right<box.right-32)return{item:card.dataset.item,lineRight:line.right,lineTop:line.top,answerRight:box.right,dotLeft:dot.left,dotTop:dot.top,dotRight:dot.right};
    }
    return null;
  });
  assert(result,'Nenalezena vhodná zkrácená otázka pro kontrolu výpustky');
  assert(Math.abs(result.dotLeft-result.lineRight)<=10,`Výpustka není u konce textu: ${JSON.stringify(result)}`);
  assert(Math.abs(result.dotTop-result.lineTop)<=4,`Výpustka není na stejném řádku: ${JSON.stringify(result)}`);
  assert(result.dotRight<=result.answerRight+1,`Výpustka přetéká odpověď: ${JSON.stringify(result)}`);

  await page.evaluate(id=>document.querySelector(`.question-card[data-item="${CSS.escape(id)}"] .question-more`)?.click(),result.item);
  await new Promise(resolve=>setTimeout(resolve,80));
  const markerVisibleAfterOpen=await page.evaluate(id=>{const marker=document.querySelector(`.question-card[data-item="${CSS.escape(id)}"] .question-ellipsis-v2`);return Boolean(marker&&!marker.hidden)},result.item);
  assert(!markerVisibleAfterOpen,'Výpustka zůstala po otevření odpovědi');

  console.log(JSON.stringify({ok:true,item:result.item,ellipsisAtTextEnd:true,deltaPx:Number(Math.abs(result.dotLeft-result.lineRight).toFixed(2)),opensCleanly:true},null,2));
}finally{
  await page.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}

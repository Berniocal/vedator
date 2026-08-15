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
    const textRects=answer=>{
      const walker=document.createTreeWalker(answer,NodeFilter.SHOW_TEXT),out=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.nodeValue?.trim()||node.parentElement?.closest('.question-ellipsis-v2'))continue;
        const range=document.createRange();range.selectNodeContents(node);
        for(const rect of range.getClientRects())if(rect.width>0&&rect.height>0)out.push({text:node.nodeValue.trim().slice(0,30),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom});
      }
      return out;
    };
    for(const card of document.querySelectorAll('#questions-v2 .question-card')){
      const answer=card.querySelector('.question-answer'),button=card.querySelector('.question-more'),marker=card.querySelector('.question-ellipsis-v2');
      if(!answer||!button||button.classList.contains('hidden')||!marker||marker.hidden)continue;
      const box=answer.getBoundingClientRect(),rects=textRects(answer),visible=rects.filter(rect=>rect.top>=box.top-1&&rect.bottom<=box.bottom+1),line=visible.sort((a,b)=>a.bottom-b.bottom||a.right-b.right).at(-1),dot=marker.getBoundingClientRect();
      if(line&&line.right<box.right-32)return{item:card.dataset.item,lineRight:line.right,lineTop:line.top,answer:{left:box.left,right:box.right,top:box.top,bottom:box.bottom,clientHeight:answer.clientHeight,scrollHeight:answer.scrollHeight},dot:{left:dot.left,right:dot.right,top:dot.top,bottom:dot.bottom,styleLeft:marker.style.left,styleTop:marker.style.top},visibleTail:visible.slice(-8),allTail:rects.slice(-12)};
    }
    return null;
  });
  assert(result,'Nenalezena vhodná zkrácená otázka pro kontrolu výpustky');
  const deltaX=Math.abs(result.dot.left-result.lineRight),deltaY=Math.abs(result.dot.top-result.lineTop);
  if(deltaX>10||deltaY>4||result.dot.right>result.answer.right+1)throw new Error('Diagnostika výpustky: '+JSON.stringify(result));

  await page.evaluate(id=>document.querySelector(`.question-card[data-item="${CSS.escape(id)}"] .question-more`)?.click(),result.item);
  await new Promise(resolve=>setTimeout(resolve,80));
  const markerVisibleAfterOpen=await page.evaluate(id=>{const marker=document.querySelector(`.question-card[data-item="${CSS.escape(id)}"] .question-ellipsis-v2`);return Boolean(marker&&!marker.hidden)},result.item);
  assert(!markerVisibleAfterOpen,'Výpustka zůstala po otevření odpovědi');

  console.log(JSON.stringify({ok:true,item:result.item,ellipsisAtTextEnd:true,deltaPx:Number(deltaX.toFixed(2)),opensCleanly:true},null,2));
}finally{
  await page.close().catch(()=>{});
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}

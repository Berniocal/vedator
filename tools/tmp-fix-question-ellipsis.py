from pathlib import Path

app_path = Path('app-v2.js')
app = app_path.read_text(encoding='utf-8')
old = """  function queueQuestionMoreCheck(view){
    requestAnimationFrame(()=>{const root=view==='questions'?$('#questions-v2'):$('#nonquestions-v2');root?.querySelectorAll('.question-card').forEach(card=>{const answer=card.querySelector('.question-answer'),button=card.querySelector('.question-more');if(!answer||!button)return;button.classList.toggle('hidden',!card.classList.contains('open')&&answer.scrollHeight<=answer.clientHeight+2)})});
  }
"""
new = """  function placeQuestionEllipsis(answer,show){
    let marker=answer.querySelector('.question-ellipsis-v2');
    if(!show){marker?.remove();return}
    if(!marker){marker=document.createElement('span');marker.className='question-ellipsis-v2';marker.setAttribute('aria-hidden','true');marker.textContent='…';answer.appendChild(marker)}
    marker.hidden=true;
    const bounds=answer.getBoundingClientRect(),walker=document.createTreeWalker(answer,NodeFilter.SHOW_TEXT);let best=null;
    while(walker.nextNode()){
      const node=walker.currentNode,parent=node.parentElement;if(!node.nodeValue?.trim()||parent?.closest('.question-ellipsis-v2'))continue;
      const range=document.createRange();range.selectNodeContents(node);if(typeof range.getClientRects!=='function'){range.detach?.();continue}
      for(const rect of range.getClientRects()){
        if(rect.width<=0||rect.height<=0||rect.top<bounds.top-1||rect.bottom>bounds.bottom+1)continue;
        if(!best||rect.bottom>best.bottom+1||(Math.abs(rect.bottom-best.bottom)<=1&&rect.right>best.right))best=rect;
      }
      range.detach?.();
    }
    if(!best){marker.remove();return}
    const fontSize=parseFloat(getComputedStyle(answer).fontSize)||16,markerWidth=Math.max(18,fontSize*1.15),x=Math.max(0,Math.min(answer.clientWidth-markerWidth,best.right-bounds.left+2)),y=Math.max(0,best.top-bounds.top);
    marker.style.left=x+'px';marker.style.top=y+'px';marker.style.height=best.height+'px';marker.hidden=false;
  }
  function queueQuestionMoreCheck(view){
    requestAnimationFrame(()=>{const root=view==='questions'?$('#questions-v2'):$('#nonquestions-v2');root?.querySelectorAll('.question-card').forEach(card=>{const answer=card.querySelector('.question-answer'),button=card.querySelector('.question-more');if(!answer||!button)return;const open=card.classList.contains('open'),marker=answer.querySelector('.question-ellipsis-v2');if(marker)marker.hidden=true;const clipped=!open&&answer.scrollHeight>answer.clientHeight+2;button.classList.toggle('hidden',!open&&!clipped);placeQuestionEllipsis(answer,clipped)})});
  }
  let questionEllipsisResizeFrame=0;
  window.addEventListener('resize',()=>{if(state.view!=='questions'&&state.view!=='nonquestions')return;if(questionEllipsisResizeFrame)cancelAnimationFrame(questionEllipsisResizeFrame);questionEllipsisResizeFrame=requestAnimationFrame(()=>{questionEllipsisResizeFrame=0;queueQuestionMoreCheck(state.view)})},{passive:true});
"""
if old in app:
    app = app.replace(old, new, 1)
elif 'function placeQuestionEllipsis(answer,show)' not in app:
    raise SystemExit('Nenalezen očekávaný queueQuestionMoreCheck blok')

old_typeset = "  function parityTypeset(root){if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([root]).catch(()=>{})}"
new_typeset = "  function parityTypeset(root){const refresh=()=>{const view=root?.id==='questions-v2'?'questions':root?.id==='nonquestions-v2'?'nonquestions':'';if(view)queueQuestionMoreCheck(view)};if(window.MathJax?.typesetPromise)return window.MathJax.typesetPromise([root]).then(refresh,()=>{});refresh();return Promise.resolve()}"
if old_typeset in app:
    app = app.replace(old_typeset, new_typeset, 1)
elif 'function parityTypeset(root){const refresh=' not in app:
    raise SystemExit('Nenalezen očekávaný parityTypeset blok')

app_path.write_text(app, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
old_css = '.question-card:not(.open):has(.question-more:not(.hidden)) .question-answer{position:relative}\n.question-card:not(.open):has(.question-more:not(.hidden)) .question-answer::after{content:"...";position:absolute;right:0;bottom:0;width:3.2em;height:1.5em;display:flex;align-items:center;justify-content:flex-end;padding-right:.15rem;background:linear-gradient(90deg,transparent 0,var(--card) 42%);color:var(--ink);font-weight:700;pointer-events:none}'
new_css = '.question-card .question-answer{position:relative}\n.question-card .question-answer::after{content:none!important}\n.question-ellipsis-v2{position:absolute;z-index:2;display:inline-flex;align-items:center;padding:0 .08em;background:var(--card);color:var(--ink);font-weight:700;line-height:1;white-space:nowrap;pointer-events:none}\n.question-ellipsis-v2[hidden]{display:none!important}'
if old_css in index:
    index_path.write_text(index.replace(old_css, new_css, 1), encoding='utf-8')
elif '.question-ellipsis-v2{' not in index:
    raise SystemExit('Nenalezen očekávaný CSS blok výpustky')

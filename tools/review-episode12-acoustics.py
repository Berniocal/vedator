"""Expose actual acoustic boundaries, source words, ASR checks and distributed anchors."""
import json
from pathlib import Path
R=Path(__file__).resolve().parent.parent; S=R/'captions/source'
def read(p):return json.loads(p.read_text())
d=read(S/'episode-12-draft.sk.json')
out={'episode':12,'audioSha256':d['source']['audioSha256'],'humanListeningVerified':False,
'sourceWordsAroundDisputedFiller':[w for w in d['words'] if 2149<=w['start']<=2152]}
f=R/'captions/episode-12.json';a=S/'episode-12-alignment.json'
if f.exists() and a.exists():
 c=read(f)['cues']; rows=read(a)['cues']
 evidence=[]
 for p in sorted(S.glob('episode-12-*checks.sk.json')):
  v=read(p)
  if v.get('model')=='large-v3':
   for x in v.get('passages',[]):evidence.append({'file':str(p.relative_to(R)),**x})
 def context(i):
  z=rows[i]; v=c[i]
  return {'cue':i+1,**{k:z[k] for k in ['start','end','meanCharacterScore','alignmentText']},
   'text':v['text'],'asrWordRange':v['asrWordRange'],
   'independentAsr':[e for e in evidence if e['start']<=z['end'] and e['end']>=z['start']]}
 out.update(status='actual-final-boundaries-awaiting-specific-editorial-decisions',
  cueCount=len(c),lowScores=[context(i) for i,z in enumerate(rows) if z['meanCharacterScore']<.35],
  nearLowScores=[context(i) for i,z in enumerate(rows) if .35<=z['meanCharacterScore']<.45],
  distributedAnchors=[context(min(range(len(c)),key=lambda i:abs(c[i]['start']-t))) for t in range(0,2912,180)],
  gaps=[{'seconds':round(c[i]['start']-c[i-1]['end'],3),'previous':context(i-1),'following':context(i)} for i in range(1,len(c)) if c[i]['start']-c[i-1]['end']>1.5],
  first=context(0),last=context(len(c)-1))
else:out['status']='no-complete-final-acoustic-output-yet'
p=S/'episode-12-acoustic-boundary-review.json'
p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(out,ensure_ascii=False,indent=2))

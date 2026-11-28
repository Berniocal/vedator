"""Apply manually reviewed whitespace-only mobile layouts; preserve speech and timing."""
import hashlib,json,re
from pathlib import Path
R=Path(__file__).resolve().parent.parent;C=R/'captions';S=C/'source'
def read(p):return json.loads(p.read_text())
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def flat(t):return re.sub(r'\s+',' ',t).strip()
def core(d):return [{**c,'text':{l:flat(t) for l,t in c['text'].items()}} for c in d['cues']]
def srt_time(t):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'
def main():
 p=C/'episode-12.json';d=read(p);e=read(C/'episode-12.edited.json');choices=read(S/'episode-12-layout-overrides.json')
 assert choices['editoriallyReviewed'] is True
 before=sha(p);original=core(d)
 for a,b in zip(d['cues'],e['cues']):
  assert a['asrWordRange']==b['asrWordRange']
  assert all(flat(a['text'][l])==flat(b['text'][l]) for l in ('cs','sk'))
 seen=set()
 for x in choices['overrides']:
  key=x['cue'],x['language'];assert key not in seen;seen.add(key)
  cue=d['cues'][x['cue']-1];lang=x['language']
  assert flat(x['text'])==flat(cue['text'][lang])==x['flatText']
  assert len(x['text'].split('\n'))<=2 and max(map(len,x['text'].split('\n')))<=48
  assert not any(re.search(r'(?:^| )[aikosuvz]$',z,re.I) for z in x['text'].split('\n')[:-1])
  cue['text'][lang]=x['text']
 assert core(d)==original
 write(p,d);after=sha(p)
 for lang in ('cs','sk'):
  (C/f'episode-12.{lang}.srt').write_text('\n\n'.join(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text'][lang]}" for i,c in enumerate(d['cues'],1))+'\n')
 # The audio and every probed interval are identical. Preserve the original
 # caption-byte association while linking the same actual probes to new layout bytes.
 gpath=S/'episode-12-gap-ctc-checks.sk.json';g=read(gpath)
 assert g['captionSha256'] in (before,after)
 expected=[(0,round(d['cues'][0]['start'],3),'pre-roll')]
 expected += [(round(d['cues'][i-1]['end'],3),round(d['cues'][i]['start'],3),'between-'+str(i)+'-'+str(i+1)) for i in range(1,len(d['cues'])) if d['cues'][i]['start']-d['cues'][i-1]['end']>1.5]
 expected += [(round(d['cues'][-1]['end'],3),round(float(e['source']['duration']),3),'final-tail')]
 assert [(v['start'],v['end'],v['label']) for v in g['passages']]==expected
 if before!=after:
  g.setdefault('preLayoutCaptionSha256',before);g['captionSha256']=after
  g['layoutOnlyChange']={'file':'captions/source/episode-12-layout-overrides.json','speechTextAndTimingUnchanged':True}
  write(gpath,g)
 lowpath=S/'episode-12-reviewed-low-score.json';low=read(lowpath)
 for x in low['exceptions']:
  value=d['cues'][x['cue']-1]['text']['sk'];assert flat(x['text'])==flat(value);x['text']=value
 write(lowpath,low)
 review=read(C/'episode-12.review.json');review['validatedForRegistration']=False;review.pop('registrationChecks',None)
 review['status']='acoustically-reviewed-awaiting-final-mobile-layout-verification'
 review['layoutOverrides']=len(choices['overrides']);write(C/'episode-12.review.json',review)
 write(S/'episode-12-layout-application.json',{'episode':12,'captionSha256Before':before,'captionSha256After':after,'speechTextTimingWordRangesAndRecoveredSpeechUnchanged':True,'layoutOverrides':len(choices['overrides']),'sourceLayoutFile':'captions/source/episode-12-layout-overrides.json','srtSha256':{l:sha(C/f'episode-12.{l}.srt') for l in ('cs','sk')}})
 print(json.dumps({'episode':12,'overrides':len(choices['overrides']),'before':before,'after':after,'speechAndTimingUnchanged':True}))
if __name__=='__main__':main()

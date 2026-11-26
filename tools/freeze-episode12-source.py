#!/usr/bin/env python3
"""Freeze original ASR integrity and export a complete review view, never subtitles."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'captions/source'
file=SOURCE/'episode-12-draft.sk.json'
draft=json.loads(file.read_text())
identity=json.loads((SOURCE/'episode-12-source-identity.json').read_text())
assert draft['episode']==12 and draft['guid']==identity['guid']
assert draft['source']['audioSha256']==identity['audioSha256']
assert draft['source']['model']=='large-v3-turbo'
assert draft['source']['language']=='sk' and draft['source']['wordTimestamps'] is True
words=draft['words'];cursor=0
for i,cue in enumerate(draft['cues'],1):
    a,b=cue['asrWordRange'];assert a==cursor and a<b<=len(words)
    assert cue['text']==' '.join(w['text'] for w in words[a:b])
    assert cue['start']==words[a]['start'] and cue['end']==words[b-1]['end']
    cursor=b
assert cursor==len(words)
for i,w in enumerate(words):
    assert 0<=w['start']<=w['end']<=identity['duration']+.2
    assert not i or w['start']>=words[i-1]['start']
integrity={'episode':12,'status':'complete-ASR-integrity-verified-not-editorial-approval',
           'transcriptSha256':hashlib.sha256(file.read_bytes()).hexdigest(),
           'audioSha256':identity['audioSha256'],'wordCount':len(words),'cueCount':len(draft['cues']),
           'allSourceWordsContiguouslyCovered':True,'editorialReviewComplete':False}
frozen=SOURCE/'episode-12-source-integrity.json'
if frozen.exists():assert json.loads(frozen.read_text())==integrity, 'Frozen source changed; investigate rather than replacing its hash'
else:frozen.write_text(json.dumps(integrity,ensure_ascii=False,indent=2)+'\n')
view='\n'.join(f"{i}\t{c['start']:.3f}\t{c['end']:.3f}\t{c['text']}" for i,c in enumerate(draft['cues'],1))+'\n'
(SOURCE/'episode-12-source-review.tsv').write_text(view)
print(json.dumps(integrity,ensure_ascii=False))

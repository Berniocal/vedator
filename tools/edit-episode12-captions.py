#!/usr/bin/env python3
"""Build reviewed bilingual utterances, preserving source-word coverage."""
import difflib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'captions/source'

def wrap(text):
    if len(text) <= 48:
        return text
    choices = [i for i, ch in enumerate(text) if ch == ' ' and i <= 48 and len(text)-i-1 <= 48]
    if not choices:
        return None
    i = min(choices, key=lambda i: abs(i-(len(text)-1)/2))
    return text[:i]+'\n'+text[i+1:]

def main():
    draft = json.loads((SOURCE/'episode-12-draft.sk.json').read_text())
    pairs = [line.split('\t') for line in (SOURCE/'episode-12-editorial-bilingual.tsv').read_text().splitlines()]
    assert len(pairs) == len(draft['cues'])
    cues = []
    for i, (c, (sk, cs)) in enumerate(zip(draft['cues'], pairs), 1):
        # Explicit bilingual phrase boundaries are checked in with the editorial text.
        parts_sk, parts_cs = sk.split('|'), cs.split('|')
        assert len(parts_sk) == len(parts_cs), i
        lo, hi = c['asrWordRange']
        tokens = sk.replace('|', ' ').split()
        original = [w['text'] for w in draft['words'][lo:hi]]
        norm = lambda s: re.sub(r'\W', '', s.lower())
        matcher = difflib.SequenceMatcher(a=list(map(norm, tokens)), b=list(map(norm, original)), autojunk=False)
        anchors = {a+k: b+k for a,b,n in matcher.get_matching_blocks() for k in range(n)}
        offset = 0
        for j, (s, t) in enumerate(zip(parts_sk, parts_cs)):
            s,t = s.strip(),t.strip()
            count = len(s.split());boundary = offset+count
            if j == len(parts_sk)-1:
                end_word = hi
            else:
                relative = anchors.get(boundary)
                if relative is None:
                    relative = round(boundary/len(tokens)*(hi-c['asrWordRange'][0]))
                end_word = max(lo+1,min(hi-(len(parts_sk)-j-1), c['asrWordRange'][0]+relative))
            assert lo < end_word <= hi, (i,lo,end_word)
            words = draft['words'][lo:end_word]
            cues.append({'start':words[0]['start'],'end':words[-1]['end'],
                         'asrWordRange':[lo,end_word],'sourceCues':[i], 'text':{'sk':s,'cs':t}})
            lo,offset = end_word,boundary
    # Join source fragments where both languages fit and there is no long pause.
    merged=[]
    for cue in cues:
        prev = merged[-1] if merged else None
        short = prev and min(len(prev['text']['sk']),len(cue['text']['sk'])) < 23
        joined = {l:prev['text'][l]+' '+cue['text'][l] for l in ('sk','cs')} if prev else {}
        if (prev and short and not prev.get('recoveredSpeech') and not cue.get('recoveredSpeech')
            and cue['start']-prev['end'] < 1.2 and cue['end']-prev['start'] < 7
            and not re.search(r'[.!?…]$',prev['text']['sk']) and all(wrap(v) for v in joined.values())):
            prev.update(end=cue['end'],text=joined,asrWordRange=[prev['asrWordRange'][0],cue['asrWordRange'][1]],
                        sourceCues=prev['sourceCues']+cue['sourceCues'])
        else:
            merged.append(cue)
    for i,c in enumerate(merged,1):
        assert all(wrap(t) for t in c['text'].values()),(i,c['sourceCues'],c['text'])
        text=c['text']['sk']
        pronunciation_file=SOURCE/'episode-12-pronunciations.json'
        replacements=json.loads(pronunciation_file.read_text()) if pronunciation_file.exists() else {}
        for original,spoken in sorted(replacements.items(),key=lambda pair:-len(pair[0])):
            text=re.sub(r'(?<!\w)'+re.escape(original)+r'(?!\w)',spoken,text)
        assert not re.search(r'\d',text),(i,text)
        c['alignmentText']=text
    edited={'episode':12,'source':draft['source'],
            'review':{'status':'complete-model-assisted-bilingual-editorial-review-needs-independent-listening',
                      'completeSlovakEditorialReview':True,'completeCzechEditorialReview':True,
                      'note':'All Slovak and Czech text read and edited. Independent large-v3 checks resolve targeted passages. No claim of complete human listening or direct YouTube audio comparison.'},
            'checkWindows':json.loads((SOURCE/'episode-12-ctc-windows.json').read_text())['windows'],
            'cues':merged}
    (ROOT/'captions/episode-12.edited.json').write_text(json.dumps(edited,ensure_ascii=False,indent=2)+'\n')
    print('Reviewed bilingual cues:',len(merged))

if __name__ == '__main__':
    main()

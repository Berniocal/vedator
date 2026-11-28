"""Verify explicit bilingual editorial phrase cuts; never approve release captions."""
import difflib,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;S=ROOT/'captions/source'
draft=json.loads((S/'episode-12-manual-bilingual-draft.json').read_text())
source=json.loads((S/'episode-12-draft.sk.json').read_text())
plan=S/'episode-12-segmentation-review.tsv'
norm=lambda t:re.findall(r'\w+',t.casefold())
groups=[];issues=[];long=[];cursor=1
for line in plan.read_text().splitlines():
    key,sk,cs=line.split('\t')
    bounds=list(map(int,key.split('-')));a,b=bounds[0],bounds[-1]
    assert a==cursor and b>=a,(a,b,cursor)
    rows=draft['cues'][a-1:b]
    parts={'sk':sk.split('|'),'cs':cs.split('|')}
    assert len(parts['sk'])==len(parts['cs']),(key,len(parts['sk']),len(parts['cs']))
    for lang in ['sk','cs']:
        before=' '.join(c['text'][lang] for c in rows);after=' '.join(parts[lang])
        if norm(before)!=norm(after):
            diff=[(tag,' '.join(norm(before)[i:j]),' '.join(norm(after)[k:l])) for tag,i,j,k,l in difflib.SequenceMatcher(a=norm(before),b=norm(after),autojunk=False).get_opcodes() if tag!='equal']
            issues.append({'group':key,'language':lang,'differences':diff})
        for i,text in enumerate(parts[lang],1):
            assert text.strip()==text and text,(key,lang,i)
            if len(text)>48:long.append({'group':key,'part':i,'language':lang,'length':len(text),'text':text})
    lo,hi=rows[0]['asrWordRange'][0],rows[-1]['asrWordRange'][1]
    groups.append({'sourceCues':[a,b],'asrWordRange':[lo,hi],'parts':[{'sk':x,'cs':y} for x,y in zip(parts['sk'],parts['cs'])]})
    cursor=b+1
out={'episode':12,'status':'manual-semantic-segmentation-in-progress-not-release-approved','sourceTranscriptSha256':hashlib.sha256((S/'episode-12-draft.sk.json').read_bytes()).hexdigest(),'sourceGroupsReviewed':cursor-1,'sourceGroupsTotal':len(draft['cues']),'asrWordsInReviewedGroups':groups[-1]['asrWordRange'][1] if groups else 0,'totalAsrWords':len(source['words']),'groups':groups,'textDifferencesRequiringDecision':issues,'over48Characters':long,'publicationApproved':False}
(S/'episode-12-segmentation-review.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k!='groups'},ensure_ascii=False,indent=2))

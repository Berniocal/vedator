"""Build explicitly reviewed utterances and auditable acoustic text; never register."""
import difflib,hashlib,json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;S=ROOT/'captions/source'
def read(p):return json.loads(p.read_text())
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def tokens(s):return re.findall(r'\[[^\]]+\]|\S+',s)
def norm(s):return re.sub(r'[^\w%]','',s.casefold())
def unaccent(s):return ''.join(c for c in unicodedata.normalize('NFD',norm(s)) if not unicodedata.combining(c))
def boundaries(a,b,interpolate=False):
    out={0:0,len(a):len(b)}
    for tag,i,j,k,l in difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_opcodes():
        if tag=='equal' or j-i==l-k:
            for n in range(j-i+1):out.setdefault(i+n,k+n)
        else:
            out.setdefault(i,k);out.setdefault(j,l)
            if interpolate and j>i:
                for n in range(1,j-i):out.setdefault(i+n,k+round(n*(l-k)/(j-i)))
    return out
def main():
    draft_path=S/'episode-12-draft.sk.json';draft=read(draft_path)
    assert hashlib.sha256(draft_path.read_bytes()).hexdigest()=='0c1dbd2210c07a2edec585f18d2aadcae677ee2ed97d817be0887e9ddffc6d13'
    review=read(S/'episode-12-final-text-review.json')
    data=(S/'episode-12-segmentation-review.tsv').read_bytes()
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==review['segmentationTsvGitBlobSha']
    assert review['completeSlovakEditorialReview'] and review['completeCzechEditorialReview']
    plan=read(S/'episode-12-segmentation-review.json')
    assert plan['sourceGroupsReviewed']==plan['sourceGroupsTotal']==658
    assert not plan['over48Characters']
    actual={(d['group'],d['language']) for d in plan['textDifferencesRequiringDecision']}
    approved={(d['group'],d['language']) for d in review['specificTextDecisions']}
    assert actual==approved,(actual,approved)
    manual=read(S/'episode-12-manual-bilingual-draft.json')['cues']
    acoustic=read(S/'episode-12-working-alignment-input.json')['cues']
    # Phonetic proxies remain distinct from the displayed unintelligibility labels.
    unclear={1:'pozoríka',130:'stovne je',192:'nepro',253:'možnosť',276:'pláňa',282:'na celú sa toho pandémiu tak potom postane',376:'či tu sú',441:'cez ktorá'}
    spelling={'epidémii':'epidémií','koronavírusie':'koronavíruse','povod':'pôvod','vírusoch':'víroch','Wow':'vau'}
    expanded=[];proxies=[]
    for c,prior in zip(manual,acoustic):
        n=c['sourceCue'];display=c['text']['sk'];spoken=prior['alignmentText']
        if n in unclear:
            spoken=re.sub(r'\[[^\]]+\]',lambda _:unclear[n],display)
            if n==1:spoken=spoken.replace('3','tri').replace('4','štyri')
            proxies.append({'sourceCue':n,'archivedWorkingText':display,'phoneticProxy':spoken,'reason':'Preserved ASR phonetic anchor for explicitly marked uncertain speech, not asserted subtitle words.'})
        if n==349:
            spoken='Toto bol teda zatiaľ najlepší odná my za to nemôžeme urobiť Áno.'
            proxies.append({'sourceCue':n,'archivedWorkingText':display,'phoneticProxy':spoken,'reason':'Overlapping speech stays marked, including the unconfirmed noun. Endpoint and Áno are evidenced by independent large-v3 through 1518 s.'})
        if n==518:
            proxies.append({'sourceCue':n,'archivedWorkingText':display,'phoneticProxy':spoken,'reason':'Latest large-v3 omits the interrupted word and neutral CTC gives fihlé. Keep known Ja by som si plus a marker; typu is only the archived phonetic timing proxy.'})
        assert spoken and not re.search(r'\d',spoken),(n,spoken)
        for old,new in spelling.items():spoken=re.sub(r'(?<!\w)'+re.escape(old)+r'(?!\w)',new,spoken)
        expanded.append(spoken)
    cues=[];groups=[];word_cursor=0
    for gi,g in enumerate(plan['groups'],1):
        a,b=g['sourceCues'];rows=manual[a-1:b]
        raw=[];spoken=[];raw_to_spoken={0:0}
        for row,pronunciation in zip(rows,expanded[a-1:b]):
            x,y=tokens(row['text']['sk']),tokens(pronunciation)
            mapping=boundaries(list(map(norm,x)),list(map(norm,y)))
            for i,j in mapping.items():raw_to_spoken.setdefault(len(raw)+i,len(spoken)+j)
            raw.extend(x);spoken.extend(y)
        reviewed=tokens(' '.join(p['sk'] for p in g['parts']))
        to_raw=boundaries(list(map(norm,reviewed)),list(map(norm,raw)))
        lo,hi=g['asrWordRange'];assert lo==word_cursor and hi>lo
        original=[w['text'] for w in draft['words'][lo:hi]]
        lineage=boundaries(list(map(unaccent,reviewed)),list(map(unaccent,original)),True)
        offset=0;phone_offset=0;indices=[]
        for pi,part in enumerate(g['parts']):
            end=offset+len(tokens(part['sk']))
            assert end in to_raw,(gi,pi,'unresolved text boundary')
            raw_end=to_raw[end]
            assert raw_end in raw_to_spoken,(gi,pi,'cut inside pronunciation replacement',part)
            phone_end=raw_to_spoken[raw_end]
            target=' '.join(spoken[phone_offset:phone_end]);assert target,(gi,pi,part)
            # Source-word attribution only; no acoustic time is estimated by ratios.
            word_end=hi if pi==len(g['parts'])-1 else lo+lineage[end]
            word_end=max(word_cursor,min(hi,word_end))
            recovered=None
            if a<=206<=b and (word_end==word_cursor or pi>=5):
                recovered={'evidence':'captions/source/episode-12-followup-1-checks.sk.json','reason':'Independent large-v3 restores actual multiplication speech replaced by the turbo dvakrát loop.'}
            if a==349:
                recovered={'evidence':'captions/source/episode-12-followup-1-checks.sk.json','reason':'Independent large-v3 preserves overlapping 1516–1518 s speech and Áno; unintelligible content remains marked.'}
            assert word_end>word_cursor or recovered,(gi,pi,'empty source range without recovered-speech evidence',part)
            words=draft['words'][word_cursor:word_end]
            start=words[0]['start'] if words else draft['words'][word_cursor-1]['end']
            finish=words[-1]['end'] if words else start
            cue={'start':start,'end':finish,'asrWordRange':[word_cursor,word_end],'sourceCueRange':[a,b],'text':part,'alignmentText':target,'alignmentGroup':gi}
            if recovered:cue['recoveredSpeech']=recovered
            indices.append(len(cues));cues.append(cue)
            word_cursor=word_end;offset=end;phone_offset=phone_end
        assert offset==len(reviewed) and phone_offset==len(spoken)
        start=rows[0]['sourceStart'];finish=rows[-1]['sourceEnd']
        if a==349:finish=1518.0
        if a<=282<=b:finish=max(finish,1247.41)
        groups.append({'group':gi,'sourceCueRange':[a,b],'asrWordRange':[lo,hi],'start':start,'end':finish,'cues':indices})
    assert word_cursor==len(draft['words'])==6790
    review['segmentationTsvSha256']=hashlib.sha256(data).hexdigest()
    out={'episode':12,'source':draft['source'],'review':{**review,'status':'complete-model-assisted-bilingual-text-review-awaiting-final-acoustic-validation','publicationApproved':False,'phoneticProxies':proxies},'alignmentGroups':groups,'cues':cues}
    write(ROOT/'captions/episode-12.edited.json',out)
    print(json.dumps({'cues':len(cues),'alignmentGroups':len(groups),'sourceWords':word_cursor,'zeroWordRecoveredCues':sum(c['asrWordRange'][0]==c['asrWordRange'][1] for c in cues),'registered':False}))
if __name__=='__main__':main()

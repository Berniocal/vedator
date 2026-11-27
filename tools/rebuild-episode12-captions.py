#!/usr/bin/env python3
"""Align reviewed episode 12 semantic utterances to authenticated original MP3."""
import hashlib,importlib.util,json,os,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'captions';S=OUT/'source'
AUDIO=Path(os.environ.get('VEDATOR_EP12_AUDIO','/tmp/vedator-ep12-audio'))/'episode-12.mp3'
MODEL='comodoro/wav2vec2-xls-r-300m-sk-cv8'
SHA='798e5179d073756e4f1c5bb83bf144973e343aa9f4137823a1c70b28b27199b5'
def read(p):return json.loads(p.read_text())
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def srt_time(t):
    ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
def main():
    import numpy as np,torch,torchaudio
    from transformers import Wav2Vec2Processor,Wav2Vec2ForCTC
    torch.set_num_threads(4)
    edited=read(OUT/'episode-12.edited.json');draft=read(S/'episode-12-draft.sk.json')
    assert edited['review']['completeSlovakEditorialReview'] and edited['review']['completeCzechEditorialReview']
    assert hashlib.sha256((S/'episode-12-draft.sk.json').read_bytes()).hexdigest()=='0c1dbd2210c07a2edec585f18d2aadcae677ee2ed97d817be0887e9ddffc6d13'
    assert draft['source']['audioSha256']==edited['source']['audioSha256']==SHA
    episode=next(e for e in read(ROOT/'content-v2.json')['episodes'] if e['number']==12)
    video=next(v for v in read(ROOT/'episode-videos.json') if v['episode']==12)
    assert episode['id']==draft['guid']==video['guid']=='vedatorskypodcast.podbean.com/60169ece-e211-5ce3-8308-2ee114cd585b'
    assert episode['enclosure']==draft['source']['audio']=='https://mcdn.podbean.com/mf/web/ks6p8t/podcast_ep12.mp3'
    assert video['youtubeId']=='ERy-fP-pcQw'
    spec=importlib.util.spec_from_file_location('reference',ROOT/'tools/download-caption-reference.py')
    ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
    ref.download(episode['enclosure'],AUDIO,95916894,SHA)
    assert hashlib.sha256(AUDIO.read_bytes()).hexdigest()==SHA
    p=Wav2Vec2Processor.from_pretrained(MODEL);m=Wav2Vec2ForCTC.from_pretrained(MODEL);m.eval()
    vocab=p.tokenizer.get_vocab();blank=p.tokenizer.pad_token_id;delimiter=p.tokenizer.word_delimiter_token
    pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(AUDIO),'-f','f32le','-ac','1','-ar','16000','-'])
    wave=np.frombuffer(pcm,dtype=np.float32).copy();duration=len(wave)/16000
    prepared=edited['cues'];cursor=0
    for c in prepared:
        lo,hi=c['asrWordRange'];assert lo==cursor and hi>=lo and (hi>lo or c.get('recoveredSpeech'));cursor=hi
        assert all(t.strip() and len(t)<=48 and '\n' not in t for t in c['text'].values())
        assert not re.search(r'\d',c['alignmentText'])
    assert cursor==len(draft['words'])==6790
    def align_block(indices,a,b):
        a=max(0,a);b=min(duration,b)
        chars=[];ranges=[]
        for idx in indices:
            text=prepared[idx]['alignmentText']
            part=[c for c in text.lower().replace(' ',delimiter) if c in vocab and vocab[c]!=blank]
            assert part,(idx,text)
            if chars:chars.append(delimiter)
            begin=len(chars);chars.extend(part);ranges.append((begin,len(chars)))
        ids=[vocab[c] for c in chars]
        inputs=p(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors='pt',padding=True)
        with torch.inference_mode():y=m(**inputs).logits.log_softmax(-1)
        paths,scores=torchaudio.functional.forced_align(y,torch.tensor([ids],dtype=torch.int32),blank=blank)
        spans=torchaudio.functional.merge_tokens(paths[0],scores[0].exp(),blank=blank)
        assert len(spans)==len(ids),(len(spans),len(ids),indices)
        ratio=(b-a)/y.shape[1];results=[]
        for idx,(lo,hi) in zip(indices,ranges):
            pairs=list(zip(chars[lo:hi],spans[lo:hi]))
            speech=[span for ch,span in pairs if ch!=delimiter]
            start=round(a+speech[0].start*ratio,3);end=round(a+speech[-1].end*ratio,3)
            assert 0<start<end<=duration+.01,(idx,start,end)
            results.append({'cue':idx+1,'start':start,'end':end,
                'meanCharacterScore':round(sum(float(s.score) for s in speech)/len(speech),4),
                'asrStart':prepared[idx]['start'],'asrEnd':prepared[idx]['end'],
                'alignmentText':prepared[idx]['alignmentText'],
                'characters':[{'token':vocab[ch],'char':ch,'start':round(a+span.start*ratio,3),'end':round(a+span.end*ratio,3),'score':round(float(span.score),4)} for ch,span in pairs]})
        return results,p.batch_decode(y.argmax(-1))[0]
    cache_file=S/'episode-12-group-alignment.json'
    previous=read(cache_file) if cache_file.exists() else {}
    cache={g['signature']:g for g in previous.get('groups',[])} if previous.get('audioSha256')==SHA and previous.get('model')==MODEL else {}
    groups=[];audits=[None]*len(prepared)
    for g in edited['alignmentGroups']:
        a=max(0,g['start']-.5);b=min(duration,g['end']+.5)
        signature=hashlib.sha256(json.dumps({'version':'semantic-group-v1','model':MODEL,'audio':SHA,'start':a,'end':b,'indices':g['cues'],'targets':[prepared[i]['alignmentText'] for i in g['cues']]},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        if signature in cache:
            item=cache[signature]
        else:
            rows,decode=align_block(g['cues'],a,b)
            item={**g,'windowStart':a,'windowEnd':b,'signature':signature,'independentCtcDecode':decode,'cues':rows}
        for row in item['cues']:audits[row['cue']-1]=row
        groups.append(item)
        write(cache_file,{'episode':12,'model':MODEL,'audioSha256':SHA,'status':'actual-group-character-alignment-before-boundary-review','groups':groups})
        print('GROUP',g['group'],'/',len(edited['alignmentGroups']),round(a,2),round(b,2),'lowest',min(x['meanCharacterScore'] for x in item['cues']),flush=True)
    assert all(audits)
    rechecks=[]
    # One shared acoustic path resolves overlaps across separately decoded groups.
    # No global offset, fabricated timestamps or silent monotonic clamping.
    for attempt in range(5):
        bad=[i for i in range(1,len(audits)) if audits[i]['start']<audits[i-1]['end']]
        if not bad:break
        for i in bad:
            old=[audits[i-1],audits[i]]
            a=min(r['start'] for r in old)-.35;b=max(r['end'] for r in old)+.35
            rows,decode=align_block([i-1,i],a,b)
            audits[i-1],audits[i]=rows
            rechecks.append({'cues':[i,i+1],'window':[max(0,a),min(duration,b)],'previousBoundaries':[[r['start'],r['end']] for r in old],'newBoundaries':[[r['start'],r['end']] for r in rows],'independentCtcDecode':decode,'reason':'Resolve a cross-group phonetic boundary with one shared original-audio CTC path.'})
    write(S/'episode-12-boundary-rechecks.json',{'episode':12,'model':MODEL,'audioSha256':SHA,'rechecks':rechecks})
    assert all(audits[i]['start']>=audits[i-1]['end'] for i in range(1,len(audits))),[(i+1,audits[i-1]['end'],audits[i]['start']) for i in range(1,len(audits)) if audits[i]['start']<audits[i-1]['end']]
    cues=[]
    for c,a in zip(prepared,audits):
        cues.append({'start':a['start'],'end':a['end'],'kind':'speech','text':c['text'],'asrWordRange':c['asrWordRange'],**({'recoveredSpeech':c['recoveredSpeech']} if c.get('recoveredSpeech') else {})})
    result={'version':1,'episode':12,'guid':episode['id'],'youtubeId':video['youtubeId'],'languages':['cs','sk'],'quality':'editorial-corrected-forced-aligned',
        'source':{**draft['source'],'type':'original-MP3-ASR-and-CTC-forced-alignment','alignmentModel':MODEL,'transcriptFile':'captions/source/episode-12-draft.sk.json','alignmentFile':'captions/source/episode-12-alignment.json','review':'Complete model-assisted Slovak editorial review and own Czech translation; original-audio character alignment. Explicitly marked unintelligible fragments remain. No claim of independent human listening or direct YouTube audio comparison.'},'cues':cues}
    write(OUT/'episode-12.json',result)
    write(S/'episode-12-alignment.json',{'episode':12,'model':MODEL,'audioSha256':SHA,'groupAuditFile':'captions/source/episode-12-group-alignment.json','cues':audits})
    write(S/'episode-12-ctc-checks.sk.json',{'episode':12,'model':MODEL,'audioSha256':SHA,'forcedTranscript':False,'passages':[{'start':g['windowStart'],'end':g['windowEnd'],'text':g['independentCtcDecode']} for g in groups]})
    for lang in ['sk','cs']:
        (OUT/f'episode-12.{lang}.srt').write_text('\n\n'.join(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text'][lang]}" for i,c in enumerate(cues,1))+'\n')
    low=[{k:v for k,v in a.items() if k!='characters'} for a in audits if a['meanCharacterScore']<.35]
    write(OUT/'episode-12.review.json',{'episode':12,'cueCount':len(cues),'asrWordCount':6790,'audioSha256':SHA,'lowScoreCues':low,'maxBoundaryChange':max(abs(a['start']-a['asrStart']) for a in audits),'unintelligibleSourceGroups':edited['review']['unintelligibleSourceGroups'],'status':'review-further-if-low-score-cues-otherwise-needs-independent-listening','publicationApproved':False})
    subprocess.run(['node','tools/build-mp3-seek-index.mjs',str(AUDIO),episode['enclosure']],cwd=ROOT,check=True)
    print('ALIGNED',len(cues),'cues;',len(low),'unresolved low scores;',len(rechecks),'actual boundary rechecks. Not registered or release-approved.',flush=True)
if __name__=='__main__':main()

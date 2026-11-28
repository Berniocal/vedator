#!/usr/bin/env python3
"""Independently re-recognize disputed speech and align reviewed Slovak drafts.

Outputs remain source audits. This script never adds captionFile or publishes text.
"""
import argparse, gc, hashlib, importlib.util, json, os, re, subprocess
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('batch',Path(__file__).with_name('prepare-youtube-caption-batch.py'))
batch=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(batch)
ROOT,SOURCE=batch.ROOT,batch.SOURCE
ALIGN_MODEL='comodoro/wav2vec2-xls-r-300m-sk-cv8'
CHECK_MODEL='large-v3'
def editorial(number):
    review=batch.read(SOURCE/f'episode-{number}-youtube-editorial-review.json')
    normalized=batch.read(SOURCE/f'episode-{number}-youtube-normalized.sk.json')
    groups=batch.draft_groups(normalized['cues'])
    encoded=(json.dumps(groups,ensure_ascii=False,indent=2)+'\n').encode()
    assert hashlib.sha256(encoded).hexdigest()==review['sourceGroupsSha256'],'Review references changed source groups'
    assert review['reviewedGroupRanges']==[[0,len(groups)]],'Incomplete Slovak text review'
    return review,groups

def source_audio(number):
    proof=batch.read(SOURCE/f'episode-{number}-youtube-audio-clock-probes.json')
    assert proof['matchedProbeCount']>=6,'Not enough matching MP3/YouTube clock anchors'
    assert proof['approximateOffsetSpread']<.8,'Nonlinear MP3/YouTube shift needs a separate timeline'
    assert max(abs(c['videoMinusAudioSeconds']) for c in proof['checks'] if c['videoMinusAudioSeconds'] is not None)<.8,'Clock origin differs; do not silently shift captions'
    assert abs(proof['audioDuration']-proof['youtubeCaptionEnd'])<.4,'Different program durations require investigation'
    path=Path(os.environ.get('VEDATOR_BATCH_AUDIO','/tmp/vedator-youtube-batch-audio'))/f'episode-{number}.mp3'
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():subprocess.run(['curl','--fail','--location','--retry','3','--max-time','240',proof['audio'],'-o',str(path)],check=True)
    assert batch.digest(path)==proof['audioSha256'],'Source audio changed since clock checks'
    import numpy as np
    pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','1','-ar','16000','-'])
    return proof,np.frombuffer(pcm,dtype=np.float32).copy()

def windows_for_review(review,groups,duration):
    windows=[]
    for key,reason in review['needsAudioReview'].items():
        index=int(key);group=groups[index]
        windows.append({'start':max(0,group['start']-1.4),'end':min(duration,group['end']+1.4),'language':'sk','groups':[index],'reasons':[reason]})
    for window in review.get('extraAudioWindows',[]):
        windows.append({**window,'groups':[],'reasons':[window['reason']]})
    # A caption-less speech interval must not disappear from the final transcript.
    for previous,current in zip(groups,groups[1:]):
        if current['start']-previous['end']>3 and previous['end']>12:
            windows.append({'start':max(0,previous['end']-.5),'end':min(duration,current['start']+.5),'language':None,'groups':[],'reasons':['Automatic gap check: may contain omitted speech or music']})
    windows.sort(key=lambda w:w['start']);merged=[]
    for window in windows:
        if merged and window['language']==merged[-1]['language'] and window['start']<=merged[-1]['end']+.3 and window['end']-merged[-1]['start']<45:
            merged[-1]['end']=max(merged[-1]['end'],window['end']);merged[-1]['groups']+=window['groups'];merged[-1]['reasons']+=window['reasons']
        else:merged.append(window)
    return merged

def check(number, shard_index=None, shard_count=1):
    import torch
    from faster_whisper import WhisperModel
    torch.set_num_threads(4)
    review,groups=editorial(number);proof,wave=source_audio(number)
    windows=windows_for_review(review,groups,proof['audioDuration'])
    output=SOURCE/f'episode-{number}-youtube-independent-audio-review.json'
    if shard_index is not None:
        assert 0<=shard_index<shard_count
        windows=[w for i,w in enumerate(windows) if i%shard_count==shard_index]
        output=SOURCE/f'episode-{number}-youtube-independent-audio-review-shard-{shard_index}.json'
    cached=batch.read(output) if output.exists() else {}
    cache={(c['start'],c['end'],c['language']):c for c in cached.get('passages',[])} if cached.get('audioSha256')==proof['audioSha256'] else {}
    result={'episode':number,'model':CHECK_MODEL,'audioSha256':proof['audioSha256'],'editorialReviewSha256':batch.digest(SOURCE/f'episode-{number}-youtube-editorial-review.json'),'status':'independent-ASR-evidence-needs-editorial-resolution-not-published','passages':[]}
    model=WhisperModel(CHECK_MODEL,device='cpu',compute_type='int8',cpu_threads=4,num_workers=1)
    for i,window in enumerate(windows):
        key=(window['start'],window['end'],window['language'])
        if key in cache:
            passage={**cache[key],**window}
        else:
            segments,info=model.transcribe(wave[int(window['start']*16000):int(window['end']*16000)],language=window['language'],beam_size=5,best_of=5,temperature=0,word_timestamps=True,vad_filter=True,condition_on_previous_text=False)
            rows=[]
            for s in segments:
                rows.append({'start':round(window['start']+s.start,3),'end':round(window['start']+s.end,3),'text':s.text.strip(),'avgLogprob':round(s.avg_logprob,4),'noSpeechProbability':round(s.no_speech_prob,4),'words':[{'start':round(window['start']+w.start,3),'end':round(window['start']+w.end,3),'text':w.word,'probability':round(w.probability,4)} for w in s.words or []]})
            passage={**window,'detectedLanguage':info.language,'segments':rows}
        result['passages'].append(passage)
        batch.write(output,result)
        print(f'INDEPENDENT AUDIO {number}: {i+1}/{len(windows)}; groups={window["groups"]}; '+ ' '.join(s['text'] for s in passage['segments']),flush=True)
    del model;gc.collect()
    print('AUDIO REVIEW COMPLETE',number,len(windows),flush=True)

def acoustic_text(text):
    from num2words import num2words
    text=re.sub(r'\[[^\]]*\]',' ',text)
    replacements={'E = mc²':'é rovná sa em cé na druhú','H₂O':'há dva ó','1/2':'jedna pol','×':' krát ','Artemis II':'Artemis dva','typ I':'typ jeden'}
    for old,new in replacements.items():text=text.replace(old,new)
    units={'km/h':'kilometrov za hodinu','m/s':'metrov za sekundu','kg':'kilogramov','km':'kilometrov','cm':'centimetrov','kt':'kiloton','g':'gram','W':'wattov','TNT':'té en té','AI':'ej aj','ISS':'í es es','%':'percent'}
    for old,new in units.items():text=re.sub(r'(?<!\w)'+re.escape(old)+r'(?!\w)',new,text)
    text=re.sub(r'\d+(?:[,.]\d+)?',lambda m:num2words(float(m[0].replace(',','.')) if re.search('[,.]',m[0]) else int(m[0]),lang='sk'),text)
    # Explicitly retain numeral tokens in acoustic input; unsupported symbols may
    # be punctuation, never dropped numbers or silently inferred speech.
    assert not re.search(r'\d',text),text
    return ' '.join(text.split())

def align(number):
    import numpy as np,torch,torchaudio
    from transformers import Wav2Vec2Processor,Wav2Vec2ForCTC
    torch.set_num_threads(4)
    review,groups=editorial(number);proof,wave=source_audio(number)
    processor=Wav2Vec2Processor.from_pretrained(ALIGN_MODEL)
    model=Wav2Vec2ForCTC.from_pretrained(ALIGN_MODEL);model.eval()
    vocab=processor.tokenizer.get_vocab();blank=processor.tokenizer.pad_token_id
    upper=sum(ch.isupper() for ch in vocab)>sum(ch.islower() for ch in vocab)
    output=SOURCE/f'episode-{number}-youtube-ctc-draft-alignment.json'
    previous=batch.read(output) if output.exists() else {}
    cache={c['group']:c for c in previous.get('groups',[])} if previous.get('audioSha256')==proof['audioSha256'] and previous.get('model')==ALIGN_MODEL else {}
    result={'episode':number,'model':ALIGN_MODEL,'audioSha256':proof['audioSha256'],'editorialReviewSha256':batch.digest(SOURCE/f'episode-{number}-youtube-editorial-review.json'),'status':'draft-alignment-needs-audio-and-bilingual-review-not-published','groups':[]}
    for i,group in enumerate(groups):
        sk=review['corrections'].get(str(i),group['originalSk']);text=acoustic_text(sk)
        if not text:
            entry={'group':i,'textSk':sk,'kind':'sound','start':group['start'],'end':group['end'],'meanCharacterScore':None,'characters':[]}
        elif i in cache and cache[i]['textSk']==sk:
            entry=cache[i]
        else:
            a=max(0,group['start']-1.25);b=min(len(wave)/16000,group['end']+1.25)
            inputs=processor(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors='pt',padding=True)
            with torch.inference_mode():logits=model(**inputs).logits.log_softmax(-1)
            chars=(text.upper() if upper else text.lower()).replace(' ',processor.tokenizer.word_delimiter_token)
            ids=[vocab[ch] for ch in chars if ch in vocab and vocab[ch]!=blank]
            if not ids:raise ValueError(('No alignment characters',i,text))
            paths,scores=torchaudio.functional.forced_align(logits,torch.tensor([ids],dtype=torch.int32),blank=blank)
            spans=torchaudio.functional.merge_tokens(paths[0],scores[0].exp(),blank=blank)
            assert len(spans)==len(ids),(i,len(spans),len(ids))
            speech=[s for s in spans if s.token!=vocab.get(processor.tokenizer.word_delimiter_token)]
            ratio=(b-a)/logits.shape[1];score=float(np.mean([s.score for s in speech]))
            entry={'group':i,'textSk':sk,'alignmentText':text,'kind':'speech','start':round(a+speech[0].start*ratio,3),'end':round(a+speech[-1].end*ratio,3),'meanCharacterScore':round(score,4),'characters':[{'token':int(s.token),'start':round(a+s.start*ratio,3),'end':round(a+s.end*ratio,3),'score':round(float(s.score),4)} for s in spans]}
        result['groups'].append(entry)
        if i%20==0 or i+1==len(groups):
            batch.write(output,result);print(f'CTC DRAFT {number}: {i+1}/{len(groups)}, score={entry["meanCharacterScore"]}',flush=True)
    result['lowScoreGroups']=[g['group'] for g in result['groups'] if g['meanCharacterScore'] is not None and g['meanCharacterScore']<.35]
    result['overlaps']=[{'previous':a['group'],'next':b['group'],'seconds':round(a['end']-b['start'],3)} for a,b in zip(result['groups'],result['groups'][1:]) if a['end']>b['start']]
    batch.write(output,result);print('CTC DRAFT COMPLETE',number,'low-score',result['lowScoreGroups'],'overlaps',len(result['overlaps']),flush=True)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episode',type=int);parser.add_argument('phase',choices=['check','align']);parser.add_argument('--shard-index',type=int);parser.add_argument('--shard-count',type=int,default=1);args=parser.parse_args()
    check(args.episode,args.shard_index,args.shard_count) if args.phase=='check' else align(args.episode)

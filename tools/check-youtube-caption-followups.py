#!/usr/bin/env python3
"""Re-recognize short difficult passages without the first pass's VAD."""
import argparse
import gc
import importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('review',Path(__file__).with_name('review-youtube-caption-batch-audio.py'))
review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
batch=review.batch

def run(number):
    import torch
    from faster_whisper import WhisperModel
    torch.set_num_threads(4)
    proof,wave=review.source_audio(number)
    request=batch.read(batch.SOURCE/f'episode-{number}-youtube-followup-requests.json')
    output=batch.SOURCE/f'episode-{number}-youtube-followup-audio.json'
    prior=batch.read(output) if output.exists() else {}
    cache={(p['model'],p['start'],p['end'],p['language']):p for p in prior.get('passages',[])} if prior.get('audioSha256')==proof['audioSha256'] else {}
    result={'episode':number,'audioSha256':proof['audioSha256'],'status':'independent-ASR-evidence-requires-editorial-decision','passages':[]}
    for name in ['large-v3-turbo','large-v3']:
        model=None
        for w in request['windows']:
            key=(name,w['start'],w['end'],w.get('language','sk'))
            if key in cache:p=cache[key]
            else:
                if model is None:model=WhisperModel(name,device='cpu',compute_type='int8',cpu_threads=4,num_workers=1)
                segments,info=model.transcribe(wave[int(w['start']*16000):int(w['end']*16000)],language=w.get('language','sk'),beam_size=5,temperature=0,word_timestamps=True,vad_filter=False,condition_on_previous_text=False)
                p={**w,'language':w.get('language','sk'),'model':name,'segments':[{'start':round(w['start']+s.start,3),'end':round(w['start']+s.end,3),'text':s.text.strip(),'avgLogprob':s.avg_logprob,'words':[{'start':round(w['start']+x.start,3),'end':round(w['start']+x.end,3),'text':x.word,'probability':x.probability} for x in s.words or []]} for s in segments]}
            result['passages'].append(p);batch.write(output,result)
            print(name,w['groups'],' '.join(s['text'] for s in p['segments']),flush=True)
        del model;gc.collect()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episode',type=int);run(parser.parse_args().episode)

#!/usr/bin/env python3
"""Czech editorial drafts from reviewed Slovak text; no automatic publication.

Model attribution: Allegro MLR / Laniqo, P5-many2ces, CC BY 4.0.
https://huggingface.co/allegro/p5-many2ces
Source token >>slk<< follows the model authors' instructions.
"""
import argparse, hashlib, importlib.util, json, re
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('audio',Path(__file__).with_name('review-youtube-caption-batch-audio.py'))
audio=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(audio)
batch=audio.batch
MODEL='allegro/p5-many2ces'
def translate(number):
    import torch
    from transformers import AutoTokenizer,MarianMTModel
    torch.set_num_threads(4)
    review,groups=audio.editorial(number)
    tokenizer=AutoTokenizer.from_pretrained(MODEL)
    model=MarianMTModel.from_pretrained(MODEL);model.eval()
    assert tokenizer.convert_tokens_to_ids('>>slk<<')!=tokenizer.unk_token_id,'Source-language token missing'
    output=batch.SOURCE/f'episode-{number}-youtube-czech-multislav-draft.json'
    result={'episode':number,'model':MODEL,'modelAttribution':'Allegro MLR and Laniqo; CC BY 4.0','modelSource':'https://huggingface.co/allegro/p5-many2ces','sourceEditorialReviewSha256':batch.digest(batch.SOURCE/f'episode-{number}-youtube-editorial-review.json'),'status':'unreviewed-czech-machine-draft-do-not-publish','totalGroups':len(groups),'completedGroups':0,'cues':[]}
    with torch.inference_mode():
        for start in range(0,len(groups),8):
            block=groups[start:start+8]
            source=[review['corrections'].get(str(start+i),g['originalSk']) for i,g in enumerate(block)]
            inputs=tokenizer(['>>slk<< '+s for s in source],return_tensors='pt',padding=True,truncation=False)
            if inputs['input_ids'].shape[1]>256:raise ValueError('Input exceeds safe sentence length')
            translated=model.generate(**inputs,num_beams=5,max_new_tokens=220,early_stopping=True)
            for i,(group,sk,cs) in enumerate(zip(block,source,tokenizer.batch_decode(translated,skip_special_tokens=True))):
                cs=' '.join(cs.split());flags=[]
                if not cs or len(cs)<len(sk)*.6 or len(cs)>len(sk)*1.6:flags.append('length-mismatch')
                if set(re.findall(r'\d+(?:[,.]\d+)?',cs))!=set(re.findall(r'\d+(?:[,.]\d+)?',sk)):flags.append('numeral-mismatch')
                if re.search(r'\d\d:\d\d:\d\d|-->',cs):flags.append('subtitle-marker-hallucination')
                if re.fullmatch(r'(?:\[[^\]]+\]\s*)+',sk):
                    cs=sk.replace('smiech','smích').replace('vzdychanie','vzdychání').replace('lapanie po dychu','lapání po dechu').replace('odkašľanie','odkašlání').replace('smrkanie','smrkání').replace('dychčanie','oddechování');flags=[]
                result['cues'].append({'group':start+i,'start':group['start'],'end':group['end'],'textSk':sk,'draftCs':cs,'reviewFlags':flags})
            result['completedGroups']=len(result['cues'])
            if start%64==0 or start+8>=len(groups):
                batch.write(output,result);print('CZECH DRAFT',number,result['completedGroups'],'/',len(groups),flush=True)
    print('CZECH TRANSLATION COMPLETE',number,flush=True)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episode',type=int);translate(parser.parse_args().episode)

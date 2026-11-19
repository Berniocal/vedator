#!/usr/bin/env python3
"""Compare explicit disputed wordings against the same acoustic emissions.

These scores are evidence for editorial review, never automatic text changes.
"""
import argparse
import importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('review',Path(__file__).with_name('review-youtube-caption-batch-audio.py'))
review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
batch=review.batch

def run(number):
    import torch
    import torchaudio
    from transformers import Wav2Vec2Processor,Wav2Vec2ForCTC
    torch.set_num_threads(4)
    request=batch.read(batch.SOURCE/f'episode-{number}-youtube-contrast-requests.json')
    proof,wave=review.source_audio(number)
    processor=Wav2Vec2Processor.from_pretrained(review.ALIGN_MODEL)
    model=Wav2Vec2ForCTC.from_pretrained(review.ALIGN_MODEL);model.eval()
    vocab=processor.tokenizer.get_vocab();blank=processor.tokenizer.pad_token_id
    delimiter=processor.tokenizer.word_delimiter_token
    upper=sum(c.isupper() for c in vocab)>sum(c.islower() for c in vocab)
    output=batch.SOURCE/f'episode-{number}-youtube-contrast-audio.json'
    result={'episode':number,'audioSha256':proof['audioSha256'],'model':review.ALIGN_MODEL,'status':'alternative-wording-scores-for-editorial-review-not-publication-approval','windows':[]}
    for window in request['windows']:
        a,b=window['start'],window['end']
        inputs=processor(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors='pt',padding=True)
        with torch.inference_mode():logits=model(**inputs).logits.log_softmax(-1)
        rows=[]
        for candidate in window['candidates']:
            text=review.acoustic_text(candidate['textSk'])
            chars=(text.upper() if upper else text.lower()).replace(' ',delimiter)
            chars=[ch for ch in chars if ch in vocab and vocab[ch]!=blank]
            ids=[vocab[ch] for ch in chars]
            paths,scores=torchaudio.functional.forced_align(logits,torch.tensor([ids],dtype=torch.int32),blank=blank)
            spans=torchaudio.functional.merge_tokens(paths[0],scores[0].exp(),blank=blank)
            assert len(spans)==len(ids)
            spoken=[s for s in spans if s.token!=vocab[delimiter]]
            ratio=(b-a)/logits.shape[1]
            rows.append({**candidate,'frameLogScore':round(float(scores.sum()),5),'meanCharacterScore':round(sum(float(s.score) for s in spoken)/len(spoken),5),'characters':[{'char':ch,'start':round(a+s.start*ratio,3),'end':round(a+s.end*ratio,3),'score':round(float(s.score),5)} for ch,s in zip(chars,spans)]})
        rows.sort(key=lambda r:r['frameLogScore'],reverse=True)
        result['windows'].append({'group':window['group'],'start':a,'end':b,'independentCtcDecode':processor.batch_decode(logits.argmax(-1))[0],'alternatives':rows,'topPathAdvantage':round(rows[0]['frameLogScore']-rows[1]['frameLogScore'],5)})
        batch.write(output,result)
        print('CONTRAST',number,window['group'],[(r['label'],r['frameLogScore'],r['meanCharacterScore']) for r in rows],flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episode',type=int);run(parser.parse_args().episode)

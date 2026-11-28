"""Score explicit alternatives; never approve or change caption text automatically."""
import hashlib, importlib.util, json, os, subprocess
from pathlib import Path
import numpy as np
import torch
import torchaudio
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'captions/source'
AUDIO=Path(os.environ.get('VEDATOR_EP12_AUDIO','/tmp/vedator-ep12-audio'))/'episode-12.mp3'
EXPECTED='798e5179d073756e4f1c5bb83bf144973e343aa9f4137823a1c70b28b27199b5'
spec=importlib.util.spec_from_file_location('reference',ROOT/'tools/download-caption-reference.py')
ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
ref.download('https://mcdn.podbean.com/mf/web/ks6p8t/podcast_ep12.mp3',AUDIO,95916894,EXPECTED)
assert hashlib.sha256(AUDIO.read_bytes()).hexdigest()==EXPECTED
torch.set_num_threads(4)
name='comodoro/wav2vec2-xls-r-300m-sk-cv8'
p=Wav2Vec2Processor.from_pretrained(name);m=Wav2Vec2ForCTC.from_pretrained(name);m.eval()
vocab=p.tokenizer.get_vocab();blank=p.tokenizer.pad_token_id;delimiter=p.tokenizer.word_delimiter_token
request=json.loads((SOURCE/'episode-12-editorial-contrast-requests.json').read_text())
out={'episode':12,'model':name,'audioSha256':EXPECTED,'status':'acoustic-evidence-not-editorial-approval','humanListeningVerified':False,'windows':[]}
for w in request['windows']:
    a,b=w['start'],w['end']
    pcm=subprocess.check_output(['ffmpeg','-v','error','-ss',str(a),'-to',str(b),'-i',str(AUDIO),'-f','f32le','-ac','1','-ar','16000','-'])
    wave=np.frombuffer(pcm,dtype=np.float32).copy()
    inputs=p(wave,sampling_rate=16000,return_tensors='pt',padding=True)
    with torch.inference_mode():y=m(**inputs).logits.log_softmax(-1)
    rows=[]
    for candidate in w['candidates']:
        chars=[c for c in candidate['textSk'].lower().replace(' ',delimiter) if c in vocab and vocab[c]!=blank]
        ids=[vocab[c] for c in chars]
        path,scores=torchaudio.functional.forced_align(y,torch.tensor([ids],dtype=torch.int32),blank=blank)
        spans=torchaudio.functional.merge_tokens(path[0],scores[0].exp(),blank=blank)
        assert len(spans)==len(ids)
        ratio=(b-a)/y.shape[1]
        spoken=[s for c,s in zip(chars,spans) if c!=delimiter]
        rows.append({**candidate,'frameLogScore':round(float(scores.sum()),5),'meanCharacterScore':round(sum(float(s.score) for s in spoken)/len(spoken),5),'characters':[{'char':c,'start':round(a+s.start*ratio,3),'end':round(a+s.end*ratio,3),'score':round(float(s.score),5)} for c,s in zip(chars,spans)]})
    rows.sort(key=lambda r:r['frameLogScore'],reverse=True)
    out['windows'].append({'group':w['group'],'start':a,'end':b,'independentCtcDecode':p.batch_decode(y.argmax(-1))[0],'alternatives':rows,'topPathAdvantage':round(rows[0]['frameLogScore']-rows[1]['frameLogScore'],5)})
    (SOURCE/'episode-12-editorial-contrast-audio.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(w['group'],out['windows'][-1]['independentCtcDecode'],[(r['label'],r['frameLogScore'],r['meanCharacterScore']) for r in rows],flush=True)

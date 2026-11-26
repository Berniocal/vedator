"""Audit working source groups, never emit publishable captions or approval flags."""
import hashlib,importlib.util,json,os,subprocess
from pathlib import Path
import numpy as np,torch,torchaudio
from transformers import Wav2Vec2Processor,Wav2Vec2ForCTC
ROOT=Path(__file__).resolve().parent.parent;S=ROOT/'captions/source'
AUDIO=Path(os.environ.get('VEDATOR_EP12_AUDIO','/tmp/vedator-ep12-audio'))/'episode-12.mp3'
EXPECTED='798e5179d073756e4f1c5bb83bf144973e343aa9f4137823a1c70b28b27199b5'
spec=importlib.util.spec_from_file_location('reference',ROOT/'tools/download-caption-reference.py');ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
ref.download('https://mcdn.podbean.com/mf/web/ks6p8t/podcast_ep12.mp3',AUDIO,95916894,EXPECTED)
assert hashlib.sha256(AUDIO.read_bytes()).hexdigest()==EXPECTED
request_path=S/'episode-12-working-alignment-input.json';request=json.loads(request_path.read_text())
torch.set_num_threads(4);name='comodoro/wav2vec2-xls-r-300m-sk-cv8'
p=Wav2Vec2Processor.from_pretrained(name);m=Wav2Vec2ForCTC.from_pretrained(name);m.eval()
vocab=p.tokenizer.get_vocab();blank=p.tokenizer.pad_token_id;delimiter=p.tokenizer.word_delimiter_token
pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(AUDIO),'-f','f32le','-ac','1','-ar','16000','-'])
wave=np.frombuffer(pcm,dtype=np.float32).copy()
out={'episode':12,'model':name,'audioSha256':EXPECTED,'inputSha256':hashlib.sha256(request_path.read_bytes()).hexdigest(),'status':'preliminary-acoustic-audit-of-working-source-groups-not-final-cues','publicationApproved':False,'humanListeningVerified':False,'cues':[]}
output=S/'episode-12-working-alignment-audit.json'
for cue in request['cues']:
    if cue['hasUnresolvedSpeech']:
        out['cues'].append({**cue,'status':'unresolved-speech-not-force-aligned','characters':[]});continue
    a=max(0,cue['start']-.5);b=min(len(wave)/16000,cue['end']+.5)
    inputs=p(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors='pt',padding=True)
    with torch.inference_mode():y=m(**inputs).logits.log_softmax(-1)
    text=cue['alignmentText'];assert not any(c.isdigit() for c in text)
    chars=[c for c in text.lower().replace(' ',delimiter) if c in vocab and vocab[c]!=blank]
    ids=[vocab[c] for c in chars]
    path,scores=torchaudio.functional.forced_align(y,torch.tensor([ids],dtype=torch.int32),blank=blank)
    spans=torchaudio.functional.merge_tokens(path[0],scores[0].exp(),blank=blank)
    assert len(spans)==len(ids)
    ratio=(b-a)/y.shape[1]
    characters=[{'char':c,'start':round(a+s.start*ratio,3),'end':round(a+s.end*ratio,3),'score':round(float(s.score),5)} for c,s in zip(chars,spans)]
    spoken=[s for c,s in zip(chars,spans) if c!=delimiter]
    score=sum(float(s.score) for s in spoken)/len(spoken)
    out['cues'].append({**cue,'status':'review-required-not-approved','acousticStart':round(a+spoken[0].start*ratio,3),'acousticEnd':round(a+spoken[-1].end*ratio,3),'meanCharacterScore':round(score,5),'independentCtcDecode':p.batch_decode(y.argmax(-1))[0],'characters':characters})
    if cue['sourceCue']%25==0:
        output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print('WORKING',cue['sourceCue'],round(score,4),flush=True)
output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('WORKING AUDIT ONLY',len(out['cues']),sum(c.get('meanCharacterScore',1)<.35 for c in out['cues']),'low scores',flush=True)

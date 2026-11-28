"""Unforced Slovak CTC evidence for original episode 12 beginning/end, not captions."""
import hashlib,importlib.util,json,os,subprocess
from pathlib import Path
import numpy as np,torch
from transformers import Wav2Vec2Processor,Wav2Vec2ForCTC
ROOT=Path(__file__).resolve().parent.parent
AUDIO=Path(os.environ.get('VEDATOR_EP12_AUDIO','/tmp/vedator-ep12-audio'))/'episode-12.mp3'
EXPECTED='798e5179d073756e4f1c5bb83bf144973e343aa9f4137823a1c70b28b27199b5'
spec=importlib.util.spec_from_file_location('reference',ROOT/'tools/download-caption-reference.py');ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
ref.download('https://mcdn.podbean.com/mf/web/ks6p8t/podcast_ep12.mp3',AUDIO,95916894,EXPECTED)
assert hashlib.sha256(AUDIO.read_bytes()).hexdigest()==EXPECTED
output=ROOT/'captions/source/episode-12-endpoint-ctc.sk.json'
if output.exists():
    prior=json.loads(output.read_text());assert prior['audioSha256']==EXPECTED
    print('Authenticated original-audio CTC endpoint evidence already exists');raise SystemExit(0)
torch.set_num_threads(4)
name='comodoro/wav2vec2-xls-r-300m-sk-cv8'
p=Wav2Vec2Processor.from_pretrained(name);m=Wav2Vec2ForCTC.from_pretrained(name);m.eval()
out={'episode':12,'model':name,'audioSha256':EXPECTED,'forcedAlignment':False,'humanListeningVerified':False,'passages':[]}
for a,b in [(0,15),(15,30),(26,40),(2898,2911.53)]:
    pcm=subprocess.check_output(['ffmpeg','-v','error','-ss',str(a),'-to',str(b),'-i',str(AUDIO),'-f','f32le','-ac','1','-ar','16000','-'])
    wave=np.frombuffer(pcm,dtype=np.float32).copy();values=p(wave,sampling_rate=16000,return_tensors='pt',padding=True)
    with torch.inference_mode():y=m(**values).logits
    d={'start':a,'end':b,'text':p.batch_decode(y.argmax(-1))[0]};out['passages'].append(d);print(json.dumps(d,ensure_ascii=False),flush=True)
output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')

import json,os
from pathlib import Path
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
root=Path(__file__).resolve().parent.parent
audio=Path("/tmp/vedator-ep5-audio/episode-5.mp3")
draft=json.loads((root/"captions/source/episode-5-draft.sk.json").read_text())
if not audio.exists():
    import subprocess
    audio.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(["curl","--fail","--location","--retry","3",draft["source"]["audio"],"-o",str(audio)],check=True)
wave=decode_audio(str(audio),sampling_rate=16000)
model=WhisperModel("large-v3",device="cpu",compute_type="int8",cpu_threads=4)
out=[]
for start,end in [(14,31),(330,349),(394,404),(464,478),(532,550),(590,610),(645,663),(675,690),(766,780),(812,825),(928,940),(973,987),(1038,1062)]:
    segments,_=model.transcribe(wave[int(start*16000):int(end*16000)],language="sk",beam_size=5,temperature=0,
        word_timestamps=True,vad_filter=False,condition_on_previous_text=False)
    texts=[{"start":round(start+s.start,3),"end":round(start+s.end,3),"text":s.text.strip()} for s in segments]
    out.append({"window":[start,end],"segments":texts})
    print(json.dumps(out[-1],ensure_ascii=False),flush=True)
p=root/"captions/source/episode-5-checks.sk.json";p.write_text(json.dumps({"model":"large-v3","audioSha256":draft["source"]["audioSha256"],"passages":out},ensure_ascii=False,indent=2)+"\n")

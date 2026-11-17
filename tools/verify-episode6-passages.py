import json,subprocess
from pathlib import Path
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
from faster_whisper.vad import VadOptions,get_speech_timestamps
root=Path(__file__).resolve().parent.parent
draft=json.loads((root/"captions/source/episode-6-draft.sk.json").read_text())
file=Path("/tmp/vedator-ep6-audio/episode-6.mp3");file.parent.mkdir(parents=True,exist_ok=True)
if not file.exists():subprocess.run(["curl","--fail","--location","--retry","3",draft["source"]["audio"],"-o",str(file)],check=True)
wave=decode_audio(str(file),sampling_rate=16000)
speech=get_speech_timestamps(wave,VadOptions(min_silence_duration_ms=180,speech_pad_ms=0))
speech=[(s["start"]/16000,s["end"]/16000) for s in speech]
words=draft["words"];candidates=[]
for left,right in zip(words,words[1:]):
    a,b=left["end"],right["start"]
    if 1.4<b-a<16:
        covered=sum(max(0,min(b,y)-max(a,x)) for x,y in speech)
        if covered>.7:candidates.append({"start":max(0,a-1),"end":b+1,"reason":"speech-in-ASR-gap","priority":covered})
gaps=sorted(candidates,key=lambda c:c["priority"],reverse=True)[:12]
low=sorted((w for w in words if w["confidence"]<.5),key=lambda w:w["confidence"])[:12]
windows=gaps+[{"start":max(0,w["start"]-2),"end":w["end"]+2,"reason":"low-ASR-confidence","priority":1-w["confidence"]} for w in low]
windows += [{"start":a,"end":b,"reason":"volcano-names-and-eruption-data","priority":1} for a,b in [(1358,1378),(1540,1562),(1720,1740),(1916,1936),(2084,2104),(2269,2289)]]
windows=[{"start":a,"end":b,"reason":"editorial-disputed-phrase","priority":1} for a,b in [(54,63),(189,201),(393,409),(452,469),(723,738),(1506,1535),(1957,1967),(2172,2189),(2210,2251)]]
windows.sort(key=lambda c:c["start"]);merged=[]
for w in windows:
    if merged and w["start"]<merged[-1]["end"] and max(w["end"],merged[-1]["end"])-merged[-1]["start"]<35:
        merged[-1]["end"]=max(w["end"],merged[-1]["end"]);merged[-1]["reason"]+=";"+w["reason"]
    else:merged.append(dict(w))
print("Cross-check windows:",json.dumps(merged),flush=True)
model=WhisperModel("large-v3",device="cpu",compute_type="int8",cpu_threads=4)
out=[]
for window in merged:
    a,b=window["start"],min(len(wave)/16000,window["end"])
    segments,_=model.transcribe(wave[int(a*16000):int(b*16000)],language="sk",beam_size=5,temperature=0,
        word_timestamps=True,vad_filter=False,condition_on_previous_text=False)
    result={**window,"segments":[{"start":round(a+s.start,3),"end":round(a+s.end,3),"text":s.text.strip()} for s in segments]}
    out.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
(root/"captions/source/episode-6-extra-checks.sk.json").write_text(json.dumps({"episode":6,"model":"large-v3","audioSha256":draft["source"]["audioSha256"],"passages":out},ensure_ascii=False,indent=2)+"\n")

#!/usr/bin/env python3
"""Transcribe episode 11, then align reviewed bilingual captions to its source MP3."""
import argparse, hashlib, json, os, re, subprocess, textwrap
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"captions"
SOURCE=OUT/"source"
AUDIO=Path(os.environ.get("VEDATOR_EP11_AUDIO","/tmp/vedator-ep11-audio"))/"episode-11.mp3"
DRAFT=SOURCE/"episode-11-draft.sk.json"
EDITED=OUT/"episode-11.edited.json"
MODEL="large-v3-turbo"
ALIGN_MODEL="comodoro/wav2vec2-xls-r-300m-sk-cv8"
def read(p): return json.loads(p.read_text(encoding="utf-8"))
def write(p,v): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def source():
    e=next(e for e in read(ROOT/"content-v2.json")["episodes"] if e["number"]==11)
    assert e["id"] == "vedatorskypodcast.podbean.com/1ae3bbad-cb34-5516-b8e1-0b468beede0f"
    assert e["enclosure"] == "https://mcdn.podbean.com/mf/web/5s3dyc/podcast_ep11.mp3"
    assert e["title"] == "Vedátorský podcast 11 – Valentínsky monopól"
    AUDIO.parent.mkdir(parents=True,exist_ok=True)
    if not AUDIO.exists():
        subprocess.run(["curl","--fail","--location","--retry","3","--max-time","180",e["enclosure"],"-o",str(AUDIO)],check=True)
    assert AUDIO.stat().st_size>1_000_000
    digest=hashlib.sha256(AUDIO.read_bytes()).hexdigest()
    return e,{"audio":e["enclosure"],"audioSha256":digest,"audioBytes":AUDIO.stat().st_size}
def draft():
    if DRAFT.exists():
        raise RuntimeError("Source already exists; review it instead of retranscribing")
    from faster_whisper import WhisperModel
    e,meta=source()
    model=WhisperModel(MODEL,device="cpu",compute_type="int8",cpu_threads=4,num_workers=1)
    segments,info=model.transcribe(str(AUDIO),language="sk",beam_size=5,best_of=5,temperature=0,word_timestamps=True,
        vad_filter=True,vad_parameters={"min_silence_duration_ms":500},condition_on_previous_text=True,
        initial_prompt="Vedátorský podcast 11. Valentínsky monopól. Jozef a Samuel.")
    words=[];raw=[];last=-1
    for seg in segments:
        first=len(words)
        for w in seg.words or []:
            if w.word.strip(): words.append({"start":round(w.start,3),"end":round(w.end,3),"text":w.word.strip(),"confidence":round(w.probability,4)})
        raw.append({"start":round(seg.start,3),"end":round(seg.end,3),"text":seg.text.strip(),"avgLogprob":seg.avg_logprob,"wordRange":[first,len(words)]})
        progress=int(100*seg.end/info.duration)
        if progress//5>last:
            print(f"ASR {progress}% ({seg.end:.1f}/{info.duration:.1f} s)",flush=True);last=progress//5
    assert 800<len(words)<16000 and 600<info.duration<7200
    groups=[];group=[]
    for i,w in enumerate(words):
        if group:
            p=words[group[-1]]
            length=len(" ".join(words[j]["text"] for j in group))
            if w["start"]-p["end"]>.65 or w["end"]-words[group[0]]["start"]>5.6 or length+len(w["text"])>85:
                groups.append(group);group=[]
        group.append(i)
    if group:groups.append(group)
    cues=[{"start":words[g[0]]["start"],"end":words[g[-1]]["end"],"text":" ".join(words[i]["text"] for i in g),"asrWordRange":[g[0],g[-1]+1]} for g in groups]
    write(DRAFT,{"episode":11,"guid":e["id"],"source":{**meta,"model":MODEL,"language":"sk","wordTimestamps":True,"vadFilter":True,"beamSize":5,"computeType":"int8","duration":info.duration},"words":words,"segments":raw,"cues":cues})
    print(f"DRAFT READY: {len(words)} words, {len(cues)} cues, duration {info.duration:.3f}",flush=True)

if __name__=="__main__":
    draft()

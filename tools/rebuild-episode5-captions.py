#!/usr/bin/env python3
"""Transcribe episode 5, then align reviewed bilingual captions to its source MP3."""
import argparse, hashlib, json, os, re, subprocess, textwrap
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"captions"
SOURCE=OUT/"source"
AUDIO=Path(os.environ.get("VEDATOR_EP5_AUDIO","/tmp/vedator-ep5-audio"))/"episode-5.mp3"
DRAFT=SOURCE/"episode-5-draft.sk.json"
EDITED=OUT/"episode-5.edited.json"
MODEL="large-v3-turbo"
ALIGN_MODEL="comodoro/wav2vec2-xls-r-300m-sk-cv8"
def read(p): return json.loads(p.read_text(encoding="utf-8"))
def write(p,v): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def source():
    e=next(e for e in read(ROOT/"content-v2.json")["episodes"] if e["number"]==5)
    AUDIO.parent.mkdir(parents=True,exist_ok=True)
    if not AUDIO.exists():
        subprocess.run(["curl","--fail","--location","--retry","3","--max-time","180",e["enclosure"],"-o",str(AUDIO)],check=True)
    assert AUDIO.stat().st_size>1_000_000
    digest=hashlib.sha256(AUDIO.read_bytes()).hexdigest()
    return e,{"audio":e["enclosure"],"audioSha256":digest,"audioBytes":AUDIO.stat().st_size}
def draft():
    from faster_whisper import WhisperModel
    e,meta=source()
    model=WhisperModel(MODEL,device="cpu",compute_type="int8",cpu_threads=4,num_workers=1)
    segments,info=model.transcribe(str(AUDIO),language="sk",beam_size=5,best_of=5,temperature=0,word_timestamps=True,
        vad_filter=True,vad_parameters={"min_silence_duration_ms":500},condition_on_previous_text=True,
        initial_prompt="Vedátorský podcast. Ako skúmame vesmír? Elektromagnetické žiarenie, neutrína, Wolfgang Pauli, Čerenkovovo žiarenie, IceCube, supernova, gravitačné vlny, LIGO, Kip Thorne.")
    words=[];raw=[];last=-1
    for seg in segments:
        first=len(words)
        for w in seg.words or []:
            if w.word.strip(): words.append({"start":round(w.start,3),"end":round(w.end,3),"text":w.word.strip(),"confidence":round(w.probability,4)})
        raw.append({"start":round(seg.start,3),"end":round(seg.end,3),"text":seg.text.strip(),"avgLogprob":seg.avg_logprob,"wordRange":[first,len(words)]})
        progress=int(100*seg.end/info.duration)
        if progress//5>last:
            print(f"ASR {progress}% ({seg.end:.1f}/{info.duration:.1f} s)",flush=True);last=progress//5
    assert 800<len(words)<6000 and 600<info.duration<2400
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
    write(DRAFT,{"episode":5,"guid":e["id"],"source":{**meta,"model":MODEL,"duration":info.duration},"words":words,"segments":raw,"cues":cues})
    print(f"DRAFT READY: {len(words)} words, {len(cues)} cues, duration {info.duration:.3f}",flush=True)
def srt_time(t):
    ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
def align():
    import numpy as np,torch,torchaudio
    from transformers import Wav2Vec2Processor,Wav2Vec2ForCTC
    torch.set_num_threads(4)
    e,meta=source();draft=read(DRAFT);edited=read(EDITED)
    assert meta["audioSha256"]==draft["source"]["audioSha256"]
    processor=Wav2Vec2Processor.from_pretrained(ALIGN_MODEL)
    model=Wav2Vec2ForCTC.from_pretrained(ALIGN_MODEL);model.eval()
    pcm=subprocess.check_output(["ffmpeg","-v","error","-i",str(AUDIO),"-f","f32le","-ac","1","-ar","16000","-"])
    wave=np.frombuffer(pcm,dtype=np.float32).copy()
    vocab=processor.tokenizer.get_vocab();blank=processor.tokenizer.pad_token_id
    upper=sum(ch.isupper() for ch in vocab)>sum(ch.islower() for ch in vocab)
    print("Alignment vocabulary:",sorted(vocab),flush=True)
    # Keep independent CTC decodes of disputed identifiers and the negation.
    acoustic_checks=[]
    for a,b in [(593.2,598.9),(819.0,823.8),(933.2,938.1),(646.0,649.5),(768.5,775.3)]:
        inputs=processor(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors="pt",padding=True)
        with torch.inference_mode(): logits=model(**inputs).logits
        text=processor.batch_decode(logits.argmax(-1))[0]
        acoustic_checks.append({"start":a,"end":b,"text":text})
        print("Independent CTC decode:",a,b,text,flush=True)
    write(SOURCE/"episode-5-ctc-checks.sk.json",{"model":ALIGN_MODEL,"passages":acoustic_checks})
    cues=[];alignment=[];previous=0;word_cursor=0
    for i,cue in enumerate(edited["cues"]):
        lo,hi=cue["asrWordRange"]
        assert lo==word_cursor and hi>lo;word_cursor=hi
        assert all(cue["text"][lang].strip() for lang in ("cs","sk"))
        start=max(0,float(cue["start"])-.5);end=min(len(wave)/16000,float(cue["end"])+.5)
        text=cue.get("alignmentText",cue["text"]["sk"]).replace("\n"," ")
        text=text.upper() if upper else text.lower()
        chars="".join(ch if ch in vocab else " " for ch in text.replace(" ",processor.tokenizer.word_delimiter_token))
        chars=re.sub(r"\s+","",chars)
        tokens=[vocab[ch] for ch in chars if ch in vocab and vocab[ch]!=blank]
        assert len(tokens)>2,(i,text)
        inputs=processor(wave[int(start*16000):int(end*16000)],sampling_rate=16000,return_tensors="pt",padding=True)
        with torch.inference_mode(): logits=model(**inputs).logits.log_softmax(-1)
        paths,scores=torchaudio.functional.forced_align(logits,torch.tensor([tokens],dtype=torch.int32),blank=blank)
        spans=torchaudio.functional.merge_tokens(paths[0],scores[0].exp(),blank=blank)
        assert len(spans)==len(tokens),(i,len(spans),len(tokens))
        speech=[s for s in spans if s.token!=vocab.get(processor.tokenizer.word_delimiter_token)]
        ratio=(end-start)/logits.shape[1]
        a=start+speech[0].start*ratio;b=start+speech[-1].end*ratio
        confidence=float(sum(s.score for s in speech)/len(speech))
        a=max(previous,round(a,3));b=max(a+.15,round(b,3))
        assert a>=previous and b<=len(wave)/16000+.1,(i,a,b)
        cues.append({"start":a,"end":b,"kind":"speech","text":{lang:"\n".join(textwrap.wrap(cue["text"][lang],width=48,break_long_words=False,break_on_hyphens=False)) for lang in ("sk","cs")},"asrWordRange":[lo,hi]})
        alignment.append({"cue":i+1,"start":a,"end":b,"meanCharacterScore":round(confidence,4),"asrStart":cue["start"],"asrEnd":cue["end"],
            "characters":[{"token":int(s.token),"start":round(start+s.start*ratio,3),"end":round(start+s.end*ratio,3),"score":round(float(s.score),4)} for s in spans]})
        previous=b
        if i%25==0:print(f"ALIGN {i+1}/{len(edited['cues'])}; {a:.2f}–{b:.2f}, score={confidence:.3f}",flush=True)
    assert word_cursor==len(draft["words"])
    mapping=read(ROOT/"episode-videos.json");record=next(x for x in mapping if x["episode"]==5)
    assert record["guid"]==e["id"]
    result={"version":1,"episode":5,"guid":e["id"],"youtubeId":record["youtubeId"],"languages":["cs","sk"],
        "quality":"editorial-corrected-forced-aligned",
        "source":{**draft["source"],"type":"original-MP3-ASR-and-CTC-forced-alignment","alignmentModel":ALIGN_MODEL,
            "transcriptFile":"captions/source/episode-5-draft.sk.json","alignmentFile":"captions/source/episode-5-alignment.json",
            "review":"Complete Slovak editorial review and Czech translation; uncertain passages re-recognized with full large-v3; acoustic character alignment. Not a full independent human listening verification."},
        "cues":cues}
    for i,c in enumerate(cues):
        assert c["end"]>c["start"] and (not i or c["start"]>=cues[i-1]["end"])
        assert all(len(c["text"][lang])<=240 for lang in ("cs","sk"))
    write(OUT/"episode-5.json",result)
    write(SOURCE/"episode-5-alignment.json",{"model":ALIGN_MODEL,"audioSha256":meta["audioSha256"],"cues":alignment})
    for lang in ("cs","sk"):
        (OUT/f"episode-5.{lang}.srt").write_text("\n\n".join(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text'][lang]}" for i,c in enumerate(cues,1))+"\n",encoding="utf-8")
    write(OUT/"episode-5.review.json",{"episode":5,"cueCount":len(cues),"asrWordCount":len(draft["words"]),"audioSha256":meta["audioSha256"],
        "lowScoreCues":[{k:v for k,v in a.items() if k!="characters"} for a in alignment if a["meanCharacterScore"]<.35],
        "maxBoundaryChange":max(abs(a["start"]-a["asrStart"]) for a in alignment),
        "status":"editorially-reviewed-acoustically-aligned-needs-independent-listening"})
    record["captionFile"]="captions/episode-5.json";write(ROOT/"episode-videos.json",mapping)
    subprocess.run(["node","tools/build-mp3-seek-index.mjs",str(AUDIO),e["enclosure"]],cwd=ROOT,check=True)
    print(f"ALIGNED {len(cues)} bilingual cues",flush=True)
if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("phase",choices=["draft","align"]);args=parser.parse_args()
    draft() if args.phase=="draft" else align()

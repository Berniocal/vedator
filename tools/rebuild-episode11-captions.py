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
def wrap(text):
    if len(text) <= 48:
        return text
    choices = [i for i, ch in enumerate(text) if ch == ' ' and i <= 48 and len(text)-i-1 <= 48]
    if not choices:
        return None
    i = min(choices, key=lambda i: abs(i-(len(text)-1)/2))
    return text[:i]+'\n'+text[i+1:]

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
    checks_file=SOURCE/"episode-11-ctc-checks.sk.json"
    prior_checks=read(checks_file) if checks_file.exists() else {}
    cached_checks={(c["start"],c["end"]):c for c in prior_checks.get("passages",[])} if prior_checks.get("audioSha256")==meta["audioSha256"] and prior_checks.get("model")==ALIGN_MODEL else {}
    acoustic_checks=[]
    for a,b in edited.get("checkWindows",[]):
        if (a,b) in cached_checks:
            acoustic_checks.append(cached_checks[(a,b)]);continue
        inputs=processor(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors="pt",padding=True)
        with torch.inference_mode(): logits=model(**inputs).logits
        text=processor.batch_decode(logits.argmax(-1))[0]
        acoustic_checks.append({"start":a,"end":b,"text":text})
        print("Independent CTC decode:",a,b,text,flush=True)
    write(SOURCE/"episode-11-ctc-checks.sk.json",{"model":ALIGN_MODEL,"audioSha256":meta["audioSha256"],"passages":acoustic_checks})
    old_result=read(OUT/"episode-11.json") if (OUT/"episode-11.json").exists() else None
    old_alignment=read(SOURCE/"episode-11-alignment.json") if (SOURCE/"episode-11-alignment.json").exists() else None
    if not old_result or old_result["source"]["audioSha256"]!=meta["audioSha256"]:
        old_result=old_alignment=None
    cached={(tuple(c["asrWordRange"])):(c,a) for c,a in zip(old_result["cues"],old_alignment["cues"])} if old_result and old_alignment else {}
    cues=[];alignment=[];previous=0;word_cursor=0
    for i,cue in enumerate(edited["cues"]):
        lo,hi=cue["asrWordRange"]
        assert lo==word_cursor and hi>=lo and (hi>lo or cue.get("recoveredSpeech"));word_cursor=hi
        assert all(cue["text"][lang].strip() for lang in ("cs","sk"))
        wrapped={lang:wrap(cue["text"][lang]) for lang in ("sk","cs")}
        if (lo,hi) in cached:
            old,audit=cached[(lo,hi)]
            if audit["asrStart"]==cue["start"] and audit["asrEnd"]==cue["end"] and audit.get("alignmentText")==cue.get("alignmentText",cue["text"]["sk"]) and old["start"]>=previous:
                cues.append({**old,"text":wrapped});alignment.append({**audit,"cue":i+1});previous=old["end"];continue
        start=max(0,float(cue["start"])-.5);end=min(len(wave)/16000,float(cue["end"])+.5)
        inputs=processor(wave[int(start*16000):int(end*16000)],sampling_rate=16000,return_tensors="pt",padding=True)
        with torch.inference_mode(): logits=model(**inputs).logits.log_softmax(-1)
        # Printed numerals are expanded only in the acoustic input; captions retain digits.
        # Where years have several spoken forms, choose among explicit pronunciations
        # using the same acoustic emissions and retain the winner in the edited source.
        candidates=cue.get("alignmentVariants",[cue.get("alignmentText",cue["text"]["sk"])])
        aligned=[]
        for candidate in candidates:
            text=candidate.replace("\n"," ")
            assert not re.search(r"\d",text),(i,"Unexpanded numeral",text)
            text=text.upper() if upper else text.lower()
            chars="".join(ch if ch in vocab else " " for ch in text.replace(" ",processor.tokenizer.word_delimiter_token))
            chars=re.sub(r"\s+","",chars)
            tokens=[vocab[ch] for ch in chars if ch in vocab and vocab[ch]!=blank]
            # A valid short reply can contain only one or two letters.
            assert tokens,(i,text)
            paths,scores=torchaudio.functional.forced_align(logits,torch.tensor([tokens],dtype=torch.int32),blank=blank)
            spans=torchaudio.functional.merge_tokens(paths[0],scores[0].exp(),blank=blank)
            assert len(spans)==len(tokens),(i,len(spans),len(tokens))
            speech=[s for s in spans if s.token!=vocab.get(processor.tokenizer.word_delimiter_token)]
            confidence=float(sum(s.score for s in speech)/len(speech))
            aligned.append((confidence,candidate,spans,speech))
        confidence,chosen,spans,speech=max(aligned,key=lambda x:x[0])
        cue["alignmentText"]=chosen
        if len(aligned)>1:print("Numeral pronunciation:",i+1,chosen,round(confidence,4),flush=True)
        ratio=(end-start)/logits.shape[1]
        a=start+speech[0].start*ratio;b=start+speech[-1].end*ratio
        confidence=float(sum(s.score for s in speech)/len(speech))
        a=max(previous,round(a,3));b=max(a+.15,round(b,3))
        assert a>=previous and b<=len(wave)/16000+.1,(i,a,b)
        cues.append({"start":a,"end":b,"kind":"speech",**({"recoveredSpeech":cue["recoveredSpeech"]} if cue.get("recoveredSpeech") else {}),"text":{lang:wrap(cue["text"][lang]) for lang in ("sk","cs")},"asrWordRange":[lo,hi]})
        alignment.append({"cue":i+1,"start":a,"end":b,"meanCharacterScore":round(confidence,4),"asrStart":cue["start"],"asrEnd":cue["end"],"alignmentText":cue.get("alignmentText",cue["text"]["sk"]),
            "characters":[{"token":int(s.token),"start":round(start+s.start*ratio,3),"end":round(start+s.end*ratio,3),"score":round(float(s.score),4)} for s in spans]})
        previous=b
        if i%25==0:print(f"ALIGN {i+1}/{len(edited['cues'])}; {a:.2f}–{b:.2f}, score={confidence:.3f}",flush=True)
    assert word_cursor==len(draft["words"])
    mapping=read(ROOT/"episode-videos.json");record=next(x for x in mapping if x["episode"]==11)
    assert record["guid"]==e["id"]
    result={"version":1,"episode":11,"guid":e["id"],"youtubeId":record["youtubeId"],"languages":["cs","sk"],
        "quality":"editorial-corrected-forced-aligned",
        "source":{**draft["source"],"type":"original-MP3-ASR-and-CTC-forced-alignment","alignmentModel":ALIGN_MODEL,
            "transcriptFile":"captions/source/episode-11-draft.sk.json","alignmentFile":"captions/source/episode-11-alignment.json",
            "review":"Complete Slovak editorial review and Czech translation; acoustic character alignment and review of flagged passages. Not a full independent human listening verification."},
        "cues":cues}
    for i,c in enumerate(cues):
        assert c["end"]>c["start"] and (not i or c["start"]>=cues[i-1]["end"])
        assert all(len(c["text"][lang])<=240 for lang in ("cs","sk"))
    write(EDITED,edited)
    write(OUT/"episode-11.json",result)
    write(SOURCE/"episode-11-alignment.json",{"model":ALIGN_MODEL,"audioSha256":meta["audioSha256"],"cues":alignment})
    for lang in ("cs","sk"):
        (OUT/f"episode-11.{lang}.srt").write_text("\n\n".join(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text'][lang]}" for i,c in enumerate(cues,1))+"\n",encoding="utf-8")
    write(OUT/"episode-11.review.json",{"episode":11,"cueCount":len(cues),"asrWordCount":len(draft["words"]),"audioSha256":meta["audioSha256"],
        "lowScoreCues":[{k:v for k,v in a.items() if k!="characters"} for a in alignment if a["meanCharacterScore"]<.35],
        "maxBoundaryChange":max(abs(a["start"]-a["asrStart"]) for a in alignment),
        "status":"review-further-if-low-score-cues-otherwise-needs-independent-listening" if any(a["meanCharacterScore"]<.35 for a in alignment) else "editorially-reviewed-acoustically-aligned-needs-independent-listening"})

    subprocess.run(["node","tools/build-mp3-seek-index.mjs",str(AUDIO),e["enclosure"]],cwd=ROOT,check=True)
    print(f"ALIGNED {len(cues)} bilingual cues",flush=True)

if __name__=="__main__":
    align()

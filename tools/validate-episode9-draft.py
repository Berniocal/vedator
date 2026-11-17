#!/usr/bin/env python3
"""Structural checks of reviewed episode 9 draft. Never claims audio verification."""
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
def read(name):return json.loads((ROOT/name).read_text(encoding="utf-8"))
def stamp(v):
    ms=round(v*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
def verify():
    src=read("captions/source/episode-9-draft.sk.json")
    patch=read("captions/source/episode-9-editorial-patches.json")["patches"]
    edited=read("captions/episode-9.edited.json")
    independent=read("captions/source/episode-9-extra-checks.sk.json")
    cues=edited["cues"]
    assert src["episode"]==edited["episode"]==9
    assert len(src["cues"])==len(patch)==520
    assert len(cues)>=520 and len(independent["passages"])>=20
    sha=src["source"]["audioSha256"]
    assert edited["source"]["audioSha256"]==independent["audioSha256"]==sha
    assert len(sha)==64 and len(set(sha))>5
    assert src["source"]["audioBytes"]>70_000_000
    assert 2250<src["source"]["duration"]<2260
    assert all(str(i) in patch for i in range(1,521))
    previous=0.0; cursor=0; recovered=0; max_chars=0
    for i,c in enumerate(cues,1):
        a,b=c["start"],c["end"]
        assert previous<=a<b<=src["source"]["duration"]+.1,(i,"timing")
        previous=b
        lo,hi=c["asrWordRange"]
        assert lo==cursor and hi>=lo,(i,"word coverage")
        if hi==lo:
            assert c.get("recoveredSpeech"),(i,"unmarked recovery")
            recovered+=1
        cursor=hi
        assert c["sourceCues"] and all(1<=int(n)<=520 for n in c["sourceCues"])
        assert c["alignmentText"] and not re.search(r"\\d",c["alignmentText"]),(i,"numeric alignment")
        for lang in ("cs","sk"):
            text=c["text"][lang]
            assert text.strip() and "\\n" not in text,(i,lang,"empty or wrapped")
            assert len(text)<=96,(i,lang,"too long",len(text))
            max_chars=max(max_chars,len(text))
    assert cursor==len(src["words"]),(cursor,len(src["words"]))
    assert recovered>=1
    for lang in ("cs","sk"):
        path=ROOT/f"captions/source/episode-9.{lang}.draft.srt"
        raw=path.read_text(encoding="utf-8-sig").strip()
        blocks=re.split(r"\\n\\s*\\n",raw)
        assert len(blocks)==len(cues),(lang,len(blocks),len(cues))
        for i,(c,block) in enumerate(zip(cues,blocks),1):
            fields=block.splitlines()
            assert fields[0]==str(i) and fields[1]==f"{stamp(c['start'])} --> {stamp(c['end'])}",(lang,i,"time")
            assert "\\n".join(fields[2:])==c["text"][lang],(lang,i,"text")
    print(json.dumps({"ok":True,"episode":9,"bilingualCues":len(cues),"asrWordsCovered":cursor,
        "independentASRPassageChecks":len(independent["passages"]),
        "recoveredSpeechCues":recovered,"maxCharactersPerCue":max_chars,
        "audioSha256":sha,"status":"source-review-only-not-acoustically-certified"},ensure_ascii=False))
if __name__=="__main__":
    try:verify()
    except Exception as e:
        print("Episode 9 draft validation failed:",repr(e),file=sys.stderr)
        raise

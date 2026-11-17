#!/usr/bin/env python3
"""Evidence-based QA triage for episode 9. Never creates publishable captions."""
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/"captions/source"
A=json.loads((SOURCE/"episode-9-draft.sk.json").read_text(encoding="utf-8"))
T=json.loads((SOURCE/"episode-9-translation-draft.cs.json").read_text(encoding="utf-8"))
CHECKS=SOURCE/"episode-9-extra-checks.sk.json"
B=json.loads(CHECKS.read_text(encoding="utf-8")) if CHECKS.exists() else {}
assert A["episode"]==T["episode"]==9
assert A["source"]["audioSha256"]==T["sourceAudioSha256"]
if B:assert B.get("audioSha256")==A["source"]["audioSha256"]
assert len(A["cues"])==len(T["cues"])
assert A["cues"][0]["asrWordRange"][0]==0
assert A["cues"][-1]["asrWordRange"][1]==len(A["words"])
assert all(A["cues"][i]["asrWordRange"][1]==A["cues"][i+1]["asrWordRange"][0] for i in range(len(A["cues"])-1))
assert all(c["asrWordRange"]==t["asrWordRange"] and c["text"]==t["originalSk"]
           for c,t in zip(A["cues"],T["cues"]))

def clock(v):
    m,s=divmod(round(v),60)
    return f"{m:02}:{s:02}"

ratio=[]
for i,(c,t) in enumerate(zip(A["cues"],T["cues"]),start=1):
    n=len(re.sub(r"\s+","",c["text"]))
    o=len(re.sub(r"\s+","",t["draftCs"]))
    if n==0 or o/n < .67 or o/n > 1.5:
        ratio.append({"cue":i,"at":c["start"],"sk":c["text"],"draftCs":t["draftCs"],"ratio":round(o/max(n,1),3)})
low=[{"start":w["start"],"end":w["end"],"text":w["text"],"confidence":w["confidence"]}
     for w in A["words"] if w.get("confidence",1)<.4]
gaps=[]
for prev,now in zip(A["words"],A["words"][1:]):
    delta=now["start"]-prev["end"]
    if delta>1.4:
        gaps.append({"start":prev["end"],"end":now["start"],"seconds":round(delta,2)})
red_flags=[(i+1,c["text"]) for i,c in enumerate(A["cues"])
           if re.search(r"\b(?:nesrozumitel|nezrozumite|poďakujem|písnot|pridvate)\b",c["text"],flags=re.I)]
data={"episode":9,"status":"review-evidence-only-not-subtitles",
    "audioSha256":A["source"]["audioSha256"],"duration":A["source"]["duration"],
    "draftCueCount":len(A["cues"]),"asrWords":len(A["words"]),
    "lowConfidenceWords":low,"asrGaps":gaps,
    "translationLengthFlags":ratio,"asrLexicalFlags":red_flags,
    "independentWindows":B.get("passages",[])}
(SOURCE/"episode-9-editorial-triage.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
lines=["# Vedátorský podcast 8 – redakční kontrola pracovní verze","",
       "**Toto není hotový přepis ani zkontrolovaný překlad.**",
       f"Zvuk SHA-256: `{data['audioSha256']}`.",
       f"Délka: {clock(data['duration'])}; slova: {len(A['words'])}; bloky: {len(A['cues'])}.",
       f"Podezřelé překlady podle délky: {len(ratio)}; slova s ASR jistotou pod 0,4: {len(low)}; ASR mezery delší než 1,4 s: {len(gaps)}.",
       f"Nezávislých ASR oken: {len(B.get('passages',[]))}.","",
       "## Pracovní překlady k revizi (heuristika délky)",""]
for p in ratio:
    lines.append(f"- Blok {p['cue']} ({clock(p['at'])}, poměr {p['ratio']}): SK: {p['sk']}  ")
    lines.append(f"  CS – **není ověřeno**: {p['draftCs']}")
lines+=["","## Nejasná rozpoznaná slova (<0,4)",""]
for w in low:
    lines.append(f"- {clock(w['start'])}: {w['text']} (jistota {w['confidence']:.2f})")
lines+=["","## ASR mezery – audio/VAD kontrola",""]
for p in sorted(gaps,key=lambda x:x["seconds"],reverse=True):
    lines.append(f"- {clock(p['start'])}–{clock(p['end'])}: {p['seconds']} s")
lines+=["","## Nezávislé large-v3 kontrolní úseky",""]
for p in B.get("passages",[]):
    txt=" ".join(x.get("text","") for x in p.get("segments",[]))
    lines.append(f"- {clock(p['start'])}–{clock(p['end'])} ({p.get('reason','')}): {txt}")
lines+=["","Před vydáním je nutné redakčně přečíst **všechny** bloky, opravit nejisté řeči podle zvuku, úplně přeložit a zarovnat opravenou slovenštinu CTC proti skutečné MP3; dodržet shodné časy CZ/SK a ověřit přehrávač.",""]
(SOURCE/"episode-9-editorial-triage.md").write_text("\n".join(lines),encoding="utf-8")
print(json.dumps({"status":"triage-created","episode":9,"words":len(A["words"]),
                  "cues":len(A["cues"]),"translationFlags":len(ratio),
                  "lowWords":len(low),"gaps":len(gaps)},ensure_ascii=False))

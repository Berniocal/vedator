#!/usr/bin/env python3
"""Build *review candidate* bilingual captions for episode 10 from source ASR,
independently checked passages, SK editorial patches and machine CZ draft.
This is not a human-listening certification or a publishing operation.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "captions" / "source"
CAP = ROOT / "captions"
def load(p):
    return json.loads(p.read_text(encoding="utf-8"))
def write(p, x):
    p.write_text(json.dumps(x, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def normalize_sk(s):
    rules = [
        (r"(?i)\bhyksov", "Higgsov"), (r"(?i)\bhyxov", "Higgsov"),
        (r"(?i)\bhygsov", "Higgsov"), (r"(?i)\bhyks", "Higgs"),
        (r"(?i)\bhiggsov bozon", "Higgsov bozón"),
        (r"(?i)\bbozon\b", "bozón"), (r"(?i)\bbozony\b", "bozóny"),
        (r"(?i)\bkvárky\b", "kvarky"), (r"(?i)\bkvárkov\b", "kvarkov"),
        (r"(?i)\bVedatorsk", "Vedátorsk"), (r"\be -maily\b", "e-maily")
    ]
    for pat,repl in rules: s = re.sub(pat, repl, s)
    return " ".join(s.split())

def normalize_cs(s):
    s=" ".join(s.split())
    for old,new in (
        ("Hyksův", "Higgsův"),("Hyxův", "Higgsův"),("Hygsův", "Higgsův"),
        ("Hiksův", "Higgsův"), ("Hyksova", "Higgsova"), ("Hyksový", "Higgsův"),
        ("Higgsovy Bozon", "Higgsův boson"), ("Higgsův Bozon", "Higgsův boson"),
        ("bozon", "boson"), ("Bozon", "boson"), ("bozony", "bosony"),
        ("Cerne", "CERNu"), ("Higgsov", "Higgsův")):
        s=s.replace(old,new)
    return s

def for_ctc(text):
    # Numerals and abbreviations are expanded for the acoustic recognizer
    # without replacing what readers see in the original-language subtitles.
    s=text.replace("W a Z", "dvojité vé a zet").replace("W a", "dvojité vé a")
    s=re.sub(r"\bW\b", "dvojité vé", s)
    s=re.sub(r"\bZ\b", "zet", s)
    s=re.sub(r"\b10\.\b", "desiate", s)
    for num,pron in [("2013","dvetisíctrinásť"),("12","dvanásť"),("20","dvadsať"),("10","desať"),("5","päť")]:
        s=re.sub(r"(?<!\d)"+num+r"(?!\d)",pron,s)
    assert not re.search(r"\d",s),("Unexpanded numerals in CTC",s)
    return s

def main():
    source=load(SRC/"episode-10-draft.sk.json")
    translation=load(SRC/"episode-10-translation-draft.cs.json")
    patches=load(SRC/"episode-10-editorial-patches.json")
    cs_patch_file=SRC/"episode-10-cs-editorial-patches.json"
    cs_patches=load(cs_patch_file).get("patches",{}) if cs_patch_file.exists() else {}
    assert source["episode"]==translation["episode"]==patches["episode"]==10
    assert source["source"]["audioSha256"]==translation["sourceAudioSha256"]==patches["sourceAudioSha256"]
    assert len(source["cues"])==len(translation["cues"])==294
    cues=[];cursor=0
    for index,(orig,trans) in enumerate(zip(source["cues"],translation["cues"]),1):
        lo,hi=orig["asrWordRange"]
        assert lo==cursor and hi>lo,("word mismatch",index)
        cursor=hi
        assert trans["asrWordRange"]==[lo,hi] and trans["originalSk"]==orig["text"]
        sk=normalize_sk(patches["patches"].get(str(index),orig["text"]))
        cs=normalize_cs(cs_patches.get(str(index),trans["draftCs"]))
        assert sk and cs and len(sk)<250 and len(cs)<250,(index,len(sk),len(cs))
        cue={
          "start":orig["start"],"end":orig["end"],
          "text":{"sk":sk,"cs":cs},
          "asrWordRange":[lo,hi],"sourceCues":[index],
          "alignmentText":for_ctc(sk)
        }
        cues.append(cue)
        if index==133:
            # Separate zero-word-range cues recover speech missed by the
            # first model's VAD. The wide independent large-v3 check confirms
            # both phrases but cannot constitute independent human listening.
            recoveries=[
                (586.65,589.97,
                 "odo mňa preč. A potom ty ten medicinbal nehodíš späť.",
                 "ode mě pryč. A potom ty ten medicinbal nehodíš zpátky."),
                (589.97,593.04,
                 "Ja ho zase chytím, posúvam sa tým ďalej.",
                 "Já ho zase chytím a posunu se tím dál.")
            ]
            for a,b,slo,ces in recoveries:
                cues.append({
                  "start":a,"end":b,
                  "text":{"sk":slo,"cs":ces},
                  "asrWordRange":[hi,hi],"sourceCues":[133],
                  "recoveredSpeech":"Independently checked original audio window 578-601 seconds; no ASR word indices",
                  "alignmentText":for_ctc(slo)
                })
    assert cursor==len(source["words"])
    assert all(cues[i]["start"]>=cues[i-1]["end"] for i in range(1,len(cues)))
    result={
       "episode":10,
       "source":{**source["source"],"transcriptFile":"captions/source/episode-10-draft.sk.json",
                 "independentChecks":"captions/source/episode-10-extra-checks.sk.json",
                 "editorialPatches":"captions/source/episode-10-editorial-patches.json",
                 "machineTranslationDraft":"captions/source/episode-10-translation-draft.cs.json"},
       "review":{"status":"text-editorial-draft-needs-acoustic-approval",
                 "note":"No independent full human listening performed; machine Czech draft requires comprehensive editorial correction before release."},
       "checkWindows":[[578,599],[1030,1048],[1190,1208]],
       "cues":cues
    }
    write(CAP/"episode-10.edited.json",result)
    print(json.dumps({"episode":10,"cues":len(cues),"asrWordsCovered":cursor,"skEditorialOverrides":len(patches["patches"]),"csEditorialOverrides":len(cs_patches)},ensure_ascii=False))

if __name__=="__main__":
    main()

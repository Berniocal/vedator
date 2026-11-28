#!/usr/bin/env python3
"""Draft-only Slovak→Czech neural translation, never a publishable caption file.

Translate every ASR cue while preserving cue indexes, timestamps, ASR word
ranges and original Slovak text. Outputs an explicitly unreviewed source file.
Human-language editorial work and acoustic alignment are separate phases.
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFT = ROOT / "captions/source/episode-12-draft.sk.json"
OUTPUT = ROOT / "captions/source/episode-12-translation-draft.cs.json"
MODEL = "facebook/nllb-200-distilled-600M"

def main():
    import torch
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    torch.set_num_threads(4)
    source = json.loads(DRAFT.read_text(encoding="utf-8"))
    assert source["episode"] == 12
    tokenizer = AutoTokenizer.from_pretrained(MODEL, src_lang="slk_Latn")
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL)
    model.eval()
    target_id = tokenizer.convert_tokens_to_ids("ces_Latn")
    assert target_id is not None and target_id != tokenizer.unk_token_id
    cues = source["cues"]
    translations = []
    for offset in range(0, len(cues), 8):
        part = cues[offset:offset + 8]
        inputs = tokenizer([c["text"] for c in part], return_tensors="pt",
                           truncation=True, padding=True, max_length=256)
        with torch.inference_mode():
            out = model.generate(**inputs, forced_bos_token_id=target_id,
                                 max_new_tokens=160, num_beams=4)
        texts = tokenizer.batch_decode(out, skip_special_tokens=True)
        assert len(texts) == len(part)
        for cue, translation in zip(part, texts):
            assert translation.strip()
            translations.append({
                "start": cue["start"],
                "end": cue["end"],
                "asrWordRange": cue["asrWordRange"],
                "originalSk": cue["text"],
                "draftCs": translation.strip()
            })
        if offset % 40 < 8:
            print(f"Unreviewed translation draft {len(translations)}/{len(cues)}", flush=True)
    OUTPUT.write_text(json.dumps({
        "episode": 12,
        "sourceAudioSha256": source["source"]["audioSha256"],
        "model": MODEL,
        "status": "unreviewed-machine-translation-draft-do-not-publish",
        "warning": "Input is UNEDITED ASR. The Czech output may be wrong or missing text. Must be corrected against editorial Slovak transcription and source audio, then independently aligned.",
        "cues": translations
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"DRAFT saved {OUTPUT} ({len(translations)} blocks)", flush=True)

if __name__ == "__main__":
    main()

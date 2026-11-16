#!/usr/bin/env python3
"""Recover episode 3 captions from original MP3, with word-level alignment.
Automatic speech recognition and translation produce a machine draft, not
a human-verified transcript. The broken legacy SRT is never reused as text.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import textwrap
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODE = 3
AUDIO_URL = "https://mcdn.podbean.com/mf/web/jvjwv6/podcast_ep3.mp3"
OUTPUT_DIR = ROOT / "captions"
MODEL_NAME = os.environ.get("WHISPER_MODEL", "medium")
TRANSLATE_MODEL = "facebook/nllb-200-distilled-600M"


def log(message):
    print(message, flush=True)


def download_audio(target):
    request = urllib.request.Request(AUDIO_URL, headers={"User-Agent": "Vedator captions, source audio verification"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=120) as source, target.open("wb") as output:
                while data := source.read(1024 * 1024):
                    output.write(data)
            if target.stat().st_size < 1_000_000:
                raise RuntimeError("Audio was unexpectedly short")
            return
        except Exception as error:
            if attempt == 2:
                raise
            log("Audio download retry: " + repr(error))


def recognized_words(audio_path):
    from faster_whisper import WhisperModel

    log("Loading ASR model: " + MODEL_NAME)
    model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=4, num_workers=2)
    segments, info = model.transcribe(
        str(audio_path), language="sk", task="transcribe", beam_size=5,
        best_of=5, temperature=0.0, word_timestamps=True,
        vad_filter=True, vad_parameters={"min_silence_duration_ms": 500},
        no_speech_threshold=0.6, condition_on_previous_text=True,
        initial_prompt=(
            "Vedátorský podcast 3 – Deviata planéta. Samuel a Jozef rozprávajú "
            "o slnečnej sústave, Uráne, Neptúne, Plute, Oortovom oblaku, "
            "Ole Rømerovi, Williamovi Herschelovi, Alexisovi Bouvardovi, "
            "Urbainovi Le Verrierovi, Johannovi Gallem, planéte Deväť a Nemesis."
        ),
    )
    words = []
    uncertain = []
    duration = float(info.duration or 0)
    next_report = 5
    for segment in segments:
        progress = min(100, int(100 * float(segment.end) / max(duration, 1)))
        if progress >= next_report:
            log(f"ASR: {progress}% at {float(segment.end):.1f}/{duration:.1f} s")
            next_report = (progress // 5 + 1) * 5
        if float(segment.avg_logprob or 0) < -1.0:
            uncertain.append({"start": round(float(segment.start), 2), "text": segment.text.strip()})
        for word in segment.words or []:
            text = word.word.strip()
            if text and word.end > word.start and len(text) < 80:
                words.append({
                    "start": round(float(word.start), 3),
                    "end": round(float(word.end), 3),
                    "text": text,
                    "confidence": round(float(word.probability), 3),
                })
    if len(words) < 600 or duration < 700 or duration > 2400:
        raise RuntimeError(f"Refusing incomplete or unexpected ASR: {len(words)} words, duration {duration:.1f} s")
    log(f"ASR complete: {len(words)} words, {duration:.1f} s")
    return words, duration, uncertain


def make_cues(words):
    groups = []
    current = []

    def flush():
        if current:
            groups.append(list(current))
            current.clear()

    for word in words:
        if current:
            length = len(" ".join(w["text"] for w in current))
            span = word["end"] - current[0]["start"]
            gap = word["start"] - current[-1]["end"]
            sentence_end = bool(re.search(r"[.!?…]$", current[-1]["text"]))
            if (gap >= 0.70 or span > 5.4 or length + len(word["text"]) + 1 > 82
                    or (sentence_end and length >= 22 and gap >= 0.18)):
                flush()
        current.append(word)
    flush()

    cues = []
    for group in groups:
        source = " ".join(item["text"] for item in group).strip()
        if not source:
            continue
        start = max(0, group[0]["start"])
        end = max(start + 0.8, group[-1]["end"])
        cues.append({"start": start, "end": end, "sk": source})
    final = []
    last_end = 0.0
    for index, cue in enumerate(cues):
        start = max(cue["start"], last_end + (0.04 if final else 0))
        next_start = cues[index + 1]["start"] if index + 1 < len(cues) else float("inf")
        end = min(max(start + 0.6, cue["end"]), next_start - 0.04)
        if end <= start:
            continue
        final.append({"start": round(start, 3), "end": round(end, 3), "sk": cue["sk"]})
        last_end = end
    if len(final) < 140:
        raise RuntimeError(f"Insufficient cues after alignment: {len(final)}")
    return final


def translate_cues(cues):
    import torch
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

    torch.set_num_threads(4)
    log("Loading Slovak-to-Czech multilingual translation: " + TRANSLATE_MODEL)
    tokenizer = AutoTokenizer.from_pretrained(TRANSLATE_MODEL, src_lang="slk_Latn")
    model = AutoModelForSeq2SeqLM.from_pretrained(TRANSLATE_MODEL)
    model.eval()
    target = tokenizer.convert_tokens_to_ids("ces_Latn")
    if target is None or target == tokenizer.unk_token_id:
        raise RuntimeError("Czech translation language token missing")
    translations = []
    with torch.inference_mode():
        for i in range(0, len(cues), 8):
            batch = [c["sk"] for c in cues[i:i + 8]]
            encoded = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=150)
            predicted = model.generate(**encoded, forced_bos_token_id=target, num_beams=3,
                                       max_new_tokens=160)
            for source, translated in zip(batch, tokenizer.batch_decode(predicted, skip_special_tokens=True)):
                value = " ".join(translated.split()).strip()
                # Never publish empty content or wildly inflated machine output.
                if (not value or len(value) > 240 or
                        len(value) > 3.5 * max(1, len(source))):
                    raise RuntimeError(f"Unsafe machine translation ({len(source)} -> {len(value)} chars): {source[:75]!r}")
                translations.append(value)
            if (i // 8) % 8 == 0:
                log(f"Translation: {min(i + 8, len(cues))}/{len(cues)} cues")
    if len(translations) != len(cues):
        raise RuntimeError("Translation count mismatch")
    return translations


def srt_time(seconds):
    ms = max(0, round(seconds * 1000))
    hours, rem = divmod(ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def line_wrap(sentence):
    return "\n".join(textwrap.wrap(sentence, width=50, break_long_words=False, break_on_hyphens=False))


def save(cues, translations, duration, words, uncertain, digest, bytes_size):
    catalogue = json.loads((ROOT / "episode-videos.json").read_text(encoding="utf-8"))
    record = next(v for v in catalogue if v["episode"] == EPISODE)
    episodes = json.loads((ROOT / "episodes.json").read_text(encoding="utf-8"))
    episode = next(e for e in (episodes if isinstance(episodes, list) else episodes["episodes"])
                   if e["number"] == EPISODE)
    if record["guid"] != episode["id"] or not re.fullmatch(r"[A-Za-z0-9_-]{11}", record["youtubeId"]):
        raise RuntimeError("Podcast catalog identity changed; captions must not be misassigned")

    output_cues = [{
        "start": cue["start"], "end": cue["end"], "kind": "speech",
        "text": {"sk": line_wrap(cue["sk"]), "cs": line_wrap(cs)}
    } for cue, cs in zip(cues, translations)]
    # The app and build-content-v2 reject cue overlaps and invalid paired text.
    last_end = 0
    for cue in output_cues:
        if cue["start"] < last_end or cue["end"] <= cue["start"]:
            raise RuntimeError("Invalid subtitle cue sequence")
        if not all(cue["text"][lang] and len(cue["text"][lang]) <= 240 for lang in ("cs", "sk")):
            raise RuntimeError("Invalid bilingual cue")
        last_end = cue["end"]

    source = {
        "type": "podcast-MP3-word-aligned-ASR",
        "audio": AUDIO_URL, "audioSha256": digest, "audioBytes": bytes_size,
        "transcriber": f"faster-whisper/{MODEL_NAME}", "translator": TRANSLATE_MODEL,
        "review": "machine-generated; manual listening not completed",
        "legacy": "Original episode 3 SRT is corrupted and was not copied",
    }
    output = {
        "version": 1, "episode": EPISODE, "guid": record["guid"], "youtubeId": record["youtubeId"],
        "languages": ["cs", "sk"], "quality": "machine-draft-needs-review",
        "source": source, "cues": output_cues,
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "episode-3.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    for lang in ("sk", "cs"):
        srt = "\n\n".join(
            f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text'][lang]}"
            for i, c in enumerate(output_cues, 1)
        )
        (OUTPUT_DIR / f"episode-3.{lang}.srt").write_text(srt + "\n", encoding="utf-8")
    (OUTPUT_DIR / "episode-3.review.json").write_text(
        json.dumps({
            "status": "machine-draft-needs-listening-review",
            "episode": 3, "duration": duration, "wordCount": len(words),
            "cueCount": len(output_cues), "uncertainSegments": uncertain,
            "audioSha256": digest, "asr": MODEL_NAME, "translation": TRANSLATE_MODEL,
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUTPUT_DIR / "source").mkdir(exist_ok=True)
    (OUTPUT_DIR / "source" / "episode-3-asr-words.sk.json").write_text(
        json.dumps(words, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    record["captionFile"] = "captions/episode-3.json"
    (ROOT / "episode-videos.json").write_text(
        json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    log(f"Prepared {len(output_cues)} bilingual captions. Episode 3 is now registered.")


def main():
    import tempfile
    with tempfile.TemporaryDirectory(prefix="vedator-ep3-") as directory:
        audio = Path(directory) / "podcast_ep3.mp3"
        log("Downloading original episode MP3")
        download_audio(audio)
        digest = hashlib.sha256(audio.read_bytes()).hexdigest()
        words, duration, uncertain = recognized_words(audio)
        cues = make_cues(words)
        translations = translate_cues(cues)
        save(cues, translations, duration, words, uncertain, digest, audio.stat().st_size)


if __name__ == "__main__":
    main()

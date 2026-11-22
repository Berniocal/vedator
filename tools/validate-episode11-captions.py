#!/usr/bin/env python3
"""Structural and provenance gate for episode 11 captions; NOT an acoustic-listening test."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAP = ROOT / "captions"
N = 11


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def srt_time(value):
    ms = round(value * 1000)
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    seconds, ms = divmod(ms, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{ms:03}"


def parse_srt(path):
    contents = path.read_text(encoding="utf-8-sig").strip()
    result = []
    for block in re.split(r"\n\s*\n", contents):
        lines = block.splitlines()
        assert len(lines) >= 3, (path, block[:50])
        assert int(lines[0]) == len(result) + 1, (path, lines[0])
        assert " --> " in lines[1], (path, lines[1])
        start, end = lines[1].split(" --> ", 1)
        result.append((start, end, "\n".join(lines[2:])))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", type=Path, help="Actual episode 11 MP3, if available")
    args = parser.parse_args()
    issues, warnings = [], []
    def check(condition, message):
        if not condition:
            issues.append(message)

    required = [CAP / f"episode-{N}.{language}.srt" for language in ("cs", "sk")]
    required += [CAP / f"episode-{N}.json", CAP / f"episode-{N}.edited.json",
                 CAP / f"episode-{N}.review.json",
                 CAP / "source" / f"episode-{N}-draft.sk.json",
                 CAP / "source" / f"episode-{N}-alignment.json"]
    absent = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if absent:
        print(json.dumps({"ok": False, "missing": absent}, ensure_ascii=False, indent=2))
        return 1
    final = load(CAP / f"episode-{N}.json")
    edited = load(CAP / f"episode-{N}.edited.json")
    draft = load(CAP / "source" / f"episode-{N}-draft.sk.json")
    alignment = load(CAP / "source" / f"episode-{N}-alignment.json")
    review = load(CAP / f"episode-{N}.review.json")
    video = next((v for v in load(ROOT / "episode-videos.json") if v["episode"] == N), {})
    cues = final["cues"]
    word_count = len(draft["words"])
    check(len(cues) == len(edited["cues"]) == len(alignment["cues"]), "Cue count mismatch")
    check(final["episode"] == N == draft["episode"], "Episode number mismatch")
    check(final["guid"] == video.get("guid") == draft["guid"], "Podcast GUID mismatch")
    check(final["youtubeId"] == video.get("youtubeId"), "YouTube ID mismatch")
    check(video.get("captionFile") == f"captions/episode-{N}.json", "Caption mapping not published")
    check(final.get("quality") == "editorial-corrected-forced-aligned",
          "Caption quality/provenance flag must not imply unreviewed ASR is final")
    sha = draft["source"].get("audioSha256")
    check(sha == "894ace9292a9bec7a0c8d5f1acc9904e9fd04fe8da2d39bb89a5bb49a1f6f428",
          "Source differs from authenticated episode 11 original RSS MP3")
    check(word_count == 2231, "Complete source ASR must retain all 2231 words")
    for name in ("episode-11-extra-checks.sk.json", "episode-11-followup-checks.sk.json",
                 "episode-11-ctc-checks.sk.json"):
        evidence_path = CAP / "source" / name
        check(evidence_path.is_file(), f"Missing independent audio evidence: {name}")
        if evidence_path.is_file():
            check(load(evidence_path).get("audioSha256") == sha,
                  f"Independent audio evidence hash mismatch: {name}")
    check(bool(sha) and sha == final["source"].get("audioSha256") == alignment.get("audioSha256"),
          "Audio SHA-256 mismatch")
    check(review.get("audioSha256") == sha and review.get("cueCount") == len(cues),
          "Review report does not match source and final captions")
    check(final["source"].get("alignmentModel") == "comodoro/wav2vec2-xls-r-300m-sk-cv8",
          "Unexpected acoustic alignment model")

    layout = load(CAP / "source" / "episode-11-layout-overrides.json")
    for choice in layout["overrides"]:
        cue = cues[choice["cue"] - 1]
        check(cue["text"][choice["language"]] == choice["text"], "Final caption differs from selected mobile layout")
        check(re.sub(r"\s+", " ", choice["text"]) == choice["flatText"], "Mobile layout changed spoken words")

    last_end, word_end = 0, 0
    duration = float(draft["source"]["duration"])
    scores, long_lines, three_lines, fast = [], [], [], []
    for i, (cue, audit) in enumerate(zip(cues, alignment["cues"]), 1):
        a, b = cue["start"], cue["end"]
        check(isinstance(a, (int, float)) and isinstance(b, (int, float)) and
              last_end <= a < b <= duration + .1, f"Cue {i}: invalid boundaries")
        check(abs(a - audit["start"]) <= .0011 and abs(b - audit["end"]) <= .0011,
              f"Cue {i}: JSON/CTC timing mismatch")
        lo, hi = cue["asrWordRange"]
        recovered = cue.get("recoveredSpeech")
        if recovered:
            path = ROOT / recovered.get("evidence", "missing")
            check(path.is_file(), f"Cue {i}: recovered speech has no source evidence")
            if path.is_file():
                source_evidence = load(path)
                check(source_evidence.get("audioSha256") == sha,
                      f"Cue {i}: recovered speech has wrong audio hash")
                check(any(p["start"] <= a and p["end"] >= b
                          for p in source_evidence.get("passages", [])),
                      f"Cue {i}: recovered speech lies outside evidence windows")
        check(lo == word_end and hi >= lo and
              (lo < hi or bool(cue.get("recoveredSpeech"))),
              f"Cue {i}: ASR word-range gap or invalid range")
        check(edited["cues"][i - 1]["asrWordRange"] == cue["asrWordRange"],
              f"Cue {i}: edited/final word-range mismatch")
        check(audit.get("alignmentText") == edited["cues"][i - 1].get("alignmentText", edited["cues"][i - 1]["text"]["sk"]),
              f"Cue {i}: alignment does not describe the reviewed Slovak text")
        check(bool(audit.get("characters")), f"Cue {i}: missing character alignment evidence")
        check(not re.search(r"\d", audit.get("alignmentText", "")),
              f"Cue {i}: printed numerals were silently omitted from acoustic alignment")
        for language in ("cs", "sk"):
            check(cue["text"][language].replace("\n", " ") == edited["cues"][i - 1]["text"][language],
                  f"Cue {i}: final {language} text differs from reviewed text")
            lines = cue["text"][language].split("\n")
            check(not any(re.search(r"(?:^| )[aikosuvz]$", line, re.I) for line in lines[:-1]),
                  f"Cue {i}: avoidable single-letter word at a fixed line ending in {language}")
            if len(lines) > 2:
                three_lines.append((i, language, len(lines)))
            if max(map(len, lines)) > 48:
                long_lines.append((i, language, max(map(len, lines))))
            if len(cue["text"][language].replace("\n", " ")) / (b - a) > 25:
                fast.append((i, language))
        scores.append(float(audit.get("meanCharacterScore", 0)))
        word_end, last_end = hi, b
    check(word_end == word_count, f"ASR words omitted at end: {word_end}/{word_count}")
    low_alignment = [(i+1,a) for i,a in enumerate(alignment['cues']) if a['meanCharacterScore'] < .35]
    check(not low_alignment, f"Unresolved CTC scores below 0.35: {[(i,a['meanCharacterScore']) for i,a in low_alignment]}")
    check(not long_lines, f"Lines exceed 48 characters: {long_lines}")
    check(not three_lines, f"Cues exceed two lines: {three_lines}")
    if fast:
        warnings.append(f"{len(fast)} cues exceed 25 characters per second")

    for language in ("cs", "sk"):
        srt = parse_srt(CAP / f"episode-{N}.{language}.srt")
        check(len(srt) == len(cues), f"{language} SRT cue count mismatch")
        for i, (cue, row) in enumerate(zip(cues, srt), 1):
            start, end, text = row
            check(start == srt_time(cue["start"]) and end == srt_time(cue["end"]),
                  f"{language} SRT cue {i}: timestamp mismatch")
            check(text == cue["text"][language], f"{language} SRT cue {i}: text mismatch")

    index = load(ROOT / "audio-seek-index.json")["entries"].get(draft["source"]["audio"])
    check(index is not None, "Missing exact frame index for source MP3")
    if index:
        check(abs(index["duration"] - duration) < .2, "MP3 frame index duration mismatch")
        check(index["size"] == draft["source"]["audioBytes"], "MP3 frame index byte count mismatch")
        check(bool(index["anchors"]), "MP3 index has no anchors")
    if args.audio:
        check(args.audio.is_file(), "MP3 path not readable")
        if args.audio.is_file():
            actual = hashlib.file_digest(args.audio.open("rb"), "sha256").hexdigest()
            check(actual == sha, "Source MP3 SHA-256 does not match subtitles")

    result = {"ok": not issues, "episode": N, "cueCount": len(cues),
              "asrWordsCovered": word_end, "asrWordCount": word_count,
              "duration": duration, "audioSha256": sha,
              "lowCtcScoreCount": sum(v < .35 for v in scores),
              "documentedLowScoreExceptions": len(low_alignment),
              "warnings": warnings, "issues": issues,
              "caution": "Automated structure checks do not prove accuracy of spoken text or YouTube/MP3 acoustic sync."}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())

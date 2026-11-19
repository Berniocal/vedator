#!/usr/bin/env python3
"""Build reviewed two-line captions from authenticated audio and resolved edits.

Alignment builds reviewable assets only. Registration is a separate operation,
after all textual, acoustic, gap and layout gates pass.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import re
import subprocess
import textwrap
from functools import lru_cache
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('audio_review', Path(__file__).with_name('review-youtube-caption-batch-audio.py'))
audio = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audio)
batch = audio.batch
ROOT, SOURCE = batch.ROOT, batch.SOURCE
CAP = ROOT / 'captions'


def balanced(text):
    """At most two 48-character lines; avoid isolated words on a third line."""
    text = ' '.join(text.split())
    if len(text) <= 48:
        return text
    words = text.split()
    choices = []
    for i in range(1, len(words)):
        left, right = ' '.join(words[:i]), ' '.join(words[i:])
        if max(len(left), len(right)) <= 48:
            orphan = 35 if min(i, len(words)-i) == 1 else 0
            choices.append((abs(len(left)-len(right))+orphan, left+'\n'+right))
    return min(choices)[1] if choices else None


def atoms(text):
    # Keep numerals, formulas and annotations together when deriving acoustic
    # word boundaries. Printed digits are never silently dropped by the model.
    pattern = r'\[[^\]]*\]|E\s*=\s*mc²\S*|H₂O\S*|\d{1,3}(?:[ \u00a0]\d{3})+(?:[,.]\d+)?[^\s]*|Artemis II\S*|typ I\S*|\S+'
    return re.findall(pattern, text)


def acoustic_atoms(words, overrides=None):
    result = []
    for i, word in enumerate(words):
        if overrides and str(i) in overrides:
            result.append(overrides[str(i)])
        else:
            word = re.sub(r'(?<=\d)[ \u00a0](?=\d{3}(?:\D|$))', '', word)
            result.append(audio.acoustic_text(word))
    return result


def token_map(parts, vocab, blank, delimiter, upper):
    ids, owners = [], []
    for i, part in enumerate(parts):
        if not part:
            continue
        if ids:
            ids.append(vocab[delimiter]); owners.append(-1)
        for ch in (part.upper() if upper else part.lower()).replace(' ', delimiter):
            if ch in vocab and vocab[ch] != blank:
                ids.append(vocab[ch]); owners.append(i if ch != delimiter else -1)
    assert ids, 'Empty acoustic token stream'
    return ids, owners


def bilingual_parts(sk_words, cs_words, word_times):
    """Jointly split translations, retaining every word and acoustic boundary.

    Dynamic programming prefers matching clause punctuation and similar
    progress in both languages. Times always come from Slovak acoustic words.
    """
    n, m = len(sk_words), len(cs_words)
    @lru_cache(None)
    def fragment(lang, a, b):
        return balanced(' '.join((sk_words if lang == 'sk' else cs_words)[a:b]))
    @lru_cache(None)
    def solve(a, c):
        if (a, c) == (n, m):
            return 0.0, []
        best = (math.inf, None)
        for b in range(a+1, n+1):
            sk = fragment('sk', a, b)
            if sk is None:
                if len(' '.join(sk_words[a:b])) > 96: break
                continue
            if word_times[b-1]['end']-word_times[a]['start'] > 7.5 and b-a > 2:
                break
            for d in range(c+1, m+1):
                cs = fragment('cs', c, d)
                if cs is None:
                    if len(' '.join(cs_words[c:d])) > 96: break
                    continue
                if (b == n) != (d == m): continue
                remaining, trail = solve(b, d)
                if trail is None: continue
                # Penalize extra panels, mismatched sentence boundaries and
                # tiny leftovers. Translation need not share exact word count.
                terminal_sk = bool(re.search(r'[.!?…,:;]["”»)]?$', sk_words[b-1]))
                terminal_cs = bool(re.search(r'[.!?…,:;]["”»)]?$', cs_words[d-1]))
                cost = 100 + 80*abs(b/n-d/m)
                cost += 20*(terminal_sk != terminal_cs)
                cost += 12 if b < n and not terminal_sk else 0
                cost += max(0, 28-min(len(sk), len(cs)))*1.5
                cost += abs(len(sk)-len(cs))*.08
                cost += ((len(sk)-75)**2+(len(cs)-75)**2)*.001
                if cost+remaining < best[0]:
                    best = cost+remaining, [(a,b,c,d,sk,cs)]+trail
        return best
    score, result = solve(0, 0)
    assert result is not None, ('Cannot fit bilingual group', sk_words, cs_words)
    assert ' '.join(p[4].replace('\n',' ') for p in result) == ' '.join(sk_words)
    assert ' '.join(p[5].replace('\n',' ') for p in result) == ' '.join(cs_words)
    return result


def reviewed_groups(number):
    review, groups = audio.editorial(number)
    cs = batch.read(SOURCE/f'episode-{number}-youtube-czech-editorial-review.json')
    draft_path = SOURCE/f'episode-{number}-youtube-czech-multislav-draft.json'
    draft = batch.read(draft_path)
    assert cs['sourceDraftSha256'] == batch.digest(draft_path)
    assert cs['reviewedGroupRanges'] == [[0,len(groups)]]
    resolution_path = SOURCE/f'episode-{number}-youtube-audio-resolutions.json'
    resolutions = batch.read(resolution_path)
    assert resolutions['status'] in ('all-audio-questions-resolved','editorial-candidates-pending-acoustic-followup')
    evidence_path = SOURCE/f'episode-{number}-youtube-independent-audio-review.json'
    evidence = batch.read(evidence_path)
    assert resolutions['audioSha256'] == evidence['audioSha256']
    assert resolutions['independentReviewSha256'] == batch.digest(evidence_path)
    for key in review['needsAudioReview']:
        item = resolutions['groups'].get(key)
        assert item and item.get('reason') and item.get('evidencePassages'), ('Unresolved speech', number, key)
        for index in item['evidencePassages']:
            passage = evidence['passages'][index]
            assert int(key) in passage['groups'], ('Wrong evidence passage', number, key, index)
    gap_indices = [i for i,p in enumerate(evidence['passages']) if not p['groups']]
    assert all(str(i) in resolutions.get('gaps',{}) for i in gap_indices), 'Unchecked caption gap'
    result=[]
    for i,g in enumerate(groups):
        fixed = resolutions['groups'].get(str(i), {})
        result.append({**g,'group':i,'text':{
            'sk':fixed.get('textSk', review['corrections'].get(str(i),g['originalSk'])),
            'cs':fixed.get('textCs', cs['corrections'].get(str(i), draft['cues'][i]['draftCs']))},
            'acousticOverrides':fixed.get('acousticOverrides',{})})
    for i,item in enumerate(resolutions.get('recovered',[])):
        assert item['start']<item['end'] and item.get('originalSpeech') and item.get('evidencePassages')
        result.append({**item,'group':f'recovered-{i}', 'acousticOverrides':{}})
    result.sort(key=lambda g:g['start'])
    return result, resolutions


def srt_time(value):
    ms=round(value*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'


def align(number):
    import numpy as np
    import torch
    import torchaudio
    from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
    torch.set_num_threads(4)
    groups, resolutions = reviewed_groups(number)
    proof, wave = audio.source_audio(number)
    final_path=SOURCE/f'episode-{number}-youtube-final-alignment.json'
    previous=batch.read(final_path) if final_path.exists() else {}
    cache={str(g['group']):g for g in previous.get('groups',[])} if previous.get('audioSha256')==proof['audioSha256'] else {}
    models={}
    def model_for(language):
        name=audio.ALIGN_MODEL if language=='sk' else 'facebook/wav2vec2-base-960h'
        if language not in models:
            processor=Wav2Vec2Processor.from_pretrained(name)
            model=Wav2Vec2ForCTC.from_pretrained(name);model.eval()
            models[language]=(name,processor,model)
        return models[language]
    # Align consecutive groups jointly. Independent padded windows can force a
    # first/last character onto a neighboring utterance even at a good average
    # confidence. One joint monotonic path prevents those artificial overlaps.
    speech_groups=[g for g in groups if not re.fullmatch(r'(?:\[[^\]]+\]\s*)+',g['text']['sk'])]
    chunks=[]
    for g in speech_groups:
        if not chunks or g.get('sourceLanguage','sk')!=chunks[-1][-1].get('sourceLanguage','sk') or g['end']-chunks[-1][0]['start']>24 or g['start']-chunks[-1][-1]['end']>1.5:
            chunks.append([])
        chunks[-1].append(g)
    aligned={}
    audit={'episode':number,'model':audio.ALIGN_MODEL,'audioSha256':proof['audioSha256'],'groups':[]}
    for ci,chunk in enumerate(chunks):
        key=hashlib.sha256(json.dumps(chunk,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        language=chunk[0].get('sourceLanguage','sk')
        name,processor,model=model_for(language)
        vocab=processor.tokenizer.get_vocab();blank=processor.tokenizer.pad_token_id
        delimiter=processor.tokenizer.word_delimiter_token
        upper=sum(c.isupper() for c in vocab)>sum(c.islower() for c in vocab)
        ids=[];chunk_owners=[];word_owners=[];details=[]
        for ri,g in enumerate(chunk):
            sk=' '.join(g['text']['sk'].split());printed=atoms(sk)
            spoken=acoustic_atoms(printed,g['acousticOverrides']) if language=='sk' else [g['originalSpeech']]
            local_ids,owners=token_map(spoken,vocab,blank,delimiter,upper)
            if ids:ids.append(vocab[delimiter]);chunk_owners.append(-1);word_owners.append(-1)
            ids.extend(local_ids);chunk_owners.extend([ri]*len(local_ids));word_owners.extend(owners)
            details.append((g,sk,printed,spoken))
        if all(cache.get(str(g['group']),{}).get('chunkKey')==key for g in chunk):
            for g in chunk:aligned[str(g['group'])]=cache[str(g['group'])]
        else:
            a=max(0,chunk[0]['start']-.15);b=min(len(wave)/16000,chunk[-1]['end']+.15)
            inputs=processor(wave[int(a*16000):int(b*16000)],sampling_rate=16000,return_tensors='pt',padding=True)
            with torch.inference_mode():logits=model(**inputs).logits.log_softmax(-1)
            independent_decode=processor.batch_decode(logits.argmax(-1))[0]
            paths,scores=torchaudio.functional.forced_align(logits,torch.tensor([ids],dtype=torch.int32),blank=blank)
            spans=torchaudio.functional.merge_tokens(paths[0],scores[0].exp(),blank=blank)
            assert len(spans)==len(ids)
            ratio=(b-a)/logits.shape[1]
            characters=[{'token':int(t.token),'start':round(a+t.start*ratio,3),'end':round(a+t.end*ratio,3),'score':round(float(t.score),4)} for t in spans]
            for ri,(g,sk,printed,spoken) in enumerate(details):
                chars=[c for c,owner in zip(characters,chunk_owners) if owner==ri]
                owners=[w for w,owner in zip(word_owners,chunk_owners) if owner==ri]
                speech=[c for c in chars if c['token']!=vocab[delimiter]]
                aligned[str(g['group'])]={'group':g['group'],'textSk':sk,'model':name,'chunkKey':key,'independentCtcDecode':independent_decode,'chunkWindow':[round(a,3),round(b,3)],'alignmentText':' '.join(spoken),'start':speech[0]['start'],'end':speech[-1]['end'],'meanCharacterScore':round(float(np.mean([c['score'] for c in speech])),4),'characters':chars,'wordOwners':owners}
        audit['groups']=[aligned[str(g['group'])] for chunk_done in chunks[:ci+1] for g in chunk_done]
        batch.write(final_path,audit)
        print(f'JOINT ALIGN {number}: {ci+1}/{len(chunks)}',flush=True)
    cues=[];omitted=[]
    audit['groups']=[]
    for gi,g in enumerate(groups):
        sk=' '.join(g['text']['sk'].split());cs=' '.join(g['text']['cs'].split())
        assert sk and cs and '\ufffd' not in sk+cs
        if re.fullmatch(r'(?:\[[^\]]+\]\s*)+',sk):
            # Non-speech annotations remain in the source audit, without
            # flashing breathing/coughing overlays in the reading text.
            omitted.append({'group':g['group'],'text':g['text'],'start':g['start'],'end':g['end'],'reason':'non-speech annotation'})
            continue
        language=g.get('sourceLanguage','sk')
        entry=aligned[str(g['group'])]
        characters=entry['characters'];owners=entry['wordOwners']
        printed=atoms(sk)
        entry['textCs']=cs
        if language=='en':
            assert balanced(sk) and balanced(cs), 'Recovered English clause must fit one panel'
            times=[{'start':entry['start'],'end':entry['end']} for _ in printed]
            parts=[(0,len(printed),0,len(cs.split()),balanced(sk),balanced(cs))]
        else:
            times=[]
            for wi in range(len(printed)):
                spans=[c for c,owner in zip(characters,owners) if owner==wi]
                if spans:
                    times.append({'start':spans[0]['start'],'end':spans[-1]['end']})
                else:
                    # An inline non-speech annotation or punctuation belongs to
                    # its nearest spoken neighbor; no invented speech timings.
                    times.append(None)
            for wi,t in enumerate(times):
                if t is None:
                    next_t=next((v for v in times[wi+1:] if v),None)
                    times[wi]={'start':next_t['start'],'end':next_t['start']} if next_t else {'start':times[wi-1]['end'],'end':times[wi-1]['end']}
            parts=bilingual_parts(printed,cs.split(),times)
        entry['wordTimes']=times
        audit['groups'].append(entry)
        for a,b,c,d,sk_part,cs_part in parts:
            cues.append({'start':times[a]['start'],'end':times[b-1]['end'],'kind':'speech','text':{'sk':sk_part,'cs':cs_part},'sourceGroup':g['group'],'sourceWordRange':[a,b],'translationWordRange':[c,d]})
        if gi%20==0 or gi+1==len(groups):
            print(f'FINAL ALIGN {number}: {gi+1}/{len(groups)}, score={entry["meanCharacterScore"]}',flush=True)
    audit['omittedNonSpeech']=omitted
    audit['boundaryAdjustments']=[]
    for previous,current in zip(cues,cues[1:]):
        overlap=previous['end']-current['start']
        if overlap>0:
            # Concurrent speakers cannot share one caption lane. Keep an
            # explicit audit of every midpoint; large conflicts remain a gate.
            midpoint=round((previous['end']+current['start'])/2,3)
            audit['boundaryAdjustments'].append({'previousGroup':previous['sourceGroup'],'nextGroup':current['sourceGroup'],'overlap':round(overlap,3),'midpoint':midpoint})
            previous['end']=midpoint;current['start']=midpoint
    audit['lowScoreGroups']=[g['group'] for g in audit['groups'] if g['meanCharacterScore']<.35]
    audit['largeBoundaryConflicts']=[a for a in audit['boundaryAdjustments'] if a['overlap']>.3]
    batch.write(final_path,audit)
    mapping=next(v for v in batch.read(ROOT/'episode-videos.json') if v['episode']==number)
    result={'version':1,'episode':number,'guid':mapping['guid'],'youtubeId':mapping['youtubeId'],'languages':['cs','sk'],'quality':'editorial-corrected-forced-aligned','source':{
        'audio':proof['audio'],'audioSha256':proof['audioSha256'],'audioBytes':proof['audioBytes'],'duration':proof['audioDuration'],
        'type':'reviewed-YouTube-transcript-and-original-MP3-CTC-alignment','alignmentModel':audio.ALIGN_MODEL,
        'transcriptFile':f'captions/episode-{number}.edited.json','alignmentFile':str(final_path.relative_to(ROOT)),
        'review':'Complete bilingual text review; disputed passages independently re-recognized from authenticated MP3. Acoustic word alignment; seven sampled checks against native YouTube timestamps. Not full independent human listening verification.'},'cues':cues}
    batch.write(CAP/f'episode-{number}.edited.json',{'episode':number,'groups':groups,'resolutionsFile':f'captions/source/episode-{number}-youtube-audio-resolutions.json'})
    batch.write(CAP/f'episode-{number}.json',result)
    for language in ['sk','cs']:
        (CAP/f'episode-{number}.{language}.srt').write_text('\n\n'.join(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text'][language]}" for i,c in enumerate(cues,1))+'\n',encoding='utf-8')
    report={'episode':number,'cueCount':len(cues),'sourceGroupCount':len(groups),'audioSha256':proof['audioSha256'],'lowScoreGroups':audit['lowScoreGroups'],'largeBoundaryConflicts':audit['largeBoundaryConflicts'],'status':'assets-built-not-registered-needs-quality-gates'}
    batch.write(CAP/f'episode-{number}.review.json',report)
    # Save the exact index per episode, avoiding matrix writes to a shared file.
    audio_path=Path(__import__('os').environ.get('VEDATOR_BATCH_AUDIO','/tmp/vedator-youtube-batch-audio'))/f'episode-{number}.mp3'
    subprocess.run(['node',str(ROOT/'tools/build-mp3-seek-index.mjs'),str(audio_path),proof['audio']],cwd=ROOT,check=True)
    index=batch.read(ROOT/'audio-seek-index.json')['entries'][proof['audio']]
    batch.write(SOURCE/f'episode-{number}-youtube-seek-index.json',{'audio':proof['audio'],'audioSha256':proof['audioSha256'],'index':index})
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episode',type=int)
    align(parser.parse_args().episode)

#!/usr/bin/env python3
"""Prepare auditable bilingual drafts; never register or publish unreviewed captions."""
import argparse, difflib, gc, hashlib, html, json, os, re, subprocess, unicodedata
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'captions/source'
TRANSLATE_MODEL = 'facebook/nllb-200-distilled-600M'
ASR_MODEL = 'large-v3-turbo'
HEADER = re.compile(r'(?m)^\s*(\d+)\s*\n(\d\d:\d\d:\d\d[,.]\d{3})\s+-->\s+(\d\d:\d\d:\d\d[,.]\d{3})[^\n]*\n')
def read(path): return json.loads(path.read_text(encoding='utf-8'))
def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def seconds(value):
    h, m, s = value.replace(',', '.').split(':')
    return int(h)*3600 + int(m)*60 + float(s)
def normalize_srt(value):
    value = value.replace('\r\n', '\n').replace('\r', '\n')
    headers = list(HEADER.finditer(value))
    if not headers: raise ValueError('No SRT cues')
    raw = []
    for i, match in enumerate(headers):
        text = value[match.end():headers[i+1].start() if i+1<len(headers) else len(value)]
        text = html.unescape(re.sub(r'<[^>]*>', '', text))
        text = ' '.join(text.replace('>>', '').split())
        raw.append({'sourceCue': int(match[1]), 'start': seconds(match[2]), 'end': seconds(match[3]), 'text': text})
    rolling = sum(c['end']-c['start'] <= .025 for c in raw) > len(raw)*.1
    cues = []; previous = None; duplicates = []
    for cue in raw:
        if not cue['text']: continue
        tokens = cue['text'].split(); overlap = 0
        if rolling and previous and cue['start']-previous['end'] < .05:
            prior = previous['text'].split()
            for size in range(1, min(len(prior), len(tokens))+1):
                if prior[-size:] == tokens[:size]: overlap = size
        previous = cue
        if overlap: duplicates.append({'sourceCue': cue['sourceCue'], 'duplicateTokenCount': overlap})
        tokens = tokens[overlap:]
        if tokens: cues.append({**cue, 'text': ' '.join(tokens)})
    for i, cue in enumerate(cues):
        if i+1<len(cues): cue['end'] = min(cue['end'], cues[i+1]['start'])
        if cue['end']<=cue['start']: raise ValueError(('Nonpositive cue', cue))
    return cues, {'sourceCueCount': len(raw), 'rollingCaptions': rolling, 'removedDisplayDuplicates': duplicates}
def draft_groups(cues):
    groups=[]; pending=[]
    def flush():
        if pending:
            groups.append({'start':pending[0]['start'], 'end':pending[-1]['end'], 'sourceCues':[c['sourceCue'] for c in pending], 'originalSk':' '.join(c['text'] for c in pending)})
            pending.clear()
    for cue in cues:
        current=' '.join(c['text'] for c in pending)
        is_sound=bool(re.fullmatch(r'(?:\[[^\]]+\]\s*)+', cue['text']))
        if pending and (len(current)+len(cue['text'])+1>175 or cue['end']-pending[0]['start']>11 or cue['start']-pending[-1]['end']>.8 or is_sound): flush()
        pending.append(cue)
        if is_sound or (len(' '.join(c['text'] for c in pending))>=60 and re.search(r'[.!?…]["»”)]?$',cue['text'])): flush()
    flush()
    if ' '.join(g['originalSk'] for g in groups)!=' '.join(c['text'] for c in cues): raise ValueError('Grouping changed text')
    return groups
TOKEN = re.compile(r'[^\W_]+', re.UNICODE)
def tokens(value):
    return [unicodedata.normalize('NFKD', t).encode('ascii','ignore').decode().lower() for t in TOKEN.findall(value)]
def probe_audio(episode, cues, audio_path):
    import numpy as np
    from faster_whisper import WhisperModel
    pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(audio_path),'-f','f32le','-ac','1','-ar','16000','-'])
    wave=np.frombuffer(pcm,dtype=np.float32).copy();duration=len(wave)/16000
    model=WhisperModel(ASR_MODEL,device='cpu',compute_type='int8',cpu_threads=4,num_workers=1)
    youtube_words=[]
    for cue in cues:
        words=tokens(cue['text'])
        for i,word in enumerate(words): youtube_words.append({'word':word,'time':cue['start']+(i+.5)/max(1,len(words))*(cue['end']-cue['start'])})
    checks=[]
    for fraction in [.015,.16,.33,.50,.67,.84,.965]:
        start=max(12,min(duration-32,duration*fraction));end=min(duration,start+28)
        segments,_=model.transcribe(wave[int(start*16000):int(end*16000)],language='sk',beam_size=5,temperature=0,word_timestamps=True,vad_filter=True,condition_on_previous_text=False)
        words=[];text=[]
        for segment in segments:
            text.append(segment.text.strip())
            for word in segment.words or []:
                words.extend({'word':t,'time':start+(word.start+word.end)/2} for t in tokens(word.word))
        near=[word for word in youtube_words if start-240<=word['time']<=end+240]
        matcher=difflib.SequenceMatcher(None,[w['word'] for w in words],[w['word'] for w in near],autojunk=False)
        block=matcher.find_longest_match();offsets=[]
        if block.size>=5:
            offsets=[near[block.b+i]['time']-words[block.a+i]['time'] for i in range(block.size)]
        check={'audioStart':round(start,3),'audioEnd':round(end,3),'independentText':' '.join(text),'matchedWords':block.size,'videoMinusAudioSeconds':round(float(np.median(offsets)),3) if offsets else None,'matchedText':' '.join(w['word'] for w in words[block.a:block.a+block.size])}
        checks.append(check);print('CLOCK CHECK',episode,check,flush=True)
    del model;gc.collect()
    good=[c for c in checks if c['videoMinusAudioSeconds'] is not None]
    return {'audio':episode['enclosure'],'audioSha256':digest(audio_path),'audioBytes':audio_path.stat().st_size,'audioDuration':round(duration,3),'youtubeCaptionEnd':cues[-1]['end'],'model':ASR_MODEL,'checks':checks,'matchedProbeCount':len(good),'approximateOffsetSpread':round(max(c['videoMinusAudioSeconds'] for c in good)-min(c['videoMinusAudioSeconds'] for c in good),3) if good else None,'status':'sampled-clock-checks-only-not-publication-approval'}
def translate(groups, output, provenance):
    import torch
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    torch.set_num_threads(4)
    tokenizer=AutoTokenizer.from_pretrained(TRANSLATE_MODEL,src_lang='slk_Latn')
    model=AutoModelForSeq2SeqLM.from_pretrained(TRANSLATE_MODEL);model.eval()
    target=tokenizer.convert_tokens_to_ids('ces_Latn')
    if target==tokenizer.unk_token_id: raise ValueError('Missing Czech language token')
    results=[]
    with torch.inference_mode():
        for index in range(0,len(groups),8):
            batch=groups[index:index+8]
            encoded=tokenizer([g['originalSk'] for g in batch],return_tensors='pt',padding=True,truncation=False)
            if encoded['input_ids'].shape[1]>220:raise ValueError('Overlong translation input')
            predicted=model.generate(**encoded,forced_bos_token_id=target,num_beams=3,max_new_tokens=200)
            for group,cs in zip(batch,tokenizer.batch_decode(predicted,skip_special_tokens=True)):
                cs=' '.join(cs.split());flags=[]
                if not cs or len(cs)<len(group['originalSk'])*.45 or len(cs)>len(group['originalSk'])*2: flags.append('translation-length')
                if set(re.findall(r'\d+(?:[,.]\d+)*',cs))!=set(re.findall(r'\d+(?:[,.]\d+)*',group['originalSk'])):flags.append('translation-numerals')
                results.append({**group,'draftCs':cs,'reviewFlags':flags})
            if index%64==0:
                write(output,{**provenance,'translationModel':TRANSLATE_MODEL,'status':'unreviewed-machine-draft-do-not-publish','completedGroups':len(results),'totalGroups':len(groups),'cues':results})
                print('TRANSLATION',len(results),'/',len(groups),flush=True)
    write(output,{**provenance,'translationModel':TRANSLATE_MODEL,'status':'unreviewed-machine-draft-do-not-publish','completedGroups':len(results),'totalGroups':len(groups),'cues':results})
def prepare(number):
    episode=next(e for e in read(ROOT/'content-v2.json')['episodes'] if e['number']==number)
    source=SOURCE/f'episode-{number}-youtube-original.sk.srt'
    manifest=read(SOURCE/os.environ.get('VEDATOR_YOUTUBE_MANIFEST','youtube-batch-363-361-manifest.json'))
    item=next(item for item in manifest['episodes'] if item['episode']==number)
    if episode['id']!=item['guid'] or episode['youtubeId']!=item['youtubeId']:raise ValueError('Video/RSS identity mismatch')
    if digest(source)!=item['archivedSha256']:raise ValueError('Changed archived YouTube source')
    cues,report=normalize_srt(source.read_text(encoding='utf-8'))
    provenance={'episode':number,'guid':episode['id'],'youtubeId':episode['youtubeId'],'youtubeSource':item,'sourceSrt':str(source.relative_to(ROOT)),'sourceSha256':digest(source)}
    write(SOURCE/f'episode-{number}-youtube-normalized.sk.json',{**provenance,'normalization':report,'cues':cues})
    directory=Path(os.environ.get('VEDATOR_BATCH_AUDIO','/tmp/vedator-youtube-batch-audio'));directory.mkdir(parents=True,exist_ok=True)
    audio=directory/f'episode-{number}.mp3'
    if not audio.exists():subprocess.run(['curl','--fail','--location','--retry','3','--max-time','240',episode['enclosure'],'-o',str(audio)],check=True)
    if audio.stat().st_size<1_000_000:raise ValueError('Truncated MP3')
    proof=probe_audio(episode,cues,audio)
    write(SOURCE/f'episode-{number}-youtube-audio-clock-probes.json',{**provenance,**proof})
    translate(draft_groups(cues),SOURCE/f'episode-{number}-youtube-bilingual-draft.json',provenance)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episode',type=int);args=parser.parse_args();prepare(args.episode)

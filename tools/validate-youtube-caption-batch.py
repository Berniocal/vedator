#!/usr/bin/env python3
"""Publication gates for newest bilingual captions, separate from generation."""
import argparse
import importlib.util
import json
import re
from pathlib import Path

spec=importlib.util.spec_from_file_location('finalize',Path(__file__).with_name('finalize-youtube-caption-batch.py'))
finalize=importlib.util.module_from_spec(spec);spec.loader.exec_module(finalize)
batch=finalize.batch
ROOT,CAP,SOURCE=finalize.ROOT,finalize.CAP,finalize.SOURCE


def validate(number, registered=False):
    final=batch.read(CAP/f'episode-{number}.json')
    edited=batch.read(CAP/f'episode-{number}.edited.json')
    alignment=batch.read(SOURCE/f'episode-{number}-youtube-final-alignment.json')
    groups,resolutions=finalize.reviewed_groups(number)
    proof=batch.read(SOURCE/f'episode-{number}-youtube-audio-clock-probes.json')
    mapping=next(v for v in batch.read(ROOT/'episode-videos.json') if v['episode']==number)
    episode=next(v for v in batch.read(ROOT/'content-v2.json')['episodes'] if v['number']==number)
    errors=[]
    def check(test,message):
        if not test:errors.append(message)
    check(resolutions['status']=='all-audio-questions-resolved','Audio review not complete')
    for key,item in resolutions['groups'].items():
        check(item.get('status')=='resolved',f'Unresolved audio group {key}')
    check(edited['groups']==groups,'Generated text no longer matches current reviewed edits')
    check(final['episode']==number==alignment['episode'],'Episode identity mismatch')
    check(final['guid']==mapping['guid']==episode['id'],'Podcast GUID mismatch')
    check(final['youtubeId']==mapping['youtubeId'],'YouTube ID mismatch')
    check(final['source']['audio']==episode['enclosure'],'MP3 URL mismatch')
    check(final['source']['audioSha256']==alignment['audioSha256']==resolutions['audioSha256']==proof['audioSha256'],'Audio hash mismatch')
    check(final['quality']=='editorial-corrected-forced-aligned','Unexpected quality/provenance')
    check(final['source']['alignmentModel']==finalize.audio.ALIGN_MODEL,'Unexpected alignment model')
    for g in alignment['groups']:
        if g['meanCharacterScore']<.35:
            item=resolutions.get('lowScoreAcceptance',{}).get(str(g['group']),{})
            check(item.get('textSk')==g['textSk'] and item.get('reason') and item.get('independentCtcDecode')==g['independentCtcDecode'],f'Unreviewed low CTC confidence in group {g["group"]}')
        check(bool(g.get('characters')) and bool(g.get('independentCtcDecode')),'Missing acoustic evidence')
        check(bool(g.get('chunkKey')),'Alignment must use joint neighboring-utterance path')
    check(not alignment.get('largeBoundaryConflicts'),'Acoustic boundaries overlap by more than 0.3 seconds')
    group_map={str(g['group']):g for g in groups}
    omitted={str(g['group']) for g in alignment['omittedNonSpeech']}
    cue_groups={str(c['sourceGroup']) for c in final['cues']}
    check(cue_groups|omitted==set(group_map),'Source group coverage gap')
    check(not cue_groups&omitted,'Speech group also marked omitted')
    for key in omitted:
        check(bool(re.fullmatch(r'(?:\[[^\]]+\]\s*)+',group_map[key]['text']['sk'])),'Spoken words incorrectly marked non-speech')
    previous=0
    fast=[];group_cues={}
    for i,cue in enumerate(final['cues'],1):
        check(previous<=cue['start']<cue['end']<=proof['audioDuration']+.05,f'Cue {i} invalid time')
        previous=cue['end']
        group_cues.setdefault(str(cue['sourceGroup']),[]).append(cue)
        for lang in ['cs','sk']:
            lines=cue['text'][lang].splitlines()
            check(0<len(lines)<=2 and max(map(len,lines))<=48,f'Cue {i} {lang} exceeds two 48-character lines')
            check(not re.search(r'\d\d:\d\d:\d\d|\ufffd|<[^>]+>',cue['text'][lang]),f'Cue {i} {lang} contains malformed text')
            if len(cue['text'][lang])/(cue['end']-cue['start'])>25:fast.append([i,lang])
    for key,cues in group_cues.items():
        g=group_map[key]
        sk_cursor=cs_cursor=0
        for cue in cues:
            check(cue['sourceWordRange'][0]==sk_cursor and cue['translationWordRange'][0]==cs_cursor,f'Word coverage gap in group {key}')
            sk_cursor=cue['sourceWordRange'][1];cs_cursor=cue['translationWordRange'][1]
        for lang in ['sk','cs']:
            joined=' '.join(c['text'][lang].replace('\n',' ') for c in cues)
            check(joined==' '.join(g['text'][lang].split()),f'{lang} words changed or dropped in group {key}')
    for lang in ['cs','sk']:
        expected='\n\n'.join(f"{i}\n{finalize.srt_time(c['start'])} --> {finalize.srt_time(c['end'])}\n{c['text'][lang]}" for i,c in enumerate(final['cues'],1))+'\n'
        check((CAP/f'episode-{number}.{lang}.srt').read_text()==expected,f'{lang} SRT differs from JSON')
    index=batch.read(SOURCE/f'episode-{number}-youtube-seek-index.json')
    check(index['audio']==proof['audio'] and index['audioSha256']==proof['audioSha256'],'Seek-index source mismatch')
    check(index['index']['size']==proof['audioBytes'] and abs(index['index']['duration']-proof['audioDuration'])<.2,'Seek-index duration/bytes mismatch')
    check(bool(index['index']['anchors']),'Missing exact MP3 frame anchors')
    if registered:
        check(mapping.get('captionFile')==f'captions/episode-{number}.json','Caption mapping not registered')
        saved=batch.read(ROOT/'audio-seek-index.json')['entries'].get(proof['audio'])
        check(saved==index['index'],'Registered MP3 index differs from reviewed source')
    report={'episode':number,'ok':not errors,'cueCount':len(final['cues']),'sourceGroupCount':len(groups),'recoveredSpeechPanels':len(resolutions.get('recovered',[])),'lowScoreGroups':alignment['lowScoreGroups'],'fastPanels':len(fast),'issues':errors,'caution':'Structural, provenance and acoustic model checks; not a full independent human listening verification.'}
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episodes',nargs='+',type=int);parser.add_argument('--register',action='store_true');parser.add_argument('--registered',action='store_true');args=parser.parse_args()
    reports=[validate(n,args.registered) for n in args.episodes]
    print(json.dumps(reports,ensure_ascii=False,indent=2))
    if any(not r['ok'] for r in reports):raise SystemExit(1)
    if args.register:
        mapping=batch.read(ROOT/'episode-videos.json');index=batch.read(ROOT/'audio-seek-index.json')
        for n in args.episodes:
            next(v for v in mapping if v['episode']==n)['captionFile']=f'captions/episode-{n}.json'
            item=batch.read(SOURCE/f'episode-{n}-youtube-seek-index.json');index['entries'][item['audio']]=item['index']
            report=next(r for r in reports if r['episode']==n);report['status']='editorially-reviewed-acoustically-aligned'
            batch.write(CAP/f'episode-{n}.review.json',report)
        batch.write(ROOT/'episode-videos.json',mapping)
        (ROOT/'audio-seek-index.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

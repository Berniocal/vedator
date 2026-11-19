"""Update existing episode 364 mentions to their original-MP3 word boundaries."""
import hashlib,importlib.util,json,re,unicodedata
from pathlib import Path
spec=importlib.util.spec_from_file_location('finalize',Path(__file__).with_name('finalize-youtube-caption-batch.py'))
finalize=importlib.util.module_from_spec(spec);spec.loader.exec_module(finalize)
root=Path(__file__).resolve().parents[1]
source=root/'captions/source';alignment=json.loads((source/'episode-364-youtube-final-alignment.json').read_text())
groups={str(g['group']):g for g in alignment['groups']}
ids={1943:60,1944:169,1945:184,1946:67,1947:218,1948:220,1949:421,1950:421,1951:423}
def norm(value):
    value=''.join(ch for ch in unicodedata.normalize('NFD',value.lower()) if unicodedata.category(ch)!='Mn')
    return re.sub(r'[^\w]+','',value)
def stamp(seconds):
    value=int(seconds);return f'{value//3600:02}:{value//60%60:02}:{value%60:02}'
original=(source/'episode-364-youtube-original.sk.srt').read_text()
cues=[]
for block in original.strip().split('\n\n'):
    lines=block.splitlines()
    if len(lines)>=3 and lines[0].isdigit():
        cue=int(lines[0]);offset=original.index(block);line=original[:offset].count('\n')+3
        cues.append({'cue':cue,'line':line,'text':norm(' '.join(lines[2:]))})
p=root/'sliby/index.html';html=p.read_text();match=re.search(r'(<script type="application/json" id="audit-data">)(.*?)(</script>)',html,re.S);data=json.loads(match[2]);resolved={}
for container in [data,data['archive']]:
    def walk(rows):
        for row in rows:
            candidate=int(row['candidate'])
            if candidate in ids:
                group=groups[str(ids[candidate])];words=finalize.atoms(group['textSk']);hay=[norm(word) for word in words];needle=[norm(word) for word in row['quote'].split()]
                start=next((i for i in range(len(hay)-len(needle)+1) if hay[i:i+len(needle)]==needle),None)
                assert start is not None,(candidate,row['quote'],group['textSk'])
                seconds=round(group['wordTimes'][start]['start'],3);row['seconds']=seconds;row['time']=stamp(seconds)
                url=row['sourceRecording']['audioURL'];row['timeURL']=url+'#t='+str(seconds)
                text_prefix=''.join(needle[:3]);source_ids=set(next(g for g in json.loads((root/'captions/episode-364.edited.json').read_text())['groups'] if str(g['group'])==str(ids[candidate]))['sourceCues'])
                cue=next((c for c in cues if c['cue'] in source_ids and text_prefix in c['text']),None)
                if cue:
                    row['line']=cue['line'];row['sourceURL']=row['sourceURL'].split('#')[0]+'#L'+str(cue['line'])
                row['timingStatus']='Čas výroku podle původní RSS MP3, akusticky zarovnaný slovenským CTC modelem.'
                row['timingEvidence']='captions/source/episode-364-youtube-final-alignment.json';row['humanListeningVerified']=False
                resolved[candidate]={'time':row['time'],'sec':seconds,'start':row['line'],'end':row['line']+2}
            if row.get('mergedFrom'):walk(row['mergedFrom'])
    walk(container['findings'])
    witten=next(row for row in container['findings'] if row['id']=='583')
    witten['outcomeNote']='Zkontrolován i celý díl 364: od 24:12 představuje Wittena a od 28:38 jeho propojení teorie uzlů s teorií pole. Jde o úvodní vysvětlení v rámci Hodgeovy hypotézy; podmíněný hlubší samostatný díl tím není doložen.'
    witten['fulfillmentChecks']=[check for check in witten.get('fulfillmentChecks',[]) if check.get('episode')!=364]+[{'episode':364,'result':'introductory-return-not-complete-dedicated-episode','captionFile':'captions/episode-364.json','playURL':'https://bernio.cz/vedator/#episode=364'}]
    for entry in container['candidateIndex']:
        if int(entry['id']) in resolved:entry.update(resolved[int(entry['id'])])
    progress=container['readingProgress'];entry=next(v for v in progress['files'] if v['episode']==364)
    entry.update(acousticVerified=True,humanListeningVerified=False,captionFile='captions/episode-364.json',transcriptQuality='Celé slovenské i české znění redigováno; nejasné fragmenty označeny; časové značky zarovnány k původní MP3.',note='Celý veřejný SRT: čtyři nové karty a pět připojených zmínek. Časy devíti výroků zpřesněny podle slovních hranic původní MP3. Placené bonusy se neevidují.')
    entry['alignmentSha256']=hashlib.sha256((source/'episode-364-youtube-final-alignment.json').read_bytes()).hexdigest()
    if progress['nextBatch'].get('startEpisode')==365:progress['nextBatch']['status']='Díl 364 dokončen včetně vlastních titulků a časů slibů; další běžný díl od 365 podle dostupnosti.'
    for entry in container['files']:
        if entry.get('episode')==364:entry['scan']='Celý veřejný přepis přečten, dvojjazyčně redigován; časy výroků ověřeny akustickým zarovnáním původní MP3.'
assert len(resolved)==9,resolved
html=html[:match.start(2)]+json.dumps(data,ensure_ascii=False,separators=(',',':'))+html[match.end(2):];p.write_text(html)
print(json.dumps(resolved,ensure_ascii=False,indent=2))

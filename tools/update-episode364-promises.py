import json,re,hashlib,copy,collections
from pathlib import Path
p=Path('sliby/index.html');s=p.read_text();pat=r'(<script type="application/json" id="audit-data">)(.*?)(</script>)';m=re.search(pat,s,re.S);d=json.loads(m[2]);import importlib.util
spec=importlib.util.spec_from_file_location('batch',Path('tools/prepare-youtube-caption-batch.py'));batchlib=importlib.util.module_from_spec(spec);spec.loader.exec_module(batchlib)
G=batchlib.draft_groups(batchlib.normalize_srt(Path('captions/source/episode-364-youtube-original.sk.srt').read_text())[0]);source=Path('captions/source/episode-364-youtube-original.sk.srt');raw=source.read_text();headers=list(re.finditer(r'(?m)^(\d+)\n(\d\d:\d\d:\d\d,\d{3}) -->',raw));lines={int(h[1]):raw.count('\n',0,h.start())+3 for h in headers};sha='64d52e5ee73205b2b22f6055afe4768674535b58';f='vedatorsky-podcast-364-mileniove-problemy-4-hodgeova-hypoteza.srt';base=f'https://github.com/Berniocal/vedator-test/blob/{sha}/titulky/{f}';e=next(z for z in json.load(open('episodes.json'))['episodes'] if z['number']==364);batch=40
if any(v['episode']==364 for v in d['readingProgress']['files']):
 print('Episode 364 promises already processed; leaving existing result unchanged.');raise SystemExit(0)
allids=[]
def ids(x):
 if isinstance(x,dict):
  for k,v in x.items():
   if k in ['candidate','id']:
    try:allids.append(int(v))
    except (ValueError,TypeError):pass
   elif k in ['findings','archive','candidateIndex','mergedFrom']:ids(v)
 elif isinstance(x,list):
  for v in x:ids(v)
ids(d);nextid=max(allids)+1; added=[];mentions=[]
def row(group,tema,category,section,note,quote):
 global nextid
 g=G[group];sec=g['start'];time=f'{int(sec)//3600:02}:{int(sec)//60%60:02}:{int(sec)%60:02}';line=lines[g['sourceCues'][0]];n=nextid;nextid+=1
 z={'id':str(n),'candidate':n,'index':0,'kategorie':category,'tema':tema,'stav':'Nesplněno','cile':'','vysvetleni':note,'episode':364,'episodeLabel':'364','sourceTitle':e['title'],'time':time,'seconds':sec,'file':f,'line':line,'sourceURL':base+f'#L{line}','playURL':'https://bernio.cz/vedator/#episode=364','targets':[],'fullRead':True,'reviewBatch':batch,'timingStatus':'Čas původních slovenských YouTube titulků. Akustická kontrola RSS MP3 se připravuje; zvuk neposlouchán.','quote':quote,'originalCategory':'Nápad' if category=='Návrhy / nápady' else 'Slib / plán','originalStatus':'Nedohledáno','section':section,'sectionReason':'Výslovný námět na samostatný tematický díl podcastu.' if section=='episodes' else 'Pozvání hosta nebo jiná činnost bez výslovně určeného tématu samostatné epizody.','outcomeNote':'Uskutečnění zatím není doložené.','categoryNote':'','sourceRecording':{'number':364,'title':e['title'],'date':e['date'],'audioURL':e['enclosure']},'timeURL':e['enclosure']+'#t='+str(sec)}
 d['candidateIndex'].append({'id':n,'file':f,'episode':364,'time':time,'sec':sec,'start':line,'end':line+2});return z

def add(g,t,c,sect,n,q):
 z=row(g,t,c,sect,n,q);d['findings'].append(z);d['archive']['findings'].append(copy.deepcopy(z));added.append(z)
def mention(parent,g,t,c,sect,n,q):
 z=row(g,t,c,sect,n,q)
 for container in [d,d['archive']]:
  root=next(v for v in container['findings'] if v['id']==parent)
  if not root.get('mergedFrom'):
   root['mergedFrom']=[copy.deepcopy(root)]
  root['mergedFrom'].append(copy.deepcopy(z));root['vysvetleni']+=' V dílu 364: '+n
 mentions.append(z)
add(60,'Samostatná epizoda o šifrování','Návrhy / nápady','episodes','Při zmínce o P versus NP zvažují věnovat šifrování a jeho fungování vlastní díl. Neurčují konkrétní techniku; neslučuje se proto s užším slibem veřejného klíče nebo eliptických křivek.','možno o tom môžeme spraviť aj dedikovanú')
add(169,'Připojit mapu matematiky k popisu epizody','Sliby','other','Výslovně slibují vložit mapu matematiky do popisu. Aktuální RSS popis dílu odkaz na mapu neobsahuje; splnění není doložené.','Dáme do popisu epizódy.')
add(184,'Biomatematika jako vlastní epizoda','Návrhy / nápady','episodes','Při prohlížení mapy matematiky navrhují vlastní díl o biomatematice. Sami jej označují za nápad a upozorňují, že nechtějí dávat pevné sliby.','to je veľmi pekný nápad na epizódu, že biomatematika.')
mention('1599',67,'Dokončit zbývající miléniové problémy','Sliby','episodes','Po čtvrté části připomínají částicověfyzikální problém, P versus NP a Poincarého hypotézu. Celá sedmidílná řada tím stále hotová není.','tak nám zostanú už len tie pekné')
mention('1106',218,'M-teorie jako vlastní podcast','Návrhy / nápady','episodes','Při Wittenově portrétu znovu navrhují díl o vzniku M-teorie. Zmínka o M-teorii v nynější epizodě není slíbenou samostatnou epizodou.','o tom by sme mohli spraviť epizódu')
add(220,'Poslat dokument o vzniku M-teorie','Návrhy / nápady','other','Samuel podmiňuje zaslání tím, že Jozef dokument ještě někde má. Jde o podmíněné poslání podkladu mezi moderátory; nikoli o slib zveřejnění ani hotový díl.','Pošli mi ten dokument, ak')
mention('1742',421,'Pozvat do podcastu Lukáše Konečného','Sliby','other','Samuel připomíná již dlouho domlouvaného Lukáše Konečného. Neuvádí konkrétní téma ani dokončené nahrávání.','dlho už dohodnutého Lukáša Konečného')
mention('753',421,'Pozvat Friedricha (Frica) Valacha','Návrhy / nápady','other','V témže závěru znovu připomínají také domlouvání Fricovy návštěvy. Krátká návazná zmínka o supergravitaci není pevným slibem samostatného tematického dílu.','aj Frica už sme nejako tak')
mention('1755',423,'Pozvat Juraje Tekela na další návštěvu po heliu','Návrhy / nápady','other','Znovu navrhují pozvat Juraje a pokračování hovoru odsouvá případné domlouvání do roku 2027. Neuvádějí konkrétní téma; rok 2027 sám není důvod zařadit kartu mezi vzdálené budoucí sliby.','A Juraja by sme inak mohli znova zavolať')
# Evidence of the fourth installment extends the existing series without declaring it complete.
for container in [d,d['archive']]:
 z=next(v for v in container['findings'] if v['id']=='1599');z['cile']=','.join(dict.fromkeys([*z['cile'].split(','),'364']));z['targets'].append({'number':364,'title':e['title'],'date':e['date'],'url':e['link'],'audioURL':e['enclosure'],'timeURL':e['enclosure']+'#t=271.49','verification':'full-transcript','verificationNote':'Celý přepis 364 souvisle přečten. Čtvrtá část se věnuje Hodgeově hypotéze; série ještě není celá hotová.','evidence':[{'episode':364,'file':f,'time':'00:04:31','sec':271.49,'line':lines[G[45]['sourceCues'][0]],'label':'Začíná celá čtvrtá část miléniové série','sourceURL':base+f"#L{lines[G[45]['sourceCues'][0]]}",'timeURL':e['enclosure']+'#t=271.49'}]})
sha256=hashlib.sha256(source.read_bytes()).hexdigest();r=d['readingProgress'];r['files'].append({'episode':364,'file':f,'sha256':sha256,'status':'Přečten celý přepis','cueCount':len(headers),'start':'00:00:01','lastCue':'00:53:02','findingsAdded':len(added),'mentionsAdded':len(mentions),'note':'Celý veřejný SRT. Čtyři nové karty a pět připojených zmínek; čtvrtá miléniová část přidána jako dílčí naplnění série. Placené bonusy se neevidují. Odmítnutý vlastní portrét Hodge není nový závazek.','transcriptQuality':'Automatické slovenské YouTube titulky s chybami; pro vlastní titulky právě probíhá nezávislá akustická kontrola.','sourceSHA':sha,'date':'2026-11-19','audioVerified':False,'videoID':'I3IYM37Ko_Q','subtitleLanguage':'sk','subtitleType':'automatic','result':'checked-with-findings'})
r['completedBatches'].append({'batch':40,'episodes':[364],'date':'2026-11-19','sourceSHA':sha,'cueCount':len(headers),'addedFindings':len(added),'addedMentions':len(mentions),'updatedOlderFindings':1,'sourceAvailability':{'srt':1,'txt':0,'missingEpisodes':[],'txtEpisodes':[]},'summary':'Celé SRT 364 přečteno: čtyři nové karty, pět připojených zmínek, doložena čtvrtá část miléniové série. Placené bonusy vynechány.'})
r['nextBatch']={'episodes':[],'startEpisode':365,'status':'Díl 364 zkontrolován pro sliby; vlastní titulky přehrávače čekají na akustické kontroly.'};a=r['availabilityCheck'];a['date']='2026-11-19';a['checkedCurrentSourceSHA']=sha
for k in ['episodes','regularEpisodes','newlyAvailableEpisodes']:
 if 364 not in a[k]:a[k].append(364)
a['srt']+=1
z={'file':f,'episode':364,'cueCount':len(headers),'sha256':sha256,'findingCount':len(added),'mentionCount':len(mentions),'fullRead':True,'scan':'Souvisle přečten celý přepis; nezávislá kontrola zvuku se připravuje.','url':base};d['files'].append(z)
d['sourceSHA']=sha;d['catalogCount']=len(json.load(open('episodes.json'))['episodes']);d['srtCount']+=1;d['cueCount']+=len(headers);d['candidateCount']+=len(added)+len(mentions);d['date']='2026-11-19';d['stage']+='; dávka 40: celé veřejné SRT 364'
for i,z in enumerate(d['findings'],1):z['index']=i
for i,z in enumerate(d['archive']['findings'],1):z['index']=i
for key in ['sourceSHA','catalogCount','srtCount','cueCount','candidateCount','date','stage','readingProgress','candidateIndex','files']:d['archive'][key]=copy.deepcopy(d[key])
for container in [d,d['archive']]:
 container['classification']['categoryCounts']=dict(collections.Counter(v['kategorie'] for v in container['findings']));container['classification']['statusCounts']=dict(collections.Counter(v['stav'] for v in container['findings']))
 for sec in container['sections']['options']:sec['count']=sum(v['section']==sec['id'] for v in container['findings'])
 container['sections']['review']['reviewedFindings']=len(container['findings'])
s=s[:m.start(2)]+json.dumps(d,ensure_ascii=False,separators=(',',':'))+s[m.end(2):];p.write_text(s);print(len(added),'new',len(mentions),'mentions')

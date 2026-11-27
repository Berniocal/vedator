import pathlib,json,re,copy,collections,hashlib
p=pathlib.Path(__file__).resolve().parent.parent;f=p/'sliby/index.html';s=f.read_text();m=re.search(r'(<script[^>]*id="audit-data">)(.*?)(</script>)',s,re.S);d=json.loads(m[2]);
if any(x['episode']==365 for x in d['readingProgress']['files']):
 print('Episode 365 already checked; no duplicate writes.');raise SystemExit(0)
e=next(x for x in json.loads((p/'episodes.json').read_text())['episodes'] if x['number']==365)
source=(p/'captions/source/episode-365-youtube-original.sk.srt');text=source.read_text();lines=text.splitlines();headers=list(re.finditer(r'(?m)^(\d+)\n(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})\n',text));base='https://github.com/Berniocal/vedator-test/blob/f80655bbb37109c757a0e3e3f5d61359dac831e2/titulky/vedatorsky-podcast-365-sede-diery.srt';name=base.rsplit('/',1)[1]
ids=[]
def walk(x):
 if isinstance(x,dict):
  for k,v in x.items():
   if k in ['candidate','id']:
    try:ids.append(int(v))
    except:pass
   else:walk(v)
 elif isinstance(x,list):
  for y in x:walk(y)
walk(d);nextid=max(ids)+1;added=[];mentions=[]
def row(tema,cat,note,quote):
 global nextid
 hit=text.find(quote);assert hit>=0,quote;head=max((h for h in headers if h.start()<hit),key=lambda h:h.start());a=head[2];h,mi,sec=a.replace(',','.').split(':');secs=int(h)*3600+int(mi)*60+float(sec);line=text[:hit].count('\n')+1;n=nextid;nextid+=1
 r={'id':str(n),'candidate':n,'index':0,'kategorie':cat,'tema':tema,'stav':'Nesplněno','cile':'','vysvetleni':note,'episode':365,'episodeLabel':'365','sourceTitle':e['title'],'time':a[:8],'seconds':secs,'file':name,'line':line,'sourceURL':base+f'#L{line}','playURL':'https://bernio.cz/vedator/#episode=365','targets':[],'fullRead':True,'reviewBatch':41,'timingStatus':'Původní čas slovenských YouTube titulků; sedm akustických kotev RSS MP3 a vlastní titulky se připravují. Bez odhadovaného posunu.','quote':quote,'originalCategory':'Nápad' if cat=='Návrhy / nápady' else 'Slib / plán','originalStatus':'Nedohledáno','section':'other','sectionReason':'Konkrétní činnost či odložená odpověď, nikoli samostatně pojmenovaný tematický díl.','outcomeNote':'Uskutečnění není doložené.','categoryNote':'','sourceRecording':{'number':365,'guid':e['id'],'title':e['title'],'date':e['date'],'audioURL':e['enclosure']},'timeURL':e['enclosure']+'#t='+str(secs)}
 d['candidateIndex'].append({'id':n,'file':name,'episode':365,'time':a[:8],'sec':secs,'start':line,'end':line+2});return r

def add(*args):
 r=row(*args);d['findings'].append(r);d['archive']['findings'].append(copy.deepcopy(r));added.append(r);return r

def mention(parent,tema,cat,note,quote):
 r=row(tema,cat,note,quote);r['section']=next(x['section'] for x in d['findings'] if x['id']==parent)
 for container in [d,d['archive']]:
  root=next(x for x in container['findings'] if x['id']==parent)
  if not root.get('mergedFrom'):
   original=copy.deepcopy(root);original.pop('mergedFrom',None);root['mergedFrom']=[original]
  root['mergedFrom'].append(copy.deepcopy(r));root['vysvetleni']+=' V dílu 365: '+note
 mentions.append(r)
add('Natáčení u Samuelovy manželky v keramické dílně bez uvedeného tématu','Sliby','U příkladu s pecí počítají s budoucím natáčením u Samuelovy manželky. V této zmínce není jmenován Robert Hooke ani konkrétní termín. Bez dalšího důkazu se proto neztotožňuje se starším avízem Hookova portrétu v keramickém studiu.','budeme mať u nej nahrávanie,')
add('Ověřit limit dokonale černého vyzařování u velmi velké černé díry','Návrhy / nápady','Samuel nabízí pouze naivní odhad, zda v nekonečně velkém limitu zmizí faktory šedosti. Podmíněně chce během dalšího povídání otevřít výpočet; později v přepisu ověření tohoto konkrétního limitu nezazní. Současná nejistá odpověď není hotový důkaz.','treba overiť výpočtom, keď v nejakom')
add('Zvážit název článku Padesát odstínů šedi','Návrhy / nápady','Spontánně zvažují název pro Samuelův článek o faktorech šedosti. Samuel jej chce zapsat, ale výslovně neví, zda projde přes spoluautora. Není to pevně slíbený publikovaný název ani nová podcastová epizoda.','To je cool názov. Doba že toto tam musím')
add('Dát Martině ze Stravy ponožky, pokud se přihlásí na akci','Sliby','Posluchačce Martině, kterou minuli při běhu a která poslouchala Enrica Fermiho, podmíněně nabízejí ponožky při osobním přihlášení na akci. Předání tím není doloženo. Reklamní obchodní nabídky z úvodu nejsou podobným osobním závazkem.','tak sa prihovor a dáme ti ponožky.')
r=add('Připojit k dílu 365 odkaz na přednášku Hledání mimozemského života','Sliby','Výslovně avizují odkaz pod epizodou. Původní RSS popis 365 již obsahuje konkrétní prodejní URL přednášky. Tím je doložen odkaz, nikoli uskutečnění přednášky nebo dostupnost vstupenek.','Dunaj. Takže určite bude link tu dole. A')
url='https://vedator.space/product/hladanie-mimozemskeho-zivota-listok-pridany-termin/';assert url in e['description']
for container in [d,d['archive']]:
 z=next(x for x in container['findings'] if x['candidate']==r['candidate']);z['stav']='Splněno už dříve';z['cile']='365';z['outcomeNote']='Konkrétní slíbený odkaz je v původním RSS popisu 365.';z['targets']=[{'number':365,'title':e['title'],'date':e['date'],'url':e['link'],'audioURL':e['enclosure'],'timeURL':e['enclosure']+'#t=0','verification':'original-rss-description','verificationNote':'Přesná slíbená URL nalezena v HTML původního RSS popisu dne 27. 11. 2026.','evidence':[{'label':'Původní popis s odkazem','url':url,'timeURL':e['enclosure']+'#t=0'}]}]
mention('1889','Další samostatný díl o Voyageru při vzdálenosti jednoho světelného dne','Sliby','Výslovně připomínají příslib ze Saganova dílu a plánují budoucí samostatnou epizodu. Přepočítávají datum milníku a opravují se; krátká závěrečná odbočka ve 365 není celou slíbenou epizodou.','že my sme na tom Saganovi sľúbili, že')
mention('1846','Přednáška Hledání mimozemského života – dvě vystoupení 7. prosince','Sliby','Znovu avizují dvě přednášky 7. prosince v KC Dunaj a odkaz na vstupenky. Samotné avízo ani prodejní odkaz nejsou důkaz uskutečnění.','Potom Samko bude mať prednášku 7. 12. do')
# Do not add the Contact teaser adjacent to membership promotion: public scope is not established.
# Research already completed in the present episode and third-party experimental plans are not new promises.
hashv=hashlib.sha256(source.read_bytes()).hexdigest();r=d['readingProgress'];r['files'].append({'episode':365,'file':name,'sha256':hashv,'status':'Přečten celý přepis','cueCount':len(headers),'start':'00:00:01','lastCue':'00:40:04','findingsAdded':len(added),'mentionsAdded':len(mentions),'note':'Celý veřejný SRT včetně úvodu, závěru a upoutávky. Pět nových karet, dvě návaznosti. Konkrétní slíbený odkaz je v RSS popisu. Promo Kontaktu u placené nabídky není evidováno; reklamy a výzkumné plány třetích osob vynechány.','transcriptQuality':'Slovenské automatické YouTube titulky. Krátká řečová mezera kolem 30:42–30:54 bude ověřena pro vlastní titulky; neznámý text není domýšlen.','sourceSHA':'f80655bbb37109c757a0e3e3f5d61359dac831e2','date':'2026-11-27','audioVerified':False,'videoID':'8Sr2R_DcH9k','subtitleLanguage':'sk','subtitleType':'automatic','result':'checked-with-findings'})
r['completedBatches'].append({'batch':41,'episodes':[365],'date':'2026-11-27','sourceSHA':'f80655bbb37109c757a0e3e3f5d61359dac831e2','cueCount':len(headers),'addedFindings':len(added),'addedMentions':len(mentions),'updatedOlderFindings':2,'sourceAvailability':{'srt':1,'txt':0,'missingEpisodes':[],'txtEpisodes':[]},'summary':'Celý dostupný SRT 365 přečten; pět nových veřejných karet a dvě návaznosti. Vlastní titulky a kontrola případné chybějící řeči zůstávají pending.'})
r['nextBatch']={'episodes':[365],'startEpisode':365,'status':'Zdrojový SRT přečten a nálezy připraveny; vlastní CZ/SK titulky, zvukové kotvy a řečová mezera 30:42–30:54 čekají na akustickou kontrolu. Nový díl nezahajovat před dokončením 365.'}
a=r['availabilityCheck'];a['date']='2026-11-27';a['checkedCurrentSourceSHA']='f80655bbb37109c757a0e3e3f5d61359dac831e2'
for k in ['episodes','regularEpisodes','newlyAvailableEpisodes']:
 if 365 not in a[k]:a[k].append(365)
a['srt']+=1
info={'file':name,'episode':365,'cueCount':len(headers),'sha256':hashv,'findingCount':len(added),'mentionCount':len(mentions),'fullRead':True,'scan':'Přečten celý dodaný veřejný YouTube SRT; akustické doplnění mezery pro vlastní titulky čeká.','url':base};d['files'].append(info)
d['sourceSHA']='f80655bbb37109c757a0e3e3f5d61359dac831e2';d['catalogCount']=len(json.loads((p/'episodes.json').read_text())['episodes']);d['srtCount']+=1;d['cueCount']+=len(headers);d['candidateCount']+=len(added)+len(mentions);d['date']='2026-11-27';d['stage']+='; dávka 41: celý dostupný veřejný SRT 365';d['consolidation']['originalFindings']+=len(added)+len(mentions)
for container in [d,d['archive']]:
 for i,x in enumerate(container['findings'],1):x['index']=i
 container['classification']['categoryCounts']=dict(collections.Counter(x['kategorie'] for x in container['findings']));container['classification']['statusCounts']=dict(collections.Counter(x['stav'] for x in container['findings']))
 for section in container['sections']['options']:section['count']=sum(x['section']==section['id'] for x in container['findings'])
 container['sections']['review']['reviewedFindings']=len(container['findings'])
for key in ['sourceSHA','catalogCount','srtCount','cueCount','candidateCount','date','stage','readingProgress','candidateIndex','files','consolidation']:d['archive'][key]=copy.deepcopy(d[key])
f.write_text(s[:m.start(2)]+json.dumps(d,ensure_ascii=False,separators=(',',':'))+s[m.end(2):])
print('ADDED',[(x['id'],x['tema'],x['seconds']) for x in added]);print('MENTIONS',len(mentions))

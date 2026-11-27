from pathlib import Path
import json,re,hashlib,unicodedata
root=Path('.');p=root/'sliby/index.html';html=p.read_text();m=re.search(r'(<script type="application/json" id="audit-data">)([\s\S]*?)(</script>)',html);d=json.loads(m[2]);ap=root/'captions/source/episode-365-youtube-final-alignment.json';a=json.loads(ap.read_text());groups={str(g['group']):g for g in a['groups']}
def tokens(v):return [unicodedata.normalize('NFKD',w).encode('ascii','ignore').decode().lower() for w in re.findall(r'[^\W_]+',v)]
def stamp(gid,phrase):
 g=groups[str(gid)];words=g['textSk'].split();want=tokens(phrase)
 for i in range(len(words)):
  joined=[]
  for j in range(i,len(words)):
   joined+=tokens(words[j])
   if joined==want:return g['wordTimes'][i]['start']
   if len(joined)>=len(want):break
 raise ValueError((gid,phrase,g['textSk']))
lookup={'1952':(73,'budeme mať u nej nahrávanie'),'1953':(114,'treba overiť výpočtom'),'1954':(235,'To je cool názov'),'1955':(296,'tak sa prihovor'),'1956':(305,'Dunaj'),'1957':(309,'že my sme'),'1958':(304,'Potom Samko')};times={k:stamp(*v) for k,v in lookup.items()};count=0
# Update matching original source statements in both current and reset catalogs.
def scan(x):
 global count
 if isinstance(x,dict):
  key=str(x.get('id') or x.get('candidate',''))
  if x.get('episode')==365 and x.get('quote') and key in times:
   t=times[key];x['seconds']=t;h,rem=divmod(int(t),3600);mi,se=divmod(rem,60);x['time']=f'{h:02}:{mi:02}:{se:02}';x['timeURL']=x['timeURL'].split('#')[0]+f'#t={t}';x['timingStatus']='Čas výroku podle původní RSS MP3, akusticky zarovnaný slovenským CTC modelem.';x['timingEvidence']='captions/source/episode-365-youtube-final-alignment.json';count+=1
   if key=='1954' and 'Fifty Shades of Grey Holes' not in x['vysvetleni']:x['vysvetleni']+=' V obnoveném rozhovoru přesný anglický návrh zní Fifty Shades of Grey Holes; původní identita karty zůstává zachována.'
  for y in x.values():scan(y)
 elif isinstance(x,list):
  for y in x:scan(y)
scan(d)
for row in d['readingProgress']['files']:
 if row['episode']==365:
  row.update(transcriptQuality='Celé slovenské i české znění redigováno; sedm krátkých nejasných fragmentů označeno, velmi krátké Uhm zůstává s výslovně nejistým časováním. Chybějící řeč včetně dvou anglických pasáží obnovena ze zvuku. Časové značky zarovnány k původní RSS MP3.',audioVerified=False,acousticVerified=True,humanListeningVerified=False,captionFile='captions/episode-365.json',alignmentSha256=hashlib.sha256(ap.read_bytes()).hexdigest())
p.write_text(html[:m.start(2)]+json.dumps(d,ensure_ascii=False,separators=(',',':'))+html[m.end(2):]);print('Updated statements',count,times)

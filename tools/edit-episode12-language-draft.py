"""Reproducible preliminary orthographic pass; never certifies final captions."""
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
S=ROOT/'captions/source'
source=S/'episode-12-draft.sk.json'
draft=json.loads(source.read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest()=='0c1dbd2210c07a2edec585f18d2aadcae677ee2ed97d817be0887e9ddffc6d13'
replacements={
 'Vedatorskom':'Vedátorskom','Vedatorského':'Vedátorského','posluchači':'poslucháči','posluchačov':'poslucháčov',
 'uprímne':'úprimne','chrypka':'chrípka','chrypku':'chrípku','chrípkov':'chrípkou',
 'smrtelnosť':'smrteľnosť','smrtelná':'smrteľná','smrtelné':'smrteľné','smrtelným':'smrteľným',
 'sezonou':'sezónnou','sezonu':'sezónu','sezona':'sezóna','epidemii':'epidémii','pandemii':'pandémii',
 'umrtnosťou':'úmrtnosťou','umrtnosť':'úmrtnosť','umrtné':'úmrtné','úmertí':'úmrtí',
 'proteinovom':'proteínovom','proteinov':'proteínov','proteinu':'proteínu','antibiotika':'antibiotiká','Antibiotika':'Antibiotiká',
 'prestaviteľne':'predstaviteľne','neprestaviteľne':'nepredstaviteľne','náplň':'náplň',
 'prírodzené':'prirodzené','základnejším':'základnejším','najzakladnejším':'najzákladnejším',
 'smiešné':'smiešne','zajímavé':'zaujímavé','znamejšia':'známejšia','najznamejšia':'najznámejšia',
 'sebe':'sebe','poporovnávať':'poporovnávať','miliónoch':'miliónoch','geneticky':'geneticky',
 'vypúkla':'vypukla','pripnuť':'pripnúť','zapada':'zapadá','nezapada':'nezapadá','nenútne':'nenutne','vyvratilo':'vyvrátilo',
 'vyhľadená':'vyhladená','prasiaca':'prasacia','osypková':'osýpková','osypky':'osýpky','Rúsku':'Rusku','Činy':'Číny',
 'nemilíme':'nemýlime','odlahlejšie':'odľahlejšie','pokračujú':'pokračujú','hygienické':'hygienické',
 'odhoduje':'odhaduje','strosti':'starosti','naštartovalo':'naštartovalo','Alas':'Ale asi',
 'videli':'videli','v priebohu':'v priebehu','predikcí':'predikcií','prúdky':'prudký','prúdky':'prudký',
 'umér':'úmer','umérne':'úmerne','nakazlíva':'nákazlivá','nákazlíva':'nákazlivá','náhoda':'náhoda'
}
# Only lexical orthography here. Disputed utterances and all numeric values remain untouched.
replacements={k:v for k,v in replacements.items() if k!=v}
changes=[];cues=[]
for i,c in enumerate(draft['cues'],1):
    text=c['text']
    for a,b in replacements.items():text=re.sub(r'(?<!\w)'+re.escape(a)+r'(?!\w)',b,text)
    text=text.replace('20 -ciferné','20-ciferné').replace('17 ,5','17,5').replace('1 ,2','1,2').replace('SARS -om','SARS-om').replace('SARS -e','SARS-e').replace('e -maily','e-maily').replace('e -mail','e-mail').replace('vedator .space','vedator.space')
    if text!=c['text']:changes.append({'cue':i,'before':c['text'],'after':text,'reason':'Preliminary lexical/orthographic transcription cleanup; numeric values and unresolved speech retained.'})
    cues.append({**c,'originalSk':c['text'],'workingSk':text,'editorialApproval':False})
(S/'episode-12-working-language.sk.json').write_text(json.dumps({'episode':12,'status':'working-orthographic-pass-not-approved-not-captions','audioSha256':draft['source']['audioSha256'],'sourceTranscriptSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'completeSourceRead':True,'finalEditorialApproval':False,'cues':cues},ensure_ascii=False,indent=2)+'\n')
(S/'episode-12-language-patches.json').write_text(json.dumps({'episode':12,'status':'preliminary-not-final','changes':changes},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'cues':len(cues),'changedCues':len(changes),'finalApproval':False}))

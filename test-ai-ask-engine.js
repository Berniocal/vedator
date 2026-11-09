// Generated from the canonical Ask engine in app-v2.js; do not edit directly.
// Engine SHA256: 995499b46573516e
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  export function createVedatorAskSearchEngine(){
    // Bundled from Berniocal/faq: synonyms.js, synonyms-extra.js, app-core.js.
    // An isolated map object keeps the FAQ engine out of the global namespace.
    const searchScope={};
'use strict';

/*
  Mapy významově stejných formulací pro vyhledávání Vedátoru.
  Vychází z opakujících se formulací v otázkách i neotázkách:
  lidová otázka -> odborný pojem v názvu nebo odpovědi.
*/
searchScope.VEDATOR_SEARCH_MAPS = {
  equivalents: [
    // --- Veličiny a číselné dotazy ---
    ['hmotnost', ['hmotnost','hmotnosti','hmotnostní','hmotnostny','hmotnosť','hmotnosti','váha','vaha','váží','vazi','vážit','vazit','váži','vazi','vážia','vazia','kg','kilogram','kilogramy','kilogramů','kilogramu','kilogramov','mass']],
    ['trvani', ['trvání','trvani','trvanie','doba','trvá','trva','trvají','trvaji','trvajú','trvaju','doba trvání','doba trvania','čas trvání','cas trvani','čas trvania','cas trvania','duration']],
    ['vzdalenost', ['vzdálenost','vzdalenost','vzdialenosť','vzdialenost','daleko','vzdálený','vzdaleny','vzdialený','vzdialeny','distance']],
    ['rychlost', ['rychlost','rýchlosť','rychlostí','rychlosti','rýchlosťou','rychle','rýchlo','speed','velocity']],
    ['vek', ['věk','vek','stáří','stari','starý','stary','stará','stara','staré','stare','vek člověka','vek cloveka','age']],
    ['velikost', ['velikost','veľkosť','velkost','velký','velky','velká','velka','velké','velke','rozměr','rozmer','rozměry','rozmery','rozměrech','rozmeroch','size','dimensions']],
    ['delka', ['délka','delka','dĺžka','dlzka','dlouhý','dlouhy','dlouhá','dlouha','dlhý','dlhy','length']],
    ['vyska', ['výška','vyska','výšce','vysce','vysoký','vysoky','vysoká','vysoka','height']],
    ['hloubka', ['hloubka','hĺbka','hlbka','hluboký','hluboky','hlboký','hlboky','depth']],
    ['sirka', ['šířka','sirka','šířce','sirce','široký','siroky','width']],
    ['plocha', ['plocha','rozloha','povrchová plocha','povrchova plocha','area']],
    ['objem', ['objem','objemu','litr','litry','litrů','litru','liter','litrov','volume']],
    ['teplota', ['teplota','teploty','teplotě','teplote','stupně','stupne','stupňů','stupnu','celsius','celsia','temperature']],
    ['pocet', ['počet','pocet','množství','mnozstvi','množstvo','mnozstvo','number','amount']],
    ['frekvence', ['frekvence','frekvencia','četnost','cetnost','často','casto','hertz','hz','frequency']],
    ['cena', ['cena','ceny','náklady','naklady','cost','price']],
    ['spotreba', ['spotřeba','spotreba','spotřebuje','spotrebuje','spotřebují','spotrebuju','consumption']],
    ['produkce', ['produkce','produkcia','produkovať','produkovat','produkuje','vyprodukuje','vyprodukují','vyprodukuju','production']],

    // --- Typ informace / význam otázky ---
    ['slozeni', ['složení','slozeni','zloženie','zlozenie','součást','soucast','součásti','soucasti','súčasť','sucast','část','cast','části','casti','častí','casti','složka','slozka','skládá','sklada','skladajú','skladaju','tvoří','tvori','obsahuje','komponenta','component','composition']],
    ['material', ['materiál','material','materiálu','materialu','vyrobený','vyrobeny','vyrobená','vyrobena','made of']],
    ['princip', ['princip','principem','mechanismus','mechanizmus','funguje','fungování','fungovani','fungovanie','pracuje','working principle']],
    ['ucel', ['účel','ucel','slouží','slouzi','slúži','sluzi','funkce','funkcia','využití','vyuziti','využitie','vyuzitie','použití','pouziti','purpose']],
    ['definice', ['definice','definícia','definicia','znamená','znamena','význam','vyznam','definition','meaning']],
    ['pricina', ['příčina','pricina','príčina','důvod','duvod','dôvod','zpusobuje','způsobuje','spôsobuje','cause','reason']],
    ['vznik', ['vznik','vzniká','vznika','vznikají','vznikaji','vznikajú','vznikaju','vytvoření','vytvoreni','formování','formovani','formation','origin process']],
    ['poloha', ['poloha','umístění','umisteni','umiestnenie','nachází','nachazi','nachádza','nachadza','location']],
    ['rozdil', ['rozdíl','rozdil','rozdiel','liší','lisi','líši','odlišnost','odlisnost','porovnání','porovnani','srovnání','srovnani','difference','comparison']],
    ['moznost', ['možnost','moznost','možné','mozne','lze','dokáže','dokaze','dokážu','dokazu','possible','possibility']],
    ['dusledek', ['důsledek','dusledek','dôsledok','následek','nasledek','následok','nasledok','consequence','result']],
    ['mereni', ['měření','mereni','meranie','změřit','zmerit','merať','merat','measurement']],
    ['vypocet', ['výpočet','vypocet','výpočet','spočítat','spocitat','vypočítat','vypocitat','počítať','pocitat','calculation']],
    ['nazev', ['název','nazev','názov','nazov','jmenuje','volá','vola','pojmenování','pojmenovani','name']],
    ['puvod', ['původ','puvod','pôvod','pochází','pochazi','pochádza','pochadza','origin']],
    ['vliv', ['vliv','vplyv','ovlivňuje','ovlivnuje','ovplyvňuje','ovplyvnuje','působí','pusobi','effect','influence']],
    ['metoda', ['metoda','způsob','zpusob','spôsob','sposob','postup','method','procedure']],

    // --- Odborné a jazykové ekvivalence ---
    ['cerna dira', ['černá díra','cerna dira','černé díry','cerne diry','černých děr','cernych der','čierna diera','cierna diera','čierne diery','cierne diery','black hole','black holes']],
    ['vesmir', ['vesmír','vesmir','kosmos','kozmos','universe','cosmos']],
    ['hvezda', ['hvězda','hvezda','hvězdy','hvezdy','hviezda','hviezdy','star','stars']],
    ['slunce', ['slunce','sluneční','slunecni','slnko','slnečný','slnecny','sun','solar']],
    ['mesic', ['měsíc','mesic','měsíční','mesicni','mesiac','mesačný','mesacny','moon','lunar']],
    ['zeme', ['země','zeme','zemský','zemsky','zem','earth','terrestrial']],
    ['casoprostor', ['časoprostor','casoprostor','časopriestor','casopriestor','spacetime']],
    ['umela inteligence', ['umělá inteligence','umela inteligence','umelá inteligencia','umela inteligencia','AI','artificial intelligence']],
    ['svetlo', ['světlo','svetlo','světelný','svetelny','svetelný','light']],
    ['foton', ['foton','fotony','fotonový','fotonovy','fotón','fotóny','photon','photons']],
    ['kvantum', ['kvantum','kvanta','kvantový','kvantovy','kvantová fyzika','kvantova fyzika','quantum']],
    ['gravitace', ['gravitace','gravitační','gravitacni','gravitácia','gravitacia','gravitačný','gravitacny','gravity']],
    ['relativita', ['relativita','relativistický','relativisticky','relativity']],
    ['elektromagneticke zareni', ['elektromagnetické záření','elektromagneticke zareni','elektromagnetické vlnění','elektromagneticke vlneni','elektromagnetické žiarenie','elektromagneticke ziarenie','electromagnetic radiation']],
    ['zareni', ['záření','zareni','žiarenie','ziarenie','radiation']],
    ['optika', ['optika','optický','opticky','optics']],
    ['vlna', ['vlna','vlny','vlnová','vlnova','vlnenie','vlnění','wave','waves']],
    ['energie', ['energie','energia','energy']],
    ['elektron', ['elektron','elektrony','elektrón','elektróny','electron','electrons']],
    ['proton', ['proton','protony','protón','protóny','protons']],
    ['neutron', ['neutron','neutrony','neutrón','neutróny','neutrons']],
    ['kvark', ['kvark','kvarky','quark','quarks']],
    ['atom', ['atom','atomy','atóm','atómy','atoms']],
    ['molekula', ['molekula','molekuly','molekulární','molekularni','molecule','molecules']],
    ['castice', ['částice','castice','častica','castica','particle','particles']],
    ['jadro', ['jádro','jadro','jaderný','jaderny','jadrový','jadrovy','nucleus','nuclear']],
    ['magnet', ['magnet','magnetický','magneticky','magnetic']],
    ['elektrina', ['elektřina','elektrina','elektrický','elektricky','electricity','electric']],
    ['zvuk', ['zvuk','zvukový','zvukovy','sound']],
    ['evoluce', ['evoluce','evoluční','evolucni','evolúcia','evolucia','evolution']],
    ['gen', ['gen','geny','genetický','geneticky','gene','genes','genetics']],
    ['dna', ['DNA','deoxyribonukleová kyselina','deoxyribonukleova kyselina']],
    ['bunka', ['buňka','bunka','buňky','bunky','cell','cells']],
    ['klima', ['klima','klimatický','klimaticky','klimatická změna','klimaticka zmena','climate']],
    ['sklenikovy efekt', ['skleníkový efekt','sklenikovy efekt','skleníkový plyn','sklenikovy plyn','greenhouse effect']],
    ['co2', ['CO2','oxid uhličitý','oxid uhlicity','carbon dioxide']],
    ['pocitac', ['počítač','pocitac','počítače','pocitace','computer','computers']],
    ['algoritmus', ['algoritmus','algoritmy','algorithm','algorithms']],
    ['neuronova sit', ['neuronová síť','neuronova sit','neurónová sieť','neuronova siet','neural network']],
    ['laser', ['laser','lasery','laserový','laserovy']],
    ['horizont udalosti', ['horizont událostí','horizont udalosti','horizont udalostí','event horizon']],
    ['singularita', ['singularita','singularity']],
    ['hawkingovo zareni', ['Hawkingovo záření','hawkingovo zareni','Hawkingovo žiarenie','hawking radiation']],
    ['galaxie', ['galaxie','galaxia','galaxy','galaxies']],
    ['planeta', ['planeta','planety','planetární','planetarni','planetárny','planetarny','planet','planets']],
    ['orbita', ['oběžná dráha','obezna draha','orbita','orbitální dráha','orbitalni draha','obežná dráha','orbit']],
    ['rychlost svetla', ['rychlost světla','rychlost svetla','rýchlosť svetla','speed of light']],
    ['velky tresk', ['velký třesk','velky tresk','veľký tresk','big bang']],
    ['temna hmota', ['temná hmota','temna hmota','tmavá hmota','tmava hmota','dark matter']],
    ['temna energie', ['temná energie','temna energie','tmavá energia','tmava energia','dark energy']],
    ['slunecni soustava', ['sluneční soustava','slunecni soustava','slnečná sústava','slnecna sustava','solar system']],
    ['mlecna draha', ['Mléčná dráha','mlecna draha','Mliečna cesta','mliecna cesta','Milky Way']],
    ['druzice', ['družice','druzice','satelit','satelity','satellite','satellites']],
    ['exoplaneta', ['exoplaneta','exoplanety','extrasolární planeta','extrasolarni planeta','exoplanet']]
  ],

  // Fráze se vyhodnocují především u dotazu. Díky nim se nemíchá např. "jak dlouho" s "jak dlouhý".
  queryPhrases: [
    ['hmotnost', ['kolik váží','kolik vazi','koľko váži','kolko vazi','jakou má hmotnost','jakou ma hmotnost','akú má hmotnosť','aku ma hmotnost','jaká je hmotnost','jaka je hmotnost']],
    ['trvani', ['jak dlouho','ako dlho','za jak dlouho','za ako dlho','jakou dobu','akú dobu','kolik času','kolko casu']],
    ['vzdalenost', ['jak daleko','ako ďaleko','ako daleko','v jaké vzdálenosti','v jake vzdalenosti','v akej vzdialenosti']],
    ['rychlost', ['jak rychle','ako rýchlo','ako rychlo','jakou rychlostí','jakou rychlosti','akou rýchlosťou','akou rychlostou']],
    ['vek', ['jak starý','jak stary','jak stará','jak stara','ako starý','ako stary','ako stará','ako stara','jaký má věk','jaky ma vek','aký má vek','aky ma vek']],
    ['velikost', ['jak velký','jak velky','jak velká','jak velka','jak velké','jak velke','ako veľký','ako velky','ako veľká','ako velka','jaké má rozměry','jake ma rozmery']],
    ['delka', ['jak dlouhý','jak dlouhy','jak dlouhá','jak dlouha','ako dlhý','ako dlhy','ako dlhá','ako dlha','jakou má délku','jakou ma delku','akú má dĺžku','aku ma dlzku']],
    ['vyska', ['jak vysoký','jak vysoky','jak vysoká','jak vysoka','ako vysoký','ako vysoky','ako vysoká','ako vysoka','jakou má výšku','jakou ma vysku']],
    ['hloubka', ['jak hluboký','jak hluboky','jak hluboká','jak hluboka','ako hlboký','ako hlboky','jaká je hloubka','jaka je hloubka']],
    ['sirka', ['jak široký','jak siroky','jak široká','jak siroka','ako široký','ako siroky','jakou má šířku','jakou ma sirku']],
    ['plocha', ['jak velkou plochu','jaká je plocha','jaka je plocha','jaká je rozloha','jaka je rozloha','aká je rozloha','aka je rozloha']],
    ['objem', ['jaký má objem','jaky ma objem','aký má objem','aky ma objem','kolik litrů','kolik litru','koľko litrov','kolko litrov']],
    ['teplota', ['jakou má teplotu','jakou ma teplotu','jaká je teplota','jaka je teplota','akú má teplotu','aku ma teplotu','aká je teplota','aka je teplota','kolik stupňů','kolik stupnu','koľko stupňov','kolko stupnov']],
    ['pocet', ['kolik je','koľko je','kolko je','kolik existuje','koľko existuje','kolko existuje','jaký je počet','jaky je pocet','aký je počet','aky je pocet']],
    ['frekvence', ['jak často','ako často','ako casto','s jakou frekvencí','s jakou frekvenci','s akou frekvenciou']],
    ['cena', ['kolik stojí','kolik stoji','koľko stojí','kolko stoji','jaká je cena','jaka je cena','aká je cena','aka je cena']],
    ['spotreba', ['kolik spotřebuje','kolik spotrebuje','koľko spotrebuje','jaká je spotřeba','jaka je spotreba','aká je spotreba','aka je spotreba']],
    ['produkce', ['kolik vyprodukuje','kolik vyrobí','kolik vyrobi','koľko vyprodukuje','koľko vyrobí','kolko vyrobi']],
    ['slozeni', ['z jakých částí','z jakych casti','z akých častí','z akych casti','z čeho se skládá','z ceho se sklada','z čoho sa skladá','z coho sa sklada','co obsahuje','čo obsahuje','co je součástí','co je soucasti','čo je súčasťou','co tvori','co tvoří']],
    ['material', ['z čeho je','z ceho je','z čoho je','z coho je','z jakého materiálu','z jakeho materialu','z akého materiálu','z akeho materialu','z čeho je vyroben','z ceho je vyroben']],
    ['princip', ['jak funguje','jak fungují','jak funguji','ako funguje','ako fungujú','ako funguju','na jakém principu','na jakem principu','na akom princípe','na akom principe']],
    ['ucel', ['k čemu slouží','k cemu slouzi','na co slouží','na co slouzi','na čo slúži','na co sluzi','k čemu se používá','k cemu se pouziva','na čo sa používa','na co sa pouziva']],
    ['definice', ['co je','co je to','čo je','co znamena','co znamená','čo znamená','co se rozumí','co se rozumi']],
    ['pricina', ['proč','prečo','z jakého důvodu','z jakeho duvodu','z akého dôvodu','z akeho dovodu','co způsobuje','co zpusobuje','čo spôsobuje','co je příčinou','co je pricinou']],
    ['vznik', ['jak vzniká','jak vznika','jak vznikají','jak vznikaji','ako vzniká','ako vznika','ako vznikajú','ako vznikaju','jak se vytvoří','jak se vytvori','ako sa vytvorí']],
    ['poloha', ['kde je','kde se nachází','kde se nachazi','kde sa nachádza','kde sa nachadza','kde leží','kde lezi']],
    ['rozdil', ['jaký je rozdíl','jaky je rozdil','aký je rozdiel','aky je rozdiel','rozdíl mezi','rozdil mezi','rozdiel medzi','v čem se liší','v cem se lisi','v čom sa líši','v com sa lisi']],
    ['moznost', ['je možné','je mozne','je možné aby','dá se','da se','dá sa','da sa','může','môže','moze','lze']],
    ['dusledek', ['co se stane','co se stane když','co se stane kdyz','co by se stalo','čo sa stane','co sa stane','co by sa stalo','jaký bude následek','jaky bude nasledek']],
    ['mereni', ['jak se měří','jak se meri','ako sa meria','jak změřit','jak zmerit','ako zmerať','ako zmerat']],
    ['vypocet', ['jak se počítá','jak se pocita','ako sa počíta','ako sa pocita','jak spočítat','jak spocitat','jak vypočítat','jak vypocitat']],
    ['nazev', ['jak se jmenuje','jak se to jmenuje','ako sa volá','ako sa vola','jaký je název','jaky je nazev','aký je názov','aky je nazov']],
    ['puvod', ['odkud pochází','odkud pochazi','odkiaľ pochádza','odkial pochadza','jaký má původ','jaky ma puvod','aký má pôvod','aky ma povod']],
    ['vliv', ['jak ovlivňuje','jak ovlivnuje','ako ovplyvňuje','ako ovplyvnuje','jaký má vliv','jaky ma vliv','aký má vplyv','aky ma vplyv']],
    ['metoda', ['jak se dá','jak se da','ako sa dá','ako sa da','jak lze','jak můžeme','jak muzeme','ako môžeme','ako mozeme']]
  ],

  // Příbuzné, ale ne totožné pojmy. Používají se až jako slabší fallback.
  semanticEdges: [
    ['foton','svetlo',.78],['foton','elektromagneticke zareni',.68],['foton','kvantum',.64],['foton','zareni',.62],['foton','energie',.50],['foton','vlna',.46],['foton','optika',.54],
    ['svetlo','optika',.78],['svetlo','elektromagneticke zareni',.72],['svetlo','vlna',.68],['svetlo','laser',.63],['svetlo','rychlost svetla',.58],
    ['cerna dira','gravitace',.86],['cerna dira','relativita',.82],['cerna dira','casoprostor',.80],['cerna dira','horizont udalosti',.94],['cerna dira','singularita',.91],['cerna dira','hawkingovo zareni',.82],['cerna dira','galaxie',.50],['cerna dira','hvezda',.56],
    ['gravitace','relativita',.79],['gravitace','casoprostor',.78],['gravitace','orbita',.68],['gravitace','planeta',.58],['gravitace','hvezda',.55],
    ['relativita','casoprostor',.88],['relativita','rychlost svetla',.72],
    ['kvantum','castice',.78],['kvantum','atom',.67],['kvantum','elektron',.68],['kvantum','foton',.64],['kvantum','vlna',.60],
    ['castice','elektron',.80],['castice','proton',.80],['castice','neutron',.80],['castice','kvark',.78],['castice','foton',.62],['castice','jadro',.55],
    ['atom','elektron',.80],['atom','proton',.73],['atom','neutron',.73],['atom','molekula',.72],['atom','jadro',.68],
    ['elektromagneticke zareni','zareni',.92],['elektromagneticke zareni','vlna',.82],['elektromagneticke zareni','svetlo',.72],
    ['vesmir','galaxie',.78],['vesmir','hvezda',.75],['vesmir','planeta',.70],['vesmir','velky tresk',.62],['vesmir','temna hmota',.58],['vesmir','temna energie',.58],
    ['galaxie','hvezda',.72],['planeta','orbita',.72],['planeta','hvezda',.58],['slunecni soustava','planeta',.82],['slunecni soustava','slunce',.84],['mlecna draha','galaxie',.95],['druzice','orbita',.68],['exoplaneta','planeta',.90],
    ['evoluce','gen',.68],['evoluce','dna',.60],['gen','dna',.88],['gen','bunka',.62],['dna','bunka',.66],
    ['klima','sklenikovy efekt',.78],['klima','co2',.70],['klima','teplota',.60],['sklenikovy efekt','co2',.80],
    ['umela inteligence','algoritmus',.80],['umela inteligence','neuronova sit',.78],['umela inteligence','pocitac',.62],['algoritmus','pocitac',.58],
    // blízké veličiny / formulace, které nejsou totožné
    ['velikost','delka',.72],['velikost','vyska',.66],['velikost','sirka',.66],['velikost','plocha',.48],['velikost','objem',.48],
    ['frekvence','trvani',.24],['pricina','vliv',.55],['slozeni','material',.78],['princip','metoda',.42]
  ]
};

'use strict';
/* Velké rozšíření odborných synonym, jazykových ekvivalentů a významů dotazů. */
(()=>{
  const M=searchScope.VEDATOR_SEARCH_MAPS;if(!M)return;
  const parseEq=text=>text.trim().split(/\n+/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).map(line=>{const [key,forms='']=line.split('|');return[key.trim(),forms.split(';').map(x=>x.trim()).filter(Boolean)]});
  const parseEdges=text=>text.trim().split(/\n+/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).map(line=>{const [a,b,w]=line.split('|');return[a.trim(),b.trim(),Number(w)]});

  M.equivalents.push(...parseEq(`
# mechanika a veličiny
zrychleni|zrychlení;zrýchlenie;akcelerace;acceleration
sila|síla;force
prace|práce;mechanická práce;mechanická práca;work
vykon|výkon;příkon;príkon;power
hybnost|hybnost;momentum
moment hybnosti|moment hybnosti;úhlová hybnost;angular momentum
tlak|tlak;pressure;pascal
hustota|hustota;měrná hmotnost;density
vztlak|vztlak;vztlaková síla;buoyancy
treni|tření;trenie;friction
pruznost|pružnost;elasticita;elasticity
setrvacnost|setrvačnost;zotrvačnosť;inertia
rotace|rotace;otáčení;rotácia;rotation
moment sily|moment síly;krouticí moment;točivý moment;torque
teziste|těžiště;ťažisko;centrum hmotnosti;center of mass
volny pad|volný pád;voľný pád;free fall
odpor prostredi|odpor prostředí;odpor vzduchu;aerodynamický odpor;drag;air resistance
terminalni rychlost|terminální rychlost;ustálená pádová rychlost;terminal velocity
kineticka energie|kinetická energie;pohybová energie;kinetic energy
potencialni energie|potenciální energie;polohová energie;potential energy
mechanicka energie|mechanická energie;mechanical energy
zakon zachovani energie|zákon zachování energie;zachování energie;conservation of energy
zakon zachovani hybnosti|zákon zachování hybnosti;zachování hybnosti;conservation of momentum

# kmity, vlny a optika
perioda|perioda;doba kmitu;period
kmitani|kmitání;oscilace;oscilácia;vibrace;oscillation
rezonance|rezonance;resonance
amplituda|amplituda;výchylka;amplitude
vlnova delka|vlnová délka;vlnová dĺžka;wavelength
interference|interference;skládání vln;interference vln
difrakce|difrakce;ohyb vln;ohyb světla;diffraction
polarizace|polarizace;polarizácia;polarization
odraz|odraz;reflexe;reflection
lom|lom;refrakce;refraction
index lomu|index lomu;refrakční index;refractive index
disperze|disperze;rozklad světla;dispersion
spektrum|spektrum;spektroskopie;spectrum;spectroscopy
doppleruv jev|Dopplerův jev;Dopplerov jev;doppler effect

# elektřina a magnetismus
elektricky proud|elektrický proud;elektrický prúd;proud;prúd;current;ampér
napeti|napětí;napätie;voltage;volt
odpor|elektrický odpor;odpor vodiče;rezistence;resistance;ohm
vodivost|vodivost;konduktivita;conductivity
elektricky naboj|elektrický náboj;náboj;charge;coulomb
elektricke pole|elektrické pole;electric field
magneticke pole|magnetické pole;magnetic field
elektromagnetismus|elektromagnetismus;elektromagnetizmus;electromagnetism
indukce|elektromagnetická indukce;indukce;indukcia;electromagnetic induction
kapacita|kapacita;elektrická kapacita;capacitance;farad
kondenzator|kondenzátor;capacitor
civka|cívka;induktor;inductor;coil
transformator|transformátor;transformer
stridavy proud|střídavý proud;striedavý prúd;AC;alternating current
stejnosmerny proud|stejnosměrný proud;jednosmerný prúd;DC;direct current

# moderní a jaderná fyzika
radioaktivita|radioaktivita;radioaktivní rozpad;radioactivity
izotop|izotop;isotope
polo cas|poločas rozpadu;half-life
jadrena stepeni|jaderné štěpení;jadrové štiepenie;nuclear fission;fission
jadrena fuze|jaderná fúze;jadrová fúzia;nuclear fusion;fusion
neutrino|neutrino;neutríno;neutrinos
antihmota|antihmota;antimatter
hmota|hmota;materie;matter
higgsuv boson|Higgsův boson;Higgsov bozón;Higgs boson
standardni model|standardní model;štandardný model;standard model
boson|boson;bozón;bosons
fermion|fermion;fermions
supervodivost|supravodivost;supervodivost;superconductivity
plazma|plazma;plasma
vakuum|vakuum;vacuum
entropie|entropie;entropy
termodynamika|termodynamika;thermodynamics
skupenske teplo|skupenské teplo;latent heat
fazovy prechod|fázový přechod;phase transition

# astronomie a kosmologie
supernova|supernova;výbuch supernovy
neutronova hvezda|neutronová hvězda;neutrónová hviezda;neutron star
bily trpaslik|bílý trpaslík;biely trpaslík;white dwarf
cerveny obr|červený obr;červený gigant;red giant
pulsar|pulsar;pulzar
kvazar|kvazar;quasar
kosmicke zareni|kosmické záření;kozmické žiarenie;cosmic rays;cosmic radiation
slunecni vitr|sluneční vítr;slnečný vietor;solar wind
polarni zare|polární záře;severní záře;aurora;aurora borealis
zatmeni|zatmění;zatmenie;eclipse
kometa|kometa;comet
asteroid|asteroid;planetka;minor planet
meteoroid|meteoroid;meteoroidy
meteor|meteor;padající hvězda;shooting star
meteorit|meteorit;meteorite
teleskop|teleskop;dalekohled;ďalekohľad;telescope
radioteleskop|radioteleskop;rádiový dalekohled;radio telescope
cerveny posuv|červený posuv;rudý posuv;redshift
gravitacni vlna|gravitační vlna;gravitačná vlna;gravitational wave
kosmologie|kosmologie;kozmológia;cosmology
astronomie|astronomie;astronómia;astronomy
astrofyzika|astrofyzika;astrophysics
svetelny rok|světelný rok;svetelný rok;light-year;light year
parsek|parsek;parsec

# Země, klima a energetika
atmosfera|atmosféra;ovzduší;atmosphere
pocasi|počasí;počasie;weather
klimaticka zmena|klimatická změna;klimatická zmena;climate change
globalni oteplovani|globální oteplování;globálne otepľovanie;global warming
ozon|ozon;ozón;ozonová vrstva;ozone
ocean|oceán;moře;more;sea;ocean
ledovec|ledovec;ľadovec;glacier
sopka|sopka;vulkán;volcano
zemetreseni|zemětřesení;zemetrasenie;earthquake
deskovatektonika|desková tektonika;tektonika desek;plate tectonics
geotermalni energie|geotermální energie;geotermálna energia;geothermal energy
fosilni paliva|fosilní paliva;fossil fuels
obnovitelne zdroje|obnovitelné zdroje;renewables;renewable energy
solarni energie|solární energie;sluneční energie;solar energy
vetrna energie|větrná energie;wind energy
jadrena energie|jaderná energie;jadrová energia;nuclear energy

# chemie
chemicky prvek|chemický prvek;prvek;prvok;element;chemical element
periodicka tabulka|periodická tabulka;periodická soustava;periodic table
chemicka vazba|chemická vazba;chemical bond
ion|ion;iont;ión;ions
kyselina|kyselina;acid
zasada|zásada;báze;base;alkali
ph|pH;kyselost;acidita;alkalita
oxidace|oxidace;oxidácia;oxidation
redukce|redukce;redukcia;reduction
redox|redox;redoxní reakce;oxidačně redukční
katalyzator|katalyzátor;catalyst
chemicka reakce|chemická reakce;reakce;reaction
roztok|roztok;solution
rozpoustedlo|rozpouštědlo;solvent
rozpustena latka|rozpuštěná látka;solute
koncentrace|koncentrace;molarita;concentration;molarity
vodik|vodík;hydrogen;H2
kyslik|kyslík;oxygen;O2
dusik|dusík;nitrogen;N2
uhlik|uhlík;carbon
voda|voda;H2O;water
metan|metan;methane;CH4

# biologie, genetika a medicína
rna|RNA;ribonukleová kyselina
chromozom|chromozom;chromosom;chromosome
genom|genom;genome
mutace|mutace;mutácia;mutation
prirodni vyber|přírodní výběr;přirozený výběr;natural selection
protein|protein;bílkovina;proteín
 enzyma|enzym;enzyme
mitochondrie|mitochondrie;mitochondria
ribozom|ribozom;ribosom;ribosome
bakterie|bakterie;baktérie;bacteria
virus|virus;viry;vírus;viruses
houba|houba;plíseň;fungus;fungi
imunita|imunita;imunitní systém;imunitný systém;immune system
vakcina|vakcína;očkování;očkovanie;vaccination;vaccine
protilatka|protilátka;antibody
hormon|hormon;hormone
mozek|mozek;mozog;brain
neuron|neuron;neurón;nerve cell
nervova soustava|nervová soustava;nervový systém;nervous system
krev|krev;krv;blood
srdce|srdce;heart
plice|plíce;pľúca;lungs
ledvina|ledvina;ledviny;oblička;kidney
jatra|játra;pečeň;liver
traveni|trávení;trávenie;digestion
metabolismus|metabolismus;metabolizmus;metabolism
spermie|spermie;spermatozoid;sperm cell
vajicko|vajíčko;oocyt;ovum;egg cell
oplodneni|oplodnění;fertilizace;fertilization
tehotenstvi|těhotenství;gravidita;pregnancy
plodnost|plodnost;fertilita;fertility
rakovina|rakovina;nádorové onemocnění;cancer
nador|nádor;tumor;tumour
infekce|infekce;infection
nemoc|nemoc;choroba;onemocnění;disease;illness
antibiotikum|antibiotikum;antibiotika;antibiotic
mikrobiom|mikrobiom;mikroflóra;microbiome
fotosynteza|fotosyntéza;photosynthesis
bunecne dychani|buněčné dýchání;cellular respiration
organismus|organismus;organizmus;organism
druh|biologický druh;species
ekosystem|ekosystém;ecosystem
spanek|spánek;spánok;sleep
vedomi|vědomí;vedomie;consciousness
pamet|paměť;pamäť;memory
stres|stres;stress
deprese|deprese;depresia;depression
uzkost|úzkost;anxiety
placebo|placebo;placebo efekt;placebo effect
bolest|bolest;pain
horecka|horečka;horúčka;fever
zanet|zánět;zápal;inflammation
prevence|prevence;prevencia;prevention
lecba|léčba;liečba;terapie;therapy;treatment
diagnoza|diagnóza;diagnosis
priznak|příznak;symptom

# technologie a AI
strojove uceni|strojové učení;machine learning;ML
hluboke uceni|hluboké učení;deep learning
generativni ai|generativní AI;generative AI
jazykovy model|jazykový model;velký jazykový model;LLM;large language model
robot|robot;robotika;robotics
internet|internet;internetová síť
web|web;WWW;world wide web;webová stránka
blockchain|blockchain;blokový řetězec
kvantovy pocitac|kvantový počítač;quantum computer;quantum computing
tranzistor|tranzistor;transistor
polovodic|polovodič;semiconductor
dioda|dioda;diode
baterie|baterie;akumulátor;battery
solarni clanek|solární článek;fotovoltaický článek;solar cell
fotovoltaika|fotovoltaika;fotovoltaický jev;photovoltaics;PV
fotoelektricky jev|fotoelektrický jev;photoelectric effect
senzor|senzor;čidlo;sensor
gps|GPS;globální polohový systém;Global Positioning System
raketa|raketa;nosná raketa;rocket;launch vehicle
kosmicka lod|kosmická loď;vesmírná loď;spacecraft;spaceship
sonda|sonda;kosmická sonda;space probe
dezinformace|dezinformace;misinformation;disinformation
konspirace|konspirace;konspirační teorie;conspiracy theory
socialni site|sociální sítě;sociálne siete;social media

# další typy významu dotazu
historie|historie;dějiny;history
objevitel|objevitel;vynálezce;discoverer;inventor
priklad|příklad;example
vyhoda|výhoda;benefit;advantage
nevyhoda|nevýhoda;drawback;disadvantage
riziko|riziko;nebezpečí;risk;danger
dukaz|důkaz;evidence;proof
pozorovani|pozorování;detekce;observation;detection
zdroj|zdroj;source
struktura|struktura;stavba;structure
funkce|funkce;role;function
`));

  M.queryPhrases.push(...parseEq(`
zrychleni|jaké má zrychlení;jak rychle zrychluje;ako rýchlo zrýchľuje
hustota|jakou má hustotu;jaká je hustota;aká je hustota
tlak|jaký je tlak;jaký tlak;aký je tlak
vykon|jaký má výkon;kolik má wattů;jaký je příkon
energie|kolik má energie;jaká je energie
elektricky proud|jaký teče proud;jak velký proud;kolik ampér
napeti|jaké je napětí;kolik voltů
odpor|jaký má odpor;kolik ohmů
perioda|jaká je perioda;jak dlouho trvá jeden kmit
vlnova delka|jaká je vlnová délka;jakou má vlnovou délku
koncentrace|jaká je koncentrace;kolik látky je v roztoku
ph|jaké má pH;jak je kyselé;jaká je kyselost
lecba|jak se léčí;ako sa lieči;jaká je léčba
prevence|jak tomu předejít;jak se tomu vyhnout;jak tomu zabránit
priznak|jaké jsou příznaky;jak se to projevuje;jaké má symptomy
diagnoza|jak se to pozná;jak se diagnostikuje;jak zjistit jestli
historie|kdy vznikl;kdy vznikla;kdy bylo objeveno;kdy byla objevena;od kdy existuje
objevitel|kdo objevil;kdo vynalezl;kdo přišel na;kto objavil
priklad|uveď příklad;jaký je příklad;například
vyhoda|jaké jsou výhody;v čem je výhoda
nevyhoda|jaké jsou nevýhody;v čem je nevýhoda
riziko|jaké je riziko;jak nebezpečné;je to nebezpečné
dukaz|jaký je důkaz;jak to víme;čím je to doloženo
pozorovani|jak to pozorovat;jak to vidět;jak se to sleduje;jak to detekovat
zdroj|odkud se bere;jaký je zdroj;z čeho pochází
struktura|jakou má strukturu;jak je uspořádaný;jak je stavěný
funkce|jakou má funkci;co dělá;jaká je jeho role
rychlost svetla|jak rychlé je světlo;jakou rychlost má světlo
svetelny rok|kolik je světelný rok;jak dlouhý je světelný rok
`));

  M.semanticEdges.push(...parseEdges(`
sila|zrychleni|0.75
sila|hmotnost|0.58
sila|prace|0.60
prace|energie|0.86
prace|vykon|0.76
vykon|energie|0.66
rotace|moment sily|0.72
rotace|moment hybnosti|0.72
volny pad|gravitace|0.86
volny pad|zrychleni|0.72
terminalni rychlost|odpor prostredi|0.84
kineticka energie|energie|0.92
potencialni energie|energie|0.92
mechanicka energie|kineticka energie|0.82
mechanicka energie|potencialni energie|0.82
kmitani|perioda|0.82
kmitani|frekvence|0.82
kmitani|amplituda|0.74
kmitani|rezonance|0.68
vlna|vlnova delka|0.84
vlna|frekvence|0.80
vlna|perioda|0.72
vlna|interference|0.70
vlna|difrakce|0.68
svetlo|interference|0.68
svetlo|difrakce|0.68
svetlo|polarizace|0.68
svetlo|odraz|0.64
svetlo|lom|0.70
lom|index lomu|0.90
svetlo|disperze|0.62
svetlo|spektrum|0.66
doppleruv jev|frekvence|0.72
doppleruv jev|vlna|0.76
elektricky proud|napeti|0.82
elektricky proud|odpor|0.78
napeti|odpor|0.70
elektricky naboj|elektricke pole|0.84
elektricky proud|magneticke pole|0.62
elektromagnetismus|elektricke pole|0.82
elektromagnetismus|magneticke pole|0.82
indukce|magneticke pole|0.86
indukce|elektricky proud|0.68
kondenzator|kapacita|0.92
civka|indukce|0.70
transformator|stridavy proud|0.86
radioaktivita|izotop|0.82
radioaktivita|polo cas|0.84
jadrena stepeni|jadro|0.82
jadrena fuze|jadro|0.80
jadrena fuze|hvezda|0.72
higgsuv boson|standardni model|0.86
supervodivost|kvantum|0.66
termodynamika|entropie|0.82
termodynamika|teplota|0.72
supernova|hvezda|0.90
supernova|neutronova hvezda|0.74
neutronova hvezda|pulsar|0.88
cerveny obr|hvezda|0.86
bily trpaslik|hvezda|0.86
kvazar|cerna dira|0.72
kosmicke zareni|zareni|0.82
slunecni vitr|slunce|0.86
polarni zare|slunecni vitr|0.76
polarni zare|magneticke pole|0.70
zatmeni|slunce|0.60
zatmeni|mesic|0.70
kometa|slunecni soustava|0.72
asteroid|slunecni soustava|0.72
meteor|meteoroid|0.84
meteorit|meteoroid|0.84
teleskop|astronomie|0.74
radioteleskop|teleskop|0.90
cerveny posuv|vesmir|0.70
cerveny posuv|doppleruv jev|0.62
gravitacni vlna|gravitace|0.84
gravitacni vlna|relativita|0.74
kosmologie|vesmir|0.88
astrofyzika|astronomie|0.86
svetelny rok|vzdalenost|0.90
parsek|vzdalenost|0.90
chemicky prvek|periodicka tabulka|0.90
chemicky prvek|atom|0.82
chemicka vazba|atom|0.76
ion|elektron|0.72
kyselina|ph|0.84
zasada|ph|0.84
oxidace|redukce|0.90
redox|oxidace|0.92
redox|redukce|0.92
katalyzator|chemicka reakce|0.84
roztok|rozpoustedlo|0.78
roztok|rozpustena latka|0.78
roztok|koncentrace|0.72
dna|rna|0.82
dna|chromozom|0.84
dna|genom|0.80
gen|chromozom|0.84
gen|mutace|0.78
evoluce|prirodni vyber|0.88
protein|gen|0.72
protein|enzyma|0.76
mitochondrie|bunka|0.82
ribozom|protein|0.72
bakterie|mikrobiom|0.72
virus|infekce|0.80
bakterie|infekce|0.74
imunita|vakcina|0.82
imunita|protilatka|0.86
mozek|neuron|0.86
neuron|nervova soustava|0.86
srdce|krev|0.78
traveni|metabolismus|0.68
spermie|vajicko|0.72
spermie|oplodneni|0.80
vajicko|oplodneni|0.82
oplodneni|tehotenstvi|0.80
plodnost|spermie|0.72
rakovina|nador|0.92
nemoc|diagnoza|0.68
nemoc|lecba|0.68
nemoc|priznak|0.70
infekce|zanet|0.66
antibiotikum|bakterie|0.82
fotosynteza|energie|0.58
fotosynteza|co2|0.60
atmosfera|pocasi|0.80
atmosfera|klima|0.74
klimaticka zmena|klima|0.94
globalni oteplovani|klimaticka zmena|0.90
globalni oteplovani|sklenikovy efekt|0.78
ozon|atmosfera|0.72
ocean|klima|0.68
ledovec|klimaticka zmena|0.72
deskovatektonika|zemetreseni|0.82
deskovatektonika|sopka|0.80
fosilni paliva|co2|0.72
obnovitelne zdroje|solarni energie|0.72
obnovitelne zdroje|vetrna energie|0.72
jadrena energie|jadrena stepeni|0.82
strojove uceni|umela inteligence|0.90
hluboke uceni|strojove uceni|0.92
neuronova sit|hluboke uceni|0.86
generativni ai|umela inteligence|0.90
jazykovy model|generativni ai|0.84
jazykovy model|umela inteligence|0.82
robot|umela inteligence|0.62
internet|web|0.82
kvantovy pocitac|kvantum|0.82
tranzistor|polovodic|0.88
dioda|polovodic|0.86
baterie|elektrina|0.64
solarni clanek|fotovoltaika|0.94
fotovoltaika|fotoelektricky jev|0.76
fotoelektricky jev|foton|0.82
gps|druzice|0.86
raketa|kosmicka lod|0.62
sonda|kosmicka lod|0.76
dezinformace|konspirace|0.64
socialni site|dezinformace|0.58
`));
})();

'use strict';

const MAPS = searchScope.VEDATOR_SEARCH_MAPS || {equivalents:[],queryPhrases:[],semanticEdges:[]};
const state = {index:[],df:new Map(),postings:new Map(),corpusSize:1,filter:'all',buildVersion:0,formTrigrams:new Map(),formCache:new Map()};

const norm = value => String(value??'')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const STOP = new Set(norm(`
a aby aj ale anebo ani ano asi az bez bude budou byl byla byli bylo by bych bychom byste
co coz ci do ho i jak jako je jej jeho jejich jen jenom ji jich jim jimi jinak jiz k kam kde kdy kdo
ktera ktere ktery kterou kterym kterych jaky jaka jake jakou jakem jakeho jakych kolik ku ma maji mezi mi mit mne mnou muze na nad nam nami ne nebo nech neni nez nic
o od on ona oni ono pak po pod podle pokud pro proc proto pri pred pres se si sice svoji sve svuj
ta tak take tam ten tento te tim to toto tu ty u uz v vam vami ve velmi vy z za ze priblizne zhruba asi
a ako ano bez bude budu bol bola boli bolo byt som sme ste co ci ich im inak jej jeho len medzi
ma maju moct moze nie alebo podla pokial pre preco preto pri pred cez sa svoj svoje vo zo aky aka ake aku akou akom akeho ktory ktora ktore kolko približne priblizne
`).split(/\s+/).filter(Boolean));

const SUFFIXES = `
ovymi evymi ovych evych oveho eveho ovemu evemu ovami evami ovou evou
ami emi imi omi ach ech ich och iach iami atami enami
ovani anie enie enia eniu ujeji ujici ujuci
ujeme ujete ujem uje aju ali ala alo ate eti ity oti eni ena eno ily ila ilo ete ite
skymi ckymi skeho ckeho skemu ckemu skych ckych
nosti nostiach eho iho ymi imi omu ych ou em am ym im om um
ovy ova ove ovi ovu ev sk ck y i a e u o
`.trim().split(/\s+/).map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);

function stem(word){
  let w=norm(word);
  if(w.length<5)return w;
  for(const s of SUFFIXES){
    if(w.endsWith(s) && w.length-s.length>=4){w=w.slice(0,-s.length);break;}
  }
  return w;
}

const alias=new Map();
const phraseAliases=[];
for(const [canonicalRaw,forms] of MAPS.equivalents){
  const canonical=norm(canonicalRaw);
  const all=[canonicalRaw,...forms];
  alias.set(canonical,canonical);
  alias.set(stem(canonical),canonical);
  for(const formRaw of all){
    const form=norm(formRaw);
    if(!form)continue;
    if(form.includes(' ')) phraseAliases.push([form,canonical]);
    else {
      alias.set(form,canonical);
      alias.set(stem(form),canonical);
    }
  }
}
phraseAliases.sort((a,b)=>b[0].length-a[0].length);

// V2_ASK_VERB_FAMILY_CANON_V1
// Konzervativní slovesná normalizace: rodiny se učí pouze z již schválených
// ekvivalentů (např. "změřit" -> "měření"), nikoli z libovolných slov v katalogu.
const askMorphNorm=value=>String(value??'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const ASK_VERB_INFINITIVE_ENDINGS=['ovat','ovať','nout','nuť','out','ať','at','iť','it','eť','et','ět','uť','ut'].sort((a,b)=>b.length-a.length);
const ASK_VERB_FORM_ENDINGS=[
  'ovali','ovaly','ovala','ovalo','oval',
  'ili','ily','ila','ilo','il',
  'eli','ely','ela','elo','el',
  'ali','aly','ala','alo','al',
  ...ASK_VERB_INFINITIVE_ENDINGS
].sort((a,b)=>b.length-a.length);
const ASK_VERB_PREFIXES=['pře','pre','roz','pro','vy','na','od','do','za','po','u','z','s'].sort((a,b)=>b.length-a.length);

function askVerbFamilyCores(value,{infinitiveOnly=false}={}){
  const word=askMorphNorm(value);
  if(!word||word.includes(' ')||word.length<5)return[];
  const endings=infinitiveOnly?ASK_VERB_INFINITIVE_ENDINGS:ASK_VERB_FORM_ENDINGS;
  let base='';
  for(const ending of endings){
    if(word.endsWith(ending)&&word.length-ending.length>=3){base=word.slice(0,-ending.length);break;}
  }
  if(!base)return[];
  const cores=new Set([base]);
  for(const prefix of ASK_VERB_PREFIXES){
    if(base.startsWith(prefix)&&base.length-prefix.length>=3)cores.add(base.slice(prefix.length));
  }
  return [...cores];
}

const askVerbFamilyBuckets=new Map();
for(const [canonicalRaw,forms] of MAPS.equivalents||[]){
  const canonical=norm(canonicalRaw);
  for(const formRaw of [canonicalRaw,...(forms||[])]){
    // Seedujeme jen skutečně česko/slovensky zapsané infinitivy.
    // Tím se např. anglické "orbit" omylem nepovažuje za sloveso.
    if(!/[^\x00-\x7F]/.test(String(formRaw)))continue;
    for(const core of askVerbFamilyCores(formRaw,{infinitiveOnly:true})){
      if(!askVerbFamilyBuckets.has(core))askVerbFamilyBuckets.set(core,new Set());
      askVerbFamilyBuckets.get(core).add(canonical);
    }
  }
}
const askVerbFamilyAlias=new Map();
for(const [core,canonicals] of askVerbFamilyBuckets){
  // Nejednoznačné kořeny raději úplně ignorujeme.
  if(canonicals.size===1)askVerbFamilyAlias.set(core,[...canonicals][0]);
}
function askVerbFamilyCanon(value){
  const matches=new Set();
  for(const core of askVerbFamilyCores(value)){
    const canonical=askVerbFamilyAlias.get(core);
    if(canonical)matches.add(canonical);
  }
  return matches.size===1?[...matches][0]:'';
}

const queryPhrases=[];
for(const [canonicalRaw,forms] of MAPS.queryPhrases){
  const canonical=norm(canonicalRaw);
  for(const formRaw of forms){
    const form=norm(formRaw);
    if(form)queryPhrases.push([form,canonical]);
  }
}
queryPhrases.sort((a,b)=>b[0].length-a[0].length);

const semanticGraph=new Map();
function addSemantic(a,b,w){
  a=canon(a);b=canon(b);
  if(!semanticGraph.has(a))semanticGraph.set(a,new Map());
  const m=semanticGraph.get(a);
  m.set(b,Math.max(m.get(b)||0,w));
}
for(const [a,b,w] of MAPS.semanticEdges){addSemantic(a,b,w);addSemantic(b,a,w*.94);}

function canon(value){
  const n=norm(value),exact=alias.get(n);
  if(exact)return exact;
  const verb=askVerbFamilyCanon(value);
  if(verb)return verb;
  return alias.get(stem(n))||stem(n);
}

// V2_ASK_WORD_FORM_SIMILARITY_V1
// Lehká morfologická vrstva pro tvary typu "meril" <-> "zmeril".
// Nepřepisuje stávající synonyma ani semantiku; jen přidává slabší signál pro významová slova.
const FORM_SIM_MIN=.72,FORM_SIM_WEIGHT=.84,FORM_SIM_LIMIT=12;
function formEligible(key){
  key=norm(key);
  return key.length>=5&&!key.includes(' ')&&!STOP.has(key)&&/^[a-z0-9]+$/.test(key);
}
function formTrigramSet(key){
  key=norm(key);const grams=new Set();
  for(let i=0;i<=key.length-3;i++)grams.add(key.slice(i,i+3));
  return grams;
}
function formDice(a,b){
  const A=formTrigramSet(a),B=formTrigramSet(b);
  if(!A.size||!B.size)return 0;
  let common=0;for(const g of A)if(B.has(g))common++;
  return 2*common/(A.size+B.size);
}
function rebuildFormIndex(df){
  const index=new Map();
  for(const key of df.keys()){
    if(!formEligible(key))continue;
    for(const gram of formTrigramSet(key)){
      if(!index.has(gram))index.set(gram,new Set());
      index.get(gram).add(key);
    }
  }
  state.formTrigrams=index;state.formCache=new Map();
}
function similarForms(key){
  key=canon(key);
  if(!formEligible(key))return[];
  if(state.formCache.has(key))return state.formCache.get(key);
  const candidates=new Set();
  for(const gram of formTrigramSet(key))for(const other of state.formTrigrams.get(gram)||[])candidates.add(other);
  const matches=[];
  for(const other of candidates){
    if(other===key||Math.abs(other.length-key.length)>3)continue;
    const similarity=formDice(key,other);
    if(similarity>=FORM_SIM_MIN)matches.push([other,similarity]);
  }
  matches.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const result=matches.slice(0,FORM_SIM_LIMIT);state.formCache.set(key,result);return result;
}

function hasPhrase(haystack,phrase){
  return (` ${haystack} `).includes(` ${phrase} `);
}

function extractTerms(text,{query=false}={}){
  const normalized=norm(text);
  if(!normalized)return[];
  const out=[],seen=new Set();
  const add=(key,label,kind='word')=>{
    key=canon(key);
    if(!key||seen.has(key))return;
    seen.add(key);out.push({key,label:label||key,kind});
  };

  // Nejprve víceslovné odborné ekvivalence.
  for(const [phrase,key] of phraseAliases){
    if(hasPhrase(normalized,phrase))add(key,phrase,'phrase');
  }

  // Potom význam otázky: „kolik váží“ = hmotnost, „jak dlouho“ = trvání atd.
  if(query){
    for(const [phrase,key] of queryPhrases){
      if(hasPhrase(normalized,phrase))add(key,phrase,'intent');
    }
  }

  const tokens=String(text??'').match(/[\p{L}\p{N}]+/gu)||[];
  for(const rawToken of tokens){
    const token=norm(rawToken);
    if(token.length<2||STOP.has(token))continue;
    const key=canon(rawToken);
    if(!key||STOP.has(key))continue;
    add(key,token,'word');
  }
  return out;
}

function parseTime(value){
  const p=String(value||'').match(/\d{1,2}:\d{2}(?::\d{2})?/)?.[0].split(':').map(Number);
  if(!p)return 0;
  return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1];
}

function flattenData(data){
  const items=[];
  for(const q of data.questions||[]){
    const cs=q.i18n?.cs||{title:q.title||'',points:Array.isArray(q.points)?q.points:[]};
    const sk=q.i18n?.sk||{title:q.title||'',points:Array.isArray(q.points)?q.points:[]};
    items.push({
      id:`q:${q.episode}:${q.order}`,type:'question',episode:Number(q.episode)||0,order:Number(q.order)||0,
      seconds:Number(q.seconds)||0,time:q.sourceTime||q.time||'',
      cs:{title:String(cs.title||q.title||''),points:Array.isArray(cs.points)?cs.points.map(String):[]},
      sk:{title:String(sk.title||q.title||''),points:Array.isArray(sk.points)?sk.points.map(String):[]}
    });
  }
  for(const [episode,languages] of Object.entries(data.nonquestions?.episodes||{})){
    const cs=Array.isArray(languages?.cs)?languages.cs:[];
    const sk=Array.isArray(languages?.sk)?languages.sk:[];
    const count=Math.max(cs.length,sk.length);
    for(let i=0;i<count;i++){
      const a=cs[i]||sk[i]||{},b=sk[i]||cs[i]||{};
      items.push({
        id:`n:${episode}:${i}`,type:'nonquestion',episode:Number(episode)||0,order:i,
        seconds:Number(a.seconds??b.seconds)||parseTime(a.time||b.time||'0:00'),
        time:a.sourceTime||a.time||b.sourceTime||b.time||'',
        cs:{title:String(a.title||b.title||''),points:Array.isArray(a.points)?a.points.map(String):[]},
        sk:{title:String(b.title||a.title||''),points:Array.isArray(b.points)?b.points.map(String):[]}
      });
    }
  }
  return items;
}

function makeIndexEntry(item,idx,df,postings,index){
  const title=[item.cs.title,item.sk.title].join(' ');
  const full=[item.cs.title,...item.cs.points,item.sk.title,...item.sk.points].join(' ');
  const titleTerms=extractTerms(title,{query:true});
  const bodyTerms=extractTerms(full);
  const byKey=new Map();
  for(const t of [...titleTerms,...bodyTerms])if(!byKey.has(t.key))byKey.set(t.key,t);
  const terms=[...byKey.values()];
  const termSet=new Set(terms.map(t=>t.key));
  const titleSet=new Set(titleTerms.map(t=>t.key));
  for(const key of termSet){
    df.set(key,(df.get(key)||0)+1);
    if(!postings.has(key))postings.set(key,[]);
    postings.get(key).push(idx);
  }
  const entry={item,title,full,normTitle:norm(title),normFull:norm(full),terms,termSet,titleSet};
  index[idx]=entry;
  return entry;
}
function installIndex(index,df,postings){
  state.index=index;state.df=df;state.postings=postings;state.corpusSize=Math.max(1,index.length);
  rebuildFormIndex(df);
  return state.index;
}
function buildIndex(items){
  const version=++state.buildVersion,df=new Map(),postings=new Map(),index=new Array(items.length);
  items.forEach((item,idx)=>makeIndexEntry(item,idx,df,postings,index));
  if(version!==state.buildVersion)return state.index;
  return installIndex(index,df,postings);
}
function buildIndexAsync(items,onProgress){
  const version=++state.buildVersion,total=items.length,df=new Map(),postings=new Map(),index=new Array(total);let position=0;
  if(onProgress)onProgress(0,total);
  return new Promise((resolve,reject)=>{
    const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
    const step=()=>{
      try{
        if(version!==state.buildVersion){resolve(null);return}
        const started=now();let processed=0;
        while(position<total){
          makeIndexEntry(items[position],position,df,postings,index);position++;processed++;
          if(processed>=32||now()-started>=8)break;
        }
        if(onProgress)onProgress(total?Math.round(position/total*100):100,total);
        if(version!==state.buildVersion){resolve(null);return}
        if(position<total)setTimeout(step,0);else resolve(installIndex(index,df,postings));
      }catch(error){reject(error)}
    };
    setTimeout(step,0);
  });
}
function idf(key){
  const df=state.df.get(key)||0;
  return Math.max(1,Math.min(5.2,Math.log((state.corpusSize+1)/(df+1))+1));
}

const INTENT_IMPORTANCE=new Map([
  ['hmotnost',.95],['trvani',.92],['vzdalenost',.92],['rychlost',.92],['vek',.90],
  ['velikost',.90],['delka',.92],['vyska',.92],['hloubka',.92],['sirka',.92],['plocha',.90],['objem',.90],
  ['teplota',.92],['pocet',.88],['frekvence',.90],['cena',.90],['spotreba',.90],['produkce',.88],
  ['slozeni',.72],['material',.72],['princip',.72],['ucel',.66],['definice',.45],['pricina',.66],['vznik',.70],
  ['poloha',.66],['rozdil',.72],['moznost',.52],['dusledek',.64],['mereni',.68],['vypocet',.68],
  ['nazev',.55],['puvod',.62],['vliv',.68],['metoda',.62]
]);
function queryWeight(term){
  return idf(term.key)*(term.kind==='intent'?(INTENT_IMPORTANCE.get(term.key)??.70):1);
}

function queryCandidates(qTerms,qNorm){
  const ids=new Set();
  const keys=qTerms.map(t=>t.key);
  for(const key of keys){
    for(const id of state.postings.get(key)||[])ids.add(id);
    for(const [related] of semanticGraph.get(key)||[]){
      for(const id of state.postings.get(related)||[])ids.add(id);
    }
    for(const [related] of similarForms(key)){
      for(const id of state.postings.get(related)||[])ids.add(id);
    }
  }

  // Přesná fráze má absolutní prioritu, proto ji dohledáme i mimo postings.
  if(qNorm.length>=3){
    state.index.forEach((e,i)=>{
      if(e.normTitle.includes(qNorm)||e.normFull.includes(qNorm))ids.add(i);
    });
  }

  // U velmi krátkého/obecného dotazu raději zkontrolujeme vše.
  if(!ids.size || ids.size<8){
    for(let i=0;i<state.index.length;i++)ids.add(i);
  }
  return ids;
}

function formScore(qTerms,entry){
  let weighted=0,titleWeighted=0,total=0;const matches=[];
  for(const q of qTerms){
    const qw=queryWeight(q);total+=qw;
    if(q.kind!=='word'||entry.termSet.has(q.key))continue;
    let best=0,bestKey='',bestTitle=0;
    for(const [related,similarity] of similarForms(q.key)){
      if(!entry.termSet.has(related))continue;
      if(similarity>best){best=similarity;bestKey=related;}
      if(entry.titleSet.has(related)&&similarity>bestTitle)bestTitle=similarity;
    }
    if(best){
      weighted+=qw*best*FORM_SIM_WEIGHT;
      if(bestTitle)titleWeighted+=qw*bestTitle*FORM_SIM_WEIGHT;
      matches.push(`${q.label} ~ ${bestKey}`);
    }
  }
  return {score:total?weighted/total:0,titleScore:total?titleWeighted/total:0,matches};
}

function semanticScore(qTerms,entry){
  let weighted=0,total=0;const matches=[];
  for(const q of qTerms){
    const qw=queryWeight(q);total+=qw;
    if(entry.termSet.has(q.key))continue;
    let best=0,bestKey='';
    for(const [related,w] of semanticGraph.get(q.key)||[]){
      if(entry.termSet.has(related)&&w>best){best=w;bestKey=related;}
    }
    if(best){weighted+=qw*best;matches.push(`${q.label} → ${bestKey}`);}
  }
  return {score:total?weighted/total:0,matches};
}

// Quoted phrases act as hard constraints on adjacent words, not as synonyms.
// No quotes => the original search and ranking remain untouched.
// Quotes: adjacent words in the original order, with morphology and synonyms.
const ASK_QUOTE_EQUIVALENTS=[
  ['jadro','stred','centr','nitr'],
  ['zeme','zemi','zemekoul'],
  ['dira','diry','dire','dirou','diram','der','deru','deram']
];
function askQuotedPhrases(query){
  return [...String(query??'').matchAll(/"([^"]+)"|„([^“”]+)[“”]|“([^”]+)”/g)]
    .map(match=>norm(match[1]||match[2]||match[3]).split(' ').filter(Boolean))
    .filter(words=>words.length);
}
function askQuoteWordEquivalent(queryWord,textWord,memo){
  if(queryWord===textWord)return true;
  const id=queryWord+'\u0000'+textWord;
  if(memo.has(id))return memo.get(id);
  const a=canon(queryWord),b=canon(textWord);
  let matches=a===b;
  if(!matches&&!STOP.has(queryWord)&&!STOP.has(textWord)){
    matches=ASK_QUOTE_EQUIVALENTS.some(group=>group.includes(a)&&group.includes(b));
    if(!matches)matches=a.length>=3&&b.length>=3&&
      (semanticGraph.get(a)?.get(b)>=.84||semanticGraph.get(b)?.get(a)>=.84);
    if(!matches)matches=similarForms(a).some(([word,similarity])=>word===b&&similarity>=.80);
    // Permit conservative grammatical suffix variations, not loose substring matches.
    if(!matches&&a.length>=4&&b.length>=4){
      let prefix=0;
      while(prefix<Math.min(a.length,b.length)&&a[prefix]===b[prefix])prefix++;
      matches=prefix>=3&&a.length-prefix<=2&&b.length-prefix<=2;
    }
  }
  memo.set(id,matches);
  return matches;
}
function askMatchesAllQuotedPhrases(item,phrases,memo){
  if(!phrases.length)return true;
  const fields=[item.cs?.title,...(item.cs?.points||[]),item.sk?.title,...(item.sk?.points||[])];
  const tokens=fields.filter(Boolean).map(field=>norm(field).split(' ').filter(Boolean));
  return phrases.every(phrase=>tokens.some(words=>{
    if(words.length<phrase.length)return false;
    for(let offset=0;offset<=words.length-phrase.length;offset++){
      let matched=true;
      for(let i=0;i<phrase.length;i++){
        if(!askQuoteWordEquivalent(phrase[i],words[offset+i],memo)){matched=false;break;}
      }
      if(matched)return true;
    }
    return false;
  }));
}
function rank(query){
  const quotedPhrases=askQuotedPhrases(query);
  const qNorm=norm(query);
  if(!qNorm)return[];
  const qTerms=extractTerms(query,{query:true});
  if(!qTerms.length)return[];
  // Only quoted searches scan all entries; plain searches remain unchanged.
  const candidates=quotedPhrases.length?new Set(state.index.map((_,i)=>i)):queryCandidates(qTerms,qNorm);
  const quoteMemo=quotedPhrases.length?new Map():null;
  const qWeightTotal=qTerms.reduce((s,t)=>s+queryWeight(t),0)||1;
  const results=[];

  for(const idx of candidates){
    const entry=state.index[idx],item=entry.item;
    if(state.filter!=='all'&&item.type!==state.filter)continue;
    // Phrase must occur in one title or one bullet, not across bullet boundaries.
    if(quotedPhrases.length&&!askMatchesAllQuotedPhrases(item,quotedPhrases,quoteMemo))continue;

    const exactTitle=entry.normTitle.includes(qNorm);
    const exactAny=entry.normFull.includes(qNorm);
    let directWeight=0,titleWeight=0,directCount=0;
    const matched=[];
    for(const q of qTerms){
      const w=queryWeight(q);
      if(entry.termSet.has(q.key)){
        directWeight+=w;directCount++;matched.push(q.label);
        if(entry.titleSet.has(q.key))titleWeight+=w;
      }
    }
    const coverage=directWeight/qWeightTotal;
    const titleCoverage=titleWeight/qWeightTotal;
    const form=formScore(qTerms,entry);
    const semantic=semanticScore(qTerms,entry);
    const effectiveCoverage=Math.min(1,coverage+form.score);
    const effectiveTitleCoverage=Math.min(1,titleCoverage+form.titleScore);

    let tier=99,reason='';
    if(exactTitle){tier=0;reason='exact-title';}
    else if(exactAny){tier=1;reason='exact-any';}
    else if(effectiveCoverage>=.78){tier=2;reason='same-meaning';}
    else if(coverage>=.42 && directCount>=1){tier=3;reason='direct';}
    else if(form.score>=.42){tier=4;reason='similar-form';}
    else if(semantic.score>=.42){tier=5;reason='semantic';}
    else if(coverage>=.18 && directCount>=1){tier=6;reason='weak-direct';}
    else if(form.score>=.18){tier=7;reason='similar-form';}
    else if(semantic.score>=.20){tier=8;reason='distant-semantic';}
    // A synonym phrase can match without any literal keyword match.
    if(tier===99&&quotedPhrases.length){tier=5;reason='semantic';}
    if(tier===99)continue;

    let score=.68*effectiveCoverage+.20*effectiveTitleCoverage+.12*semantic.score;
    if(exactAny)score=Math.max(score,.86);
    if(exactTitle)score=Math.max(score,.97);
    if(reason==='same-meaning')score=Math.max(score,.72+.18*effectiveTitleCoverage);
    score=Math.min(1,score);
    results.push({entry,score,tier,reason,coverage,titleCoverage,effectiveCoverage,effectiveTitleCoverage,form,semantic,matchedDirect:[...new Set(matched)]});
  }

  return results.sort((a,b)=>
    a.tier-b.tier || b.score-a.score || b.titleCoverage-a.titleCoverage ||
    b.coverage-a.coverage || b.entry.item.episode-a.entry.item.episode || a.entry.item.order-b.entry.item.order
  );
}

// Same highlighting terms as Berniocal/faq/highlight.js, rendered as escaped HTML.
const formsByKey=new Map();
for(const [canonicalRaw,forms] of MAPS.equivalents||[]){
  const key=canon(canonicalRaw);
  if(!formsByKey.has(key))formsByKey.set(key,new Set());
  const values=formsByKey.get(key);values.add(String(canonicalRaw));
  for(const form of forms||[])values.add(String(form));
}
function highlightKeys(query,result){
  const keys=new Set(),tokens=new Set(),qTerms=extractTerms(query,{query:true});
  for(const q of qTerms){
    if(result.entry.termSet.has(q.key))keys.add(q.key);
    for(const [related] of similarForms(q.key))if(result.entry.termSet.has(related))keys.add(related);
    for(const [related] of semanticGraph.get(q.key)||[])if(result.entry.termSet.has(related))keys.add(related);
  }
  const addToken=token=>{const n=norm(token);if(!n||n.length<2)return;tokens.add(canon(n));tokens.add(n)};
  for(const key of keys){
    addToken(key);
    for(const form of formsByKey.get(key)||[key])for(const token of String(form).match(/[\p{L}\p{N}]+/gu)||[])addToken(token);
  }
  for(const q of qTerms)addToken(q.label);
  // A quoted phrase may match a neighboring synonym or inflected word.
  // Highlight exactly those matching words, without changing normal queries.
  tokens.quotedPhrases=askQuotedPhrases(query);
  return tokens;
}
function highlightText(value,keys){
  const raw=String(value??'');let out='',position=0;
  const quotes=keys.quotedPhrases||[];
  const words=[...raw.matchAll(/[\p{L}\p{N}]+/gu)];
  const quotedIndices=new Set();
  if(quotes.length&&words.length){
    const normalized=words.map(match=>norm(match[0])),memo=new Map();
    for(const phrase of quotes){
      for(let offset=0;offset+phrase.length<=normalized.length;offset++){
        let matched=true;
        for(let i=0;i<phrase.length;i++){
          if(!askQuoteWordEquivalent(phrase[i],normalized[offset+i],memo)){
            matched=false;break;
          }
        }
        if(matched)for(let i=0;i<phrase.length;i++)quotedIndices.add(offset+i);
      }
    }
  }
  for(let i=0;i<words.length;i++){
    const match=words[i],token=match[0];
    if(token.length<2||!(quotedIndices.has(i)||keys.has(canon(token))||keys.has(norm(token))))continue;
    const at=match.index;
    out+=esc(raw.slice(position,at))+'<mark class="vedator-match ask-search-hit">'+esc(token)+'</mark>';
    position=at+token.length;
  }
  return out+esc(raw.slice(position));
}
return {load(data){state.items=flattenData(data);state.index=buildIndex(state.items)},loadAsync(data,onProgress){state.items=flattenData(data);return buildIndexAsync(state.items,onProgress)},search(query,filter='all'){state.filter=filter;return rank(query)},highlightKeys,highlightText};
  }

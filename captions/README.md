# Titulky prvního dílu – doplnění podle nahrávky

První verze vycházela z poškozeného SRT v `Berniocal/vedator-test/titulky` a obsahovala 39 označených mezer a 13 nejasných bloků. Původní SRT zůstává beze změny; jeho původ a hash uchovává `previousSource` v `episode-1.json`.

Nová verze vznikla z úplného nového přepisu původní RSS nahrávky (`podcast_ep1.mp3`, přibližně 20:22,56). Faster Whisper 1.2.1 / CTranslate2 4.9.0, model `large-v3-turbo`, slovenština, CPU int8, beam 5, VAD a slovní časování. Celý výstup má 369 segmentů a 2 837 slov; následovala jazyková redakce celého slovenského znění a český překlad. Text se nedoplňoval pouhým odhadem z okolních vět starého SRT.

- `source/episode-1-asr.sk.json`: úplný nezkrácený nový strojový přepis včetně slovních časů, pravděpodobností a hashe nahrávky.
- `episode-1.json`: 272 upravených dvojjazyčných titulků pro aplikaci, původ, hash zdrojového přepisu a návaznost na všechna slova ASR (`asrWordRange`, polootevřený interval).
- `episode-1.cs.srt`, `episode-1.sk.srt`: stejné opravené titulky ve standardním SRT formátu.

V původně prázdných místech je nyní text zachycený z nahrávky. Značky chybějících/nejasných úseků a falešné opakování jedné věty jsou odstraněné. Při hudbě nebo pauzách se titulky nezobrazují. Krátké sousední fragmenty jsou sloučené a krátké titulky podle dostupné pauzy chvíli podržené, aby se lépe četly. Základem časování jsou nové slovní značky ASR v časové ose MP3, bez jednotného ručního posunu.

Jde o jazykově zkontrolovaný nový strojový přepis, nikoli o nezávislý lidský poslech celé nahrávky. Drobné chyby rozpoznání nebo časování proto mohou přetrvávat. Historická tvrzení, čísla a zjednodušení mluvčích z roku 2019 nejsou nahrazena současnými údaji ani věcně přepracována. Shoda s YouTube nebyla nezávisle ověřena poslechem.

Web načítá titulky až při otevření příslušného videa a ověřuje HTTP cache, aby se po opravě nenačetl starý soubor. Volba automatického jazyka / češtiny / slovenštiny / vypnutí se pamatuje. Text zůstává mimo iframe pod videem; nativní fullscreen samotného YouTube jej nezahrnuje.

## Přehrávač (16. 11. 2026)

V ostré aplikaci se vlastní titulky při YouTube videu překrývají uvnitř videoplochy; při MP3 zůstávají pod ovládáním. Tlačítko Čtečka zobrazí průběžné titulky na černé obrazovce, návrat je klepnutím nebo klávesou Escape. Prohlížeč se pokusí o skutečný fullscreen, jinak použije překryv. Nativní fullscreen samotného iframe YouTube vlastní titulkovou vrstvu nezahrnuje. Díly 1–4 používají při MP3 původní časové značky bez ručních posunů. Přesné indexy MP3 snímků v `audio-seek-index.json` udržují shodu při vzdáleném přeskoku i obnovení pozice; přibližná Xing tabulka se u těchto nahrávek nepoužije. YouTube si ponechává dosavadní časování.

## Stabilita přehrávání a rozsvícená obrazovka

Inline titulky i čtečka čtou aktuální pozici média; čas nepřičítají podle běhu JavaScriptového časovače. Pauza a změna rychlosti tedy nezavádějí samostatnou titulkovou časovou osu. Chybné MP3 přičítání +2 s u dílu 1 bylo odstraněno.

Při zobrazených titulcích zůstává spuštěná malá tichá MP4 smyčka, která se přesouvá do fullscreen čtečky. Samotné video o velikosti 16 px nevyhovuje velikostní podmínce Chromium VideoWakeLock (20 % plochy okna); proto se vedle něj žádá standardní Screen Wake Lock. Žádost se deduplikuje a zámek se uvolní při skrytí stránky, sbalení/zavření přehrávače či vypnutí titulků. Návrat a uživatelské gesto umožňují obnovení po uvolnění systémem. Pokud API není dostupné nebo systém žádost odmítne, tiché video zůstává jako záloha; skutečné zabránění zhasnutí záleží na prohlížeči a systému.

Produkční service worker zahrnuje titulky a pomocné video do verzované offline cache. Změna titulků i indexu MP3 ovlivní verzi cache.

`tools/test-caption-clock-browser.mjs` a příslušná GitHub Actions kontrola používají původní MP3 dílů 1–4, ověřují titulky na začátku/uprostřed/na konci, vzdálené přeskoky, změnu rychlosti, pauzu, čtečku, zachované YouTube časování a životní cyklus pomocného videa i screen zámku. Test používá skutečný dekodér Chrome a simulovaný Screen Wake Lock; nenahrazuje fyzický test zhasnutí displeje na telefonu ani nezávislý poslech všech titulků.

## Díl 5 – Jak zkoumáme vesmír (16. 11. 2026)

Nový úplný slovenský přepis vznikl z původní MP3 (1 131,23 s; SHA-256 `2008fcfd831b8663cdff193610a31cc240f68a98a7bcd666a9686d960dd14667`) pomocí large-v3-turbo. Všech 2 562 rozpoznaných slov bylo jazykově zkontrolováno a celý obsah přeložen do češtiny. Krátké fragmenty jsou spojené do 226 dvojjazyčných titulků. Starý poškozený SRT se jako text nepřebíral.

Nejisté pasáže znovu rozpoznal samostatný plný model large-v3. Tím byla obnovena i vynechaná oprava jednotek „ne kilometry, ale světelné roky“ a navazující poznámka. Mluvčího historické údaje a přeřeknutí se nepřepisují na jiné věcné tvrzení; při označení supernovy je zachováno vyslovené SN 1977A, rozpoznané oběma ASR a nezávislým akustickým modelem, přestože dříve mluví o datu v roce 1987.

Po redakci byl slovenský text zarovnán znak po znaku slovenským CTC modelem `comodoro/wav2vec2-xls-r-300m-sk-cv8`. Česká verze používá stejné začátky a konce odpovídajících vět. Index MP3 obsahuje přesné pozice snímků i pro díl 5, bez ručního posunu titulků. Po úpravě označených míst nezůstal žádný blok s průměrným skóre zarovnání pod 0,35.

Původní přepis, kontrolní rozpoznání, upravený text i akustický audit jsou uchované v `captions/source/episode-5-*` a `captions/episode-5.edited.json`. Aplikace načítá `captions/episode-5.json`; obě SRT obsahují stejné titulky. Nejde o nezávislý lidský poslech každé věty a lokální chyby rozpoznání nebo zarovnání mohou přetrvávat. Přímé porovnání YouTube zvuku s MP3 nebylo možné kvůli ochraně proti automatickému stahování; testuje se identita videa a vykreslení na jeho časové ose.


## Díl 7 – Vesmírné právo (17. 11. 2026)

Základem je úplný nový slovenský přepis původní RSS MP3 (1 723,115 s; SHA-256 `602a47266a4ceb0bdfe16129fbd65f572387a443c685835cd124b877800145dc`). Všech 3 614 slov ASR má návaznost v upraveném textu. Celé slovenské znění a český překlad byly redakčně přečteny; dvě vynechané řečové pasáže byly obnoveny z nezávislého rozpoznání modelem large-v3. Krátké navazující útržky jsou spojené do 354 dvojjazyčných titulků. Historické údaje, přeřeknutí a vlastní opravy mluvčích zůstávají zachované.

Původní pracovní postup končil chybou na samostatném slově „aj“: skript neoprávněně požadoval nejméně tři znaky pro CTC zarovnání. Oprava dovoluje skutečná krátká slova a zachovává kontroly všech slov, zdrojového hashe, monotonních časů a akustického skóre. Výsledné slovenské titulky jsou zarovnány modelem `comodoro/wav2vec2-xls-r-300m-sk-cv8`; česká verze sdílí stejné časové úseky. Číslovky jsou pro akustický model rozepsané slovy, zatímco viditelné titulky zachovávají číslice. Žádný jednotný ruční posun se nepřidává.

`source/episode-7-extra-checks.sk.json` zachovává prvních 21 nezávislých rozpoznání; `source/episode-7-final-checks.sk.json` dalších osm kontrolních oken (negace, čísla, název výboru, dialogy a nejistá krátká odpověď). `source/episode-7-alignment-checks.sk.json` přidává čtyři širší kontrolní úseky; podle nich bylo vráceno vynechané zopakování otázky a přepracován dialog o raketách. U přibližně 25:06 se nezávislé rozpoznávače neshodují; toto krátké místo zůstává výslovně označené jako nesrozumitelné. Není doplněno odhadem. Nejde o úplný nezávislý lidský poslech každé věty ani přímé akustické porovnání YouTube s MP3.

Aplikace používá `episode-7.json`, jeho české a slovenské SRT mají shodné znění i časování. Původ, upravený text, akustické důkazy a přehled nízkých skóre jsou uchovány vedle výsledku. `tools/validate-episode7-captions.py` kontroluje návaznost všech slov, totožnost upraveného a výsledného textu, audit znaků, shodu obou SRT a přesný snímkový MP3 index. Produkční service worker zahrnuje nový titulkový soubor do verzované offline cache.

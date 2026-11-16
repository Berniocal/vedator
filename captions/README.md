# Titulky prvního dílu – doplnění podle nahrávky

První verze vycházela z poškozeného SRT v `Berniocal/vedator-test/titulky` a obsahovala 39 označených mezer a 13 nejasných bloků. Původní SRT zůstává beze změny; jeho původ a hash uchovává `previousSource` v `episode-1.json`.

Nová verze vznikla z úplného nového přepisu původní RSS nahrávky (`podcast_ep1.mp3`, přibližně 20:22,56). Faster Whisper 1.2.1 / CTranslate2 4.9.0, model `large-v3-turbo`, slovenština, CPU int8, beam 5, VAD a slovní časování. Celý výstup má 369 segmentů a 2 837 slov; následovala jazyková redakce celého slovenského znění a český překlad. Text se nedoplňoval pouhým odhadem z okolních vět starého SRT.

- `source/episode-1-asr.sk.json`: úplný nezkrácený nový strojový přepis včetně slovních časů, pravděpodobností a hashe nahrávky.
- `episode-1.json`: 272 upravených dvojjazyčných titulků pro aplikaci, původ, hash zdrojového přepisu a návaznost na všechna slova ASR (`asrWordRange`, polootevřený interval).
- `episode-1.cs.srt`, `episode-1.sk.srt`: stejné opravené titulky ve standardním SRT formátu.

V původně prázdných místech je nyní text zachycený z nahrávky. Značky chybějících/nejasných úseků a falešné opakování jedné věty jsou odstraněné. Při hudbě nebo pauzách se titulky nezobrazují. Krátké sousední fragmenty jsou sloučené a krátké titulky podle dostupné pauzy chvíli podržené, aby se lépe četly. Základem časování jsou nové slovní značky ASR v časové ose MP3, bez jednotného ručního posunu.

Jde o jazykově zkontrolovaný nový strojový přepis, nikoli o nezávislý lidský poslech celé nahrávky. Drobné chyby rozpoznání nebo časování proto mohou přetrvávat. Historická tvrzení, čísla a zjednodušení mluvčích z roku 2019 nejsou nahrazena současnými údaji ani věcně přepracována. Shoda s YouTube nebyla nezávisle ověřena poslechem.

Web načítá titulky až při otevření příslušného videa a ověřuje HTTP cache, aby se po opravě nenačetl starý soubor. Volba automatického jazyka / češtiny / slovenštiny / vypnutí se pamatuje. Text zůstává mimo iframe pod videem; nativní fullscreen samotného YouTube jej nezahrnuje.

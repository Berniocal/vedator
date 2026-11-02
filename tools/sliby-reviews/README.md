# Průběžné zpracování slibů a nápadů

Tato data a nástroje slouží pouze při přípravě obsahu. Web je za běhu nenačítá.

1. Nejdříve ověř původní RSS GUID, číslo a slovenský SRT v `Berniocal/vedator-test/titulky/` včetně přesného commitu a SHA-256. Přečti celý přepis včetně intra a outra. Díl 361 je FAQ, i když to název neříká; jeho hotové shrnutí se při doplnění slibů neopakuje.
2. Porovnej každý návrh s celým přehledem `sliby/index.html`, včetně `mergedFrom`. Stejný závazek znovu nevytvářej. Stejné obecné téma samo o sobě také není důkazem totožného závazku nebo splnění.
3. Založ `tools/sliby-reviews/N.json` podle 361. Uveď datum čtení, GUID, commit/cestu/hash celého SRT, počet cue, videoID, jazyk a typ titulků, poznámku o časové shodě a přiznaných omezeních. `fullRead:true` znamená skutečně celý přepis. `excluded` zaznamená důvody odmítnutí sporných kandidátů. Uchovej nadsázku, podmínky a nejistotu; scénář reklamy není osobní závazek.
4. `additions` obsahuje český název, `kategorie` (`Sliby` nebo `Návrhy / nápady`), `section` (`episodes` nebo `other`), vysvětlení, důvod zařazení, počáteční/koncové **číslované SRT cue** (`cue`, `endCue`) a `label`. Rozhoduje zamýšlený výstup: konkrétní tematický výklad včetně kratšího návratu patří do Epizod; host bez tématu, samotný formát, praktický úkol, akce či osobní plán do Ostatních. Nová karta je ve výchozím stavu Nesplněno; to zahrnuje nedoložené nebo částečné splnění.
5. `mentions` adresuje existující kartu přesnou dvojicí `candidate` + `tema`; neměň ji kvůli přejmenování. Uveď zdrojové cue, label, českou interpretační `note` a `action:repeat`. Opakované avízo nemění stav. Pouze konkrétní důkaz dovoluje `action:fulfilment` + `status` (Splněno později / Splněno už dříve) a `fulfilmentReason`; důkaz musí pokrývat celý závazek. U nové karty lze doložené splnění ve stejném přepisu uvést objektem `fulfilment` (status, cue, endCue, label, reason). Pro důkazy z jiné epizody nejprve ověř celý příslušný přepis a připrav samostatnou kontrolovanou úpravu; nevkládej falešné zdrojové cue z právě čteného dílu.
6. Spusť z kořene repozitáře:

   ```sh
   node tools/update-sliby-episode.mjs tools/sliby-reviews/N.json /cesta/k/uplnemu.srt
   node tools/test-sliby-episode-update.mjs
   node tools/test-sliby-player.cjs
   node tools/test-sliby-personal-state.cjs
   ```

   Nástroj doplní pouze vložená data, počítadla a aktuální evidenci čtení; zachová HTML, CSS, přehrávač, staré dávky a všechny osobní klíče/aliasy. Časy a citace odvodí ze SRT bez ručního prerollu. Evidence `episodeReviews` se ukládá i při nulovém počtu nálezů. Shodný GUID + SRT hash + review hash je opakovatelný bez změn; jiný přepis nebo pozměněný hotový manifest vyžaduje výslovnou revizi, nikoli tiché přepsání. Sémantickou správnost a duplicity musí posoudit autor, nejsou nahrazené hledáním klíčových slov.
7. Do jednoho PR s dalšími změnami epizody zahrň manifest, sliby a nezbytné zdroje. Vyžaduj zelené **Verify promises report** i **Verify V2 summary PR** na přesném aktuálním head SHA. Teprve potom merge a kontrola navazujícího nasazení. `Ověřit živá produkční data` ověřuje také celý živý `/vedator/sliby/` proti přesnému nasazenému artefaktu. Za dokončené označ až skutečně ověřené nasazení.

Pro výběr práce posuzuj překlad, titulky, shrnutí a sliby odděleně. Hotové shrnutí samo o sobě neuzavírá sliby. Starší souvislé audity (např. 360) mají již evidované úplné čtení a hash v `readingProgress.files`; neopakuj je kvůli chybějícímu novému manifestu. `episodeReviews` eviduje nové průběžné zpracování. Historické mezery mimo rozsah pátečního automatu se touto změnou zpětně neoznačují za vyřešené.

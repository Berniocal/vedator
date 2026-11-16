# Upravené titulky – zkušební díl 1

`episode-1.json` obsahuje ručně jazykově upravenou slovenskou verzi a její český překlad. Obě mají společné původní časování. Zdroj je celý 240blokový SRT ze složky `Berniocal/vedator-test/titulky`; přesná cesta, blob SHA a SHA-256 jsou v JSON.

Jde o pracovní jazykovou redakci strojového přepisu, nikoli o přepis ověřený poslechem. Zkomolená slova, jména, interpunkce a odborné výrazy jsou opravené podle rozpoznatelného kontextu. Nejasné fragmenty jsou označené; chybějící úseky delší než dvě sekundy mají samostatnou značku. Opakování jedné věty ve zdrojových blocích 136–138 bylo nahrazené upozorněním na nejasný úsek. Původní SRT zůstává beze změny.

Historická tvrzení mluvčích, včetně čísel a zjednodušení, nejsou nahrazena dnešními údaji ani věcně přepracována. Text a časování je před označením za plně ověřené titulky nutné porovnat s nahrávkou; samotná jazyková úprava ztracená slova neobnoví.

Web načítá soubor až při otevření příslušného videa. Výběr jazyka je nezávislý na jazyce aplikace, s výchozí automatickou volbou podle aplikace. Vypnutí se pamatuje. Text se zobrazuje mimo iframe přímo pod videem, protože YouTube IFrame API vlastní titulkové soubory nepřijímá. Nativní fullscreen samotného YouTube iframe tento doprovodný text nezahrnuje.

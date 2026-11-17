# Díl 7 – redakční a akustické kontrolní poznámky (pracovní)

> **Nejde o hotové titulky ani dokončenou lidskou kontrolu.** Tento soubor pouze třídí místa vyžadující redakci před vytvořením `episode-7.edited.json` a nasazením na `main`.

- Původní nahrávka: https://mcdn.podbean.com/mf/web/ngcvxz/podcast_ep7.mp3
- SHA-256: `602a47266a4ceb0bdfe16129fbd65f572387a443c685835cd124b877800145dc`
- Délka MP3 podle ASR: 1723.115 s
- 3614 ASR slov, 374 pracovních bloků
- Nezávislý large-v3 audit: 21 oken
- Velmi nízká pravděpodobnost rozpoznání (slova pod 0,35): 41
- Výrazná disproporce délky českého a slovenského bloku (<60 % nebo >155 %): 40
- Mezera mezi ASR slovy delší než 2 s: 7 (ne každá obsahuje řeč)

## Prioritní rizika v českém strojovém překladu

Tyto bloky je třeba překládat z redakčně opravené slovenštiny, nikoli jen automaticky přejmout. Délkový poměr je pouze heuristická pomůcka.

- **Blok 9 (0:43.0):** SK: O ktorom ja neviem nič a ty vieš niečo. Ja viem niečo, áno. Naštudoval som si a pozrel  
  Strojový CS: Já o tom nic nevím a ty něco víš.
- **Blok 15 (1:09.5):** SK: práve.  
  Strojový CS: Přesně tak.
- **Blok 27 (2:07.0):** SK: Môžem dve otázky? Počkaj, len toto dokončím. Veľmi dôležité,  
  Strojový CS: Můžu vám položit dvě otázky?
- **Blok 41 (3:20.1):** SK: nachádza niekto napríklad na mesiaci. Toto je veľmi ťažká otázka, čo si myslí vláda vo  
  Strojový CS: Je to velmi obtížná otázka, co si vláda myslí o
- **Blok 50 (4:05.1):** SK: nejaké sankcie. Zdroj prijomať. Ale  
  Strojový CS: Některé sankce.
- **Blok 62 (5:03.0):** SK: ostatnými krajinami. To bolo aj z dôvodu nejakej národnej bezpečnosti,  
  Strojový CS: A to bylo kvůli národní bezpečnosti.
- **Blok 70 (5:42.3):** SK: vytvorená. Ona má taký zvláštny názov. Ona je Committee  
  Strojový CS: Má tak zvláštní název.
- **Blok 78 (6:24.3):** SK: lietadla, tak je to ešte súčasťou. Je nepísané pravidlo, že tam, kde končí  
  Strojový CS: Je to nepsané pravidlo, že tam, kde končí
- **Blok 81 (6:39.0):** SK: takého... Hovorí sa, že hard law. Vlastne nie je to nikde  
  Strojový CS: Říká se, že je to tvrdý zákon.
- **Blok 84 (6:54.2):** SK: termínov nie je definovaných. Napríklad, čo by si povedal, že kto je astronaut?  
  Strojový CS: Například, kdo je astronaut?
- **Blok 85 (7:00.4):** SK: Niekto, kto sa nachádza na orbite Zeme. No a áno,  
  Strojový CS: Někdo, kdo se nachází v Zemi.
- **Blok 97 (7:57.5):** SK: Američanom po záhradke. Áno, bez toho, aby Američania k tomu mohli niečo povedať. Tak  
  Strojový CS: Ano, bez toho, aby Američané měli co říct.
- **Blok 114 (9:28.4):** SK: to ešte sme v takých tých počiatkoch. Áno, to sme v úplných počiatkoch, že tam sa  
  Strojový CS: Ano, je to úplně začátek.
- **Blok 115 (9:33.6):** SK: povedalo, že čo je tak. Napríklad, čo je tam veľmi zaujímavá povinnosť, tam  
  Strojový CS: Například, co je tam velmi zajímavé,
- **Blok 143 (11:47.0):** SK: ktoré by boli viazané. Dokonca ani Slovenská republika  
  Strojový CS: Ani Slovenská republika.
- **Blok 145 (11:56.4):** SK: Máme záľusk na mesiac? Je to z toho, že presne, výborné si to  
  Strojový CS: Máme zájem o Měsíc?
- **Blok 166 (13:37.9):** SK: k takému utlmeniu  
  Strojový CS: k němu,
- **Blok 174 (14:15.8):** SK: srany, že však aj tak o nič nejde a teraz už vedia, že to môže mať  
  Strojový CS: A teď už ví, že to může mít.
- **Blok 176 (14:25.9):** SK: aj  
  Strojový CS: a
- **Blok 179 (14:37.4):** SK: to nikto ani nevedel predstaviť. Ale výborne na to náražaš a dobre si  
  Strojový CS: Nikdo si to neuvědomil.
- **Blok 211 (17:08.8):** SK: a tieto nové spoločnosti. No a jak môžu spoločnosti vlastne využívať? Ja ti  
  Strojový CS: A jak mohou společnosti vlastně využít?
- **Blok 215 (17:22.0):** SK: To je prvé, čo som chcel povedať. Druhé je, že ja mám pocit, že oni často nechávali  
  Strojový CS: To je první věc, kterou jsem chtěl říct.
- **Blok 216 (17:25.2):** SK: proste zhorieť v atmosfére také tie časti. Že to je zase niečo, áno, že nie, že  
  Strojový CS: že je to něco, že ano, že ne, že je to něco, že je to něco, že je to něco, že je to něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco, co je něco.
- **Blok 217 (17:29.6):** SK: dopadnú do puštia, ale proste, že to je zhorieť. Podľa toho, ktoré to bol štádium tej  
  Strojový CS: Je to spálení, podle toho, jaké bylo to stádium.
- **Blok 222 (17:49.4):** SK: No a teraz sa opýtam za všetkých poslucháčov asi. Keď si postavím na záhrade raketu,  
  Strojový CS: A teď se chci zeptat všech posluchačů.
- **Blok 224 (17:56.6):** SK: No,  
  Strojový CS: Dobře.
- **Blok 227 (18:03.4):** SK: asi by ti niekto potom klopal na dvere. A hlavne, keby staviaš raketu, tak  
  Strojový CS: A hlavně, když postavíš raketu,
- **Blok 258 (20:22.3):** SK: nestal sa  
  Strojový CS: To se nestalo.
- **Blok 282 (21:59.8):** SK: ale  
  Strojový CS: Ale...
- **Blok 288 (22:21.1):** SK: bude to ako priestupok riešené. Takže sme sa nedočkali toho prvého trestného činu.  
  Strojový CS: Takže jsme se nedostali k prvnímu trestnému činu.
- **Blok 291 (22:38.2):** SK: Tak  
  Strojový CS: No tak.
- **Blok 293 (22:44.7):** SK: To, že letí nad Ruskom je zbytočno. To, že letí nad Ruskom, to môžeme dať preč.  
  Strojový CS: Létání nad Ruskem je zbytečné.

**Další konkrétní chyba:** Poslední slovenské `Čaute!` je strojově přeložené jako `Poslouchejte!`; správný ekvivalent je např. `Čau!` nebo `Mějte se!` podle významu a skutečné řeči.

## Místa samostatně kontrolovaná modelem large-v3

Audio okna byla nezávisle znovu rozpoznána; automatický výstup není důkazem správného znění. Úseky s označením `speech-in-ASR-gap` se musí porovnat se zdrojovým přepisem a případnou chybějící řeč doplnit.

- **0:29.5–0:41.5** (timeline-sample): podcastu. Dneska to bude troška vymenené a dneska sa budeš ty pýtať a ja budem sa snažiť ti odpovedať, čo najlepšie budem vedieť, nakoľko je dnes na téma vesmír.
- **7:05.8–7:17.8** (timeline-sample): to je asi taká najjednoduchšia, ale napríklad nikde síce hovoria tie zmluvy, ktoré boli prijaté a aj rôzne iné o tom, že existuje
- **8:15.5–8:19.2** (speech-in-ASR-gap): tieto zmluvy sú, oni majú také
- **9:56.4–10:02.2** (speech-in-ASR-gap): slnko, takže tak.
- **13:21.9–13:25.5** (speech-in-ASR-gap): vlastne tú suverenitu. No a tento
- **14:16.6–14:28.6** (timeline-sample): tak o nič nejde a teraz už vedia, že to môže mať 10 ročia obrovské dôsledky? Určite, má to obrovské dôsledky a hlavne sa začalo aj vlastne skloňovať
- **15:19.5–15:23.8** (low-ASR-confidence): napríklad cez Medzinárodnú desmovú výtež a cez dohody.
- **16:02.8–16:07.1** (low-ASR-confidence): ktoré sa používali na orbitu.
- **16:20.8–16:35.1** (speech-in-ASR-gap;low-ASR-confidence;low-ASR-confidence): Myslím, že Saturn, nespovedané si, Falkon môže byť. Falkony, ale Saturn sa myslím, že chystá. Nie, Saturn je následný. Saturn bola tá stará, myslím, že... Falkon a Falkon Heavy.
- **18:14.1–18:17.8** (speech-in-ASR-gap): susedov, myslím. A si aj si aj
- **18:37.3–18:42.5** (speech-in-ASR-gap;low-ASR-confidence): Ale čo je dôležitejšie pre túto otázku bolo, že
- **19:29.4–19:35.5** (speech-in-ASR-gap;low-ASR-confidence): nabrifovaný doteraz kto bol vysielaný do vesmíru boli
- **21:27.3–21:41.4** (timeline-sample;low-ASR-confidence): tak musia podpísať túto zmluvu a tam si zachovávajú vlastne jurisdikciu nad svojimi občanmi tieto krajiny, ktorých vysielajú. Takže kebyže je to ruská astronautka, aby sa pozrela na americký účet.
- **22:37.6–22:43.4** (speech-in-ASR-gap): ponca. Tak toto je komplikované. Ultimátne, čo je to dôležité?
- **23:13.5–23:17.9** (speech-in-ASR-gap): pod vlajkou USA.
- **24:01.0–24:08.0** (low-ASR-confidence;speech-in-ASR-gap): majú extradičnú dohodu o vydávaní áno, o vydávaní takže keď
- **24:38.9–24:43.1** (low-ASR-confidence): každou krajinou a USA. Á, jasné.
- **24:57.9–25:02.1** (low-ASR-confidence): nemôže dovoliť. Presne tak, presne tak.
- **25:36.2–25:46.7** (low-ASR-confidence;low-ASR-confidence;speech-in-ASR-gap): prvej dohode sa všetky 120 krajín zo 190, ale povedzme, že veľmi veľké jadro medzinárodného spoločnosti.
- **26:29.8–26:33.4** (speech-in-ASR-gap): niečo takéto mohli vlastniť, čo sa týka mesií.
- **28:03.7–28:15.7** (timeline-sample): OK, dobre, máš ešte niečo, čo by si chcel povedať? Myslím si, že zatiaľ všetko. Ďakujeme veľmi pekne za rozhovor tebe, Samuel, a ďakujeme za počúvanie všetkým našim divákom.

## Největší ASR pauzy (prověřit VAD)

- 16:21.8–16:29.4 (7.68 s)
- 15:37.6–15:41.7 (4.11 s)
- 9:57.4–10:01.2 (3.80 s)
- 22:38.6–22:42.4 (3.76 s)
- 28:00.7–28:03.5 (2.81 s)
- 23:14.5–23:16.9 (2.38 s)
- 20:20.3–20:22.3 (2.03 s)

## Vydávací brána

Vydat až po ověření úplného SK textu včetně oprav dialogů, kompletního CZ překladu větu po větě, nuceného CTC zarovnání a nezávislé kontroly nízkých skóre, vygenerování shodných JSON/SRT, MP3 indexu a úspěšných browser/PWA testech. Poslední krok je publikace na `main`, nikoli pouhý výsledek této poznámky.

# Vedátor FAQ – Google Tabulky + lokální AI (Otázky / Neotázky / Oboje)

Tato složka obsahuje **úplnou, rozšířenou verzi** původního uživatelského Apps Scriptu ze souboru „Vložený text.txt“. Původní Google Tabulku ani samotnou webovou aplikaci Vedátor nemění.

## Co dělá

- Při vložení/úpravě otázky do listu **Dotazy**, sloupce A, zpracuje Apps Script automaticky 5 nejlepších shod.
- **Přepínač nad panelem** umožňuje vybrat **Otázky / Neotázky / Oboje**. V režimu Oboje se oba typy kapitol řadí dohromady, podle stejného algoritmu „Zeptej se“. Výběr se ukládá pro celou tabulku a platí pro automatický trigger, ruční zpracování i celý list.
- **Neotázky** se čtou z `content-v2.json → nonquestions.episodes`, včetně všech odrážek, českých a slovenských textů a přímých odkazů `#nonquestion=epizoda:pořadí`. Výsledky neotázek dostanou v tabulce označení **[Neotázka]**.
- Místo starého přibližného porovnávání používá **stejný chytrý vyhledávač jako „Zeptej se“ ve Vedátorovi**: synonyma, skloňování, podobné tvary, české a slovenské texty, **fráze v uvozovkách**.
- Zdrojová databáze se dál aktualizuje z `Berniocal/vedator/content-v2.json` (standardně kontrola jednou za 6 hodin).
- Do skrytého listu **Databáze** ukládá také odrážky shrnutí, proto hledá i v nich.
- Volitelná **lokální AI** v bočním panelu může ručně přerovnat **prvních 30 výsledků**, aniž by přidala jiné. **Pět nejlepších se uloží automaticky rovnou** do listu **Dotazy (B:S)** a **Všechny shody**; nepřepisuje otázku ve sloupci A.
- Tlačítko **Zpracovat celý list** projde všechny vyplněné otázky jednu po druhé, průběžně zapisuje hotové výsledky po dávkách až 5 a zobrazuje průběh. Tlačítko **Zastavit** dokončí aktuální krok a zapíše již vypočítané výsledky.
- Po dokončení dostane každý řádek stav **AI hotovo: otázky**, **AI hotovo: neotázky**, nebo **AI hotovo: oboje**. Při dalším spuštění se přeskočí jen řádky hotové pro **aktuálně vybraný režim**, nikoli pro jiný režim. Staré `AI hotovo` se považuje za hotové pouze pro Otázky. Přepínač „Znovu zpracovat…“ umožňuje projet i hotové řádky.

## Instalace do existující tabulky

Určeno pro [Vedator FAQ](https://docs.google.com/spreadsheets/d/1ByMC28LBMoDD1sJvphKfRa7TtZ5jsFD6g5FX4KiNPMo/edit), která má listy Dotazy, Databáze, Všechny shody, Nastavení.

1. V Google Tabulkách otevřete **Rozšíření → Apps Script**.
2. **Před úpravou si zálohujte dosavadní Code.gs** (nebo vytvořte kopii celého projektu).
3. Nahraďte obsah dosavadního `Code.gs` obsahem zdejšího [Code.gs](./Code.gs).
4. Tlačítkem **+ → Skript** přidejte soubor s názvem `AskEngine` a vložte celý [AskEngine.gs](./AskEngine.gs).
5. Tlačítkem **+ → HTML** přidejte soubor s názvem `Sidebar` a vložte celý [Sidebar.html](./Sidebar.html).
6. Uložte všechny soubory a **obnovte Google Tabulku**.
7. V menu **Vedátor → Nainstalovat automatické zpracování** povolte potřebná oprávnění. Tím se obnoví databáze **otázek i neotázek**, včetně odrážek a typu kapitoly. **Stávající otázky ve sloupci A zůstanou**.
8. Nyní vložení nové otázky do `Dotazy!A2:A` automaticky vytvoří pět shod.
9. V panelu **Vedátor → AI – zpřesnit vybranou otázku** nejprve vyberte, zda se má hledat v **Otázkách**, **Neotázkách**, nebo **Obojím**. Po změně se výběr uloží i pro následné běžné hledání. Pro jednu otázku označte odpovídající řádek v Dotazy.
10. V bočním panelu klikněte na **Stáhnout AI** (přibližně 140 MB). Pro jednu otázku zvolte **Zpřesnit a zapsat do tabulky**; výsledek se **uloží automaticky**, žádné další tlačítko pro zápis není potřeba.
11. Pro hromadné zpracování zvolte **Zpracovat celý list**. Lišta ukazuje postup a řádky se zapisují po nejvýše pěti. Kdykoli můžete kliknout na **Zastavit**; při příštím spuštění se přeskočí jen řádky `AI hotovo` **pro zvolený zdroj**.
12. Chcete-li přepsat i již zpracované otázky, zaškrtněte **Znovu zpracovat i řádky označené „AI hotovo“**.
13. Tlačítko **Vrátit pořadí** u jednotlivé otázky nyní vrací původní řazení **přímo do tabulky**, nikoliv pouze vizuálně v panelu.

## Jak se to chová

**Bez stažené AI:** běží automatické vyhledávání zcela bez AI modelu. Žádné další stahování, žádný placený API klíč.

**Se staženou AI:** po ručním spuštění se malý model `Xenova/multilingual-e5-small` pokusí v prohlížeči porovnat dotaz a text nejlepších 30 nalezených kapitol (z Otázek, Neotázek nebo obou zdrojů, podle přepínače; titulky plus až tři relevantní odrážky). Po úspěchu je výsledek **automaticky zapsán do tabulky**. Celý list se zpracovává postupně; při selhání AI se původní výsledky a data nepoškozují, neúspěšné řádky lze vyzkoušet znovu.

**Uvozovky:** `"jádro Země"` vyžaduje slova vedle sebe, ale uznává také příslušné tvary a významové ekvivalenty (např. střed Země).

**Zachování dat:** původní listy, rozložení pěti shod, odkazy, ruční volby menu a upravovací trigger zůstávají. Ve skryté databázi přibudou dvě pole pro odrážky CZ/SK a sloupec s typem kapitoly; existující rozložení listu Dotazy se nemění. Procenta jsou výsledkem vyhledávacího algoritmu, **nikoli kalibrovaná pravděpodobnost správnosti**.

**Aktualizace již existující instalace:** nahraďte novými verzemi soubory `Code.gs` a `Sidebar.html`. `AskEngine.gs` můžete ponechat, pokud již používáte stejnou verzi z této složky. Pak spusťte **Vedátor → Obnovit databázi z GitHubu**, aby se stáhly i neotázky. U staršího skrytého listu proběhne migrace automaticky při dalším zpracování, je-li dostupný GitHub.

## Zrychlení vyhledávání a AI

- Model stále vyhodnocuje nejvýše **30 původních kandidátů** a používá stejné váhy hodnocení, ale počítá embeddingy v dávkách **po osmi** místo po třech. To snižuje režii opakovaného volání ONNX/WASM.
- Jednou vypočtené vektory dotazů i vybraných kapitol se **znovu používají** při dalších řádcích. Paměť je omezená a průběžně se uvolňuje.
- Při ukládání výsledků se nejlepších 30 kandidátů krátkodobě uchovává (do 15 minut) v uživatelské mezipaměti Apps Scriptu. Uložení pak nemusí opět sestavovat celý vyhledávací index. Při chybě či nedostupné mezipaměti se použije původní spolehlivé vyhledání.
- Pokud v tabulce není právě vybraný vyplněný řádek, panel neukazuje červenou chybu; lze rovnou spustit **Zpracovat celý list**.
- Skutečná rychlost záleží na zařízení a dostupnosti WebAssembly; první inicializace modelu může být pomalejší. Při opakovaných tématech bývá větší přínos díky znovupoužití vektorů.

## Technická omezení

Boční panel Apps Scriptu běží ve **zabezpečeném iframe Google**. Není zaručeno, že konkrétní prohlížeč povolí WebAssembly, velký model a dlouhodobé uložení v Cache Storage. **Hromadné zpracování probíhá jen při otevřeném bočním panelu a zapnutém prohlížeči**; nejedná se o serverový automat běžící na pozadí. U velkého seznamu otázek může trvat dlouho. Po každé dávce se změny ukládají a později lze navázat. Tato část byla ověřena **syntakticky**, ale **nebyla spuštěna ve skutečném Google Sheets iframe**. V takovém případě zůstává chytré vyhledávání a automatický výstup funkční; volitelná AI vypíše chybu. Model z mobilního Vedátora se do prostředí Google Tabulek automaticky nepřenáší.

Otázky a výsledky se kvůli AI neposílají do žádného generativního API. Stažení samotného modelu probíhá přes Hugging Face/CDN. Automat Apps Script běží na infrastruktuře Google a čte veřejnou databázi GitHub.

## Soubory

- [Code.gs](./Code.gs) — původní automat + nové propojení a bezpečné ukládání AI pořadí
- [AskEngine.gs](./AskEngine.gs) — oddělená kopie vyhledávače „Zeptej se“
- [Sidebar.html](./Sidebar.html) — volitelný panel pro ruční spuštění lokální AI

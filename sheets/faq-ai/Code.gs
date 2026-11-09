/**
 * Vedátor – automatické hledání podobných již zodpovězených otázek
 *
 * Postup:
 * 1. Nahrajte přiloženou šablonu do Google Tabulek.
 * 2. Rozšíření → Apps Script → vložte Code.gs a AskEngine.gs, přidejte Sidebar.html.
 * 3. Uložte projekt a obnovte tabulku.
 * 4. V menu „Vedátor“ zvolte „Nainstalovat automatické zpracování“.
 * 5. Otázky vkládejte do listu Dotazy, sloupce A od řádku 2.
 */

const CFG = Object.freeze({
  INPUT_SHEET: 'Dotazy',
  ALL_MATCHES_SHEET: 'Všechny shody',
  SETTINGS_SHEET: 'Nastavení',
  DATABASE_SHEET: 'Databáze',
  TOP_N: 5,
  AI_RERANK_N: 30,
  REPO: 'Berniocal/vedator',
  BRANCH: 'main',
  PUBLIC_BASE: 'https://bernio.cz/vedator/',
  DATABASE_CHECK_HOURS: 6,
  V2_DATABASE_FILE: 'content-v2.json',
  OUTPUT_START_COLUMN: 2,
  OUTPUT_COLUMN_COUNT: 18,
  PROP_SIGNATURE: 'VEDATOR_DB_SIGNATURE_V1',
  PROP_CHECKED_AT: 'VEDATOR_DB_CHECKED_AT_V1'
});

const INPUT_HEADERS = [
  'Otázka posluchače', 'Stav',
  '1. shoda', '1. podobná otázka', '1. odkaz',
  '2. shoda', '2. podobná otázka', '2. odkaz',
  '3. shoda', '3. podobná otázka', '3. odkaz',
  '4. shoda', '4. podobná otázka', '4. odkaz',
  '5. shoda', '5. podobná otázka', '5. odkaz',
  'Společné pojmy (1. shoda)', 'Zpracováno'
];

const ALL_MATCH_HEADERS = [
  'Řádek dotazu', 'Otázka posluchače', 'Pořadí', 'Shoda',
  'Podobná otázka', 'Společné pojmy', 'Díl', 'Čas', 'Odkaz',
  'Pojmy položené otázky', 'Pojmy nalezené otázky'
];

const DB_HEADERS = ['Díl', 'Pořadí', 'Čas', 'Sekundy odkazu', 'Otázka česky', 'Otázka slovensky', 'Odkaz', 'Zdroj', 'Odrážky CZ (JSON)', 'Odrážky SK (JSON)'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Vedátor')
    .addItem('Nainstalovat automatické zpracování', 'nainstalovat')
    .addItem('Zpracovat všechny otázky', 'zpracovatVsechnyDotazy')
    .addItem('Zpracovat vybrané řádky', 'zpracovatVybraneRadky')
    .addItem('AI – zpřesnit vybranou otázku', 'otevritAiPanel')
    .addSeparator()
    .addItem('Obnovit databázi z GitHubu', 'obnovitDatabazi')
    .addItem('Připravit / opravit listy', 'pripravitTabulku')
    .addToUi();
}

function nainstalovat() {
  pripravitTabulku();
  const spreadsheet = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'priUprave')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('priUprave').forSpreadsheet(spreadsheet).onEdit().create();
  obnovitDatabazi();
  SpreadsheetApp.getUi().alert(
    'Hotovo',
    'Automatické zpracování je nainstalované. Otázky vkládejte do listu „Dotazy“, sloupce A od řádku 2.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function pripravitTabulku() {
  const ss = SpreadsheetApp.getActive();
  const input = getOrCreateSheet_(ss, CFG.INPUT_SHEET);
  const all = getOrCreateSheet_(ss, CFG.ALL_MATCHES_SHEET);
  const settings = getOrCreateSheet_(ss, CFG.SETTINGS_SHEET);
  const database = getOrCreateSheet_(ss, CFG.DATABASE_SHEET);

  ensureSize_(input, 1000, INPUT_HEADERS.length);
  input.getRange(1, 1, 1, INPUT_HEADERS.length).setValues([INPUT_HEADERS]);
  styleHeader_(input.getRange(1, 1, 1, INPUT_HEADERS.length));
  input.setFrozenRows(1);
  input.setFrozenColumns(1);
  input.setColumnWidth(1, 360);
  input.setColumnWidth(2, 110);
  [3, 6, 9, 12, 15].forEach(col => input.setColumnWidth(col, 85));
  [4, 7, 10, 13, 16].forEach(col => input.setColumnWidth(col, 300));
  [5, 8, 11, 14, 17].forEach(col => input.setColumnWidth(col, 165));
  input.setColumnWidth(18, 260);
  input.setColumnWidth(19, 145);
  input.getRange(2, 1, input.getMaxRows() - 1, INPUT_HEADERS.length)
    .setVerticalAlignment('top')
    .setWrap(true);
  [3, 6, 9, 12, 15].forEach(col => {
    input.getRange(2, col, input.getMaxRows() - 1, 1).setNumberFormat('0.0%');
  });
  setScoreConditionalFormatting_(input);
  if (!input.getFilter()) input.getRange(1, 1, input.getMaxRows(), INPUT_HEADERS.length).createFilter();

  ensureSize_(all, 1000, ALL_MATCH_HEADERS.length);
  all.getRange(1, 1, 1, ALL_MATCH_HEADERS.length).setValues([ALL_MATCH_HEADERS]);
  styleHeader_(all.getRange(1, 1, 1, ALL_MATCH_HEADERS.length));
  all.setFrozenRows(1);
  all.setColumnWidth(1, 95);
  all.setColumnWidth(2, 360);
  all.setColumnWidth(3, 70);
  all.setColumnWidth(4, 90);
  all.setColumnWidth(5, 330);
  all.setColumnWidth(6, 250);
  all.setColumnWidth(7, 70);
  all.setColumnWidth(8, 80);
  all.setColumnWidth(9, 170);
  all.setColumnWidth(10, 130);
  all.setColumnWidth(11, 140);
  all.getRange(2, 4, all.getMaxRows() - 1, 1).setNumberFormat('0.0%');
  all.getRange(2, 1, all.getMaxRows() - 1, ALL_MATCH_HEADERS.length).setVerticalAlignment('top').setWrap(true);
  if (!all.getFilter()) all.getRange(1, 1, all.getMaxRows(), ALL_MATCH_HEADERS.length).createFilter();

  settings.clear();
  settings.getRange('A1:B1').setValues([['Nastavení', 'Hodnota']]);
  styleHeader_(settings.getRange('A1:B1'));
  settings.getRange('A2:B9').setValues([
    ['Počet nejlepších výsledků', CFG.TOP_N],
    ['Zdroj otázek', 'GitHub: ' + CFG.REPO],
    ['Kontrola nových souborů', 'nejvýše jednou za ' + CFG.DATABASE_CHECK_HOURS + ' hodin'],
    ['Vstupní list', CFG.INPUT_SHEET + ' – sloupec A od řádku 2'],
    ['Automatické spuštění', 'po vložení / úpravě otázky v sloupci A'],
    ['Ruční spuštění', 'menu Vedátor → Zpracovat všechny otázky'],
    ['Význam procenta', 'odborné a věcné pojmy mají přednost; dále se hodnotí délka, pořadí a rozestupy'],
    ['Poznámka', 'Obecná přídavná jména zůstávají, ale mají menší váhu než věcné pojmy. Skloňování, množné číslo a odvozená přídavná jména se sjednocují.']
  ]);
  settings.setColumnWidth(1, 220);
  settings.setColumnWidth(2, 560);
  settings.getRange('A1:B20').setWrap(true).setVerticalAlignment('top');
  settings.setFrozenRows(1);

  // Stará tabulka mohla mít jen 8 sloupců databáze; nové 2 jsou odrážky.
  ensureSize_(database, 1, DB_HEADERS.length);
  if (database.getLastRow() === 0) database.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS]);
  styleHeader_(database.getRange(1, 1, 1, DB_HEADERS.length));
  database.hideSheet();

  ss.setActiveSheet(input);
  ss.toast('Listy jsou připravené.', 'Vedátor', 4);
}

function priUprave(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CFG.INPUT_SHEET) return;
  if (e.range.getColumn() > 1 || e.range.getLastColumn() < 1) return;
  const startRow = Math.max(2, e.range.getRow());
  const endRow = e.range.getLastRow();
  if (endRow < 2) return;

  const values = sheet.getRange(startRow, 1, endRow - startRow + 1, 1).getDisplayValues();
  const rows = [];
  const blankRows = [];
  values.forEach((row, index) => {
    const actualRow = startRow + index;
    if (String(row[0] || '').trim()) rows.push(actualRow);
    else blankRows.push(actualRow);
  });
  clearOutputRows_(sheet, blankRows);
  if (rows.length) zpracujRadky_(rows);
}

function zpracovatVsechnyDotazy() {
  pripravitTabulku();
  const sheet = SpreadsheetApp.getActive().getSheetByName(CFG.INPUT_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const rows = [];
  values.forEach((row, index) => {
    if (String(row[0] || '').trim()) rows.push(index + 2);
  });
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('Ve sloupci A nejsou žádné otázky.');
    return;
  }
  zpracujRadky_(rows);
}

function zpracovatVybraneRadky() {
  pripravitTabulku();
  const range = SpreadsheetApp.getActiveRange();
  if (!range || range.getSheet().getName() !== CFG.INPUT_SHEET) {
    SpreadsheetApp.getUi().alert('Nejdřív vyberte řádky v listu „Dotazy“.');
    return;
  }
  const sheet = range.getSheet();
  const rows = [];
  const start = Math.max(2, range.getRow());
  const end = range.getLastRow();
  if (end >= start) {
    const values = sheet.getRange(start, 1, end - start + 1, 1).getDisplayValues();
    values.forEach((row, index) => {
      if (String(row[0] || '').trim()) rows.push(start + index);
    });
  }
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('Ve vybraných řádcích nejsou žádné otázky.');
    return;
  }
  zpracujRadky_(rows);
}

function obnovitDatabazi() {
  pripravitTabulku();
  const ss = SpreadsheetApp.getActive();
  ss.toast('Stahuji aktuální databázi otázek…', 'Vedátor', 8);
  const rows = nactiDatabazi_(true);
  ss.toast('Databáze je připravená: ' + rows.length + ' otázek.', 'Vedátor', 6);
}

function zpracujRadky_(rows) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getActive().toast('Právě probíhá jiné zpracování. Zkuste to za chvíli.', 'Vedátor', 6);
    return;
  }
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(CFG.INPUT_SHEET);
    const uniqueRows = [...new Set(rows)].sort((a, b) => a - b);
    uniqueRows.forEach(row => sheet.getRange(row, 2).setValue('Zpracovávám…'));
    SpreadsheetApp.flush();

    const database = nactiDatabazi_(false);
    const index = vedatorPripravAskIndex_(database);
    const processed = [];

    uniqueRows.forEach(rowNumber => {
      const query = String(sheet.getRange(rowNumber, 1).getDisplayValue() || '').trim();
      if (!query) {
        clearOutputRows_(sheet, [rowNumber]);
        return;
      }
      const matches = vedatorSeradAsk_(query, index, CFG.TOP_N);
      processed.push({rowNumber, query, matches});
    });

    zapisVysledky_(sheet, processed);
    aktualizujVsechnyShody_(processed);
    ss.toast('Zpracováno ' + processed.length + ' otázek.', 'Vedátor', 5);
  } catch (error) {
    console.error(error);
    SpreadsheetApp.getActive().toast('Chyba: ' + error.message, 'Vedátor', 10);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function zapisVysledky_(sheet, processed) {
  const now = new Date();
  processed.forEach(item => {
    const row = new Array(CFG.OUTPUT_COLUMN_COUNT).fill('');
    row[0] = 'Hotovo';
    for (let i = 0; i < CFG.TOP_N; i++) {
      const result = item.matches[i];
      if (!result) continue;
      const offset = 1 + i * 3;
      row[offset] = result.score;
      row[offset + 1] = result.title;
      row[offset + 2] = result.url;
    }
    row[16] = item.matches[0] ? item.matches[0].matchedLabels.join(', ') : '';
    row[17] = now;
    sheet.getRange(item.rowNumber, CFG.OUTPUT_START_COLUMN, 1, CFG.OUTPUT_COLUMN_COUNT).setValues([row]);
  });
  [3, 6, 9, 12, 15].forEach(col => sheet.getRange(2, col, Math.max(1, sheet.getLastRow() - 1), 1).setNumberFormat('0.0%'));
  sheet.getRange(2, 19, Math.max(1, sheet.getLastRow() - 1), 1).setNumberFormat('d. m. yyyy HH:mm');
}

function aktualizujVsechnyShody_(processed) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CFG.ALL_MATCHES_SHEET);
  const replacedRows = new Set(processed.map(item => item.rowNumber));
  let existing = [];
  if (sheet.getLastRow() >= 2) {
    existing = sheet.getRange(2, 1, sheet.getLastRow() - 1, ALL_MATCH_HEADERS.length).getValues()
      .filter(row => row[0] && !replacedRows.has(Number(row[0])));
  }
  const additions = [];
  processed.forEach(item => {
    item.matches.forEach((result, index) => {
      additions.push([
        item.rowNumber,
        item.query,
        index + 1,
        result.score,
        result.title,
        result.matchedLabels.join(', '),
        result.episode,
        result.time,
        result.url,
        result.queryCount,
        result.candidateCount
      ]);
    });
  });
  const rows = existing.concat(additions).sort((a, b) => Number(b[3]) - Number(a[3]) || Number(a[0]) - Number(b[0]) || Number(a[2]) - Number(b[2]));
  const maxDataRows = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, 1, maxDataRows, ALL_MATCH_HEADERS.length).clearContent();
  if (rows.length) {
    ensureSize_(sheet, rows.length + 1, ALL_MATCH_HEADERS.length);
    sheet.getRange(2, 1, rows.length, ALL_MATCH_HEADERS.length).setValues(rows);
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat('0.0%');
  }
}

function clearOutputRows_(sheet, rows) {
  rows.forEach(row => {
    if (row >= 2) sheet.getRange(row, CFG.OUTPUT_START_COLUMN, 1, CFG.OUTPUT_COLUMN_COUNT).clearContent();
  });
}

// -----------------------------------------------------------------------------
// Databáze otázek z GitHubu
// -----------------------------------------------------------------------------

function nactiDatabazi_(forceRefresh) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(CFG.DATABASE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CFG.DATABASE_SHEET);
    sheet.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS]);
    sheet.hideSheet();
  }
  let localRows = readDatabaseSheet_(sheet);
  const props = PropertiesService.getDocumentProperties();
  const now = Date.now();
  const lastChecked = Number(props.getProperty(CFG.PROP_CHECKED_AT) || 0);
  let sourceInfo = null;
  let mustRefresh = Boolean(forceRefresh) || localRows.length === 0;

  if (!mustRefresh && now - lastChecked >= CFG.DATABASE_CHECK_HOURS * 3600000) {
    try {
      sourceInfo = fetchCurrentDatabaseInfo_();
      props.setProperty(CFG.PROP_CHECKED_AT, String(now));
      mustRefresh = sourceInfo.signature !== (props.getProperty(CFG.PROP_SIGNATURE) || '');
    } catch (error) {
      console.warn('Kontrola změn databáze selhala, používám uloženou kopii.', error);
    }
  }

  if (mustRefresh) {
    try {
      sourceInfo = sourceInfo || fetchCurrentDatabaseInfo_();
      if (sourceInfo.kind !== 'v2') {
        throw new Error('Tabulka otázek odmítla jiný zdroj než content-v2.json.');
      }
      const freshRows = downloadV2Database_(sourceInfo);
      if (!freshRows.length) throw new Error('V repozitáři nebyly nalezeny žádné otázky.');
      writeDatabaseSheet_(sheet, freshRows);
      props.setProperty(CFG.PROP_SIGNATURE, sourceInfo.signature);
      props.setProperty(CFG.PROP_CHECKED_AT, String(now));
      localRows = freshRows;
    } catch (error) {
      if (!localRows.length) throw error;
      console.warn('Aktualizace databáze selhala, používám uloženou kopii.', error);
    }
  }
  return localRows;
}

function readDatabaseSheet_(sheet) {
  ensureSize_(sheet, 1, DB_HEADERS.length);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, DB_HEADERS.length).getValues()
    .filter(row => Number(row[0]) && String(row[4] || row[5] || '').trim())
    .map(row => ({
      episode: Number(row[0]),
      order: Number(row[1]),
      time: String(row[2] || ''),
      linkSeconds: Number(row[3]) || 0,
      cs: String(row[4] || ''),
      sk: String(row[5] || ''),
      url: String(row[6] || ''),
      source: String(row[7] || ''),
      csPoints: vedatorParsePoints_(row[8]),
      skPoints: vedatorParsePoints_(row[9])
    }));
}

function writeDatabaseSheet_(sheet, rows) {
  sheet.showSheet();
  sheet.clearContents();
  sheet.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS]);
  styleHeader_(sheet.getRange(1, 1, 1, DB_HEADERS.length));
  ensureSize_(sheet, rows.length + 1, DB_HEADERS.length);
  const values = rows.map(item => [item.episode, item.order, item.time, item.linkSeconds, item.cs, item.sk, item.url, item.source, JSON.stringify(item.csPoints || []), JSON.stringify(item.skPoints || [])]);
  sheet.getRange(2, 1, values.length, DB_HEADERS.length).setValues(values);
  sheet.hideSheet();
}


function fetchCurrentDatabaseInfo_() {
  return fetchV2DatabaseInfo_();
}

function fetchV2DatabaseInfo_() {
  const url = 'https://api.github.com/repos/' + CFG.REPO + '/contents/' +
    encodeURIComponent(CFG.V2_DATABASE_FILE) + '?ref=' + encodeURIComponent(CFG.BRANCH);
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {Accept: 'application/vnd.github+json'}
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('V2 databáze není dostupná (GitHub ' + response.getResponseCode() + ').');
  }
  const payload = JSON.parse(response.getContentText());
  if (!payload || !payload.sha) throw new Error('GitHub neposlal SHA V2 databáze.');
  return {
    kind: 'v2',
    signature: CFG.V2_DATABASE_FILE + ':' + String(payload.sha),
    downloadUrl: String(payload.download_url || '')
  };
}

function downloadV2Database_(info) {
  const url = info.downloadUrl ||
    ('https://raw.githubusercontent.com/' + CFG.REPO + '/' + CFG.BRANCH + '/' + CFG.V2_DATABASE_FILE);
  const response = UrlFetchApp.fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), {
    muteHttpExceptions: true,
    headers: {Accept: 'application/json'}
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Stažení V2 databáze selhalo (HTTP ' + response.getResponseCode() + ').');
  }
  const data = JSON.parse(response.getContentText());
  const questions = Array.isArray(data && data.questions) ? data.questions : [];
  const rows = questions.map(item => {
    const episode = Number(item && item.episode) || 0;
    const order = Number(item && item.order) || 0;
    const linkSeconds = Math.max(0, Math.floor(Number(item && item.seconds) || 0));
    const sourceTime = String((item && (item.sourceTime || item.time)) || formatSeconds_(linkSeconds + 5));
    const cs = String((item && item.i18n && item.i18n.cs && item.i18n.cs.title) || (item && item.title) || '');
    const sk = String((item && item.i18n && item.i18n.sk && item.i18n.sk.title) || (item && item.title) || '');
    const csPoints = (item && item.i18n && item.i18n.cs && item.i18n.cs.points) || [];
    const skPoints = (item && item.i18n && item.i18n.sk && item.i18n.sk.points) || [];
    return {
      episode,
      order,
      time: sourceTime,
      linkSeconds,
      cs,
      sk,
      csPoints: Array.isArray(csPoints) ? csPoints.map(String) : [],
      skPoints: Array.isArray(skPoints) ? skPoints.map(String) : [],
      url: directQuestionUrl_(episode, linkSeconds),
      source: CFG.V2_DATABASE_FILE
    };
  }).filter(item => item.episode && (item.cs || item.sk));

  rows.sort((a, b) => b.episode - a.episode || a.order - b.order || a.linkSeconds - b.linkSeconds);
  return rows;
}

function fetchRepositoryTree_() {
  const url = 'https://api.github.com/repos/' + CFG.REPO + '/git/trees/' + encodeURIComponent(CFG.BRANCH) + '?recursive=1';
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {Accept: 'application/vnd.github+json'}
  });
  if (response.getResponseCode() !== 200) throw new Error('GitHub API vrátilo stav ' + response.getResponseCode() + '.');
  const payload = JSON.parse(response.getContentText());
  if (!Array.isArray(payload.tree)) throw new Error('GitHub neposlal seznam souborů.');
  const files = payload.tree
    .filter(item => item && item.type === 'blob' && (
      /(?:^|\/)episode-\d+(?:-\d+)*-(?:summary|chapters)\.js$/i.test(item.path) ||
      /(?:^|\/)question-translations[^/]*\.js$/i.test(item.path)
    ))
    .map(item => ({path: item.path, sha: String(item.sha || '')}))
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    files,
    signature: files.map(item => item.path + ':' + item.sha).join('|')
  };
}

function downloadDatabase_(treeInfo) {
  const paths = treeInfo.files.map(item => item.path);
  const fetched = fetchFiles_(paths);
  const translations = new Map();
  fetched.forEach(file => {
    if (file.text && /^question-translations/i.test(baseName_(file.path))) parseTranslationPairs_(file.text, translations);
  });

  const candidates = [];
  fetched.forEach(file => {
    if (!file.text || !/^episode-/i.test(baseName_(file.path))) return;
    const kind = /-summary\.js$/i.test(baseName_(file.path)) ? 'summary' : 'chapter';
    const bilingual = kind === 'summary' ? parseBilingualData_(file.path, file.text) : [];
    if (bilingual.length) {
      bilingual.forEach(item => candidates.push(Object.assign(item, {kind})));
      return;
    }
    if (kind === 'chapter') {
      const grouped = parseChapterGroups_(file.path, file.text);
      if (grouped.length) {
        grouped.forEach(item => candidates.push(Object.assign(item, {kind})));
        return;
      }
    }
    parseGenericQuestions_(file.path, file.text).forEach(item => candidates.push(Object.assign(item, {kind})));
  });

  const selected = selectBestSources_(candidates);
  const rows = selected.map(item => {
    let cs = String(item.cs || '');
    let sk = String(item.sk || '');
    if (!cs && !sk) {
      const langs = chooseLanguages_(item.title, translations);
      cs = langs.cs;
      sk = langs.sk;
    }
    const linkSeconds = Number.isFinite(Number(item.linkSeconds)) ? Number(item.linkSeconds) : Math.max(0, toSeconds_(item.time) - 5);
    return {
      episode: Number(item.episode),
      order: 0,
      time: String(item.time || ''),
      linkSeconds,
      cs: cs || item.title || sk,
      sk,
      url: directQuestionUrl_(item.episode, linkSeconds),
      source: item.source
    };
  }).filter(item => item.episode && (item.cs || item.sk));

  rows.sort((a, b) => b.episode - a.episode || toSeconds_(a.time) - toSeconds_(b.time) || a.cs.localeCompare(b.cs, 'cs'));
  const countByEpisode = new Map();
  rows.forEach(item => {
    const order = (countByEpisode.get(item.episode) || 0) + 1;
    countByEpisode.set(item.episode, order);
    item.order = order;
  });
  return rows;
}

function fetchFiles_(paths) {
  const rawBase = 'https://raw.githubusercontent.com/' + CFG.REPO + '/' + CFG.BRANCH + '/';
  const results = [];
  const batchSize = 40;
  for (let start = 0; start < paths.length; start += batchSize) {
    const batch = paths.slice(start, start + batchSize);
    const requests = batch.map(path => ({
      url: rawBase + path + '?v=' + Date.now(),
      muteHttpExceptions: true,
      headers: {Accept: 'text/plain'}
    }));
    const responses = UrlFetchApp.fetchAll(requests);
    responses.forEach((response, index) => {
      const code = response.getResponseCode();
      results.push({path: batch[index], text: code >= 200 && code < 300 ? response.getContentText() : ''});
    });
  }
  return results;
}

const JS_STRING_TOKEN_ = "(?:'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\")";

function parseTranslationPairs_(source, translations) {
  const regex = new RegExp('\\[\\s*(' + JS_STRING_TOKEN_ + ')\\s*,\\s*(' + JS_STRING_TOKEN_ + ')\\s*\\]', 'g');
  let match;
  while ((match = regex.exec(source))) {
    const a = decodeJsString_(match[1]).trim();
    const b = decodeJsString_(match[2]).trim();
    if (!a || !b) continue;
    const pair = {a, b};
    translations.set(norm_(a), pair);
    translations.set(norm_(b), pair);
  }
}

function parseBilingualData_(path, source) {
  const marker = source.search(/\b(?:const|let|var)\s+DATA\s*=\s*\{/);
  if (marker < 0) return [];
  const open = source.indexOf('{', marker);
  const end = matchingObject_(source, open);
  if (open < 0 || end < 0) return [];
  let data;
  try {
    data = JSON.parse(source.slice(open, end + 1));
  } catch (error) {
    return [];
  }
  if (!data || (!Array.isArray(data.cs) && !Array.isArray(data.sk))) return [];
  const episode = Number((baseName_(path).match(/^episode-(\d+)/i) || [])[1] || 0);
  if (!episode) return [];
  const csItems = Array.isArray(data.cs) ? data.cs : [];
  const skItems = Array.isArray(data.sk) ? data.sk : [];
  const skByTime = new Map(skItems.map((item, index) => [String(item && item.time || '#' + index), {item, index}]));
  const usedSk = new Set();
  const output = [];
  csItems.forEach((item, index) => {
    const key = String(item && item.time || '#' + index);
    const found = skByTime.get(key) || {item: skItems[index], index};
    if (found && found.item) usedSk.add(found.index);
    addBilingualQuestion_(output, path, episode, item, found && found.item, index);
  });
  skItems.forEach((item, index) => {
    if (!usedSk.has(index)) addBilingualQuestion_(output, path, episode, null, item, csItems.length + index);
  });
  return dedupeQuestions_(output);
}

function addBilingualQuestion_(output, path, episode, csItem, skItem, offset) {
  const cs = String(csItem && csItem.title || '').trim();
  const sk = String(skItem && skItem.title || '').trim();
  const time = String(csItem && csItem.time || skItem && skItem.time || '').trim();
  if ((!cs && !sk) || !time) return;
  output.push({
    episode,
    time,
    linkSeconds: Math.max(0, toSeconds_(time) - 5),
    title: cs || sk,
    cs,
    sk,
    source: path,
    offset
  });
}

function parseGenericQuestions_(path, source, forcedEpisode) {
  const episode = Number(forcedEpisode || (baseName_(path).match(/^episode-(\d+)/i) || [])[1] || 0);
  if (!episode) return [];
  const output = [];
  const preroll = /data-vedator-preroll/i.test(source) ? 0 : 5;
  const add = (time, title, offset) => {
    const cleanTitle = String(title || '').replace(/^\s*\d+[.)]\s*/, '').trim();
    const cleanTime = String(time || '').trim();
    if (cleanTitle.length < 3 || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(cleanTime)) return;
    output.push({
      episode,
      time: cleanTime,
      linkSeconds: Math.max(0, toSeconds_(cleanTime) - preroll),
      title: cleanTitle,
      source: path,
      offset: offset || 0
    });
  };

  const timeObject = new RegExp('\\{[\\s\\S]{0,800}?[\"\']?time[\"\']?\\s*:\\s*(' + JS_STRING_TOKEN_ + ')[\\s\\S]{0,800}?[\"\']?title[\"\']?\\s*:\\s*(' + JS_STRING_TOKEN_ + ')', 'g');
  let match;
  while ((match = timeObject.exec(source))) add(decodeJsString_(match[1]), decodeJsString_(match[2]), match.index);

  const secondsObject = new RegExp('\\{[\\s\\S]{0,500}?[\"\']?seconds[\"\']?\\s*:\\s*(\\d+(?:\\.\\d+)?)[\\s\\S]{0,500}?[\"\']?title[\"\']?\\s*:\\s*(' + JS_STRING_TOKEN_ + ')', 'g');
  while ((match = secondsObject.exec(source))) add(formatSeconds_(Number(match[1])), decodeJsString_(match[2]), match.index);

  const tuple = new RegExp('\\[\\s*(' + JS_STRING_TOKEN_ + ')\\s*,\\s*(' + JS_STRING_TOKEN_ + ')\\s*,\\s*\\[', 'g');
  while ((match = tuple.exec(source))) {
    const time = decodeJsString_(match[1]).trim();
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(time)) add(time, decodeJsString_(match[2]), match.index);
  }
  return dedupeQuestions_(output);
}

function parseChapterGroups_(path, source) {
  const start = source.search(/\bCHAPTERS\s*=\s*\{/);
  if (start < 0) return [];
  const output = [];
  const keyRegex = /(\d{1,4})\s*:\s*\[/g;
  keyRegex.lastIndex = start;
  let match;
  while ((match = keyRegex.exec(source))) {
    const episode = Number(match[1]);
    const open = source.indexOf('[', match.index);
    const end = matchingBracket_(source, open);
    if (end < 0) continue;
    const block = source.slice(open, end + 1);
    parseGenericQuestions_(path, block, episode).forEach(item => output.push(item));
    keyRegex.lastIndex = end + 1;
  }
  return dedupeQuestions_(output);
}

function selectBestSources_(items) {
  const priority = {summary: 3, chapter: 1};
  const groups = new Map();
  items.forEach(item => {
    const key = item.episode + '|' + item.source;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const episodes = [...new Set(items.map(item => Number(item.episode)).filter(Boolean))];
  const selected = [];
  episodes.forEach(episode => {
    const options = [...groups.values()]
      .filter(group => Number(group[0].episode) === episode)
      .map(group => dedupeQuestions_(group));
    options.sort((a, b) => b.length - a.length || (priority[b[0] && b[0].kind] || 0) - (priority[a[0] && a[0].kind] || 0));
    if (options[0]) options[0].forEach(item => selected.push(item));
  });
  return dedupeQuestions_(selected);
}

function chooseLanguages_(title, translations) {
  const exact = translations.get(norm_(title));
  if (exact) return {cs: exact.a, sk: exact.b};
  const sourceNgrams = ngrams_(title, 3);
  let best = null;
  let bestScore = 0;
  const uniquePairs = new Set(translations.values());
  uniquePairs.forEach(pair => {
    [pair.a, pair.b].forEach(candidate => {
      const score = dice_(sourceNgrams, ngrams_(candidate, 3));
      if (score > bestScore) {
        bestScore = score;
        best = pair;
      }
    });
  });
  if (best && bestScore >= 0.91) return {cs: best.a, sk: best.b};
  return isLikelyCzech_(title) ? {cs: title, sk: ''} : {cs: '', sk: title};
}

function isLikelyCzech_(text) {
  const value = ' ' + norm_(text) + ' ';
  const cz = [' proc ', ' jaky ', ' kter', ' muze ', ' zeme ', ' hvez', ' mesic ', ' slunce ', ' diky ', ' zadny ', ' kdyz ', ' nej'];
  const sk = [' preco ', ' aky ', ' ktory', ' moze ', ' zem ', ' hviez', ' mesiac ', ' slnko ', ' vdaka ', ' ziadny ', ' ked ', ' naj'];
  let c = 0;
  let s = 0;
  cz.forEach(word => { if (value.includes(word)) c++; });
  sk.forEach(word => { if (value.includes(word)) s++; });
  return c >= s;
}

function dedupeQuestions_(items) {
  const seen = new Map();
  items.forEach(item => {
    const key = Number(item.episode) + '|' + norm_(item.cs || item.sk || item.title);
    if (!seen.has(key)) seen.set(key, item);
  });
  return [...seen.values()];
}

function matchingObject_(source, open) {
  return matchingDelimited_(source, open, '{', '}');
}

function matchingBracket_(source, open) {
  return matchingDelimited_(source, open, '[', ']');
}

function matchingDelimited_(source, open, opening, closing) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === opening) depth++;
    else if (char === closing && --depth === 0) return i;
  }
  return -1;
}

function decodeJsString_(token) {
  if (!token) return '';
  const body = token.slice(1, -1);
  let output = '';
  for (let i = 0; i < body.length; i++) {
    let char = body[i];
    if (char !== '\\') { output += char; continue; }
    char = body[++i];
    if (char === undefined) break;
    if (char === 'n') output += '\n';
    else if (char === 'r') output += '\r';
    else if (char === 't') output += '\t';
    else if (char === 'b') output += '\b';
    else if (char === 'f') output += '\f';
    else if (char === 'v') output += '\v';
    else if (char === 'u') {
      const hex = body.slice(i + 1, i + 5);
      if (/^[0-9a-f]{4}$/i.test(hex)) { output += String.fromCharCode(parseInt(hex, 16)); i += 4; }
      else output += 'u';
    } else if (char === 'x') {
      const hex = body.slice(i + 1, i + 3);
      if (/^[0-9a-f]{2}$/i.test(hex)) { output += String.fromCharCode(parseInt(hex, 16)); i += 2; }
      else output += 'x';
    } else output += char;
  }
  return output;
}

// -----------------------------------------------------------------------------
// Výpočet podobnosti
// -----------------------------------------------------------------------------

const BASE_STOP_ = new Set();
const FUNCTION_WORDS_=`
  a i ani nebo anebo ci či ale avsak avšak vsak však nybrz nýbrž protoze protože ponevadz poněvadž jelikoz jelikož kdyz když kdyby jestli jestlize jestliže pokud aby takze takže tedy tudiz tudíž proto presto přesto zatimco
  v ve na do od z ze s se k ke ku u o po pro proti pres přes skrz pred před za pod nad mezi kolem okolo bez kvuli kvůli diky díky podle behem během mimo vedle
  jak proc proč kdy kde kam odkud kudy co kdo koho komu cim čím cem čem ktery který ktera která ktere které kteri kteří jaky jaký jaka jaká jake jaké ci čí kolik zda zdali
  ten ta to ti ty te té tom tim tím tento tato toto tihle tyhle tohle tamten tamta tamto
  ja já ty on ona ono my vy oni ony me mě mne mi mně tebe te tě ti jej jeho ji jí nam nám vas vás jim
  se si svuj svůj svoje sve své jen jenom pouze take také taky jeste ještě uz už jiz již prave právě vubec vůbec vlastne vlastně proste prostě prece přece snad asi mozna možná treba třeba ano ne nikoli
  by bych bys bychom byste bude budou byl byla bylo byli byt být jsem jsi jsme jste jsou je ma má mam mám mas máš maji mají mel měl mela měla meli měli mit mít muze může mohou mohl mohla mohli lze
  aj alebo avsak lebo pretoze pretože ked keď keby ak pokial pokiaľ takze takže teda cize čiže napriek zatialco zatiaľčo
  vo zo so pre cez kvoli kvôli vdaka vďaka podla podľa pocas počas vedla vedľa
  ako preco prečo kedy odkial odkiaľ kadial kadiaľ čo kto čom ktory ktorý ktora ktorá ktore ktoré ktorí aky aký aka aká ake aké kolko koľko
  tie tej tym tým táto títo tieto mna mňa teba ťa jej ju im sa svoj len iba tiez tiež este ešte prave práve vobec vôbec predsa snáď mozno možno napriklad napríklad áno nie
  som sme ste budu budú bol bola bolo boli su sú maju majú mal mala mali mat mať moze môže mozu môžu mohol mohla mohli da dá
  `.split(/\s+/).map(norm_).filter(Boolean);
  FUNCTION_WORDS_.forEach(word => BASE_STOP_.add(word));

  const DERIVATION_SUFFIXES_=`
  alniho alniemu alnemu alnich alnych alnimi alnymi alnim alnym alni alny
  arniho arniemu arnemu arnich arnych arnimi arnymi arnim arnym arni arny
  erniho erniemu ernemu ernich ernych ernimi ernymi ernim ernym erni erny
  acniho acniemu acnemu acnich acnych acnimi acnymi acnim acnym acni acny
  icniho icniemu icnemu icnich icnych icnimi icnymi icnim icnym icni icny
  ecniho ecniemu ecnemu ecnich ecnych ecnimi ecnymi ecnim ecnym ecni ecny
  ovniho ovniemu ovnemu ovnich ovnych ovnimi ovnymi ovnim ovnym ovni ovny
  evniho evniemu evnemu evnich evnych evnimi evnymi evnim evnym evni evny
  ickeho ickemu ickych ickymi ickou ickem icky icka icke
  skeho skemu skych skymi skou skem sky ska ske
  ckeho ckemu ckych ckymi ckou ckem cky cka cke
  oveho ovemu ovych ovymi ovou ovem ovi ova ove ovy
  eveho evemu evych evymi evou evem evi eva eve evy
  neho neho nemu nemu nych nymi nou ny na ne niho niemu nich nimi nim
  telneho telnych telnymi telnou telny telna telne telni
  itelneho itelnych itelnymi itelnou itelny itelna itelne itelni
  `.trim().split(/\s+/).sort((a,b)=>b.length-a.length);

  const DERIVATION_GROUPS_=[
    ['knih',['kniha','knihy','knizni','knizny','knihovni','knizne']],
    ['foton',['foton','fotony','fotonovy']], ['elektron',['elektron','elektrony','elektronovy']],
    ['proton',['proton','protony','protonovy']], ['neutron',['neutron','neutrony','neutronovy']],
    ['kvark',['kvark','kvarky','kvarkovy']], ['atom',['atom','atomy','atomovy']],
    ['molekul',['molekula','molekuly','molekularni']], ['castic',['castice','castice','casticovy']],
    ['kvant',['kvantum','kvanta','kvantovy']], ['fyzik',['fyzika','fyzikalni','fyzikalny']],
    ['chem',['chemie','chemicky','chemicky']], ['biolog',['biologie','biologicky','biologicky']],
    ['astronom',['astronomie','astronomicky','astronomicky']], ['kosm',['kosmos','kosmicky','kozmicky']],
    ['vesmir',['vesmir','vesmirny']], ['hvezd',['hvezda','hvezdy','hvezdny','hviezda','hviezdy','hviezdny']],
    ['planet',['planeta','planety','planetarni','planetarny']], ['slunc',['slunce','slunecni','slnko','slnecny']],
    ['mesic',['mesic','mesice','mesicni','mesiac','mesacny']], ['zem',['zeme','zemsky','zem','zemsky']],
    ['orbit',['orbita','orbitalni','orbitalny']], ['obeh',['obeh','obiha','obihat','obehovy','obieha','obiehat']],
    ['rotac',['rotace','rotacni','rotacia','rotacny','rotuje','rotovat']],
    ['zatmen',['zatmeni','zatmenia','zatmeni','zatmenie']], ['priliv',['priliv','prilivovy','prilivovy']],
    ['gravit',['gravitace','gravitacni','gravitacia','gravitacny']],
    ['relativ',['relativita','relativisticky','relativisticky']],
    ['energ',['energie','energeticky','energia','energeticky']], ['magnet',['magnet','magneticky']],
    ['elektr',['elektrina','elektricky','elektrina','elektricky']], ['jadr',['jadro','jaderny','jadrovy']],
    ['tepl',['teplo','tepelny','tepelny']], ['svetl',['svetlo','svetelny','svetelny']],
    ['zvuk',['zvuk','zvukovy']], ['optik',['optika','opticky']], ['radioaktiv',['radioaktivita','radioaktivni']],
    ['evoluc',['evoluce','evolucni','evolucia','evolucny']], ['gen',['gen','geny','geneticky']],
    ['klimat',['klima','klimaticky']], ['pocas',['pocasi','pocasie','povetrnostni']],
    ['ved',['veda','vedecky','veda','vedecky']], ['vyzkum',['vyzkum','vyzkumny']],
    ['histor',['historie','historicky','historia','historicky']], ['spolec',['spolecnost','spolecensky','spolocnost','spolocensky']],
    ['clovek',['clovek','lide','lidsky','clovek','ludia','ludsky']], ['dit',['dite','deti','detsky','dieta','deti','detsky']],
    ['prirod',['priroda','prirodni','priroda','prirodny']], ['technolog',['technologie','technologicky','technologia','technologicky']],
    ['pocitac',['pocitac','pocitace','pocitacovy']], ['internet',['internet','internetovy']],
    ['film',['film','filmy','filmovy']], ['hr',['hra','hry','herni','hra','hry','herny']]
  ];

  function rawDerivationRoot_(value){
    let current=norm_(value);
    if(!current)return'';
    if(current.includes(' '))return current.split(/\s+/).map(rawDerivationRoot_).filter(Boolean).join(' ');
    for(const suffix of DERIVATION_SUFFIXES_){
      if(current.endsWith(suffix)&&current.length-suffix.length>=3){current=current.slice(0,-suffix.length);break;}
    }
    current=stem_(current);
    const rewrites={kniz:'knih',jader:'jadr',tepel:'tepl',slunec:'slunc',vede:'ved',energet:'energ',elektrin:'elektr',opt:'optik'};
    return rewrites[current]||current;
  }


  // Široké rodiny přírodovědných a matematických pojmů. Každá rodina
  // sjednocuje podstatné jméno, přídavné jméno a běžné české/slovenské tvary
  // pod jeden koncept, aby např. nekonečno/nekonečný/nekonečně nebyly tři různé pojmy.
  const SCIENCE_DERIVATION_GROUPS_=[
    // Matematika
    ['matemat',['matematika','matematicky','matematicka','matematicke','matematickeho','matematickemu','matematickych','matematickymi']],
    ['nekonec',['nekonecno','nekonecny','nekonecna','nekonecne','nekonecneho','nekonecnemu','nekonecnych','nekonecnymi','nekonecnou','nekonecnost','nekonecnosti','nekonecne']],
    ['konecnost',['konecny','konecna','konecne','konecnost','konecneho','konecnych']],
    ['mnozin',['mnozina','mnoziny','mnozinovy','mnozinovy']],
    ['funkc',['funkce','funkcia','funkcni','funkcny','funkcionalni','funkcionalny']],
    ['derivac',['derivace','derivacia','derivacni','derivacny']],
    ['integral',['integral','integraly','integralni','integralny','integrovani','integrovanie']],
    ['limit',['limita','limity','limitni','limitny']],
    ['posloupnost',['posloupnost','posloupnosti','postupnost','postupnosti']],
    ['matrada',['rada','rady','nekonecna rada','nekonecny rad','ciselna rada','ciselny rad']],
    ['rovnic',['rovnice','rovnica','rovnicovy']], ['nerovnic',['nerovnice','nerovnica']],
    ['vektor',['vektor','vektory','vektorovy']], ['skalar',['skalar','skalarni','skalarny']],
    ['matic',['matice','matica','maticovy']], ['tenzor',['tenzor','tenzory','tenzorovy']],
    ['algebr',['algebra','algebraicky','algebraicky']], ['geometr',['geometrie','geometria','geometricky']],
    ['topolog',['topologie','topologia','topologicky']], ['kombinator',['kombinatorika','kombinatoricky']],
    ['pravdepodob',['pravdepodobnost','pravdepodobny','pravdepodobnostni','pravdepodobnostny']],
    ['statist',['statistika','statisticky']], ['trigonometr',['trigonometrie','trigonometria','trigonometricky']],
    ['logaritm',['logaritmus','logaritmy','logaritmicky']], ['exponenc',['exponenciala','exponencialni','exponencialny','exponent']],
    ['sinus',['sinus','sinovy']], ['kosinus',['kosinus','kosinovy']], ['tangens',['tangens','tangent']],
    ['uhol',['uhel','uhly','uhlovy','uhol','uhly','uhlovy']], ['kruznic',['kruznice','kruznica','kruznicovy']],
    ['parabol',['parabola','parabolicky']], ['hyperbol',['hyperbola','hyperbolicky']], ['elips',['elipsa','elipticky']],
    ['fraktal',['fraktal','fraktaly','fraktalni','fraktalny']], ['chaos',['chaos','chaoticky']],
    ['symetr',['symetrie','symetria','symetricky']], ['dimenz',['dimenze','dimenzia','dimenzionalni','dimenzionalny']],
    ['prvocisl',['prvocislo','prvocisla','prvociselny','prvociselny']], ['cisl',['cislo','cisla','ciselny','ciselna','ciselne']],

    // Fyzika a astronomie
    ['mechan',['mechanika','mechanicky']], ['dynam',['dynamika','dynamicky']], ['kinemat',['kinematika','kinematicky']],
    ['termodynam',['termodynamika','termodynamicky']], ['elektromagnet',['elektromagnetismus','elektromagneticky']],
    ['elektrostat',['elektrostatika','elektrostaticky']], ['hydrostat',['hydrostatika','hydrostaticky']],
    ['aerodynam',['aerodynamika','aerodynamicky']], ['hydrodynam',['hydrodynamika','hydrodynamicky']],
    ['hybnost',['hybnost','hybnosti']], ['moment',['moment','momentovy']], ['vykon',['vykon','vykonovy']],
    ['pracefyz',['prace','mechanicka prace']], ['hmotnost',['hmotnost','hmotnostni']], ['hustot',['hustota','hustotovy']],
    ['zrychl',['zrychleni','zrychlenie','zrychleny']], ['rychlost',['rychlost','rychlostni']],
    ['frekvenc',['frekvence','frekvencia','frekvencni','frekvencny']], ['vlnov',['vlnova delka','vlnovy','vlnova','vlnove']],
    ['amplitud',['amplituda','amplitudovy']], ['rezonanc',['rezonance','rezonancia','rezonancni']],
    ['polariz',['polarizace','polarizacia','polarizacni']], ['interferenc',['interference','interferencia','interferencni']],
    ['difrakc',['difrakce','difrakcia','difrakcni']], ['entrop',['entropie','entropia','entropicky']],
    ['faze',['faze','fazovy','fazovy']], ['supravod',['supravodivost','supravodivy','supravodivy']],
    ['cernadir',['cerna dira','cerne diry','cierna diera','cierne diery']], ['horizont',['horizont udalosti','event horizon']],
    ['kosmolog',['kosmologie','kosmologia','kosmologicky']], ['velkytresk',['velky tresk','big bang']],
    ['temnahmota',['temna hmota','tmava hmota']], ['temnaenerg',['temna energie','tmava energia']],

    // Chemie – obecné pojmy
    ['chemprvek',['prvek','prvky','chemicky prvek','chemicke prvky']], ['periodtab',['periodicka tabulka','periodicka soustava']],
    ['atomcis',['atomove cislo','protonove cislo']], ['mol',['mol','molarni','molarny']], ['latkovemnoz',['latkove mnozstvi','latkove mnozstvo']],
    ['izotop',['izotop','izotopy','izotopovy']], ['nuklid',['nuklid','nuklidy','nuklidovy']],
    ['ion',['ion','ionty','iontovy']], ['kation',['kation','kationty']], ['anion',['anion','anionty']],
    ['vazbchem',['chemicka vazba','chemicke vazby','vazebny']], ['sloucen',['sloucenina','slouceniny','zlucenina','zluceniny']],
    ['reakcchem',['chemicka reakce','chemicka reakcia','reakcni']], ['oxidac',['oxidace','oxidacia','oxidacni']], ['reduk',['redukce','redukcni','redukcia']],
    ['kyselin',['kyselina','kyseliny','kysely']], ['zasad',['zasada','zasady','zasadity']], ['ph',['ph','kyselost','alkalita']],

    // Prvky a jejich přídavná jména
    ['helium',['helium','helia','heliovy','heliova','heliove','heliovy']],
    ['vodik',['vodik','vodikovy','vodikova','vodikove']], ['kyslik',['kyslik','kyslikovy','kyslikova','kyslikove']],
    ['dusik',['dusik','dusikovy','dusikova','dusikove']], ['uhlik',['uhlik','uhlikovy','uhlikova','uhlikove']],
    ['neon',['neon','neonovy']], ['argon',['argon','argonovy']], ['uran',['uran','uranovy']], ['plutonium',['plutonium','plutoniovy']],
    ['zelezo',['zelezo','zelezny','zelezity','zeleznaty']], ['medchem',['med','medený','medeny','mednaty']], ['zlato',['zlato','zlaty']],

    // Biologie
    ['bunk',['bunka','bunky','bunecny','bunkovy','bunka','bunky','bunkovy']],
    ['genet',['genetika','geneticky']], ['genom',['genom','genomovy','genomicky']], ['chromozom',['chromozom','chromozomy','chromozomovy']],
    ['mutac',['mutace','mutacia','mutacni','mutacny']], ['selekc',['selekce','selekcia','selekcni']], ['adaptac',['adaptace','adaptacia','adaptacni']],
    ['organism',['organismus','organismy','organizmus','organizmy']], ['druhbio',['biologicky druh','druhy organismu']],
    ['tkan',['tkan','tkane','tkanovy']], ['organbio',['organ','organy','organovy']], ['hormon',['hormon','hormony','hormonalni','hormonalny']],
    ['neuron',['neuron','neurony','neuronovy']], ['nerv',['nerv','nervy','nervovy']], ['mozek',['mozek','mozkova','mozkovy','mozog','mozgovy']],
    ['imunit',['imunita','imunitni','imunitny']], ['protilatk',['protilatka','protilatky','protilatkova']],
    ['mitochondr',['mitochondrie','mitochondria','mitochondrialni']], ['ribozom',['ribozom','ribozomy','ribozomalni']],
    ['fotosyntez',['fotosynteza','fotosynteticky']], ['metabol',['metabolismus','metabolizmus','metabolicky']],
    ['ekosystem',['ekosystem','ekosystemy','ekosystemovy']], ['populac',['populace','populacia','populacni']],
    ['fylogenez',['fylogeneze','fylogeneza','fylogeneticky']], ['taxonom',['taxonomie','taxonomia','taxonomicky']],
    ['mikrobiom',['mikrobiom','mikrobiomovy']], ['antibiot',['antibiotikum','antibiotika','antibioticky']],

    // Geologie, meteorologie a vědy o Zemi
    ['geolog',['geologie','geologia','geologicky']], ['mineral',['mineral','mineraly','mineralni']], ['hornin',['hornina','horniny','horninovy']],
    ['tekton',['tektonika','tektonicky','desková tektonika','deskova tektonika']], ['zemetres',['zemetreseni','zemetrasenie','seismicky']],
    ['seism',['seismologie','seismologicky','seismicky']], ['sopk',['sopka','sopky','sopecny','vulkan','vulkanicky']],
    ['magma',['magma','magmaticky']], ['lav',['lava','lavovy']], ['eroz',['eroze','erozia','erozni']],
    ['hydrolog',['hydrologie','hydrologia','hydrologicky']], ['meteorolog',['meteorologie','meteorologia','meteorologicky']],
    ['atmosfer',['atmosfera','atmosfericky']], ['klimatolog',['klimatologie','klimatologia','klimatologicky']],
    ['oceanograf',['oceanografie','oceanografia','oceanograficky']]
  ];
  DERIVATION_GROUPS_.push(...SCIENCE_DERIVATION_GROUPS_);

  const DERIVATION_ALIASES_=(()=>{
    const map=new Map();
    for(const [key,forms] of DERIVATION_GROUPS_){
      const canonical=norm_(key);
      map.set(canonical,canonical);
      for(const form of forms){
        const normalized=norm_(form);
        map.set(normalized,canonical);
        map.set(stem_(normalized),canonical);
        map.set(rawDerivationRoot_(normalized),canonical);
      }
    }
    return map;
  })();

  function canonicalConcept_(value){
    const normalized=norm_(value);
    if(!normalized)return'';
    if(DERIVATION_ALIASES_.has(normalized))return DERIVATION_ALIASES_.get(normalized);
    const preCanonical=normalized;
    if(DERIVATION_ALIASES_.has(preCanonical))return DERIVATION_ALIASES_.get(preCanonical);
    const root=rawDerivationRoot_(preCanonical);
    return DERIVATION_ALIASES_.get(root)||root;
  }

  const GENERIC_MODIFIERS_=new Set(`
    velky maly nejvetsi nejmensi dlouhy kratky vysoky nizky siroky uzky tezky lehky
    rychly pomaly silny slaby stary novy mlady teply studeny horky chladny
    viditelny neviditelny pozorovatelny znamy neznamy mozny nemozny skutecny realny
    bezny obvykly zvlastni hlavni vedlejsi dalsi jiny stejny prvni posledni jediny
    blizky vzdaleny nejblizsi nejvzdalenejsi spravny spatny dobry nejlepsi horsi
  `.split(/\s+/).map(canonicalConcept_).filter(Boolean));

  // Slova, která mohou být vzácná, ale sama o sobě téměř neurčují téma dotazu.
  // Nechceme, aby např. „stále“ porazilo shodu na „Měsíc“ jen kvůli vysokému IDF.
  const NOISE_CONCEPTS_=new Set(`
    stale porad furt znovu opet znova trochu docela temer skoro vice mene hodne malo
    casto obcas nekdy vzdy nikdy dnes vcera zitra drive pozdeji postupne nakonec
    skutecne opravdu vlastne obecne bezne obvykle hlavne zejmena predevsim
    jinak podobne stejne rozdilne odlisne opacne naopak normalne jednoduse samostatne
    dohromady zvlast zaroven soucasne potom pote nejprve napred celkove
    stále pořád furt znovu opět znova trochu docela téměř skoro více méně hodně málo
    často občas někdy vždy nikdy dnes včera zítra dříve později postupně nakonec
    skutečně opravdu vlastně obecně běžně obvykle hlavně zejména především
    jinak podobně stejně rozdílně odlišně opačně naopak normálně jednoduše samostatně
    dohromady zvlášť zároveň současně potom poté nejprve napřed celkově
  `.split(/\s+/).map(canonicalConcept_).filter(Boolean));

  // Obecné obsahové výrazy ponecháváme, ale s malou vahou. Pomáhají až při
  // rozhodování mezi kandidáty se stejným hlavním tématem.
  const LOW_VALUE_CONCEPTS_=new Set(`
    vec pripad zpusob duvod problem moznost tema cast druh typ oblast souvislost priklad
    doba rok leta cas dnes clovek lide otazka neotazka informace vysledek zmena rozdil
    věc případ způsob důvod problém možnost téma část druh typ oblast souvislost příklad
    doba rok léta čas dnes člověk lidé otázka neotázka informace výsledek změna rozdíl
  `.split(/\s+/).map(canonicalConcept_).filter(Boolean));

  // V4: Silné tematické kotvy. Zahrnují matematiku a hlavní přírodovědné obory.
  // Nejde jen o fyziku: patří sem odborné vědecké a
  // technické pojmy, které říkají „o čem“ dotaz je. Jejich shoda má dominovat.
  const TOPIC_ANCHORS_=new Set(`
    fyzik kvant relativ gravit energ sila tlak tepl svetl zvuk optik magnet elektr radioaktiv jadr
    foton elektron proton neutron kvark atom molekul castic pole vlna frekvenc napeti proud odpor
    astronom kosm vesmir hvezd galax planet slunc mesic zem orbit obeh rotac zatmen priliv
    komet asteroid meteor meteorit teleskop webb exoplanet mars venus jupiter saturn uran neptun merkur
    atmosfera vakuum plazma spektrum radiace laser
    chem biolog gen dna rna bunka evoluc virus bakterie protein enzym molekular
    prvek atomove cislo izotop nuklid ion kation anion vazba sloucenina reakce kyselina zasada
    helium vodik kyslik dusik uhlik neon argon krypton xenon radon lithium beryllium bor fluor
    sodik horcik hlinik kremik fosfor sira chlor draslik vapnik titan chrom mangan zelezo kobalt nikl med zinek
    arsen selen brom stribro kadmium cin jod cesium baryum wolfram platina zlato rtut olovo bismut radium thorium uran plutonium
    klimat pocas ocean led voda teplota
    matemat statist pravdepodob geometr algebra nekonec konecnost mnozin funkc derivac integral limit posloupnost matrada rovnic nerovnic
    vektor skalar matic tenzor topolog kombinator trigonometr logaritm exponenc sinus kosinus tangens uhol kruznic parabol hyperbol elips fraktal chaos symetr dimenz prvocisl cisl
    mechan dynam kinemat termodynam elektromagnet elektrostat hydrostat aerodynam hydrodynam hybnost moment vykon pracefyz hmotnost hustot zrychl rychlost
    frekvenc vlnov amplitud rezonanc polariz interferenc difrakc entrop faze supravod cernadir horizont kosmolog velkytresk temnahmota temnaenerg
    chemprvek periodtab atomcis mol latkovemnoz izotop nuklid ion kation anion vazbchem sloucen reakcchem oxidac reduk kyselin zasad ph
    helium vodik kyslik dusik uhlik neon argon uran plutonium zelezo medchem zlato
    bunk genet genom chromozom mutac selekc adaptac organism druhbio tkan organbio hormon neuron nerv mozek imunit protilatk mitochondr ribozom fotosyntez metabol ekosystem populac fylogenez taxonom mikrobiom antibiot
    geolog mineral hornin tekton zemetres seism sopk magma lav eroz hydrolog meteorolog atmosfer klimatolog oceanograf
    technolog pocitac internet sit protokol algoritm data umel inteligence robot
  `.split(/\s+/).map(canonicalConcept_).filter(Boolean));

  function conceptBundle_(text){
    const tokens=String(text||'').match(/[\p{L}\p{N}]+/gu)||[];
    const seen=new Set(),out=[];
    for(let tokenIndex=0;tokenIndex<tokens.length;tokenIndex++){
      const raw=tokens[tokenIndex],normalized=norm_(raw);
      if(!normalized||normalized.length<2||BASE_STOP_.has(normalized))continue;
      const key=canonicalConcept_(normalized);
      if(!key||BASE_STOP_.has(key)||NOISE_CONCEPTS_.has(key)||seen.has(key))continue;
      seen.add(key);
      const anchor=TOPIC_ANCHORS_.has(key);
      const modifier=GENERIC_MODIFIERS_.has(key);
      const low=LOW_VALUE_CONCEPTS_.has(key);
      out.push({key,label:raw.toLocaleLowerCase('cs-CZ'),tokenIndex,contentIndex:out.length,modifier,anchor,low});
    }
    return out;
  }

  function conceptSimilarity_(a,b){
    if(a.key===b.key)return 1;
    if(Math.min(a.key.length,b.key.length)<4)return 0;
    const similarity=dice_(ngrams_(a.key,2),ngrams_(b.key,2));
    return similarity>=0.88?similarity:0;
  }

  function queryConceptWeight_(concept,position,total,index){
    const frequency=index.df.get(concept.key)||0;
    const idf=Math.log((index.corpusSize+1)/(frequency+1))+1;

    // Vzácnost je už jen jemné doladění (max. +60 %), ne hlavní zdroj bodů.
    const rarity=1+Math.min(0.60,Math.max(0,idf-1)*0.14);
    const positionWeight=total<=1?1:1.08-0.08*(position/(total-1));

    // Hierarchie významu: odborné téma >> věcný detail >> obecný modifikátor.
    let role=1.55;
    if(concept.anchor)role=6.5;
    else if(concept.low)role=0.35;
    else if(concept.modifier)role=0.18;
    return rarity*positionWeight*role;
  }

  function matchConcepts_(queryConcepts,candidateConcepts){
    const available=new Set(candidateConcepts.map((_,index)=>index));
    const matchedQueries=new Set(),matches=[];
    queryConcepts.forEach((query,qIndex)=>{
      const cIndex=candidateConcepts.findIndex((candidate,index)=>available.has(index)&&candidate.key===query.key);
      if(cIndex<0)return;
      available.delete(cIndex);matchedQueries.add(qIndex);
      matches.push({query,candidate:candidateConcepts[cIndex],qIndex,cIndex,similarity:1});
    });
    queryConcepts.forEach((query,qIndex)=>{
      if(matchedQueries.has(qIndex))return;
      let bestIndex=-1,bestScore=0;
      for(const cIndex of available){
        const score=conceptSimilarity_(query,candidateConcepts[cIndex]);
        if(score>bestScore){bestScore=score;bestIndex=cIndex;}
      }
      if(bestIndex<0)return;
      available.delete(bestIndex);
      matches.push({query,candidate:candidateConcepts[bestIndex],qIndex,cIndex:bestIndex,similarity:bestScore});
    });
    return matches.sort((a,b)=>a.qIndex-b.qIndex);
  }

  function structuralSimilarity_(matches,queryCount,candidateCount){
    if(!matches.length)return 0;
    if(matches.length===1)return 0.55;
    let ordered=0,pairs=0;
    for(let i=0;i<matches.length;i++)for(let j=i+1;j<matches.length;j++){pairs++;if(matches[i].cIndex<matches[j].cIndex)ordered++;}
    const orderScore=pairs?ordered/pairs:1;
    let gapScore=0;
    for(let i=1;i<matches.length;i++){
      const qGap=Math.abs(matches[i].qIndex-matches[i-1].qIndex)/Math.max(1,queryCount-1);
      const cGap=Math.abs(matches[i].cIndex-matches[i-1].cIndex)/Math.max(1,candidateCount-1);
      gapScore+=Math.max(0,1-Math.abs(qGap-cGap));
    }
    gapScore/=Math.max(1,matches.length-1);
    let positionScore=0;
    for(const match of matches){
      const qp=match.qIndex/Math.max(1,queryCount-1),cp=match.cIndex/Math.max(1,candidateCount-1);
      positionScore+=Math.max(0,1-Math.abs(qp-cp));
    }
    positionScore/=matches.length;
    return 0.45*orderScore+0.30*gapScore+0.25*positionScore;
  }

  function evaluateVariant_(queryConcepts,queryChargrams,candidateText,candidateConcepts,index){
    const matches=matchConcepts_(queryConcepts,candidateConcepts);
    const queryCount=queryConcepts.length,candidateCount=candidateConcepts.length;
    const weights=queryConcepts.map((concept,position)=>queryConceptWeight_(concept,position,queryCount,index));
    const totalWeight=weights.reduce((sum,value)=>sum+value,0)||1;
    const matchedWeight=matches.reduce((sum,match)=>sum+weights[match.qIndex]*match.similarity,0);
    const weightedCoverage=matchedWeight/totalWeight;

    const coreIndices=queryConcepts.map((concept,index)=>(concept.modifier||concept.low)?-1:index).filter(index=>index>=0);
    const matchedCore=new Set(matches.filter(match=>!match.query.modifier&&!match.query.low).map(match=>match.qIndex));
    const coreCoverage=coreIndices.length?matchedCore.size/coreIndices.length:1;

    const anchorIndices=queryConcepts.map((concept,index)=>concept.anchor?index:-1).filter(index=>index>=0);
    const matchedAnchors=new Set(matches.filter(match=>match.query.anchor&&match.similarity>=0.88).map(match=>match.qIndex));
    const anchorCoverage=anchorIndices.length?matchedAnchors.size/anchorIndices.length:1;

    const lengthBalance=queryCount&&candidateCount?Math.min(queryCount,candidateCount)/Math.max(queryCount,candidateCount):0;
    const structure=structuralSimilarity_(matches,queryCount,candidateCount);
    const characterSimilarity=dice_(queryChargrams,ngrams_(candidateText));
    const lengthFactor=0.68+0.32*lengthBalance;
    const structureFactor=0.90+0.10*structure;
    const coreFactor=coreIndices.length?0.20+0.80*coreCoverage:1;
    const anchorFactor=anchorIndices.length?0.30+0.70*anchorCoverage:1;
    let score=Math.max(0,Math.min(1,weightedCoverage*lengthFactor*structureFactor*coreFactor*anchorFactor));

    // Pokud dotaz obsahuje jasné odborné téma a kandidát ho vůbec nemá,
    // nesmí ho zachránit shoda na obecném či náhodném slově.
    if(anchorIndices.length&&!matchedAnchors.size)score=Math.min(score,0.012);
    else if(coreIndices.length&&!matchedCore.size)score=Math.min(score,0.035);

    return{score,weightedCoverage,coreCoverage,anchorCoverage,lengthBalance,structure,characterSimilarity,matches,matchedCount:matches.length,queryCount,candidateCount};
  }

function pripravIndex_(database) {
  const items = database.map(item => {
    const csConcepts = conceptBundle_(item.cs);
    const skConcepts = conceptBundle_(item.sk);
    return Object.assign({}, item, {csConcepts, skConcepts});
  });
  const df = new Map();
  items.forEach(item => {
    const keys = new Set(item.csConcepts.concat(item.skConcepts).map(concept => concept.key));
    keys.forEach(key => df.set(key, (df.get(key) || 0) + 1));
  });
  return {items, df, corpusSize: Math.max(1, items.length)};
}

function seradPodobne_(query, index, limit) {
  const queryConcepts = conceptBundle_(query);
  const queryNgrams = ngrams_(query, 3);
  if (!queryConcepts.length) return [];
  return index.items.map(item => {
    const variants = [];
    if (item.cs) variants.push(evaluateVariant_(queryConcepts, queryNgrams, item.cs, item.csConcepts, index));
    if (item.sk && item.sk !== item.cs) variants.push(evaluateVariant_(queryConcepts, queryNgrams, item.sk, item.skConcepts, index));
    if (!variants.length) variants.push(evaluateVariant_(queryConcepts, queryNgrams, '', [], index));
    variants.sort(compareVariant_);
    const best = variants[0];
    return {
      score: best.score, coreCoverage: best.coreCoverage, anchorCoverage: best.anchorCoverage, matchedCount: best.matchedCount,
      weightedCoverage: best.weightedCoverage, lengthBalance: best.lengthBalance,
      structure: best.structure, characterSimilarity: best.characterSimilarity,
      matchedLabels: best.matches.map(match => match.query.label),
      queryCount: best.queryCount, candidateCount: best.candidateCount,
      title: item.cs || item.sk, episode: item.episode, time: item.time, url: item.url
    };
  }).sort((a, b) =>
    b.score - a.score || b.anchorCoverage - a.anchorCoverage || b.coreCoverage - a.coreCoverage ||
    b.weightedCoverage - a.weightedCoverage || b.matchedCount - a.matchedCount ||
    b.lengthBalance - a.lengthBalance || b.structure - a.structure ||
    b.characterSimilarity - a.characterSimilarity || b.episode - a.episode
  ).slice(0, limit);
}

function compareVariant_(a, b) {
  return b.score - a.score || b.anchorCoverage - a.anchorCoverage || b.coreCoverage - a.coreCoverage ||
    b.weightedCoverage - a.weightedCoverage || b.matchedCount - a.matchedCount ||
    b.lengthBalance - a.lengthBalance || b.structure - a.structure ||
    b.characterSimilarity - a.characterSimilarity;
}

function stem_(word) {
  let value = norm_(word);
  if (value.length < 5) return value;
  const suffixes = `ovymi evymi ovych evych oveho eveho ovemu evemu ovami evami ovou evou ami emi imi omi ach ech ich och ichu ovia ovie iach miami atami enami ovy eva ova ove ovi ovu eho emu ymi omu ych ou em am ym im om um ov ev skymi ckymi skeho ckeho skemu ckemu skych ckych nosti nostiach anie enie enia eniu enim ovani ujeme ujete ujem ujeju ujuci ajuci aju ali ala alo aty ate eti ity oti eni ena eno ily ila ilo ete ite ych ach ich eho iho ymi imi ami emi ia ie iu i a e y o u`.split(/\s+/).sort((a,b)=>b.length-a.length);
  for (const suffix of suffixes) {
    if (suffix && value.endsWith(suffix) && value.length - suffix.length >= 4) {value = value.slice(0, -suffix.length); break;}
  }
  return value;
}

function norm_(value) {
  return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function ngrams_(text, size) {
  const value = norm_(text).replace(/\s+/g, ' '), output = new Set();
  if (value.length < size) {if (value) output.add(value); return output;}
  for (let i = 0; i <= value.length - size; i++) output.add(value.slice(i, i + size));
  return output;
}

function dice_(a, b) {
  if (!a.size && !b.size) return 1;
  let common = 0; a.forEach(value => {if (b.has(value)) common++;});
  return 2 * common / (a.size + b.size || 1);
}

// -----------------------------------------------------------------------------
// Pomocné funkce
// -----------------------------------------------------------------------------

function directQuestionUrl_(episode, seconds) {
  const key = Number(episode || 0) + '-sheet@' + Math.max(0, Math.floor(Number(seconds) || 0));
  return CFG.PUBLIC_BASE + '#question=' + encodeURIComponent(key);
}

function toSeconds_(time) {
  const parts = String(time || '').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatSeconds_(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = value % 60;
  return hours
    ? hours + ':' + String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0')
    : minutes + ':' + String(rest).padStart(2, '0');
}

function baseName_(path) {
  return String(path || '').split('/').pop() || '';
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensureSize_(sheet, rows, columns) {
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < columns) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
}

function styleHeader_(range) {
  range
    .setBackground('#4338ca')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function setScoreConditionalFormatting_(sheet) {
  const oldRules = sheet.getConditionalFormatRules().filter(rule => {
    const ranges = rule.getRanges();
    return !ranges.some(range => [3, 6, 9, 12, 15].includes(range.getColumn()));
  });
  const rules = oldRules.slice();
  [3, 6, 9, 12, 15].forEach(col => {
    const range = sheet.getRange(2, col, sheet.getMaxRows() - 1, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(0.8).setBackground('#dcfce7').setFontColor('#166534').setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(0.5, 0.799999).setBackground('#fef3c7').setFontColor('#92400e').setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0.5).setBackground('#fee2e2').setFontColor('#991b1b').setRanges([range]).build());
  });
  sheet.setConditionalFormatRules(rules);
}

// ─────────────────────────────────────────────────────────────────────────────
// Vedátor FAQ + lokální AI: rozšíření Apps Scriptu, listopad 2026
// Pro původní chytrý algoritmus načtěte také AskEngine.gs.
// Model se na server Apps Script NIKDY nestahuje; načítá ho jen uživatel
// na vyžádání v bočním panelu Sidebar.html.
// ─────────────────────────────────────────────────────────────────────────────

function vedatorParsePoints_(value) {
  if (Array.isArray(value)) return value.map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
}

function vedatorPripravAskIndex_(database) {
  if (typeof vedatorCreateAskEngine_ !== 'function')
    throw new Error('Chybí soubor AskEngine.gs. Přidejte ho do projektu Apps Script.');
  const engine = vedatorCreateAskEngine_();
  const byId = new Map();
  const questions = database.map(item => {
    const key = 'q:' + Number(item.episode) + ':' + Number(item.order);
    byId.set(key, item);
    return {
      episode: Number(item.episode),
      order: Number(item.order),
      seconds: Number(item.linkSeconds) || 0,
      i18n: {
        cs: {title: item.cs, points: item.csPoints || []},
        sk: {title: item.sk, points: item.skPoints || []}
      }
    };
  });
  // Stejný vyhledávač jako záložka „Zeptej se“, včetně odrážek.
  engine.load({questions: questions, nonquestions: {episodes: {}}});
  return {engine: engine, byId: byId};
}

function vedatorSeradAsk_(query, index, limit) {
  const ranked = index.engine.search(query, 'question').slice(0, limit);
  return ranked.map(result => {
    const key = result.entry.item.id;
    const item = index.byId.get(key);
    if (!item) throw new Error('Chybí otázka v databázi: ' + key);
    const labels = Array.from(new Set((result.matchedDirect || [])
      .concat((result.form && result.form.matches || []).map(String))));
    return {
      id: key,
      score: Math.max(0, Math.min(1, Number(result.score) || 0)),
      title: item.cs || item.sk,
      url: item.url,
      episode: item.episode,
      order: item.order,
      time: item.time,
      matchedLabels: labels,
      queryCount: (query.match(/[\p{L}\p{N}]+/gu) || []).length,
      candidateCount: (String(item.cs || item.sk).match(/[\p{L}\p{N}]+/gu) || []).length,
      csPoints: item.csPoints || [],
      skPoints: item.skPoints || [],
      csTitle: item.cs,
      skTitle: item.sk
    };
  });
}

// Boční panel s volitelným malým modelem Xenova/multilingual-e5-small.
function otevritAiPanel() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Vedátor – lokální AI')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Jedna konkrétní vybraná otázka. Bez posílání soukromých dat do AI API.
function vedatorAiVybranyRadek() {
  const ss = SpreadsheetApp.getActive();
  const range = ss.getActiveRange();
  if (!range || range.getSheet().getName() !== CFG.INPUT_SHEET || range.getRow() < 2)
    throw new Error('Vyberte nejprve buňku v řádku otázky na listu Dotazy (od řádku 2).');
  const rowNumber = range.getRow();
  const question = String(range.getSheet().getRange(rowNumber, 1).getDisplayValue() || '').trim();
  if (!question) throw new Error('Vybraný řádek má prázdnou otázku ve sloupci A.');
  return {row: rowNumber, question: question};
}

function vedatorAiKandidati(rowNumber) {
  const ss = SpreadsheetApp.getActive();
  const input = ss.getSheetByName(CFG.INPUT_SHEET);
  const row = Math.floor(Number(rowNumber));
  if (!input || !Number.isSafeInteger(row) || row < 2 || row > input.getMaxRows())
    throw new Error('Neplatný řádek listu Dotazy.');
  const query = String(input.getRange(row, 1).getDisplayValue() || '').trim();
  if (!query) throw new Error('V tomto řádku není otázka.');
  const database = nactiDatabazi_(false);
  const ranked = vedatorSeradAsk_(query, vedatorPripravAskIndex_(database), CFG.AI_RERANK_N);
  return {
    row: row,
    question: query,
    total: ranked.length,
    candidates: ranked.map(item => {
      const points = item.csPoints && item.csPoints.length ? item.csPoints : item.skPoints;
      // Prefer sentences/bullets with words from the question. No full-catalog
      // AI index, only the same first 30 results as in Vedátor.
      const terms = (query.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []);
      const chosen = (points || []).map((value, i) => ({
        value: String(value),
        i: i,
        hits: terms.reduce((n, term) => n +
          (String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().includes(term) ? 1 : 0), 0)
      })).sort((a,b) => b.hits - a.hits || a.i - b.i)
        .slice(0, 3).sort((a,b) => a.i - b.i).map(v => v.value);
      return {
        id: item.id,
        title: item.title,
        episode: item.episode,
        time: item.time,
        url: item.url,
        score: item.score,
        passage: (item.title + '. ' + chosen.join(' ')).slice(0, 480)
      };
    })
  };
}

// Zapisuje pouze přerovnanou původní třicítku; nové výsledky nepřidává.
// Opakovanou validací chrání proti změně otázky nebo databáze během AI výpočtu.
function vedatorAiUlozPoradi(rowNumber, originalQuestion, ids) {
  const lock = LockService.getDocumentLock();
  if (!lock || !lock.tryLock(30000))
    throw new Error('Tabulka se právě upravuje. Zkuste uložit pořadí znovu.');
  try {
    const ss = SpreadsheetApp.getActive();
    const input = ss.getSheetByName(CFG.INPUT_SHEET);
    const row = Math.floor(Number(rowNumber));
    if (!input || !Number.isSafeInteger(row) || row < 2 || row > input.getMaxRows())
      throw new Error('Neplatný řádek.');
    const currentQuestion = String(input.getRange(row, 1).getDisplayValue() || '').trim();
    if (currentQuestion !== originalQuestion)
      throw new Error('Otázka se mezitím změnila. Znovu načtěte kandidáty.');
    if (!Array.isArray(ids)) throw new Error('Chybí pořadí výsledků.');
    const original = vedatorSeradAsk_(currentQuestion,
      vedatorPripravAskIndex_(nactiDatabazi_(false)), CFG.AI_RERANK_N);
    const originalIds = original.map(item => item.id);
    const submittedIds = ids.map(String);
    if (submittedIds.length !== originalIds.length ||
        new Set(submittedIds).size !== submittedIds.length ||
        submittedIds.some(id => !originalIds.includes(id)))
      throw new Error('AI smí pouze přerovnat původních 30 kandidátů. Načtěte je znovu.');
    const byId = new Map(original.map(item => [item.id, item]));
    const ordered = submittedIds.map(id => byId.get(id));
    const top = ordered.slice(0, CFG.TOP_N);
    const processed = [{rowNumber: row, query: currentQuestion, matches: top}];
    zapisVysledky_(input, processed);
    aktualizujVsechnyShody_(processed);
    input.getRange(row, 2).setValue('AI hotovo');
    return {saved: true, count: top.length, row: row};
  } finally {
    lock.releaseLock();
  }
}

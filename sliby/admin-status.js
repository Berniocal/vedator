(function (root) {
  'use strict';
  const validStatuses = new Set(['Nesplněno', 'Splněno později', 'Splněno už dříve', 'Budoucí slib']);
  const key = row => JSON.stringify([row.candidate, row.tema]);
  const members = row => [row, ...(row.mergedFrom || [])];
  const keys = row => [...new Set(members(row).map(key))];
  function check(document) {
    if (!document || document.schema !== 1 || !document.items ||
        typeof document.items !== 'object' || Array.isArray(document.items)) {
      throw new Error('Neplatná data ručních oprav');
    }
    for (const value of Object.values(document.items)) {
      if (!value || !validStatuses.has(value.stav) ||
          (value.note !== undefined && typeof value.note !== 'string')) {
        throw new Error('Neplatný stav v ručních opravách');
      }
    }
    return document;
  }
  function resolve(row, document) {
    if (!document) return null;
    const matches = keys(row).map(k => document.items[k]).filter(Boolean);
    matches.sort((a,b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')));
    return matches[matches.length - 1] || null;
  }
  function apply(data, document) {
    check(document);
    let changed = 0;
    for (const collection of [data.findings, data.archive && data.archive.findings]) {
      if (!Array.isArray(collection)) continue;
      for (const row of collection) {
        const value = resolve(row, document);
        if (!value) continue;
        if (row.stav !== value.stav) changed += 1;
        row.stav = value.stav;
        row.adminNote = value.note || '';
        row.adminUpdatedAt = value.updatedAt || '';
      }
    }
    if (data.classification && Array.isArray(data.classification.statuses)) {
      if (!data.classification.statuses.includes('Budoucí slib')) data.classification.statuses.push('Budoucí slib');
      data.classification.statusCounts = Object.fromEntries(
        data.classification.statuses.map(status => [status, data.findings.filter(r => r.stav === status).length])
      );
    }
    return changed;
  }
  root.VedatorSlibyAdminStatus = Object.freeze({key, keys, resolve, check, apply, validStatuses});
})(typeof window !== 'undefined' ? window : globalThis);

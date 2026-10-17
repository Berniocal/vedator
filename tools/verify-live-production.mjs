import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const fail = message => { throw new Error(message); };
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const contentEpisodes = data => {
  if (!data || !Array.isArray(data.episodes) || data.episodes.length < 20) fail('Invalid or truncated content-v2.json');
  return data.episodes;
};
const sourceEpisodes = data => {
  if (!data || !Array.isArray(data.episodes) || data.episodes.length < 20) fail('Invalid or truncated episodes.json');
  if (Number(data.count) !== data.episodes.length) fail('RSS count disagrees with episodes.json');
  return data.episodes;
};
const unique = (values, label) => {
  if (values.some(value => value === '' || value === null || value === undefined)) fail('Missing ' + label);
  if (new Set(values).size !== values.length) fail('Duplicate ' + label);
};
const asHttpUrl = (value, label) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) fail('Invalid URL in ' + label);
  } catch { fail('Invalid URL in ' + label + ': ' + String(value).slice(0, 100)); }
};
const decodeHref = value => String(value)
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const htmlUrls = (html, label) => {
  const result = [...String(html ?? '').matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
    .map(match => decodeHref(match[1] ?? match[2] ?? match[3]));
  for (const url of result) asHttpUrl(url, label);
  return result.sort();
};
const firstDiff = (a, b, prefix = '$') => {
  if (isDeepStrictEqual(a, b)) return null;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return prefix;
  if (Array.isArray(a) !== Array.isArray(b)) return prefix;
  const keysA = Object.keys(a).sort(), keysB = Object.keys(b).sort();
  if (!isDeepStrictEqual(keysA, keysB)) return prefix + ' (keys)';
  for (const key of keysA) {
    const nested = firstDiff(a[key], b[key], prefix + (Array.isArray(a) ? '[' + key + ']' : '.' + key));
    if (nested) return nested;
  }
  return prefix;
};

export function verifyPayloads(expectedEpisodes, expectedContent, liveEpisodes, liveContent) {
  const expectedSource = sourceEpisodes(expectedEpisodes);
  const actualSource = sourceEpisodes(liveEpisodes);
  const expectedBuilt = contentEpisodes(expectedContent);
  const actualBuilt = contentEpisodes(liveContent);
  unique(expectedSource.map(e => compact(e.id)), 'expected RSS GUID');
  unique(actualSource.map(e => compact(e.id)), 'live RSS GUID');
  unique(expectedBuilt.map(e => compact(e.id)), 'expected content GUID');
  unique(actualBuilt.map(e => compact(e.id)), 'live content GUID');
  unique(expectedBuilt.map(e => e.number), 'expected playback identity');
  unique(actualBuilt.map(e => e.number), 'live playback identity');
  if (expectedBuilt.length !== expectedSource.length || actualBuilt.length !== actualSource.length)
    fail('Catalog and V2 content have different episode counts');

  // A fresh build has a new generatedAt timestamp even for identical data.
  // This is the ONLY ignored field: metadata and all substantive content must match.
  const expectedCopy = { ...expectedContent }, actualCopy = { ...liveContent };
  delete expectedCopy.generatedAt;
  delete actualCopy.generatedAt;
  const sourceMismatch = firstDiff(expectedEpisodes, liveEpisodes);
  if (sourceMismatch) fail('Live episodes.json differs from deployment artifact at ' + sourceMismatch);
  const bundleMismatch = firstDiff(expectedCopy, actualCopy);
  if (bundleMismatch) fail('Live content-v2.json differs from deployment artifact at ' + bundleMismatch);

  const byGuid = new Map(actualBuilt.map(e => [String(e.id), e]));
  const specials = actualSource.filter(e => !Number(e.number));
  let translated = 0;
  for (const source of actualSource) {
    const built = byGuid.get(String(source.id));
    if (!built) fail('RSS item missing in live V2: ' + source.id);
    for (const field of ['date', 'enclosure', 'link']) {
      if (compact(built[field]) !== compact(source[field]))
        fail('RSS ' + field + ' changed for GUID ' + source.id);
    }
    asHttpUrl(source.enclosure, 'MP3 of ' + source.id);
    asHttpUrl(source.link, 'detail link of ' + source.id);
    if (Number(source.number)) continue;

    const label = String(source.id);
    if (!Number.isInteger(built.number) || built.number < 1 || built.number >= 2048 ||
        !(built.unnumbered || Number.isInteger(built.displayNumber)))
      fail('Invalid special playback identity ' + label);
    if (compact(built.i18n?.cs?.title)) {
      translated++;
      if (!compact(built.i18n.cs.description) || !compact(built.i18n?.sk?.title))
        fail('Incomplete Czech translation ' + label);
    } else if (built.i18n?.cs) {
      fail('Incomplete Czech translation ' + label);
    }
    const originalUrls = htmlUrls(source.description, 'RSS HTML ' + label);
    for (const [language, rich] of [
      ['base', built.fullDescriptionHtml],
      ['sk', built.i18n?.sk?.fullDescriptionHtml],
      ['cs', built.i18n?.cs?.fullDescriptionHtml]
    ]) {
      if (language !== 'base' && !built.i18n?.[language]) continue;
      if (!isDeepStrictEqual(htmlUrls(rich, language + ' HTML ' + label), originalUrls))
        fail('Original RSS URLs were lost or changed in ' + language + ' HTML for ' + label);
    }
  }
  return { episodes: actualSource.length, specials: specials.length, translatedSpecials: translated };
}

async function downloadJson(name, checkoutSha, attempt) {
  const url = new URL('https://bernio.cz/vedator/' + name);
  url.searchParams.set('verify_deploy', checkoutSha + '-' + attempt);
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'User-Agent': 'Vedator-Production-Verifier/1.0' },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) fail(name + ' HTTP ' + response.status);
  const body = await response.arrayBuffer();
  if (body.byteLength < 2 || body.byteLength > 50 * 1024 * 1024)
    fail(name + ' invalid response size ' + body.byteLength);
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(body);
  try { return JSON.parse(decoded); }
  catch (error) { fail(name + ' is incomplete or invalid JSON: ' + error.message); }
}

async function main() {
  const checkoutSha = compact(process.env.DEPLOY_CHECKOUT_SHA);
  if (!/^[0-9a-f]{40}$/i.test(checkoutSha)) fail('Missing actual checkout SHA');
  const expectedEpisodes = JSON.parse(fs.readFileSync('episodes.json', 'utf8'));
  const expectedContent = JSON.parse(fs.readFileSync('content-v2.json', 'utf8'));
  console.log('Ověřit živá produkční data: checkout SHA ' + checkoutSha);
  console.log('Expected RSS episodes: ' + sourceEpisodes(expectedEpisodes).length);
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const liveEpisodes = await downloadJson('episodes.json', checkoutSha, attempt);
      const liveContent = await downloadJson('content-v2.json', checkoutSha, attempt);
      const result = verifyPayloads(expectedEpisodes, expectedContent, liveEpisodes, liveContent);
      console.log('OVĚŘENO: episodes=' + result.episodes +
        ', specials=' + result.specials + ', translatedSpecials=' + result.translatedSpecials +
        ', checkout=' + checkoutSha);
      return;
    } catch (error) {
      lastError = error;
      console.error('Production verification attempt ' + attempt + '/12: ' + error.message);
      if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  fail('NEOVĚŘENO after 12 bounded attempts: ' + lastError.message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error('PRODUCTION VERIFICATION FAILED: ' + error.message); process.exitCode = 1; });
}

import assert from 'node:assert/strict';
import { verifyPayloads } from './verify-live-production.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const episodes = Array.from({ length: 20 }, (_, i) => ({
  id: 'rss-guid-' + (i + 1),
  number: i + 1,
  title: 'Vedátorský podcast ' + (i + 1),
  description: 'Popis',
  date: 'Wed, 01 Jan 2025 00:00:00 GMT',
  link: 'https://example.org/detail/' + (i + 1),
  enclosure: 'https://example.org/audio/' + (i + 1) + '.mp3'
}));
episodes.push({
  id: 'podbean/special-guid', number: 0, title: 'Vedátorský špeciál – Astrológia',
  description: '<p>Slovenský úvod <a href="https://example.org/article?a=1&amp;b=2">zdroj</a></p>',
  date: 'Thu, 02 Jan 2025 00:00:00 GMT', link: 'https://example.org/special',
  enclosure: 'https://example.org/special.mp3'
});
const feed = { count: episodes.length, updatedAt: '2025-01-02T00:00:00Z', episodes };
const contentEpisodes = episodes.map(e => {
  const built = { ...e, number: e.number || 1512 };
  if (!e.number) {
    built.unnumbered = true;
    built.fullDescriptionHtml = e.description;
    built.i18n = {
      cs: { title: 'Vedátorský speciál – Astrologie', description: 'Český úvod', fullDescriptionHtml: '<p>Český úvod <a href="https://example.org/article?a=1&amp;b=2">zdroj</a></p>' },
      sk: { title: e.title, description: 'Slovenský úvod', fullDescriptionHtml: e.description }
    };
  }
  return built;
});
const data = { schema: 3, generatedAt: '2025-01-02T00:00:00Z', episodes: contentEpisodes, source: { episodeCount: episodes.length } };

function passes(label, mutate) {
  const f = clone(feed), d = clone(data), liveF = clone(feed), liveD = clone(data);
  mutate(f, d, liveF, liveD);
  assert.equal(verifyPayloads(f, d, liveF, liveD).translatedSpecials, 1, label);
  console.log('PASS ' + label);
}
function rejects(label, mutate, pattern) {
  const f = clone(feed), d = clone(data), liveF = clone(feed), liveD = clone(data);
  mutate(f, d, liveF, liveD);
  assert.throws(() => verifyPayloads(f, d, liveF, liveD), pattern, label);
  console.log('PASS rejected: ' + label);
}

passes('identical full deployment', () => {});
passes('only generatedAt can differ', (f, d, lf, ld) => { ld.generatedAt = '2025-01-03T09:00:00Z'; });
rejects('stale live production', (f, d, lf, ld) => { ld.episodes[20].i18n.cs.title = 'Old title'; }, /differs.*episodes/);
rejects('missing live Czech translation', (f, d, lf, ld) => { delete ld.episodes[20].i18n; }, /differs.*episodes/);
rejects('changed publication date', (f, d, lf, ld) => {
  lf.episodes[20].date = 'Fri, 03 Jan 2025 00:00:00 GMT';
  ld.episodes[20].date = lf.episodes[20].date;
}, /differs/);
rejects('changed MP3 address', (f, d, lf, ld) => {
  lf.episodes[20].enclosure = 'https://example.org/wrong.mp3';
  ld.episodes[20].enclosure = lf.episodes[20].enclosure;
}, /differs/);
rejects('changed detail link', (f, d, lf, ld) => { ld.episodes[20].link = 'https://example.org/wrong'; }, /differs/);
rejects('duplicate GUID', (f, d, lf, ld) => { lf.episodes[20].id = lf.episodes[0].id; }, /Duplicate live RSS GUID/);
rejects('duplicate playback identity', (f, d, lf, ld) => { ld.episodes[20].number = ld.episodes[0].number; }, /Duplicate live playback identity/);
rejects('lost original HTML URL', (f, d, lf, ld) => {
  lf.episodes[20].description = '<p>Slovenský úvod <a href="https://example.org/changed">zdroj</a></p>';
  ld.episodes[20].fullDescriptionHtml = lf.episodes[20].description;
  ld.episodes[20].i18n.sk.fullDescriptionHtml = lf.episodes[20].description;
}, /differs/);
rejects('malformed RSS URL even when files match', (f, d, lf, ld) => {
  for (const src of [f, lf]) src.episodes[20].description = '<p><a href="https://bad domain">zdroj</a></p>';
  for (const built of [d, ld]) {
    built.episodes[20].fullDescriptionHtml = '<p><a href="https://bad domain">zdroj</a></p>';
    built.episodes[20].i18n.sk.fullDescriptionHtml = '<p><a href="https://bad domain">zdroj</a></p>';
    built.episodes[20].i18n.cs.fullDescriptionHtml = '<p><a href="https://bad domain">zdroj</a></p>';
  }
}, /Invalid URL/);
console.log('Live production verification regression tests OK.');

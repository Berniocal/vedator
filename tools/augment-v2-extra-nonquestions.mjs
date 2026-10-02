import fs from 'fs';
import vm from 'vm';

const file = new URL('../content-v2.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const EXTRAS = [155, 156, 157, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 171, 172, 173, 174, 175, 176, 177, 178, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 191, 192];

function readSummaryData(n) {
  const src = fs.readFileSync(new URL(`../episode-${n}-summary.js`, import.meta.url), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const obj = sandbox.window[`__vedatorEpisodeSummary${n}`];
  if (!obj?.cs?.chapters || !obj?.sk?.chapters) throw new Error(`Invalid summary ${n}`);
  return obj;
}

for (const n of EXTRAS) {
  if (data.questionEpisodes?.includes(n)) {
    throw new Error(`Episode ${n} is already in questionEpisodes; refusing to duplicate it in nonquestions.`);
  }
}

const map = new Map((data.nonquestions || []).map((x) => [x.episodeNumber, x]));
for (const n of EXTRAS) {
  const s = readSummaryData(n);
  const ep = (data.episodes || []).find((x) => x.episodeNumber === n);
  if (!ep) throw new Error(`Episode ${n} not found`);
  map.set(n, {
    episodeNumber: n,
    date: ep.date || '',
    url: ep.url || '',
    audioUrl: ep.audioUrl || '',
    title: { cs: s.cs.title || ep.title?.cs || '', sk: s.sk.title || ep.title?.sk || '' },
    chapters: { cs: s.cs.chapters, sk: s.sk.chapters }
  });
}

data.nonquestions = [...map.values()].sort((a, b) => b.episodeNumber - a.episodeNumber);
data.generatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(data));
console.log(`Added/updated nonquestions: ${EXTRAS.join(', ')}`);

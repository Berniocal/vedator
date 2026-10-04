// V2 regression checks; this file also serves as a safe deployment trigger after generated data updates.
import fs from 'node:fs';
import './test-v2-mathjax-data.mjs';
import './test-summary-audit.mjs';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const seriesConfig=JSON.parse(fs.readFileSync('series.json','utf8'));
const fail=message=>{throw new Error(message)};

if(data.schema!==3)fail(`Unexpected schema ${data.schema}`);
if(!Array.isArray(data.episodes)||data.episodes.length<380)fail(`Too few episodes: ${data.episodes?.length}`);

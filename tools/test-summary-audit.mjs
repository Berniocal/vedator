import fs from 'node:fs';
import assert from 'node:assert/strict';

const directory='summary-audits';
if(fs.existsSync(directory)){
  const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
  const seconds=time=>String(time).split(':').reduce((total,part)=>total*60+Number(part),0);
  const numbers=text=>String(text).replace(/(\d),(\d)/g,'$1.$2').match(/\d+(?:\.\d+)?/g)||[];
  for(const file of fs.readdirSync(directory).filter(file=>/^episode-\d+\.json$/.test(file))){
    const audit=JSON.parse(fs.readFileSync(`${directory}/${file}`,'utf8'));
    const episode=String(audit.episode),languages=data.nonquestions?.episodes?.[episode];
    assert(languages,`Audited episode ${episode} disappeared`);
    assert(!data.questions.some(row=>Number(row.episode)===Number(episode)),`Audited summary ${episode} became FAQ`);
    const duration=audit.cleanContent.endSeconds-audit.cleanContent.startSeconds-
      audit.cleanContent.excludedInterludes.reduce((total,[start,end])=>total+end-start,0);
    assert(Math.abs(duration-audit.cleanContent.durationSeconds)<0.01,`Incorrect clean duration in ${episode}`);
    assert(audit.chapters.length<=Math.floor(duration/120),`Too many chapters in ${episode}`);
    assert.equal(languages.cs.length,audit.chapters.length,`CZ chapter count in ${episode}`);
    assert.equal(languages.sk.length,audit.chapters.length,`SK chapter count in ${episode}`);
    let previous=-1;
    for(const [index,proof] of audit.chapters.entries()){
      const cs=languages.cs[index],sk=languages.sk[index];
      assert.equal(cs.time,proof.time,`Audited CZ time changed in ${episode}:${index}`);
      assert.equal(sk.time,proof.time,`Audited SK time changed in ${episode}:${index}`);
      assert.equal(cs.seconds,seconds(cs.time),`CZ display/seek mismatch in ${episode}:${index}`);
      assert.equal(sk.seconds,cs.seconds,`SK display/seek mismatch in ${episode}:${index}`);
      assert(cs.seconds>previous,`Nonchronological ${episode}:${index}`);previous=cs.seconds;
      assert(cs.seconds>=audit.cleanContent.startSeconds-5&&cs.seconds<audit.cleanContent.endSeconds,`Chapter outside content in ${episode}:${index}`);
      assert(Math.abs(cs.seconds-proof.audioTopicStartSeconds)<=5,`Audio timestamp outside tolerance in ${episode}:${index}`);
      assert.equal(proof.browserSeek.status,'passed',`Missing browser seek evidence in ${episode}:${index}`);
      assert.equal(proof.browserSeek.summaryCurrentTime,cs.seconds);
      assert.equal(proof.browserSeek.nonquestionCurrentTime,cs.seconds);
      assert.equal(cs.points.length,proof.points.length,`CZ point evidence count in ${episode}:${index}`);
      assert.equal(sk.points.length,cs.points.length,`SK point count in ${episode}:${index}`);
      for(const chapter of [cs,sk]){
        assert(/\?$/.test(chapter.title.trim()),`Chapter is not a question in ${episode}:${index}`);
        assert(/\s/.test(chapter.title.trim()),`Question is only a label in ${episode}:${index}`);
      }
      assert.deepEqual(numbers(cs.title),numbers(sk.title),`CZ/SK question numbers differ in ${episode}:${index}`);
      for(const [pointIndex,point] of proof.points.entries()){
        assert.deepEqual(numbers(cs.points[pointIndex]),numbers(sk.points[pointIndex]),`CZ/SK numbers differ in ${episode}:${index}:${pointIndex}`);
        assert(point.srtCues.length&&point.audioRanges.length,`Missing source evidence in ${episode}:${index}:${pointIndex}`);
        assert(point.srtCues.every(cue=>Number.isInteger(cue)&&cue>=1&&cue<=audit.source.srtCueCount),`Invalid SRT cue in ${episode}`);
        assert(point.audioRanges.every(([start,end])=>Number.isFinite(start)&&end>start&&end<=audit.source.audioDurationSeconds),`Invalid audio range in ${episode}`);
      }
    }
  }
}

import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('batch',Path(__file__).with_name('prepare-youtube-caption-batch.py'))
batch=importlib.util.module_from_spec(spec);spec.loader.exec_module(batch)
def srt(rows):
 return '\n\n'.join(f'{i}\n{a} --> {b}\n{text}' for i,(a,b,text) in enumerate(rows,1))+'\n'
class CaptionSources(unittest.TestCase):
 def test_rolling_windows_are_not_spoken_twice(self):
  raw=srt([('00:00:01,000','00:00:02,000','Prvá veta.'),('00:00:02,000','00:00:02,010','Prvá veta.\n '),('00:00:02,010','00:00:03,000','Prvá veta.\nDruhá veta.'),('00:00:03,000','00:00:03,010','Druhá veta.\n '),('00:00:03,010','00:00:04,000','Druhá veta.\nTretia veta.'),('00:00:10,000','00:00:11,000','Tretia veta.')])
  cues,report=batch.normalize_srt(raw)
  self.assertTrue(report['rollingCaptions'])
  self.assertEqual([c['text'] for c in cues],['Prvá veta.','Druhá veta.','Tretia veta.','Tretia veta.'])
 def test_ordinary_repeated_speech_is_preserved(self):
  cues,_=batch.normalize_srt(srt([('00:00:01,000','00:00:03,000','Áno, áno.'),('00:00:02,000','00:00:04,000','Áno, áno.')]))
  self.assertEqual([c['text'] for c in cues],['Áno, áno.','Áno, áno.'])
  self.assertEqual(cues[0]['end'],2)
 def test_complete_archived_episodes(self):
  for n in (363,362,361):
   cues,report=batch.normalize_srt((batch.SOURCE/f'episode-{n}-youtube-original.sk.srt').read_text())
   self.assertGreater(cues[-1]['end'],2700)
   self.assertGreater(len(cues),1000)
   self.assertEqual(report['rollingCaptions'],n==363)
   groups=batch.draft_groups(cues)
   self.assertEqual(' '.join(c['text'] for c in cues),' '.join(g['originalSk'] for g in groups))
   self.assertTrue(all(c['end']>c['start'] for c in cues))
   print(f'Episode {n}: {len(cues)} unique display lines -> {len(groups)} complete draft groups')
if __name__=='__main__': unittest.main()

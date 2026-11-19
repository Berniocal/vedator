import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('finalize',Path(__file__).with_name('finalize-youtube-caption-batch.py'))
finalize=importlib.util.module_from_spec(spec);spec.loader.exec_module(finalize)

class CaptionLayout(unittest.TestCase):
    def test_two_balanced_lines_without_orphan(self):
        text='Společně se Snyderem zkoumali gravitační kolaps. Pokrok nebyl příliš rychlý.'
        wrapped=finalize.balanced(text)
        self.assertIsNotNone(wrapped)
        self.assertEqual(wrapped.replace('\n',' '),text)
        self.assertEqual(len(wrapped.splitlines()),2)
        self.assertTrue(all(len(line)<=48 for line in wrapped.splitlines()))
        self.assertTrue(all(len(line.split())>1 for line in wrapped.splitlines()))

    def test_every_translated_word_survives_partition(self):
        sk='Spoločne so Snyderom skúmali gravitačný kolaps. Pokrok nebol príliš rýchly, pretože keď niečo nepatrí medzi vedecký mainstream, nezaoberá sa tým veľa ľudí.'
        cs='Společně se Snyderem zkoumali gravitační kolaps. Pokrok nebyl příliš rychlý, protože když něco nepatří mezi vědecký mainstream, nezabývá se tím mnoho lidí.'
        words=finalize.atoms(sk)
        times=[{'start':i*.3,'end':i*.3+.25} for i in range(len(words))]
        result=finalize.bilingual_parts(words,cs.split(),times)
        self.assertGreater(len(result),1)
        self.assertEqual(' '.join(p[4].replace('\n',' ') for p in result),sk)
        self.assertEqual(' '.join(p[5].replace('\n',' ') for p in result),cs)
        for a,b,c,d,left,right in result:
            for text in [left,right]:
                self.assertLessEqual(len(text.splitlines()),2)
                self.assertTrue(all(len(line)<=48 for line in text.splitlines()))
            self.assertGreater(times[b-1]['end'],times[a]['start'])

    def test_number_and_formula_remain_atomic(self):
        text='Misia Artemis II preletí 40 000 kilometrov. E = mc² a H₂O.'
        words=finalize.atoms(text)
        self.assertIn('40 000',words)
        self.assertIn('E = mc²',words)
        self.assertIn('Artemis II',words)
        self.assertEqual(' '.join(words),text)

if __name__=='__main__':unittest.main()

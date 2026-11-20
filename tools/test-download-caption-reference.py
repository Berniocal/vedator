import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
from pathlib import Path
import re
import tempfile
import threading
import unittest

spec = importlib.util.spec_from_file_location('reference', Path(__file__).with_name('download-caption-reference.py'))
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
PAYLOAD = bytes(range(256)) * 1024 + b'final partial range'
DIGEST = hashlib.sha256(PAYLOAD).hexdigest()


class Handler(BaseHTTPRequestHandler):
    requests = []
    def log_message(self, *_):
        pass
    def do_GET(self):
        match = re.fullmatch(r'bytes=(\d+)-(\d+)', self.headers.get('Range', ''))
        if self.path == '/denied' or not match:
            self.send_error(403)
            return
        start, end = map(int, match.groups())
        type(self).requests.append((start, end))
        self.send_response(206)
        self.send_header('Content-Range', f'bytes {start}-{end}/{len(PAYLOAD)}')
        self.send_header('Content-Length', str(end-start+1))
        self.end_headers()
        self.wfile.write(PAYLOAD[start:end+1])


class DownloadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
    def test_exact_reassembly_and_verified_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp)/'source.mp3'
            reference.download(self.url+'/audio', target, len(PAYLOAD), DIGEST, workers=3, chunk_size=65536)
            self.assertEqual(target.read_bytes(), PAYLOAD)
            before = len(Handler.requests)
            reference.download(self.url+'/denied', target, len(PAYLOAD), DIGEST)
            self.assertEqual(len(Handler.requests), before)
    def test_hash_mismatch_never_replaces_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp)/'source.mp3'
            target.write_bytes(b'previous file')
            with self.assertRaisesRegex(ValueError, 'SHA-256'):
                reference.download(self.url+'/audio', target, len(PAYLOAD), '0'*64, workers=3, chunk_size=65536)
            self.assertEqual(target.read_bytes(), b'previous file')
    def test_access_denial_is_not_retried(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(reference.urllib.error.HTTPError):
                reference.download(self.url+'/denied', Path(tmp)/'source.mp3', 10, '0'*64, workers=1)


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Fetch the unchanged source MP3 in bounded ranges, then verify its full SHA-256."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import time
import urllib.request
import urllib.error


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def download(url, output, size, expected, *, workers=16, chunk_size=1024*1024):
    output = Path(output)
    if output.is_file() and output.stat().st_size == size and sha256(output) == expected:
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='caption-reference-', dir=output.parent) as tmp:
        tmp = Path(tmp)
        ranges = [(start, min(size-1, start+chunk_size-1)) for start in range(0, size, chunk_size)]

        def fetch(bounds):
            start, end = bounds
            path = tmp / str(start)
            for attempt in range(3):
                try:
                    request = urllib.request.Request(url, headers={
                        'Range': f'bytes={start}-{end}',
                        'User-Agent': 'VedatorCaptionQA/1.0',
                        'Accept-Encoding': 'identity'})
                    began = time.monotonic()
                    with urllib.request.urlopen(request, timeout=30) as response:
                        if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{size}':
                            raise ValueError('Server did not return the exact requested source range')
                        with path.open('wb') as stream:
                            remaining = end-start+1
                            while remaining:
                                block = response.read(min(65536, remaining))
                                if not block:
                                    raise ValueError('Truncated source range')
                                stream.write(block)
                                remaining -= len(block)
                                if time.monotonic()-began > 120:
                                    raise TimeoutError('Source range exceeded its time budget')
                            if response.read(1):
                                raise ValueError('Source range contained extra bytes')
                    return path
                except Exception as error:
                    if isinstance(error, urllib.error.HTTPError) and error.code in (401, 403, 429):
                        raise
                    if attempt == 2:
                        raise
                    time.sleep(1+attempt)

        with ThreadPoolExecutor(max_workers=workers) as pool:
            tasks = {pool.submit(fetch, bounds): index for index, bounds in enumerate(ranges)}
            parts = [None] * len(ranges)
            try:
                for task in as_completed(tasks):
                    parts[tasks[task]] = task.result()
            except Exception:
                for task in tasks:
                    task.cancel()
                raise
        joined = tmp / 'complete.mp3'
        with joined.open('wb') as stream:
            for part in parts:
                with part.open('rb') as source:
                    shutil.copyfileobj(source, stream)
        if joined.stat().st_size != size or sha256(joined) != expected:
            raise ValueError('Source MP3 size or SHA-256 differs from the reviewed recording')
        os.replace(joined, output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', type=int, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    source = json.loads((root/'captions'/f'episode-{args.episode}.json').read_text())['source']
    download(source['audio'], args.output, source['audioBytes'], source['audioSha256'])
    print(json.dumps({'episode': args.episode, 'verifiedBytes': source['audioBytes'],
                      'sha256': source['audioSha256']}))


if __name__ == '__main__':
    main()

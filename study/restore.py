#!/usr/bin/env python3
"""Verify or restore losslessly compressed study evidence. Never overwrites edits."""
import argparse,gzip,hashlib,json,os,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true',help='Verify archives without restoring files');args=parser.parse_args()
manifest=json.loads((ROOT/'transfer-manifest.json').read_text());pending=[]
def digest(raw):return hashlib.sha256(raw).hexdigest()
def inside(rel):
 p=(ROOT/rel).resolve()
 if not p.is_relative_to(ROOT):raise ValueError('Path outside study folder')
 return p
for entry in manifest['compressedFiles']:
 archive=inside(entry['archive']);packed=archive.read_bytes()
 if digest(packed)!=entry['archiveSha256']:raise ValueError('Archive hash mismatch: '+entry['archive'])
 raw=gzip.decompress(packed)
 if len(raw)!=entry['bytes'] or digest(raw)!=entry['sha256']:raise ValueError('Evidence hash mismatch: '+entry['path'])
 target=inside(entry['path'])
 if target.exists() and digest(target.read_bytes())!=entry['sha256']:raise ValueError('Refusing to overwrite modified evidence: '+entry['path'])
 if not target.exists():pending.append((target,raw))
if not args.check:
 for target,raw in pending:
  target.parent.mkdir(parents=True,exist_ok=True)
  with tempfile.NamedTemporaryFile(dir=target.parent,delete=False) as fp:fp.write(raw);name=fp.name
  os.replace(name,target)
print(json.dumps({'archivesVerified':len(manifest['compressedFiles']),'restored':0 if args.check else len(pending),'missingBefore':len(pending),'mode':'check' if args.check else 'restore'}))

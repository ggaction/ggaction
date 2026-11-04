#!/usr/bin/env python3
"""Read-only verification of the portable handoff contents; runs no product code."""
import hashlib,json,sys
from pathlib import Path
base=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
manifest=json.loads((base/'MANIFEST.json').read_text())
for item in manifest['files']:
 p=(base/item['path']).resolve()
 if base not in p.parents: raise SystemExit('Unsafe manifest path: '+item['path'])
 raw=p.read_bytes()
 if len(raw)!=item['bytes'] or hashlib.sha256(raw).hexdigest()!=item['sha256']: raise SystemExit('Mismatch: '+item['path'])
print('Verified',len(manifest['files']),'handoff files; product tests were not run.')

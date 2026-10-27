#!/usr/bin/env python3
"""Package report/evidence/scripts; never package source clones or node_modules."""
import hashlib,json,zipfile
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
excluded={'report-bundle-manifest.json','report-delivery.json'}
files=[ROOT/'REPORT.ko.md',ROOT/'REPORT.ko.html',ROOT/'README.ko.md',ROOT/'ROADMAP.ko.md',ROOT/'ROADMAP.ko.html']
for folder in ['parts','scripts','evidence','roadmap']:
    files += [p for p in (ROOT/folder).rglob('*') if p.is_file() and p.name not in excluded and '__pycache__' not in p.parts]
files=sorted(files)
entries=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
manifest={'generatedAt':datetime.now(timezone.utc).isoformat(),'notice':'Analysis/report package only. Source clones and installed dependencies are excluded. Proposed feature tests are not implementation results.','files':entries}
mp=ROOT/'evidence/report-bundle-manifest.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
archive=ROOT/'ggaction-coverage-report-2026-10-27.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in files+[mp]:z.write(p,p.relative_to(ROOT))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
result={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(files)+1,'uncompressedBytes':sum(x['bytes'] for x in entries)+mp.stat().st_size,'validated':'ZIP CRC and per-file SHA-256 manifest'}
(ROOT/'evidence/report-delivery.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))

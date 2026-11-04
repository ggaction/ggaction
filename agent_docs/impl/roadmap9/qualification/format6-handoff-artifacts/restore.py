"""Restore committed diagnostic fixtures and exact frozen archives; run at repo root.
This only copies/decompresses files. It does not run tests, loaders, or product code.
"""
import gzip
import hashlib
import json
from pathlib import Path

root = Path.cwd()
qualification = root / 'agent_docs/impl/roadmap9/qualification'
for evidence, destination in [('format6-product-evidence', 'format6'), ('point-validation-evidence', 'point-validation'), ('circle-column-proof-evidence', 'column-proof-review')]:
    for source in (qualification / evidence).rglob('*.gz'):
        relative = source.relative_to(qualification / evidence)
        target = root / '.artifacts' / destination / str(relative)[:-3]
        if evidence == 'circle-column-proof-evidence' and relative.parts[0] == 'baseline-profile':
            target = root / '.artifacts/format6-sampler-profile' / str(Path(*relative.parts[1:]))[:-3]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(gzip.decompress(source.read_bytes()))
for destination, sha in [('format6','349dbf2925ab89ff2a72cafd7d86f127455b0af324cca43e04dc541b6533ba9d'), ('point-validation','186c01ea470a97e8c10a2f97e66061ef0d4a5583ae561ab1bfacd2b00a159c84')]:
    archive = qualification / 'format6-handoff-artifacts' / f'ggaction-{sha}.tgz'
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == sha
    target = root / '.artifacts' / destination / 'frozen.json'
    target.write_text(json.dumps({'file': str(archive), 'sha256': sha}, indent=2) + '\n')
print('Restored diagnostic files and verified two exact frozen archives; no tests executed.')

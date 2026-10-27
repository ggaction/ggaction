"""Read every tracked file and index metadata, JS symbols, imports, and headings.

This is a lexical navigation aid, not a substitute for semantic code review.
"""
import collections
import hashlib
import json
import pathlib
import re
import subprocess

root = pathlib.Path(__file__).resolve().parent.parent / 'ggaction'
out = pathlib.Path(__file__).resolve().parent
names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')[:-1]
records = []
for name in names:
    raw = (root / name).read_bytes()
    row = {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    try:
        body = raw.decode('utf-8')
        if '\0' in body:
            raise UnicodeError()
    except UnicodeError:
        row['kind'] = 'binary'
    else:
        row.update(kind='text', lines=len(body.splitlines()))
        if name.endswith(('.js', '.mjs', '.ts')):
            row['imports'] = sorted(set(re.findall(r'(?:from\s+|import\s*\(\s*|import\s+)[\"\x27]([^\"\x27]+)', body)))
            row['exports'] = re.findall(r'^export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)', body, re.M)
            row['functions'] = re.findall(r'^(?:export\s+)?(?:async\s+)?function\s+(\w+)', body, re.M)
            row['actionOps'] = re.findall(r'\bop:\s*[\"\x27]([^\"\x27]+)', body)
            row['tests'] = re.findall(r'\b(?:test|it|describe)\s*\(\s*[\"\x27]([^\"\x27]+)', body)
        if name.endswith(('.md', '.txt')):
            row['headings'] = [s.strip() for s in re.findall(r'^#{1,6}\s+(.+)$', body, re.M)]
        if name.endswith('.json'):
            try:
                value = json.loads(body)
                row['jsonShape'] = {'type': type(value).__name__, 'count': len(value) if isinstance(value, (dict,list)) else None,
                                    'keys': list(value)[:40] if isinstance(value,dict) else None}
            except (ValueError, RecursionError):
                row['jsonShape'] = {'unparsed': True}
    records.append(row)

summary = {'commit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),
           'files': len(records), 'text': sum(r['kind']=='text' for r in records),
           'binary': sum(r['kind']=='binary' for r in records),
           'bytes': sum(r['bytes'] for r in records),
           'lines': sum(r.get('lines',0) for r in records),
           'roots': dict(collections.Counter(r['path'].split('/')[0] for r in records))}
(out/'inventory.json').write_text(json.dumps({'summary': summary, 'files': records},ensure_ascii=False,indent=2)+'\n')
lines = ['# Tracked-file inventory', '', 'Lexical index of every tracked file at `'+summary['commit']+'`. Binary assets are indexed by size/hash; code symbols and headings are approximate extraction.', '', '| File | Lines | Bytes | Navigation cues |', '| --- | ---: | ---: | --- |']
for row in records:
    cues = row.get('exports') or row.get('actionOps') or row.get('headings') or row.get('functions') or []
    cue = ', '.join(cues[:6]).replace('|','\\|').replace('\n',' ')
    cue = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cue)
    if len(cues)>6: cue += f' (+{len(cues)-6})'
    lines.append(f"| [{row['path']}](../ggaction/{row['path']}) | {row.get('lines','binary')} | {row['bytes']} | {cue} |")
(out/'FILE_INDEX.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(summary,indent=2))

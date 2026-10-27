#!/usr/bin/env python3
"""Print a bounded task packet; never execute or approve implementation."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'roadmap'
p=argparse.ArgumentParser();p.add_argument('--task');p.add_argument('--progress-dir',type=Path);p.add_argument('--with-contracts',action='store_true');args=p.parse_args()
plan=json.loads((R/'plan.json').read_text()); tasks=plan['tasks']; states={}
def verify_file(value,base,path_key,hash_key):
 path=value.get(path_key);digest=value.get(hash_key)
 assert path and digest, f'Missing evidence path/hash: {value}'
 target=Path(path)
 if not target.is_absolute():target=base/target
 assert target.is_file(),f'Missing evidence file: {target}'
 assert hashlib.sha256(target.read_bytes()).hexdigest()==digest,f'Evidence hash mismatch: {target}'
if args.progress_dir:
 for f in args.progress_dir.glob('*.json'):
  s=json.loads(f.read_text());tid=s.get('taskId')
  if s.get('status')=='complete':
   assert s.get('implementationCommit') and s.get('commands') and s.get('artifacts'),f'Missing completion evidence: {f}'
   assert not s.get('openObligations'),f'Open obligations: {f}'
   assert all(c.get('exitCode')==0 for c in s['commands']),f'Failed command: {f}'
   for c in s['commands']:
    assert c.get('command'),f'Missing executed command: {f}'
    verify_file(c,f.parent,'logPath','logSha256')
   for a in s['artifacts']:verify_file(a,f.parent,'path','sha256')
   states[tid]=s
for tid in states:
 task=next((t for t in tasks if t['id']==tid),None);assert task,f'Unknown completed task {tid}'
 assert all(d in states for d in task['dependsOn']),f'Completed task with incomplete prerequisites: {tid}'
ready=[t for t in tasks if t['id'] not in states and all(d in states for d in t['dependsOn'])]
if args.task:
 t=next((t for t in tasks if t['id']==args.task),None)
 if not t: raise SystemExit('Unknown task ID')
else:
 if not ready: raise SystemExit('No ready task. Check actual progress and pending obligations.')
 t=ready[0]
print(f"TASK {t['id']} | {t['title']} | status {t['status']}")
print('BASELINE',plan['baseline']['commit']); print('PREREQUISITES',', '.join(t['dependsOn']) or 'none')
print('NOTICE: A printed packet does not approve public/schema/visual/release Gates. Read recorded decisions.')
print((R/'tasks'/f"{t['id']}-{t['slug']}.ko.md").read_text())
if args.with_contracts:
 for c in t['contracts']: print('\n'+(R/'contracts'/f'{c}.ko.md').read_text())
fixtures=json.loads((R/'oracle-fixtures.json').read_text())['fixtures']
for f in fixtures:
 if f['id'] in t.get('oracleFixtures',[]):print(json.dumps(f,ensure_ascii=False,indent=2))

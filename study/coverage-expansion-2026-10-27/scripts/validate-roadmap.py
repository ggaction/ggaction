#!/usr/bin/env python3
import hashlib,json,re,subprocess
from pathlib import Path
from environment import find_repository
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'roadmap';REPO=find_repository()
def j(p):return json.loads(p.read_text())
checks=[]
def check(name,ok,detail=None):checks.append({'name':name,'passed':bool(ok),'detail':detail})
plan=j(R/'plan.json');old=j(ROOT/'evidence/implementation-plan.json');tasks=plan['tasks'];byid={t['id']:t for t in tasks}
check('unique task IDs and slugs',len(byid)==len(tasks)==len({t['slug'] for t in tasks}),len(tasks))
check('active WP parity',{t['workPackage'] for t in tasks}=={w['id'] for w in old['workPackages']})
check('no withdrawn or deferred task WP',not ({'WP-01','WP-15','WP-16','WP-17','WP-23'}&{t['workPackage'] for t in tasks}))
check('all proposed statuses',all(t['status']=='planned' and not t['implementationEvidence'] for t in tasks))
seen=set();ordered=True
for t in tasks:
 ordered &= all(d in seen for d in t['dependsOn']);seen.add(t['id'])
check('dependency DAG topological and references exist',ordered)
for w in plan['workPackages']:
 first=byid[w['entryTask']];exits={x['id']:x['exitTask'] for x in plan['workPackages']}
 check('WP prerequisite closure '+w['id'],all(exits[d] in first['dependsOn'] for d in w['dependsOn']))
ats=j(R/'acceptance-cases.json')['tests'];ids={a['id'] for a in ats}
check('all 79 active acceptance groups',len(ats)==79 and ids=={x['id'] for x in old['acceptanceTests']})
check('no orphan acceptance',all(a['implementationTasks'] and all(x in byid for x in a['implementationTasks']) and a['closureTask'] in a['implementationTasks'] for a in ats))
check('acceptance ownership two-way',all(a['id'] in byid[t]['acceptanceTests'] for a in ats for t in a['implementationTasks']))
check('no claimed implementation test passes',all(a['result']=='not-run' and not a['evidence'] for a in ats))
req=j(R/'requirement-map.json')['activeRequirements'];check('30 active requirements mapped',len(req)==30 and all(r['tasks'] for r in req))
check('deferred requirements excluded',not {'USR-03','USR-04'}&{r['id'] for r in req})
check('all task contracts exist',all((R/'contracts'/f'{c}.ko.md').exists() for t in tasks for c in t['contracts']))
check('all cards emitted',len(list((R/'tasks').glob('STEP-*.ko.md')))==len(tasks))
fixtures=j(R/'oracle-fixtures.json')['fixtures'];fids={f['id'] for f in fixtures}
check('26 independent fixtures',len(fixtures)==len(fids)==26)
check('fixture task references valid',all(s in {t['slug'] for t in tasks} for f in fixtures for s in f['taskSlugs']))
check('task fixture IDs valid',all(set(t['oracleFixtures'])<=fids for t in tasks))
check('independent arithmetic passes',j(ROOT/'evidence/roadmap-oracle-validation.json')['passed'])
check('oracles do not import production',not re.search(r'(?:from|import).*src[/\.]',(ROOT/'scripts/roadmap-oracles.py').read_text()))
sources=j(R/'source-map.json');changed=[]
for f in sources['files']:
 p=REPO/f['path']
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:changed.append(f['path'])
check('92 baseline source hashes unchanged',len(sources['files'])==92 and not changed,changed)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
check('baseline revision is in current history',subprocess.run(['git','merge-base','--is-ancestor',plan['baseline']['commit'],'HEAD'],cwd=REPO,capture_output=True).returncode==0,{'baseline':plan['baseline']['commit'],'current':head})
status=subprocess.check_output(['git','status','--short','--','.',':(exclude)study'],cwd=REPO,text=True)
check('ggaction runtime checkout remains clean outside study',not status,status)
scripts=j(REPO/'package.json')['scripts'];bad=[]
for t in tasks:
 for c in t['commands']:
  if c.startswith('npm run ') and c[8:] not in scripts:bad.append(c)
  if c.startswith('node scripts/run-tests.js '):
   _,_,suite,selector=c.split(' ',3)
   prefix={'unit':'unit/','contracts':'contracts/','browser':'browser/'}
   if suite not in prefix or not selector.startswith(prefix[suite]):bad.append(c)
check('commands match current script and selector syntax',not bad,bad)
badlinks=[]
for p in [ROOT/'ROADMAP.ko.md',*R.rglob('*.ko.md')]:
 for href in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if href.startswith(('https://','http://','#')):continue
  target=p.parent/href.split('#')[0]
  if not target.exists():badlinks.append([str(p.relative_to(ROOT)),href])
check('roadmap local links resolve',not badlinks,badlinks)
matrix=j(R/'consumer-matrix.json');check('consumer matrix 30 by 19',len(matrix['rows'])==30 and len(matrix['columns'])==19)
check('consumer cells remain unverified',all(c['status']=='not-run' and not c['evidence'] for r in matrix['rows'] for c in r['cells'].values()))
doc=(ROOT/'ROADMAP.ko.md').read_text()
for token in ['schema 4','createPartitionPlot','maxStretch','pointercancel','duration0','UpSet','Flint','same-frame','G-CORE','proposed']:
 check('roadmap concept '+token,token in doc)
for t in tasks:
 card=(R/'tasks'/f"{t['id']}-{t['slug']}.ko.md").read_text()
 check('complete task packet '+t['id'],all(h in card for h in ['## 진행 상태','## 먼저 읽을 것','## 수정 위치와 경계','## 구현 순서','## 통과해야 하는 결과','## 실패와 금지','## 인수 시험 연결','## 시험 파일과 명령','## 완료 인계']))
build=j(ROOT/'evidence/roadmap-build.json');check('markdown build hash matches',build['markdownSha256']==hashlib.sha256((ROOT/'ROADMAP.ko.md').read_bytes()).hexdigest())
if (ROOT/'ROADMAP.ko.html').exists():check('HTML build hash matches',build.get('htmlSha256')==hashlib.sha256((ROOT/'ROADMAP.ko.html').read_bytes()).hexdigest())
result={'scope':'Roadmap document consistency and independent arithmetic; not ggaction feature verification','passed':all(c['passed'] for c in checks),'counts':plan['counts'],'checks':checks}
(ROOT/'evidence/roadmap-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'passed':result['passed'],'failed':[c for c in checks if not c['passed']]},ensure_ascii=False))
raise SystemExit(0 if result['passed'] else 1)

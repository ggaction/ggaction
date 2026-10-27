#!/usr/bin/env python3
"""Build planning artifacts from authored contracts and task specs; no source writes."""
import hashlib, importlib.util, json, re, subprocess
from pathlib import Path
from environment import find_repository
ROOT=Path(__file__).resolve().parents[1]
REPO=find_repository()
OUT=ROOT/'roadmap'
spec=importlib.util.spec_from_file_location('task_spec',Path(__file__).with_name('roadmap-task-spec.py'))
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
def readj(p): return json.loads(p.read_text())
def writej(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
plan=readj(ROOT/'evidence/implementation-plan.json')
wp={x['id']:x for x in plan['workPackages']}
ats={x['id']:x for x in plan['acceptanceTests']}
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
package=readj(REPO/'package.json')
tasks=[]; last={}; byslug={}
fixtures=readj(OUT/'oracle-fixtures.json')['fixtures'] if (OUT/'oracle-fixtures.json').exists() else []
modules=readj(OUT/'module-plan.json')['workPackages']
for group,contract,rows in module.GROUPS:
    previous=None
    for slug,title,steps,expect,avoid,tests in rows:
        id=f'STEP-{len(tasks)+1:03d}'
        dependencies=[previous] if previous else [last[d] for d in wp[group]['dependsOn']]
        sources=module.OWNERS[group]
        required=[contract]
        if contract not in ['core','qualification-delivery']: required+=['core']
        if group=='WP-08': required+=['hierarchy-partition','graph-inference','data-statistics']
        if group=='WP-25': required+=['graph-inference','hierarchy-partition']
        if group in ['WP-12','WP-13']: required+=['qualification-delivery']
        if group=='WP-18': required+=['interaction','animation','geo','edge-bundling','hierarchy-partition']
        unit=f'test/unit/{slug}.test.js'
        testpaths=[unit]
        commands=[f'node scripts/run-tests.js unit unit/{slug}.test.js']
        if group not in ['WP-00','WP-19','WP-20','WP-21']:
            testpaths.append(f'test/contracts/{slug}.test.js')
            commands.append(f'node scripts/run-tests.js contracts contracts/{slug}.test.js')
        if group in ['WP-11','WP-12','WP-13','WP-14','WP-18']:
            testpaths.append(f'test/browser/{slug}.browser.js')
            commands.append(f'node scripts/run-tests.js browser browser/{slug}.browser.js')
        if group in ['WP-04','WP-05','WP-07','WP-08','WP-09','WP-10','WP-22','WP-25']:
            testpaths.append(f'test/charts/{slug}/variants.render.js')
            commands.append('npm run test:render')
        if group in ['WP-00','WP-19','WP-20','WP-21']:
            testpaths=[]
            commands={'WP-00':['npm test'], 'WP-19':['npm run test:package','npm run docs:verify'],
              'WP-20':['npm test','npm run test:realistic','npm run test:coverage','npm run test:browser','npm run test:render','npm run test:package','npm run test:platform','npm run package:check','npm run docs:verify'],
              'WP-21':['node scripts/release-candidate.js --verify <candidate-manifest> <annotated-tag>']}[group]
        task={'id':id,'slug':slug,'title':title,'workPackage':group,'status':'planned',
          'dependsOn':dependencies,'contracts':list(dict.fromkeys(required)),
          'baselineOwners':sources,'proposedTestPaths':testpaths,
          'proposedModules':modules[group],
          'steps':steps.split(';'),'expected':expect,'prohibited':avoid,
          'acceptanceTests':tests.split(),'commands':commands,'implementationEvidence':[],
          'oracleFixtures':[f['id'] for f in fixtures if slug in f['taskSlugs']],
          'doneRequires':['source-and-types','independent-tests','consumer-obligations','docs-and-contracts','applicable-gates','revisioned-handoff']}
        gates=[]
        if group not in ['WP-00','WP-19','WP-20','WP-21']:
            gates.append({'id':'G-CORE','before':'unresolved public API or persisted schema implementation','independentWork':'baseline, independent oracle, pure kernel and review package'})
        if group in ['WP-04','WP-05','WP-07','WP-08','WP-09','WP-10','WP-22','WP-25']:
            gates.append({'id':'G-VISUAL','before':'new visual target public action flow','independentWork':'pure math and primitive review target'})
        if group in ['WP-11','WP-12','WP-13','WP-14']:
            gates.append({'id':'G-RUNTIME','before':'unresolved native session/event/animation public behavior','independentWork':'fixture, headless pure reducer, review package'})
        if group=='WP-10':gates.append({'id':'G-GEO','before':'public projection/camera/resource contract','independentWork':'pure projection reference checks'})
        if slug=='performance-qualification':gates.append({'id':'G-PERF','before':'claiming supported size class and performance qualification','independentWork':'measure exact baseline and proposed SLO'})
        if group=='WP-21':gates.append({'id':'G-RELEASE','before':'public release action in current authorization scope','independentWork':'local candidate checks and review evidence'})
        task['gateRequirements']=gates
        tasks.append(task);previous=id;byslug[slug]=task
    last[group]=previous
byid={t['id']:t for t in tasks}
requirements=readj(ROOT/'evidence/requirements-traceability.json')
if isinstance(requirements,dict):
    requirements=next(v for k,v in requirements.items() if isinstance(v,list) and v and isinstance(v[0],dict) and 'id' in v[0])
active=[r for r in requirements if r.get('required') is True]
acceptance=[]
for aid,at in ats.items():
    owners=[t['id'] for t in tasks if aid in t['acceptanceTests']]
    assert owners, aid
    acceptance.append({**at,'required':True,'implementationTasks':owners,'closureTask':owners[-1],
      'qualificationTask':byslug['native-qualification']['id'],
      'evidenceRequired':['input hash','exact public call or pure kernel call','independent expected','actual and diff','command and exit code','implementation commit','applicable consumer matrix'],
      'result':'not-run','evidence':[]})
requirement_map=[]
for r in active:
    aids=r.get('acceptance',r.get('acceptanceTests',[]))
    groups=r.get('workPackages',[])
    rt=[t['id'] for t in tasks if set(t['acceptanceTests'])&set(aids)]
    if not rt: rt=[t['id'] for t in tasks if t['workPackage'] in groups]
    assert rt, r
    requirement_map.append({'id':r['id'],'requirement':r.get('requirement',r.get('description','')),
      'workPackages':groups,'acceptanceTests':aids,'tasks':rt,'status':'requires-implementation-and-qualification'})
baseline_paths=sorted(set(p for ps in module.OWNERS.values() for p in ps)|{
 'AGENTS.md','src/AGENTS.md','src/actions/AGENTS.md','src/grammar/AGENTS.md','src/materialization/AGENTS.md',
 'src/layout/AGENTS.md','src/renderers/AGENTS.md','test/AGENTS.md','agent_docs/impl/AGENTS.md',
 'agent_docs/SECOND_ARCHITECTURE.md','src/actions/index.js','src/ChartProgram.js','src/core/action.js'})
source_map=[]
for rel in baseline_paths:
    p=REPO/rel;assert p.exists(),rel
    lines=p.read_text().splitlines()
    symbols=[{'line':i,'declaration':s.strip()[:180]} for i,s in enumerate(lines,1)
       if re.match(r'^(export (const|function|class)|export async function|function register|## )',s)]
    source_map.append({'path':rel,'status':'existing-at-baseline','sha256':sha(p),'lines':len(lines),'symbols':symbols,
      'sourceUrl':f'https://github.com/ggaction/ggaction/blob/{head}/{rel}'})
writej(OUT/'source-map.json',{'commit':head,'version':package['version'],'files':source_map})
writej(OUT/'acceptance-cases.json',{'status':'proposed-not-run','tests':acceptance})
writej(OUT/'requirement-map.json',{'scopeProfile':plan['scopeProfile'],'activeRequirements':requirement_map})
writej(OUT/'plan.json',{'schemaVersion':1,'status':'proposal-only','baseline':{'commit':head,'version':package['version']},
 'scopeProfile':plan['scopeProfile'],'workPackages':[{'id':g,'title':wp[g]['title'],'dependsOn':wp[g]['dependsOn'],'entryTask':next(t['id'] for t in tasks if t['workPackage']==g),'exitTask':last[g]} for g,_,_ in module.GROUPS],
 'tasks':tasks,'counts':{'tasks':len(tasks),'workPackages':len(wp),'acceptanceGroups':len(ats),'activeRequirements':len(active)}})
writej(OUT/'progress-template.json',{'schemaVersion':1,'taskId':None,'status':'planned','implementationCommit':None,
 'contractRevision':None,'gateEvidence':[],'changedFiles':[],'commands':[], 'artifacts':[],
 'independentOracleReview':None,'consumerCells':[],'openObligations':[], 'handoff':{'completed':[],'remaining':[],'nextTask':None},
 'notice':'Copy per task during implementation. Do not fill pass without executing the referenced command.'})
matrix_rows=['compound-path','pattern','image','partition-cartesian','partition-polar','tree','treemap','graph-nodes',
 'edges-hierarchical','edges-force-directed','edges-density','edges-edge-path','sankey-dag','sankey-cyclic','contour-line','contour-filled',
 'calendar','table','pyramid','ohlc','waterfall','trail','geo-shape','geo-point','geo-line','graticule',
 'rose-regression','radar-regression','streamgraph-regression','violin-regression']
cols=['create','edit','source-revise','encodings','scales','guides','composition','selection-highlight','hit','scene-animation',
 'svg','canvas','png','pdf','persistence','types','package','docs','accessibility']
writej(OUT/'consumer-matrix.json',{'status':'proposed-not-run','columns':cols,'rows':[{'capability':r,'cells':{c:{'status':'not-run','applicability':'requires-review','reason':None,'evidence':[]} for c in cols}} for r in matrix_rows]})
for task in tasks:
    prerequisite='、'.join(task['dependsOn']) or '없음'
    text=f"# {task['id']} {task['title']}\n\n## 진행 상태\n\n- [ ] 계약과 선행 단계 확인\n- [ ] 독립 실패 시험 작성\n- [ ] 구현과 모든 소비자 연결\n- [ ] 명령 실행 및 evidence 저장\n- [ ] 타입·문서·Gate·인계 종료\n\n상태 planned. 작업 묶음 {task['workPackage']}. 선행 단계 {prerequisite}. 현재 구현 또는 테스트 성공을 뜻하지 않는다.\n\n## 먼저 읽을 것\n\n"
    text+='- [공통 실행 규칙](../START_HERE.ko.md)와 [결정표](../DECISIONS.ko.md).\n'
    text+=''.join(f'- [계약 {c}](../contracts/{c}.ko.md).\n' for c in task['contracts'])
    text+='\n## 수정 위치와 경계\n\n다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.\n\n'
    text+=''.join(f'- `{p}`\n' for p in task['baselineOwners'])
    if task['proposedModules']:
        text+='\n**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.\n\n'
        text+=''.join(f"- `{m['path']}` — {m['role']}.\n" for m in task['proposedModules'])
    text+='\n새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.\n\n## 구현 순서\n\n'
    text+='\n'.join(f'{i}. {s}.' for i,s in enumerate(task['steps'],1))
    text+='\n4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.\n5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.\n'
    text+=f"\n## 통과해야 하는 결과\n\n{task['expected']}. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.\n\n## 실패와 금지\n\n{task['prohibited']}. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.\n\n## 인수 시험 연결\n\n"
    if task['oracleFixtures']:
        text+='독립 literal fixture: '+', '.join(task['oracleFixtures'])+'. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.\n\n'
    for aid in task['acceptanceTests']:
        a=ats[aid]
        text+=f"- **{aid}** 입력: {a['input']}. 기대: {a['expected']}.\n"
    text+='\nacceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.\n\n## 시험 파일과 명령\n\n'
    if task['proposedTestPaths']:
        text+='아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.\n\n'+''.join(f'- `{p}`\n' for p in task['proposedTestPaths'])
    else:
        text+='이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.\n'
    text+='\n~~~sh\n'+'\n'.join(task['commands'])+'\n~~~\n'
    text+='\n명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.\n'
    text+='\n## 완료 인계\n\nprogress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.\n'
    if task['gateRequirements']:
        text+='\n**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.\n\n'
        text+=''.join(f"- {g['id']}: {g['before']}. 먼저 진행할 수 있는 일: {g['independentWork']}.\n" for g in task['gateRequirements'])
    (OUT/'tasks'/f"{task['id']}-{task['slug']}.ko.md").write_text(text)
index=['# 실행 순서와 작업 인계','',f"총 {len(tasks)}개 실행 카드, {len(wp)}개 작업 묶음, {len(ats)}개 인수 시험군, {len(active)}개 활성 요구다. 모든 카드는 planned다.",'',
 '| 순서 | 작업 | 선행 카드 | WP |','|---|---|---|---|']
for t in tasks:
    index.append(f"| {t['id']} | [{t['title']}](tasks/{t['id']}-{t['slug']}.ko.md) | {', '.join(t['dependsOn']) or '없음'} | {t['workPackage']} |")
index+=['','## 단계 종료 표','','| WP | 첫 카드 | 종료 카드 | 선행 WP |','|---|---|---|---|']
for g,_,_ in module.GROUPS:
    first=next(t['id'] for t in tasks if t['workPackage']==g)
    index.append(f"| {g} {wp[g]['title']} | {first} | {last[g]} | {', '.join(wp[g]['dependsOn']) or '없음'} |")
index+=['','카드는 각 WP 안에서 순차 실행한다. WP 사이에는 원래 계획의 의존성을 보존한다. 현재 모델이 임의로 동시에 여러 public schema를 만들지 않게 보수적인 순서를 사용한다. 독립 작업을 실제 병렬 실행하려면 공통 계약 revision과 파일 소유자를 먼저 고정한다.','',
 '## 교차 기능 의무','','| 먼저 구현 | 뒤에서 닫을 의무 | 종료 카드 |','|---|---|---|']
for a,b,s in [('partition-navigation','focus/keyboard/bend/current-frame hit','cross-feature-integration'),('bundling-consumers','overlap selection/animation/geo/export','cross-feature-integration'),('hit-frame','실제 sampler와 current scene 교체','cross-feature-integration'),('geo-camera','gesture/LOD/tween/restore','cross-feature-integration'),('animation-envelope','source-free offline four-format export','export-restore')]:
    index.append(f"| {byslug[a]['id']} | {b} | {byslug[s]['id']} |")
(OUT/'EXECUTION_ORDER.ko.md').write_text('\n'.join(index)+'\n')
chapters=['START_HERE.ko.md','DECISIONS.ko.md','EXECUTION_ORDER.ko.md','INTEGRATION_COOKBOOK.ko.md']
chapters+=['contracts/'+p.name for p in sorted((OUT/'contracts').glob('*.ko.md'))]
parts=['# ggaction 상세 구현 로드맵\n\n'+f"기준 {package['version']} · {head} · {len(tasks)}개 실행 카드 · 79개 인수 시험군 · 30개 활성 요구\n\n"]
for name in chapters:
    p=OUT/name
    if not p.exists(): continue
    body=p.read_text()
    body=re.sub(r'^(#{1,5}) ',r'\1# ',body,flags=re.M)
    body=body.replace('](tasks/','](roadmap/tasks/').replace('](../contracts/','](roadmap/contracts/')
    parts.append(body)
parts.append('## 전체 작업 카드\n\n각 카드의 실행 명령은 계획이며 이번 문서 작업에서 수행한 ggaction 기능 테스트가 아니다.\n')
for t in tasks:
    body=(OUT/'tasks'/f"{t['id']}-{t['slug']}.ko.md").read_text()
    body=re.sub(r'^(#{1,4}) ',r'\1## ',body,flags=re.M)
    body=body.replace('](../contracts/','](roadmap/contracts/').replace('](../START_HERE','](roadmap/START_HERE').replace('](../DECISIONS','](roadmap/DECISIONS')
    parts.append(body)
(ROOT/'ROADMAP.ko.md').write_text('\n\n'.join(parts))
writej(ROOT/'evidence/roadmap-build.json',{'status':'planning-artifacts-only','baselineCommit':head,'counts':{'tasks':len(tasks),'workPackages':len(wp),'acceptanceGroups':len(ats),'activeRequirements':len(active),'consumerRows':len(matrix_rows),'consumerColumns':len(cols)},'markdownBytes':(ROOT/'ROADMAP.ko.md').stat().st_size,'markdownSha256':sha(ROOT/'ROADMAP.ko.md')})
print(json.dumps({'tasks':len(tasks),'AT':len(ats),'requirements':len(active),'sourceFiles':len(source_map),'markdownBytes':(ROOT/'ROADMAP.ko.md').stat().st_size}))

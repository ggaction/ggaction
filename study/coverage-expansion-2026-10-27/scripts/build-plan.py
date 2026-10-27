#!/usr/bin/env python3
"""Build proposed work packages and traceability. Does not assert conformance."""
import csv
import json
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def dump(name, value):
    (ROOT / 'evidence' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

# Stable IDs are report-local proposals, not GitHub issues or implemented tasks.
work_rows = [
('WP-00','원본·환경·oracle 기준 고정',[], '고정 커밋, 원본 hash, reference engine/font/data manifest, source behavior capture', 'study harness; external fixture package', ['AT-01','AT-02']),
('WP-01','dialect·asset·정정 원장',['WP-00'], '루트/중첩 전수 분류, schema/engine 결과 분리, repair ledger와 data binding', 'external translator; asset resolver (new)', ['AT-03','AT-04','AT-05']),
('WP-02','안정적인 item identity와 lineage',['WP-00'], 'logical dataset/revision/row/item keys, lineage, key 없는 교체 정책', 'src/actions/data/revise.js; src/actions/data/revisionBindings.js; src/scene.js; src/inspection.js', ['AT-06','AT-07','AT-08']),
('WP-03','resource·schema·persistence 확장',['WP-02'], 'selection/parameter/geometry/layout resource 소유권, schema 3 migration, inspection', 'src/core/ChartProgram.js; src/grammar; src/persistence; types/program.d.ts', ['AT-09','AT-10']),
('WP-04','복합 path와 geometry 계약',['WP-03'], '복수 subpath, fill rule, bounds/clip/flatten, 모든 renderer와 scene 동등성', 'src/grammar/pathCommands.js; src/grammar/schemas; src/renderers; src/scene.js', ['AT-11','AT-12']),
('WP-05','paint·image·font 자원',['WP-03','WP-04'], 'pattern/필수 gradient/image, resource hash/resolve/export, text metrics', 'src/grammar/paint.js; src/renderers; src/actions/textMetrics; asset resolver (new)', ['AT-13','AT-14','AT-15']),
('WP-06','data transform·expression·조건부 인코딩',['WP-01','WP-03'], '관측 AST/functions/pivot 및 통계 차이, parameter dependency, 조건부 채널', 'src/actions/data; src/grammar/computed.js; src/grammar/transforms.js; src/actions/encodings', ['AT-16','AT-17','AT-18']),
('WP-07','design·guide·responsive composition',['WP-03','WP-05'], '14theme token mapping, layout solve, typography, nested facets, issue258 원본', 'src/actions/guides; src/materialization; src/actions/composition; src/grammar', ['AT-19','AT-20','AT-21']),
('WP-08','구조형·연속 기하 layout',['WP-02','WP-04','WP-06'], 'hierarchy/tree/treemap/sunburst/graph/flow/contour/calendar의 의미 있는 data/layout 액션', 'src/actions/data; domain layout modules (new); src/grammar', ['AT-22','AT-23','AT-24','AT-25']),
('WP-09','51 chart facade와 세부 variant',['WP-06','WP-07','WP-08'], '기존 조합 우선; funnel/gauge/table/trail 등 부족한 role별 마크와 guide', 'src/actions/charts; src/actions/marks; src/grammar/plotComposition.js; external adapters', ['AT-26','AT-27','AT-28']),
('WP-10','geo 전체 경로',['WP-02','WP-04','WP-05','WP-07'], 'GeoJSON/TopoJSON/identity, projection/join/fit, LOD/camera/geo marks', 'geo resource/kernel/materializer (new); src/grammar; src/renderers', ['AT-29','AT-30','AT-31','AT-32']),
('WP-11','semantic hit와 공간 인덱스',['WP-02','WP-04','WP-07'], 'CSS/DPR/composition/clip/frame 기반 hit, guide roles와 원본 records', 'src/inspection.js; src/scene.js; hit-test module (new)', ['AT-33','AT-34']),
('WP-12','selection·gesture·입력 controller',['WP-03','WP-06','WP-11'], '23preset, legacy/new selection, parameter bind, linked views, keyboard widgets', 'interaction entry/runtime (new); src/actions/selection; types (new)', ['AT-35','AT-36','AT-37','AT-38']),
('WP-13','retained updates·host 상태',['WP-07','WP-10','WP-12'], '7ops, overlay/freeform, preview/commit/cancel, async settlement, clear/reset', 'interaction session (new); adapter update mapping (new)', ['AT-39','AT-40','AT-41']),
('WP-14','transition planner·sampler·player',['WP-02','WP-04','WP-07','WP-10','WP-11'], '정적 보간과 typed kernel, enter/update/exit, interrupt/seek/timeline, frame export', 'src/scene.js; animation entry/planner/player (new); types/scene.d.ts', ['AT-42','AT-43','AT-44','AT-45']),
('WP-15','Flint public prepare·capability 경계',['WP-00'], 'upstream 공개 중립 analysis/layout contract와 capability admission 설계', 'Flint core/index.ts; interactive/spec/compose.ts; public types/exports', ['AT-46']),
('WP-16','Flint 완전 adapter·host 연결',['WP-09','WP-10','WP-13','WP-14','WP-15'], '모든 registry/type/property/native behavior, exact adapter interface, React/MCP/Python/export 경로', 'external Flint adapter (new); Flint mount/React/site/MCP/Python/export', ['AT-47','AT-48','AT-49']),
('WP-17','코퍼스 전수 native translator',['WP-01','WP-06','WP-09','WP-10','WP-12','WP-14'], '원본 pointer→public action plan, 모든 파일과 embedded 출현 추적, faithful recipes', 'external translator/corpus qualification package (new)', ['AT-50','AT-51','AT-52']),
('WP-18','접근성·export·복원 종단검증',['WP-05','WP-12','WP-13','WP-14'], 'keyboard/focus/accessible data, SVG/Canvas/PNG/PDF, offline program/animation 재생', 'src/accessibility.js; src/renderers; src/persistence; browser tests', ['AT-53','AT-54','AT-55']),
('WP-19','성능·배포패키지·문서·agent 지원',['WP-16','WP-17','WP-18'], '성능 SLO와 memory cleanup, clean consumer, current action/LLM/capability docs', 'test/browser; scripts/package-consumer.js; knowledge; agent_docs; docs; types', ['AT-56','AT-57','AT-58']),
('WP-20','전수 qualification과 독립 검토',['WP-00','WP-16','WP-17','WP-18','WP-19'], '모든 source requirement/fixture의 상태와 증거를 닫고 mismatch 원인 검토', 'qualification manifest/dashboard (new); all test suites', ['AT-59','AT-60']),
('WP-21','릴리스 후보와 공개 산출물 검증',['WP-20'], '동일 tarball CI/package/docs/registry artifact 확인, 외부 호환성 manifest 동봉', 'existing release workflow; package/docs publication', ['AT-61']),
]

test_rows = [
('AT-01','4저장소 commit/hash와 전체 파일 수를 재계산','snapshot과 298/51/154/1981/24957+30 분모 일치; 새 파일은 diff 행으로 추가'),
('AT-02','고정 source engine/font/locale/timezone/DPR/viewport로 reference 생성','반복 출력·데이터·geometry·event trace가 재현되며 버전/hash가 evidence에 있음'),
('AT-03','root24957+embedded30을 schema/dialect/source-engine로 분리 검사','invalid/unknown/unavailable도 원장에서 유지; 조용한 repair·제외 0'),
('AT-04','named/URL/relative/inline data와 font/map/image를 offline replay','사용 자원 hash 일치; 없는 data는 source-blocked, 빈 차트 성공 금지'),
('AT-05','340 source delta와 6 normalization-only 가족 비교','pointer별 효과와 dialect 근거; 0009hover/0011zoom/0002responsive 원복 확인'),
('AT-06','3rows 중1row값변경, 정렬, append/delete, reload','명시 key가 같은 항목 identity 유지; old program 불변; generated key 할당 보존'),
('AT-07','duplicate/null key 및 key없는 전체 set-data 교체','명시 error/occurrence/mapping/new-identity 정책; 자동 잘못 매칭 없음'),
('AT-08','aggregate/bin/stack/fold/lookup/facet 후 hit·filter·revise','contributing row lineage와 grain 정확; series/owner/facet key 충돌 없음'),
('AT-09','schema3 selection/highlight 프로그램을 새 버전에서 load/edit/save','기존 상태 동등, indices→rowkey 변환 근거 보존, ambiguous 참조 명시 오류'),
('AT-10','새 모든 resource/action을 serialize→새프로세스 load→edit','등록/스키마 검증·trace·inspection 일치, DOM/function/cache 유입 없음'),
('AT-11','outer ring+hole+islands와 nonzero/evenodd를 모든 renderer로 출력','구멍이 실제 비어 있음; transparency/overlay에서도 topology 동일'),
('AT-12','open/closed curved path, clipping, bounds, invalid commands','정확한 stroke/fill/bounds, finite geometry, canonical 변환 오차 한계 검증'),
('AT-13','7texture와 요구 gradient/alpha를 SVG/Canvas/PNG/PDF에 출력','pitch/phase/색/투명도/clip 일치, 지원 안 하는 paint 무음 대체 0'),
('AT-14','원본 image 3개와 asset 실패/CORS/abort/export','fit/aspect/clip 보존; 사전 진단; dispose 후 load callback 없음'),
('AT-15','고정font+fallback+한글+긴label+font load delay','실제 font hash 측정과 render 일치, stale layout 없음, line break/origin 검증'),
('AT-16','관찰된 모든 expression AST/function과 null/date/string 경계','원 dialect oracle와 값/오류 일치, eval/global access 없음'),
('AT-17','모든 transform과 stats의 numeric fixtures','독립 수식·불변식 일치; pivot/loess/bin/window/timezone/DST 포함'),
('AT-18','parameter→filter→aggregate→scale→조건부 encoding 연쇄','정확한 dependency invalidation; cycle 오류; 모든 condition branch 실행'),
('AT-19','14theme의 모든 token 및 explicit override/null/false/0','resolved provenance와 모양 일치; 팔레트만 바꾸고 완료 금지'),
('AT-20','unit/layer/facet/concat/repeat와 shared/independent guides','plot/content/full bounds 정렬, empty cell·responsive 폭 처리, bounded layout convergence'),
('AT-21','원본0522/0628/0944 및 세행 full-bounds fixture','원본 hash 유지, header/plot/footer geometry 오차 원인 해결; tolerance 올려 숨김 금지'),
('AT-22','hierarchy/tree/treemap/sunburst의 단일/다층/빈/잘못된 구조','cycle/orphan 진단, containment/면적/각도보존, stable sibling key'),
('AT-23','graph/circular/force와 Sankey DAG/edge특수경우','deterministic seed, node/link lineage·유량/폭보존, tooltip/adjacency/native behavior'),
('AT-24','2D histogram contour의 saddle/hole/disconnected/empty','원 estimator/bin/threshold semantics 및 topology 일치, KDE로 임의 대체 없음'),
('AT-25','calendar 윤년/연말/DST/weekStart/누락날짜','날짜→cell mapping과 month boundary, timezone/aggregation 정확'),
('AT-26','51이름/50family의 등록154backend-profile fixtures','차트당 mark/data/guide/behavior parity, alias 입력 보존, source profile 명시'),
('AT-27','funnel/gauge/bullet/OHLC/waterfall/table/KPI/sparkline','role별 의미·hit, delta/total·threshold·column alignment, 단일 giant path 우회 없음'),
('AT-28','trail와 polar/radar/rose/streamgraph/violin variants','variable width/area/angle/baseline/bandwidth가 원본과 일치, missing/negative/zero 정책'),
('AT-29','모든 source projection+identity/reflectY+US inset','forward/inverse/fit/clip oracle와 일치; planar 경로에 spherical 처리 없음'),
('AT-30','GeoJSON/TopoJSON hole/dateline/pole/geometrycollection/null','ring/feature identity·clipping·join 정확; NaN path와 hidden-backside hit 없음'),
('AT-31','custom geography levels와 region join, county/stateLOD','중복/미매칭 정책, LOD hysteresis, 선택·annotation rebase, asset hash 보존'),
('AT-32','geo pan/zoom/globe rotate/region fit/reset/resize/tween','camera와 host viewport 왕복, anchor 유지, ±180경도·clipped inverse 처리'),
('AT-33','모든 geometry와 legend/axis/header/title hit at DPR1/2/3','CSS좌표 기준 same semantic target, clip/occlusion/stroke tolerance와 provenance 정확'),
('AT-34','animation frame hit와 overlapping enter/exit/crossfade','현재 보이는 geometry 선택, semantic key 중복 이벤트 없음'),
('AT-35','23preset의 모든 옵션/기본값/reset/gesture충돌','visible 결과+getState+events 모두 일치, 실제 pointer/touch/keyboard 시퀀스'),
('AT-36','brushx/y/angular/lasso/log/time/category의 down→move→cancel/up','domain invert/0-2π crossing/빈선택·capture정리; commit1회 또는 cancel1회'),
('AT-37','legacy/new params와 bind/empty/toggle/nearest/resolve','canonical324selection/263binding 등 실제 feature 요구 재현; 이름만 번역한 dummy 없음'),
('AT-38','linked brush/filter/legend/reorder/controls/contextmenu','scope·order·focus 보존, origin loop 없음, 삭제된 data/child 선택 reconciliation'),
('AT-39','7update ops와 retain/preview/setUpdates/clearUpdate/reset','baseline 복구, opacity 누적 없음, viewport supersede 특례와 overlay 자체data 지원'),
('AT-40','host vs reader event·viewport tween·partialtarget','원 계약/관찰 차이를 profile로 명시; previous/state/event sequence 정확'),
('AT-41','mount/update/asset/resize 중 cancel/destroy/reentry','stale 결과 덮어쓰기0, 중복destroy안전, listener/timer/DOM leak0'),
('AT-42','t=0,.25,.5,.75,1와 duration0의 deterministic transition','endpoint 동일, 색/형상/guide/kernel sample 수치와 topology 올바름'),
('AT-43','play/pause/seek/reverse/rate/repeat/interrupt','현재 frame에서 이어짐, finished상태정확, virtualclock 재현'),
('AT-44','logscale/polar/geo/layout/data 동시변경','transformed-space·camera kernel 정확, 잘못된 topology morph와 flicker 없음'),
('AT-45','animation envelope 저장→offline 새프로세스 replay','endpoint/asset/font/kernel 버전고정, same time same frame, reduced motion 보존'),
('AT-46','Flint public package consumer로 prepare/capability호출','private deep import0, nonVL interaction 삭제 해결, optionaldependency lazy loading'),
('AT-47','adapter interface 전메서드와 interactive surface','typecheck+실제호출, viewports/layout/context/state/refresh/update/destroy 일치'),
('AT-48','874Flint 요구와 registry밖 property/nativebehavior','각 row에 fixture/evidence; property enum·boundary·inapplicability 누락0'),
('AT-49','React/MCP/Python/site/gallery/static-export 경로','backend선택→동일program/behavior, 기존 external artifact route 기능보존'),
('AT-50','1981대표원본과 모든 추가 root/embedded 후보','각파일/JSONpointer 상태존재, invalid/unknown 미완료보존, duplicate alias 추적'),
('AT-51','모든 번역 recipe의 AST와 feature→step coverage','public domain action만 사용, rawgraphics/private/렌더러fallback/행별좌표loop0'),
('AT-52','원본+native의 의미/배치/픽셀/입력/시간 비교','각적용layer 통과, source hash/repair/profile 고정, frozen-target replay와구분'),
('AT-53','keyboard focus·screenreader표·tooltip·reducedmotion','차트 정보와 actionable targets 접근 가능, hidden/filter 상태 일치, focus 복구'),
('AT-54','SVG/Canvas/PNG/PDF·frame export 비교','같은 semantic/geometry, asset embedding/font/clip 정확, vector/raster역할명시'),
('AT-55','저장된 interacted chart/geo/animation offline 재개','필수자원 동봉, 상태/선택/viewport 복원, functions/network숨은의존없음'),
('AT-56','sizeclass별 startup/update/hit/frame/memory benchmark','사전에고정한SLO통과, 장비·size·P50/P95 기록, 반복mount/dispose 안정'),
('AT-57','npm pack clean consumer, SSR/browser/Node/types','소스checkout없는환경에서실행, optionaldeps 격리, schema/types/runtime일치'),
('AT-58','catalog/contracts/types/examples/docs/LLM/MCP 산출물 검사','new API계약누락0, executableexamples통과, planned와current지원구분'),
('AT-59','전체 requirement→workpackage→test→evidence graph 검사','orphan0, 필요한unqualified/unsupported/unknown0이어야최종완료'),
('AT-60','모든 실패 diff 독립검토와 성공 stratified sample review','통계/폰트/레이아웃/입력원인별판정, baseline대량재생성으로실패덮음없음'),
('AT-61','동일 candidate tarball을CI·설치·출판·docs에서hash대조','모든필수CI통과+공개artifact동일; externalqualificationmanifest 버전동봉'),
]

revision = runpy.run_path(str(ROOT/'scripts/scope-revision.py'))
revision['build_evidence']()
work_rows, test_rows = revision['revise_work_tests'](work_rows, test_rows)
native = runpy.run_path(str(ROOT/'scripts/native-design-revision.py'))
work_rows, test_rows, retired_work, retired_tests = native['revise'](work_rows, test_rows)

tests=[{'id':a,'input':b,'expected':c,'status':'proposed-not-run'} for a,b,c in test_rows]
test_ids={t['id'] for t in tests}
work=[{'id':a,'title':b,'dependsOn':c,'deliverables':d,'implementationTouchpoints':e.split('; '),'acceptance':f,'required':True,'status':'proposed-not-implemented'} for a,b,c,d,e,f in work_rows]
assert len({w['id'] for w in work})==len(work)
assert all(t in test_ids for w in work for t in w['acceptance'])
seen=set()
for w in work:
    assert set(w['dependsOn']) <= seen, (w['id'],w['dependsOn'])
    seen.add(w['id'])

flint=json.loads((ROOT/'evidence/flint-requirements.json').read_text())
category_work={
 'chart-family':['WP-09','WP-16'], 'chart-property':['WP-09','WP-16'],
 'native-backend-behavior':['WP-12','WP-16'], 'public-contract-field':['WP-15','WP-16'],
 'interaction-preset':['WP-12','WP-13','WP-16'], 'encoding-action':['WP-06','WP-16'],
 'theme-preset':['WP-07','WP-16'], 'cross-cutting':['WP-16','WP-20'],
}
requirements=[]
for r in flint['requirements']:
    owners=list(category_work[r['category']])
    text=json.dumps(r,ensure_ascii=False).lower()
    if r['category']=='chart-family':
        chart=r.get('chart','').lower()
        if chart in ['map','choropleth']: owners.insert(0,'WP-10')
        elif chart in ['network graph','sankey diagram','tree','treemap','sunburst chart','density contour','calendar heatmap']: owners.insert(0,'WP-08')
    requirements.append({'id':r['id'],'origin':'Flint extracted requirement','sourceEvidence':'evidence/flint-requirements.json', 'workPackages':owners,'status':'requires-qualification','acceptance':['AT-48','AT-59']})

features=json.loads((ROOT/'evidence/corpus-features.json').read_text())
all_features=sorted(set(f for group in features.values() for f in group))
def feature_owner(f):
    if f.startswith(('geo:','projection:','projectionProperty:')) or f in ['mark:geoshape','channel:longitude','channel:latitude','channel:longitude2','channel:latitude2']: return ['WP-10','WP-17']
    if f.startswith(('interaction:','selection','bind:','eventStream:','param','syntax:params','syntax:legacy-selection')): return ['WP-12','WP-17']
    if f.startswith(('expression','transform','aggregate:','timeUnit:','data:','fieldType:')): return ['WP-06','WP-17']
    if f.startswith(('layout:','composition:','facet:','resolve','repeat:','axis:','legend:','header:','config','title:','scale:')): return ['WP-07','WP-17']
    if f=='mark:image': return ['WP-05','WP-17']
    if f.startswith(('mark:','markProperty:','channel:','encoding','sort:')): return ['WP-09','WP-17']
    return ['WP-01','WP-17']
for i,f in enumerate(all_features,1):
    requirements.append({'id':f'CF-{i:04d}','origin':'corpus observed feature declaration','feature':f,'sourceEvidence':'evidence/corpus-features.json','groups':[g for g,items in features.items() if f in items],'workPackages':feature_owner(f),'status':'requires-dialect-and-qualification','acceptance':['AT-50','AT-51','AT-52']})

requirements = native['trace'](revision['apply_trace'](requirements))
native['evidence'](requirements, retired_work, retired_tests)

dump('implementation-plan.json', {'status':'proposal-only','notice':'Active work packages implement native ggaction design. External audits are reference-only; integration and translation work/tests are withdrawn. Not completed implementations. KPI/Gauge excluded; dual Y prohibited; source counts are unchanged. File paths are touchpoints; new modules are marked new. Requirement routing is ownership triage, not proof of capability.','scopeProfile':native['PROFILE'],'withdrawnWorkPackages':retired_work,'withdrawnAcceptanceTests':retired_tests,'deferredPlan':json.loads((ROOT/'evidence/deferred-set-visualization-plan.json').read_text()),'workPackages':work,'acceptanceTests':tests})
dump('requirements-traceability.json', {'status':'proposal-only','counts':{'flint':len(flint['requirements']),'corpusFeatureKinds':len(all_features),'userRequirements':22,'nativeRequirements':10,'referenceOnly':2279,'deferred':2,'active':len(requirements)-2281,'total':len(requirements)},'notice':'Observed features are overlapping declaration kinds, not counts of fully compatible charts. All rows remain unqualified. Read source inventory for pointers/values.','requirements':requirements})
with (ROOT/'evidence/requirements-traceability.csv').open('w',newline='') as fp:
    writer=csv.writer(fp);writer.writerow(['id','origin','feature','work_packages','acceptance','status','source_evidence','scope_disposition','policy_ids','target_representation','scope_reason','required'])
    for r in requirements: writer.writerow([r['id'],r['origin'],r.get('feature',''),' '.join(r['workPackages']),' '.join(r['acceptance']),r['status'],r['sourceEvidence'],r['scopeDisposition'],' '.join(r['policyIds']),r['targetRepresentation'],r['scopeReason'],r['required']])

lines=['## 14. 구현 작업 패키지와 의존 관계','', f'아래 {len(work)}개 작업은 모두 최종 목표에 포함된다. `WP-00`의 조사 기준은 이번 산출물로 시작할 수 있지만 향후 reference renderer와 실제 입력 oracle까지 완성해야 한다. 모든 상태는 **제안/미구현**이며 구현 완료나 추정 개발 기간을 뜻하지 않는다. 공개 API·schema 변경은 저장소 계약 절차로 확정하고, 각 작업에서 types/contracts/tests/docs를 함께 수정한다.','', '| ID | 작업과 산출물 | 선행 작업 | 인수 시험 |','|---|---|---|---|']
for w in work: lines.append(f"| {w['id']} | **{w['title']}** — {w['deliverables']} | {', '.join(w['dependsOn']) or '없음'} | {', '.join(w['acceptance'])} |")
lines+=['','### 14.1 코드 소유 위치와 병렬 작업','', '| ID | 구현 접점 — `(new)`는 제안 위치/모듈 |','|---|---|']
for w in work: lines.append(f"| {w['id']} | "+'; '.join('`'+p+'`' for p in w['implementationTouchpoints'])+' |')
lines+=['', '개정 정책 WP-26을 먼저 적용한다. partition WP-22, inference WP-24, bundling WP-25는 모두 필수이며 상세 계약은 부록 F에 있다. critical path는 identity/resource → compound geometry/layout → geo/hit → interaction/animation → native runtime → 전수 검증이다. data/expression, design/layout, hierarchy/graph는 공통 계약 이후 병렬화할 수 있다. 여러 작업이 같은 core schema를 각자 정의하지 않도록 `WP-03`의 resource와 migration 계약을 먼저 고정한다.','', '외부 차트 이름별 PR로 나누기보다 공통 기반과 의미 단위로 나눈다. 한 PR은 domain action+validator+materializer+renderer 적용+types+문서+독립 oracle까지 수직으로 완결한다. 단, API 이름이나 snapshot만 먼저 올리고 runtime이 비어 있는 상태를 지원 완료로 표시하지 않는다.','', '### 14.2 요구사항 추적 원장','', f"Flint {len(flint['requirements'])}개 추출 요구사항, 코퍼스 {len(all_features)}종 관찰 feature, 사용자 요구 22개와 native capability 10개를 합친 **{len(requirements)}행**의 [요구사항 원장](evidence/requirements-traceability.json)을 만들었다. [CSV](evidence/requirements-traceability.csv)에서는 작업 소유권과 시험 ID를 필터링할 수 있다. 이 행들은 서로 다른 단위이며 합계를 차트 수나 지원률로 해석하면 안 된다. 개별 옵션의 값/위치/원본 목록은 원 source inventory에 연결되어 있다. 외부 관찰 2,279행은 reference-only이며 작업·시험 소유권과 release 의무가 없다. 사용자/native 30행이 active 원장이며 UpSet 관련2행은 deferred-by-user다. 현재 routing은 구현 소유권 배정이며 합격 증거가 아니다.", '', 'WP-01/15/16/17 및 AT-03/05/46–52는 철회했다. ID를 재사용하지 않고 [철회 기록](evidence/withdrawn-flint-plan.json)에 남긴다. 외부 adapter/parity/번역은 선행 조건이 아니다.','', 'UpSet 및 집합 시각화 WP-23, USR-03/04, AT-66–69는 후속 과제로 이관했다. 관련 data/API/interaction도 이번 필수 범위가 아니다. [후속 기록](evidence/deferred-set-visualization-plan.json)을 참고한다.','', '## 15. 인수 시험 명세','', f'다음 {len(tests)}개는 실제 입력과 기대 결과를 정한 **추가해야 할 시험군**이다. 이번 조사에서 실행한 19개 core probe, 154개 Flint compile, 46개 번역 replay와 혼동하지 않는다. 각 행은 요구 옵션과 사례를 전개하는 generator/fixture 묶음이며 한 테스트 함수만 추가하라는 뜻이 아니다.','', '| ID | 입력·시나리오 | 반드시 확인할 결과 |','|---|---|---|']
for t in tests: lines.append(f"| {t['id']} | {t['input']} | {t['expected']} |")
(ROOT/'parts/55-generated-plan.ko.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'workPackages':len(work),'acceptanceTestGroups':len(tests),'flintRequirements':len(flint['requirements']),'corpusFeatureKinds':len(all_features),'traceabilityRows':len(requirements)}))

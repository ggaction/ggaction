"""Latest decision: ggaction design is authoritative; Flint is reference-only."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROFILE='ggaction-native-2026-10-27'
RETIRED_WORK={'WP-01','WP-15','WP-16','WP-17'}
RETIRED_TESTS={'AT-03','AT-05','AT-46','AT-47','AT-48','AT-49','AT-50','AT-51','AT-52'}
DEFERRED_WORK={'WP-23'}
DEFERRED_TESTS={'AT-66','AT-67','AT-68','AT-69'}
CAPABILITIES=[
('GGA-01','Native semantic data and chart composition','data transforms, statistical summaries, Cartesian/polar marks, layers/facets/adjacent panels and traceable recipes',['WP-06','WP-07','WP-09'],['AT-17','AT-20','AT-26','AT-27','AT-28']),
('GGA-02','Native design and theme system','typography, colors, patterns/gradients, explicit precedence, responsive guides and layout; no external theme token parity',['WP-05','WP-07'],['AT-13','AT-15','AT-19','AT-20']),
('GGA-03','Structure and geometric layouts','tree, treemap, Sankey, contour, calendar, table/cell layout, stable node/edge/region semantics',['WP-08','WP-09'],['AT-22','AT-23','AT-24','AT-25','AT-27']),
('GGA-04','Selection and direct inspection','hover/tooltip, single/multi/group selection, brush/lasso/angular selection, semantic hit on marks and guides',['WP-11','WP-12'],['AT-33','AT-34','AT-35','AT-36']),
('GGA-05','Coordinated interactive views','linked selection/filter, parameter controls, legend visibility, reorder, annotations, keyboard/touch, context commands',['WP-12','WP-13'],['AT-37','AT-38','AT-39','AT-40','AT-41']),
('GGA-06','Native state and lifecycle','immutable committed state, preview/commit/cancel, typed commands and events, revision ordering, disposal',['WP-02','WP-03','WP-13'],['AT-06','AT-09','AT-10','AT-39','AT-40','AT-41']),
('GGA-07','Animation and timeline','identity matching, enter/update/exit, typed interpolation, keyframes/playback, interruption, frame export, reduced motion',['WP-14','WP-18'],['AT-42','AT-43','AT-44','AT-45','AT-54']),
('GGA-08','Geo resources and navigation','GeoJSON/TopoJSON, spherical/planar coordinates, projections, holes/clip/join, zoom/pan/rotation, LOD and export',['WP-10','WP-12','WP-14'],['AT-29','AT-30','AT-31','AT-32','AT-44']),
('GGA-09','Readable and reproducible public APIs','public action contracts, identity/lineage, persistence, inspection, documentation/agent cards, installed-package use',['WP-03','WP-18','WP-19'],['AT-10','AT-55','AT-57','AT-58','AT-89','AT-90']),
('GGA-10','Native correctness and design independence','independent math/geometry/state/time oracles, composition, performance and native-only release gates; no external parity or translation',['WP-19','WP-20','WP-21'],['AT-56','AT-59','AT-60','AT-61','AT-91','AT-92']),
]
def write(name,obj): (ROOT/'evidence'/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def revise(work,tests):
    retiredW=[{'id':a,'title':b,'required':False,'status':'withdrawn-by-user','reason':'External conformance, backend integration and corpus translation are no longer implementation goals.'} for a,b,*_ in work if a in RETIRED_WORK]
    retiredT=[{'id':a,'input':b,'expected':c,'required':False,'status':'withdrawn-not-run'} for a,b,c in tests if a in RETIRED_TESTS]
    replacements={
      'WP-00':('현행 기반·독립 oracle 고정','ggaction 계약·수치/geometry/state/time oracle와 환경/hash 고정; 외부 자료는 역사적 참고'),
      'WP-06':('data transform·expression·조건부 인코딩','native AST/functions/pivot/statistics, parameter dependency와 조건부 채널의 자체 의미 계약'),
      'WP-07':('ggaction 디자인·가이드·반응형 조합','자체 theme/typography/paint/guide 우선순위와 layout solve, nested facets, 자체 합성 fixture의 배치 검증'),
      'WP-09':('native 차트 표현과 공통 조합 recipe','ggaction domain semantics와 기존 액션 조합; Pyramid/table/trail/OHLC 등 역할 보강; 외부 chart catalog parity 불필요'),
      'WP-12':('native selection·gesture·입력 controller','선택/brush/lasso/linked views/filter/legend/reorder/annotation/navigation/accessibility를 자체 계약으로 설계'),
      'WP-13':('native 상태·명령·이벤트·lifecycle','committed baseline+preview, commit/cancel, typed updates/events, async settlement, clear/reset; 외부 op 수·이름 고정 없음'),
      'WP-20':('native 계약·조합·성능 qualification','GGA/USR 요구의 증거를 닫고 독립 oracle 검토; 외부 참고 행은 gate 밖'),
      'WP-21':('릴리스 후보와 공개 산출물 검증','동일 tarball CI/package/docs/registry artifact 확인, native capability qualification 동봉'),
      'WP-26':('자체 설계 원칙·단일 Y·조합·명칭','ggaction-native 정책, 단일 Y frame validator, 조합 recipe, Pyramid 명칭; 외부 adapter 필수 아님'),
    }
    write('deferred-set-visualization-plan.json',{'reason':'Latest user instruction defers UpSet and set visualization to later; no current release obligation.','status':'deferred-by-user','workPackages':[{'id':a,'title':b,'required':False,'status':'deferred-by-user','previousDependsOn':c,'previousAcceptance':f} for a,b,c,d,e,f in work if a in DEFERRED_WORK],'acceptanceTests':[{'id':a,'input':b,'expected':c,'required':False,'status':'deferred-not-run'} for a,b,c in tests if a in DEFERRED_TESTS],'deferredAPIs':['createSetData','createIntersectionData','createUpSetPlot']})
    out=[]
    for a,b,c,d,e,f in work:
        if a in RETIRED_WORK | DEFERRED_WORK:continue
        b,d=replacements.get(a,(b,d));c=[x for x in c if x not in RETIRED_WORK | DEFERRED_WORK];f=[x for x in f if x not in RETIRED_TESTS | DEFERRED_TESTS]
        e=e.replace('adapter update mapping (new)','native command/event contract (new)').replace('; external adapters','').replace('external adapters; ','')
        if a=='WP-05': f=list(dict.fromkeys(f+['AT-04']))
        if a=='WP-00': e='native fixture/oracle harness (new)'
        if a in ['WP-20','WP-26']:f=list(dict.fromkeys(f+['AT-92']))
        out.append((a,b,c,d,e,f))
    changes={
      'AT-01':('ggaction baseline·공개 action/schema·환경 hash','기준 버전과 계약 추적, native fixture hash 재현; 외부 저장소 실행 불필요'),
      'AT-02':('독립 numeric/geometry/state/time reference 생성','동일 native 입력에서 결정적 출력과 반복 가능한 oracle; 외부 엔진 필수 아님'),
      'AT-04':('native data/font/map/image resource offline replay','자원 hash·binding·오류·abort 정확; source dialect/번역 의무 없음'),
      'AT-16':('ggaction expression AST/function과 null/date/string 경계','자체 타입·오류·수치 계약 일치, eval/global access 없음; 외부 DSL 번역 제외'),
      'AT-21':('nested facet·3행 full-bounds·긴label·resize 합성 fixture','공통 header/plot/footer 정렬과 text metrics 정확; corpus source ID 재현 의무 없음'),
      'AT-37':('native parameter/selection bind/empty/toggle/nearest/resolve','자체 의미와 선언된 option 계약 정확; legacy/new 외부 selection 번역 제외'),
      'AT-14':('native image asset와 load failure/CORS/abort/export','fit/aspect/clip·사전 진단·dispose 뒤 callback 없음'),
      'AT-23':('graph/circular/force와 Sankey DAG/cyclic/edge 경계','deterministic seed, node/link lineage·유량/폭·cycle routing·tooltip/adjacency'),
      'AT-24':('native histogram/KDE contour의 saddle/hole/disconnected/empty','선택한 estimator/bin/threshold 계약과 독립 수치·topology oracle 일치'),
      'AT-28':('trail/polar/radar/rose/streamgraph/violin native variants','width/area/angle/baseline/bandwidth의 자체 의미·수식·missing/negative/zero 계약'),
      'AT-19':('ggaction theme token schema·override/null/false/0','자체 precedence와 provenance·typography·paint·guide 일치; 외부14theme 복제 불필요'),
      'AT-26':('native chart capability와 조합 recipe 전수','GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지'),
      'AT-29':('자체 projection API와 native-supported projection/planar/inset','수학 reference 및 forward/inverse/fit/clip 검증; Flint preset parity 아님'),
      'AT-32':('geo pan/zoom/rotate/region fit/reset/resize/tween','native camera/viewport 왕복·anchor·dateline·clipped inverse 정확'),
      'AT-35':('native interaction command와 gesture/options/reset 충돌','자체 상태·event·화면 계약 일치, 실제 pointer/touch/keyboard; Flint preset 이름 불필요'),
      'AT-39':('native update commands와 preview/commit/cancel/reset','불변 baseline·결정적 overlay·도메인 갱신; 외부7ops 특례 복제 없음'),
      'AT-40':('programmatic/user 입력의 native event 순서','origin/phase/revision 명확, 중복 commit0, preview취소와 async settlement 정확'),
      'AT-59':('active GGA/USR requirement→work→test→evidence','active orphan0·미완료0; reference-only 외부2,279행은 gate 분모 제외'),
      'AT-83':('Pyramid 공개 명칭과 단계형 geometry','이전 Funnel 의미·order·gap·value 보존; 외부 alias 구현은 의무 아님'),
      'AT-86':('독립 facet/concat panels·y2 range·polar/geo','합법적 별도 frame/범위 endpoint 오탐0; native frame 의미로 단일 Y 검증'),
      'AT-87':('KPI/Gauge 전용 API 제외와 docs/LLM scope','필수개발·새 facade로 재유입0; 외부 입력 adapter admission은 의무 아님'),
      'AT-88':('native 정책과 외부 참고 원장의 분리','native fixture에 단일Y·조합·제외 정책 적용; 외부 reference-only를 pass/필수로 집계하지 않음'),
      'AT-91':('native completion manifest와 기존 CI','필수 GGA/USR qualification과 공개artifact 일치; 외부 호환성·번역 미요구'),
      'AT-61':('동일 candidate tarball을CI·설치·출판·docs에서hash대조','필수CI통과+공개artifact동일; native capability evidence 버전 동봉'),
    }
    tests=[(a,*changes[a]) if a in changes else (a,b,c) for a,b,c in tests if a not in RETIRED_TESTS | DEFERRED_TESTS]
    tests.append(('AT-92','core/API/event/defaults/dependency/release gate 독립성','Flint·번역기 import, upstream 변경·adapter·corpus parity의 필수 의존0; native 기능 축소0'))
    return out,tests,retiredW,retiredT

def trace(rows):
    out=[]
    for r in rows:
        r['workPackages']=[w for w in r['workPackages'] if w not in RETIRED_WORK | DEFERRED_WORK]
        r['acceptance']=[t for t in r['acceptance'] if t not in RETIRED_TESTS | DEFERRED_TESTS]
        if r['origin'] in ['Flint extracted requirement','corpus observed feature declaration']:
            r.update(priorScopeDisposition=r['scopeDisposition'],scopeDisposition='reference-only',required=False,status='reference-only-not-qualified',workPackages=[],acceptance=[],policyIds=['POL-09' if r['origin']=='Flint extracted requirement' else 'POL-10'],targetRepresentation=None,scopeReason='External observation only. No API/behavior/visual parity, adapter, translation or release obligation.')
        else:r['required']=True
        if r['id'] in ['USR-03','USR-04']:
            r.update(required=False,scopeDisposition='deferred-by-user',status='deferred-not-implemented',workPackages=[],acceptance=[],policyIds=['POL-02'],targetRepresentation='future set visualization project',scopeReason='Latest user instruction defers UpSet and set visualization; no current prerequisite or release obligation.')
        if r['id']=='USR-14':r['requirement']='Pyramid naming and preserved stage geometry; external aliases reference-only'
        if r['id']=='USR-17':r['requirement']='KPI/Gauge dedicated support excluded; native docs/catalog reflect scope'
        if r['id']=='USR-18':r['requirement']='Native scope policy and reference-only external audit rows'
        out.append(r)
    out.append({'id':'USR-21','origin':'explicit user scope revision','requirement':'ggaction design takes precedence; no Flint conformance or backend integration obligation','sourceEvidence':'evidence/scope-policy.json','workPackages':['WP-26','WP-20'],'acceptance':['AT-92'],'status':'requires-qualification','scopeDisposition':'required','required':True,'targetRepresentation':'native public contracts','policyIds':['POL-09'],'scopeReason':'Latest user instruction.'})
    out.append({'id':'USR-22','origin':'explicit user scope revision','requirement':'Translation is a separate project; no corpus translator, source parity or source fixture closure required here','sourceEvidence':'evidence/scope-policy.json','workPackages':['WP-26','WP-20'],'acceptance':['AT-92'],'status':'requires-qualification','scopeDisposition':'required','required':True,'targetRepresentation':'native capability development','policyIds':['POL-10'],'scopeReason':'Latest user instruction.'})
    native=[]
    for a,b,d,w,t in CAPABILITIES:
        native.append({'id':a,'origin':'ggaction native capability design','requirement':b,'description':d,'sourceEvidence':'evidence/native-capability-requirements.json','workPackages':w,'acceptance':t,'status':'requires-qualification','scopeDisposition':'required','required':True,'targetRepresentation':'native reusable actions/resources/runtime','policyIds':['POL-09'],'scopeReason':'Explicitly adopted native functionality; no external contract inheritance.'})
    write('native-capability-requirements.json',{'profile':PROFILE,'status':'proposal-only','requirements':native})
    return out+native

def evidence(rows,retiredW,retiredT):
    p=json.loads((ROOT/'evidence/scope-policy.json').read_text());p['supersedes']=p['profile'];p['profile']=PROFILE
    p['policies'].append({'id':'POL-09','decision':'Native ggaction design is authoritative. Flint audit is reference only; no conformance/backend/upstream dependency. Retain prior native feature scope.','disposition':'required'})
    p['policies'].append({'id':'POL-10','decision':'External chart translation is a separate project and outside this implementation plan. Preserve references without corpus qualification obligations.','disposition':'required'})
    for policy in p['policies']:
        if policy['id']=='POL-02':policy.update(decision='UpSet and set visualization deferred to a future project, including membership/intersection resources and dedicated API/interaction tests.',disposition='deferred-by-user')
    p['deferredFeatures']={'setVisualization':{'status':'deferred-by-user','required':False,'releaseGate':False,'workPackages':['WP-23'],'userRequirements':['USR-03','USR-04'],'acceptanceTests':sorted(DEFERRED_TESTS)}}
    p['externalReferences']={'Flint':{'role':'reference-only','conformanceRequired':False,'backendIntegrationRequired':False,'releaseGate':False},'chart-llm':{'role':'reference-only','translationRequired':False,'releaseGate':False}}
    p['completionClaim']='Native ggaction capability correctness only; no external compatibility or translation claim'
    p['userRequirements']=[{k:r[k] for k in ['id','requirement','policyIds','workPackages','acceptance','required','scopeDisposition']} for r in rows if r['id'].startswith('USR-')]
    p['counts']['notice']='Historical external census, not a mandatory capability denominator.'
    write('scope-policy.json',p)
    fixture=json.loads((ROOT/'evidence/revision-oracle-fixtures.json').read_text())
    if 'upset' in fixture:
        write('deferred-upset-oracle-fixture.json',{'status':'deferred-reference-only','notice':'Future work only; not an active test or release gate.','upset':fixture.pop('upset')})
        write('revision-oracle-fixtures.json',fixture)
    m=json.loads((ROOT/'evidence/target-chart-mapping.json').read_text());m['profile']=PROFILE;m['notice']='Historical source mapping for reference only. No chart-family parity or adapter implementation obligation.'
    for c in m['charts']:
        c['priorScopeDisposition']=c['scopeDisposition'];c['scopeDisposition']='reference-only';c['required']=False;c['qualification']='not-required';c['policyIds']=['POL-09']
        c['scopeReason']='Historical comparison only; ggaction native design is authoritative.'
    write('target-chart-mapping.json',m)
    write('withdrawn-flint-plan.json',{'reason':'Latest user instructions remove external conformance/integration and translation requirements. IDs retained for history, not active dependencies.','workPackages':retiredW,'acceptanceTests':retiredT})

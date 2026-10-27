"""Authoritative user-scope overlay. Preserves observed-source evidence."""
import csv, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROFILE='user-scope-2026-10-27'
POLICIES=[
('POL-01','Unified partition: Icicle and Sunburst','required'),
('POL-02','Set membership and UpSet','required'),
('POL-03','Hierarchical, force-directed, density, edge-path bundling','required'),
('POL-04','Rule-based graph inference','required'),
('POL-05','Funnel renamed Pyramid without geometry or meaning change','renamed'),
('POL-06','KPI Card and Gauge Chart','excluded-by-user'),
('POL-07','Marginal, Bullet, Combo through existing actions','required-via-composition'),
('POL-08','One Y scale and at most one Y guide per Cartesian plot frame','prohibited-by-user'),
]
NEW_TESTS=[
('AT-62','동일 hierarchy에서 Icicle/Sunburst 생성','같은 normalized partition/node ID, value·순서·선택 동등'),
('AT-63','partition 수치 fixture와 zero/internal value/forest/cycle','독립 기대 interval·합·containment; 잘못된 구조 명시 오류'),
('AT-64','partition orientation/padding/rootVisible/deep tree/작은 wedge','finite geometry·clip·label·hit 일치; radial area 의미 명시'),
('AT-65','partition focus/filter/breadcrumb/keyboard/coordinate morph','같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion'),
('AT-66','UpSet long/wide/array 입력과 duplicate/null/explicit universe','distinct membership 일치; none/unobserved와 unknown 구분'),
('AT-67','UpSet A/B/C exact·inclusive·project 수치 fixture','AB exact1/inclusive2, set size3/3/2, project none2; weight 별도'),
('AT-68','UpSet 64/128/1000 sets·topK·empty combination','signature 충돌0, 2^S 무조건 열거0, 누락 count·query 의미 유지'),
('AT-69','UpSet matrix/bar alignment·sort·filter·linked attributes','shared band 정렬, element lineage·키보드·query save/load·resize 유지'),
('AT-70','kNN directed/union/mutual와 ties·duplicate points','수작업 fixture edge 일치, stable ID tie, 0거리 edge 유지'),
('AT-71','radius/similarity/metric/preprocessing 경계','inclusive radius, cosine zero/Jaccard empty/geo units/null 정책과 provenance'),
('AT-72','MST/forest/group/sequence rule','독립 Kruskal 결과, component 수·비용, group 경계·lag·edge budget'),
('AT-73','exact accelerator와 opt-in approximate search','brute-force exact 일치, approximate seed/recall 기록, 무음 sampling0'),
('AT-74','data revise/k change/layout drag/resize와 graph selection','topology invalidation 이유 정확, node/edge ID 및 observed/inferred 보존'),
('AT-75','네 bundling 방법 공통 입력 불변성','graph/adjacency/node position 불변, edge ID/count/direction/weight·endpoint 보존'),
('AT-76','HEB hierarchy mapping/LCA/strength0·1/누락 endpoint','independent hierarchy path oracle, 직선 endpoint, missing mapping 진단'),
('AT-77','FDEB compatibility/subdivision/schedule/zero·opposite edges','paper reference numeric oracle, deterministic double buffer, finite 고정 endpoint'),
('AT-78','KDE grid/gradient/endpoint pin/direction/resample','density reference와 tolerance, vector route 보존, grid 밖 NaN0'),
('AT-79','Edge-path connected/disconnected/directed/stretch','route provenance 실제 graph path, maxStretch 준수, fallback·locking 결정적'),
('AT-80','bundle 겹침/선택/unbundle/tooltip/keyboard','candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility'),
('AT-81','bundle animate/interrupt/seek/revise/geo date line','endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0'),
('AT-82','bundling sizeclass/abort/worker/cache/export','stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등'),
('AT-83','Funnel source→Pyramid rename과 기존 source Pyramid','원 단계 geometry·order·gap·value 보존, FCH-018/032 target 충돌0'),
('AT-84','Marginal/Bullet/Combo action AST와 composition fixtures','전용 constructor0, 공통 layout/scale/role 사용, 같은 frame Y 공유'),
('AT-85','같은 frame에 두 Y scale/guide·숨긴축·mirror axis','모두 정책 오류, 독립 scale 숨김·overlaid frame 우회 금지'),
('AT-86','독립 facet/concat/UpSet panels·y2 range·polar/geo','합법적 별도 frame/범위 endpoint 오탐0; source independentYAxis 의미 판별'),
('AT-87','KPI/Gauge admission 및 docs/LLM/catalog scope','정확한 excluded 진단, 새 facade/필수 구현으로 재유입0'),
('AT-88','원본 corpus/Flint fixture별 policy disposition','source hash/row 보존, excluded/prohibited와 pass 분리, unresolved scope0 at closure'),
('AT-89','새 resource/action save/load/type/schema/clean consumer','JSON codec·refs·version·lineage 왕복, source checkout/DOM 숨은 의존0'),
('AT-90','신규 domain docs/agent packet/recipes/option presets','planned/current 구분, parameter defaults/version 고정, 실행 예제와 negative cases'),
('AT-91','개정 scope completion manifest와 기존 CI','필수 in-scope+USR qualification, 제외 사유 공개, 원본100% parity 과장0'),
]
NEW_WORK=[
('WP-26','사용자 범위·단일 Y·조합·Pyramid 명칭',['WP-03','WP-07'], '정책 schema/admission, FCH별 target mapping, 조합 recipe, 단일 Y frame validator', 'policy/admission module (new); src/actions/composition; external adapters; docs', ['AT-83','AT-84','AT-85','AT-86','AT-87','AT-88']),
('WP-22','Icicle·Sunburst 공통 partition',['WP-02','WP-03','WP-04','WP-06'], 'normalized hierarchy partition, Cartesian/polar materializer, stable focus와 coordinate kernel', 'hierarchy layout/materializer (new); src/actions/charts; src/grammar', ['AT-62','AT-63','AT-64','AT-65']),
('WP-23','집합 데이터·교집합·UpSet',['WP-02','WP-03','WP-06','WP-07','WP-26'], 'membership/intersection resource, exact/inclusive query, aligned bar/matrix composition', 'set data/actions (new); src/actions/composition; src/grammar', ['AT-66','AT-67','AT-68','AT-69']),
('WP-24','규칙 기반 graph inference',['WP-02','WP-03','WP-06'], 'kNN/radius/similarity/MST/group/sequence, metric/preprocessing/provenance와 edge limits', 'graph inference data actions (new); src/grammar; types', ['AT-70','AT-71','AT-72','AT-73','AT-74']),
('WP-25','네 대표 edge bundling 방법',['WP-04','WP-08','WP-22','WP-24'], 'HEB/FDEB/KDE/edge-path, 독립 EdgeRouteResource, endpoint/identity/direction 보존', 'edge routing kernels/materializer (new); src/inspection; src/renderers', ['AT-75','AT-76','AT-77','AT-78','AT-79','AT-80','AT-81','AT-82']),
]
USER_ROWS=[
('USR-01','Icicle and Sunburst unified partition',['POL-01'],['WP-22'],['AT-62','AT-63','AT-64']),
('USR-02','Partition focus, interaction and coordinate animation',['POL-01'],['WP-22','WP-12','WP-14'],['AT-65']),
('USR-03','UpSet membership and intersection semantics',['POL-02'],['WP-23'],['AT-66','AT-67']),
('USR-04','UpSet sparse scaling and aligned interactive composition',['POL-02','POL-08'],['WP-23','WP-12'],['AT-68','AT-69']),
('USR-05','kNN inference and symmetrization',['POL-04'],['WP-24'],['AT-70']),
('USR-06','Radius and similarity inference with metrics',['POL-04'],['WP-24'],['AT-71']),
('USR-07','MST, forest, group and sequence rules',['POL-04'],['WP-24'],['AT-72']),
('USR-08','Inference determinism, exactness, provenance and lifecycle',['POL-04'],['WP-24','WP-12','WP-14'],['AT-73','AT-74']),
('USR-09','Hierarchical edge bundling',['POL-03'],['WP-25'],['AT-75','AT-76']),
('USR-10','Force-directed edge bundling',['POL-03'],['WP-25'],['AT-75','AT-77']),
('USR-11','Density/KDE bundling',['POL-03'],['WP-25'],['AT-75','AT-78']),
('USR-12','Edge-path bundling',['POL-03'],['WP-25'],['AT-75','AT-79']),
('USR-13','Bundled edge hit/interaction/animation/geo/export/performance',['POL-03'],['WP-25','WP-10','WP-11','WP-12','WP-14','WP-18','WP-19'],['AT-80','AT-81','AT-82']),
('USR-14','Funnel rename only and source Pyramid collision',['POL-05'],['WP-26','WP-09','WP-16'],['AT-83']),
('USR-15','Marginal/Bullet/Combo composition without dedicated public API',['POL-07'],['WP-26','WP-09'],['AT-84']),
('USR-16','No multiple Y scales or guides in one frame',['POL-08'],['WP-26','WP-16','WP-17'],['AT-85','AT-86']),
('USR-17','KPI and Gauge excluded with accurate admission',['POL-06'],['WP-26','WP-16','WP-19'],['AT-87']),
('USR-18','Preserved source rows and scoped compatibility claims',['POL-06','POL-08'],['WP-26','WP-20'],['AT-88','AT-91']),
('USR-19','New domain resource persistence and installed package',['POL-01','POL-02','POL-03','POL-04'],['WP-18','WP-19'],['AT-89']),
('USR-20','Human and agent docs and full revised release gate',['POL-01','POL-02','POL-03','POL-04','POL-05','POL-06','POL-07','POL-08'],['WP-19','WP-20','WP-21'],['AT-90','AT-91']),
]
def dump(name,data): (ROOT/'evidence'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def revise_work_tests(work,tests):
    updates={
      'WP-08':{'deliverable':'tree/treemap/graph/flow/contour/calendar의 data/layout; partition은 WP-22와 공유'},
      'WP-09':{'title':'허용 source variants와 공통 조합 recipe','deps':['WP-22','WP-23','WP-25','WP-26'],'deliverable':'Pyramid/table/trail/OHLC 등 공통 role 보강; Marginal/Bullet/Combo는 기존 액션 조합; KPI/Gauge 제외'},
      'WP-12':{'deps':['WP-22','WP-23','WP-24','WP-25','WP-26']},
      'WP-14':{'deps':['WP-22','WP-23','WP-24','WP-25','WP-26']},
      'WP-16':{'title':'사용자 범위의 Flint adapter·host 연결','deliverable':'scope admission 후 허용 registry/property/native behavior와 interface·host 경로; excluded/prohibited 명시'},
      'WP-17':{'deliverable':'모든 source row 보존·scope 판정 후 허용 원본 native 번역; 금지 표현의 재표현은 별도 variant'},
      'WP-18':{'tests':['AT-89']},'WP-19':{'tests':['AT-90']},
      'WP-20':{'deps':['WP-22','WP-23','WP-24','WP-25','WP-26'],'tests':['AT-88','AT-91'],'deliverable':'in-scope 및 USR 전수 qualification, 제외/금지 정확성, unresolved scope 제거'},
    }
    out=[]
    for a,b,c,d,e,f in work:
        u=updates.get(a,{}); out.append((a,u.get('title',b),list(dict.fromkeys(c+u.get('deps',[]))),u.get('deliverable',d),e,list(dict.fromkeys(f+u.get('tests',[])))))
    out+=NEW_WORK
    ordered=[];done=set()
    while len(ordered)<len(out):
        candidates=[w for w in out if w[0] not in done and set(w[2])<=done]
        if not candidates: raise ValueError('Cyclic work dependencies')
        for w in candidates: ordered.append(w);done.add(w[0])
    edits={
      'AT-20':('unit/layer/facet/concat/repeat와 허용 scale/guide scope','frame별 Y 하나; 분리된 facet 독립 scale 허용, bounds와 responsive 정렬'),
      'AT-22':('hierarchy/tree/treemap의 단일/다층/빈/잘못된 구조','cycle/orphan·containment·stable ID; 통합 partition은 AT-62~65'),
      'AT-26':('원본51이름/154등록 전체 원장과 개정 scope 판정','KPI/Gauge 제외·dual-Y 금지 별도; 허용 fixture의 mark/data/guide/behavior parity'),
      'AT-27':('Pyramid/OHLC/waterfall/table/sparkline와 reference-band 조합','role별 의미·hit·정렬, KPI/Gauge 전용 개발 제외, 별도 Bullet facade0'),
      'AT-48':('874Flint 요구의 disposition과 허용 property/native behavior','각 row에 정책/fixture/evidence; 제외를 pass로 세지 않음'),
      'AT-50':('1981원본과 추가 root/embedded 전수 scope screening','원본별 pointer/hash 보존; 금지 variant 명시; 허용 원본의 미완료 보존'),
      'AT-59':('source+USR requirement→work→test→evidence graph','orphan0, 허용 요구 미완료0, scope-review0; excluded/prohibited별 검증'),
    }
    return ordered,[(a,*edits[a]) if a in edits else (a,b,c) for a,b,c in tests]+NEW_TESTS

def disposition(r):
    chart=r.get('chart','')
    file=r.get('declaration',{}).get('file','')
    if chart in ['Gauge Chart','KPI Card'] or Path(file).stem in ['gauge','kpi-card']:
        return ('excluded-by-user',None,['POL-06'],'Dedicated KPI/Gauge support removed; retain source evidence.')
    if chart=='Funnel Chart': return ('renamed','stage-pyramid',['POL-05'],'Rename only; preserve source semantics and geometry.')
    if chart=='Pyramid Chart':return ('required-via-composition','mirrored-bars',['POL-05','POL-07'],'Original source population-style pyramid, distinct from renamed Funnel.')
    if chart=='Combo Chart' or Path(file).stem=='combo':return ('scoped-conditional','shared-y-layer-composition',['POL-07','POL-08'],'Original two-measure y/y1 variant prohibited; shared-Y alternatives are re-expressed, not source-equivalent.')
    if chart in ['Bullet Chart','Marginal Plot']:return ('required-via-composition','existing-action-recipe',['POL-07','POL-08'],'No dedicated public constructor; separate panels may each own one Y scale.')
    if r.get('property',{}).get('key')=='independentYAxis':return ('scoped-conditional','facet-scope-resolution',['POL-08'],'Facet independent Y is allowed; layered independent Y is prohibited. Inspect resolved frame scope.')
    if chart=='Sunburst Chart':return ('required','unified-partition-polar',['POL-01'],'Shared partition with new Icicle.')
    return ('required','source-profile-native-actions',[],'Subject to frame-level policy admission on every concrete fixture.')

def apply_trace(requirements):
    source=json.loads((ROOT/'evidence/flint-requirements.json').read_text())['requirements'];byid={x['id']:x for x in source}
    for r in requirements:
        if r['id'] in byid:
            raw=byid[r['id']];d,t,p,why=disposition(raw)
            r.update(scopeDisposition=d,targetRepresentation=t,policyIds=p,scopeReason=why)
            r['sourceChart']=raw.get('chart')
            if d=='excluded-by-user':
                r.update(status='excluded-awaiting-admission-verification',workPackages=['WP-26','WP-16','WP-20'],acceptance=['AT-87','AT-88','AT-91'])
            elif p:
                r['workPackages']=list(dict.fromkeys(r['workPackages']+['WP-26']+(['WP-22'] if 'POL-01' in p else [])))
                r['acceptance']=list(dict.fromkeys(r['acceptance']+['AT-83' if 'POL-05' in p else 'AT-86' if 'POL-08' in p else 'AT-62']))
        else:
            r.update(scopeDisposition='scoped-conditional',targetRepresentation='native-action-plan',policyIds=['POL-08'],scopeReason='Feature kind is not a fixture. Inspect declaration scope and resolved frame before qualification.')
    for a,b,p,w,t in USER_ROWS: requirements.append({'id':a,'origin':'explicit user scope revision','requirement':b,'sourceEvidence':'evidence/scope-policy.json','workPackages':w,'acceptance':t,'status':'requires-qualification','scopeDisposition':'required','targetRepresentation':'see Appendix F','policyIds':p,'scopeReason':'Latest user instruction or necessary implementation contract.'})
    return requirements

def build_evidence():
    catalog=json.loads((ROOT/'evidence/flint-catalog.json').read_text())
    charts=[]
    for c in catalog['charts']:
        d,t,p,why=disposition(c);charts.append({**c,'scopeDisposition':d,'targetRepresentation':t,'policyIds':p,'scopeReason':why,'qualification':'not-run'})
    excluded=[c for c in charts if c['scopeDisposition']=='excluded-by-user']
    counts={'sourceChartNames':len(charts),'sourceBackendEntries':sum(len(c['backends']) for c in charts),'excludedChartNames':len(excluded),'excludedBackendEntries':sum(len(c['backends']) for c in excluded)}
    counts.update(namesBeforeOptionPolicy=counts['sourceChartNames']-counts['excludedChartNames'],backendEntriesBeforeOptionPolicy=counts['sourceBackendEntries']-counts['excludedBackendEntries'])
    dump('target-chart-mapping.json',{'profile':PROFILE,'notice':'Overlay, not source inventory mutation. Conditional rows need fixture-level admission.','counts':counts,'charts':charts})
    dump('scope-policy.json',{'profile':PROFILE,'authority':'Latest user instruction in this conversation','status':'approved-scope-proposed-implementation','policies':[{'id':i,'decision':d,'disposition':s} for i,d,s in POLICIES],'singleY':{'unit':'Cartesian plot frame','maxYScales':1,'maxVisibleYGuides':1,'independentPanelsAllowed':True,'hiddenIndependentScaleAllowed':False,'rangeEndpointY2Allowed':True},'mandatoryBundlingMethods':['hierarchical','force-directed','density','edge-path'],'mandatoryInferenceRules':['knn','radius','similarity-threshold','mst','group-rule','sequence-rule'],'completionClaim':'Conforms to user-scope-2026-10-27, not unconditional source parity','counts':counts,'userRequirements':[{'id':a,'requirement':b,'policyIds':p,'workPackages':w,'acceptance':t} for a,b,p,w,t in USER_ROWS]})
    dump('revision-oracle-fixtures.json',{'notice':'Hand-derived expected values for planned tests, not ggaction execution.','partition':{'input':{'root':10,'A':6,'A1':2,'A2':4,'B':4},'intervals':{'root':[0,1],'A':[0,.6],'B':[.6,1],'A1':[0,.2],'A2':[.2,.6]},'cartesianWidth1000':{'A':600},'polarFullTurnAnglePiUnits':{'A':1.2}},'upset':{'sets':{'A':['e1','e2','e3'],'B':['e2','e3','e4'],'C':['e3','e5']},'universe':['e1','e2','e3','e4','e5','e6'],'exact':{'A':1,'B':1,'C':1,'A,B':1,'A,C':0,'B,C':0,'A,B,C':1,'':1},'inclusiveAB':2,'setSizes':{'A':3,'B':3,'C':2},'projectAB':{'A':1,'B':1,'A,B':2,'':2}},'graph':{'positions':{'a':0,'b':1,'c':3,'d':10},'k':1,'directed':['a>b','b>a','c>b','d>c'],'union':['a-b','b-c','c-d'],'mutual':['a-b'],'radius2Inclusive':['a-b','b-c'],'mst':[{'edge':'a-b','distance':1},{'edge':'b-c','distance':2},{'edge':'c-d','distance':7}],'mstTotal':10}})
    # Hash original observation files: this revision must never rewrite them.
    names=['flint-catalog.json','flint-requirements.json','flint-chart-mapping.json','corpus-files.json','corpus-originals.json','corpus-embedded-specs.json']
    fp=ROOT/'evidence/pre-revision-source-hashes.json'
    hashes={n:hashlib.sha256((ROOT/'evidence'/n).read_bytes()).hexdigest() for n in names}
    if fp.exists(): assert json.loads(fp.read_text())==hashes, 'Original source evidence changed'
    else: dump(fp.name,hashes)
    return counts

if __name__=='__main__':print(json.dumps(build_evidence()))

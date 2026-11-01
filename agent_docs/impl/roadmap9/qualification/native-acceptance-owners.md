# Native 역할·수치 acceptance owner 감사

## 진행 상태

- [x] 기존 전체 승인과 원 AT-23/27/28 요구 재확인
- [x] 현재 계약과 실제 발견 가능한 시험 본문 대조
- [x] 전체 범위의 담당 시험이 확인된 AT-27/28만 assigned로 연결
- [x] AT-23의 미확인 flow tooltip 시험을 구체적인 pending 사유로 기록
- [x] 구조 검사와 변경 범위 보존 확인
- [x] 검증된 metadata checkpoint로 기록

기준은 `8ca777e65`의 현재 소스다. [전체 승인](../AUTHORIZATION.json)을 재사용한다.
원 요구는 `study/coverage-expansion-2026-10-27/roadmap/acceptance-cases.json`의 해당 세 항목을
읽기 전용으로 대조했다. 제품 manifest/validator에 역사 자료 의존을 추가하지 않는다.
정본은 `test/native-capabilities.json`; assigned는 시험 담당자 지정이며 실행 통과가 아니다.
최종 후보 qualification은 [기존 판정 계약](native-completion.md)을 그대로 따른다.

## AT-27: 역할·hit·순서

현재 계약 `PYRAMID.md`, `OHLC.md`, `WATERFALL.md`, `TABLE.md`, `NATIVE_POLICY.md`를
등록한다. 모두 `agent_docs/contract/current/` 아래의 기존 문서다.

| 원 요구 | 기존 발견 가능한 시험과 확인한 assertion |
| --- | --- |
| Pyramid 단계 의미·순서·hit | `test/unit/grammar/pyramid-layout.test.js`: literal trapezoid, width/area, 네 방향, 원 순서, percent/zero. `test/unit/pyramid-plot.test.js`: logical body/label 키, 선택·실제 hit와 source revision. |
| OHLC 역할·순서·hit | `test/unit/grammar/financial-roles.test.js`: high/low/open/close literal, 상승/하락/doji, 누락 원행. `test/unit/ohlc-plot.test.js`: compound 역할과 원행, 재정렬 후 typed key, 실제 compound hit. |
| Waterfall 역할·순서·hit | 같은 financial oracle의 독립 누적식·명시 total/reset와 `test/unit/waterfall-plot.test.js`의 연결선, 원행 projection, actual hit. |
| Table cell·sparkline 의미·순서·hit | `test/unit/grammar/table-cells.test.js`, `table-data.test.js`: typed cell key, 정렬, 전체 원본 기준 footer, sparkline x 순서·공유 domain·missing gap. `test/unit/materialization/table-content.test.js`: literal cell/bar/sparkline 좌표. `test/unit/table-plot.test.js`: header/body/footer identity, row/column 재정렬, clip 내부 실제 hit와 접근성 원값. |
| Reference-band 조합 | `test/unit/composition-recipes.test.js`: ranges→measure→target 순서, 한 quantitative scale, 값·resize·원본 revision, 실제 measure hit와 zero 의미. |
| KPI/Gauge 제외·별도 Bullet facade 없음 | `test/contracts/native-api-policy.test.js`: Full/Basic 및 action inventory에 제외 API가 없고 generic resource 우회도 거부. `test/contracts/composition-recipes.test.js`: 기존 공개 domain action만 사용하며 별도 facade와 low-level primitive authoring 없음. |

위 경로들을 하나의 assigned owner에 연결한다. 별도 KPI/Gauge 개발을 요구에 추가하지 않으며
recipe helper를 공개 library facade로 세지 않는다. 다른 consumer cell의 담당자와 실행 상태는 변경하지 않는다.

## AT-28: 폭·면적·각도·기준선·대역폭

현재 계약 `TRAIL.md`, `CORE.md`, `ENCODINGS.md`, `COMPLETE_CHARTS.md`, `VIOLIN_PLOTS.md`를
등록한다. 다음 시험은 공개 호출과 lower numeric owner를 함께 확인하는 기존 파일이다.

| 원 요구 | 기존 발견 가능한 시험과 확인한 assertion |
| --- | --- |
| Trail width와 area, missing/negative/zero | `test/unit/grammar/trail.test.js`: 독립 polygon area, width/2 normal, join/cap, zero degenerate와 overflow. `trail-curve.test.js`, `trail-series.test.js`: 같은 곡선 subdivision의 width, 음수 극값 거부, missing position/width 분리와 원행 순서. `test/unit/trail-plot.test.js`: 공개 width/Polar/missing 및 revision. |
| Polar angle와 radius | `test/unit/grammar/polar.test.js`: 0도 위·시계방향 literal, 화면 frame/range와 음수 radius range 거부. `polar-line-series.test.js`: theta 순서, category domain, 명시 closure/seam. `test/unit/actions/encodings/polar-position-encodings.test.js`: 실제 Cartesian 좌표·반경과 glyph size 분리. `test/unit/actions/charts/polar-facades.test.js`: 공개 open/closed와 scoped guide, 원자적 잘못된 역할 거부. |
| Radar 공통 category와 값 의미 | `test/unit/actions/charts/radar-facade.test.js`: long/wide, 명시 순서와 missing/duplicate/nonfinite dimension 거부. `radar-summary.test.js`: 독립 mean/median literal, minmax 상수 0과 원본 값 보존. |
| Rose 면적 | `test/unit/grammar/measured-radius.test.js`: annulus area의 독립 제곱근 공식, 단조성, equal angle, zero category 유지, 음수/nonfinite/표현 불가 값 거부. `test/unit/actions/charts/radial-plots.test.js`: 공개 count/sum, 원행 membership와 zero domain 유지. |
| Streamgraph baseline | `test/unit/grammar/stream-baseline.test.js`: 독립 weighted-center 변화식, 최소 slope 목적식, 두께 보존, missing run reset/zero hold/negative 거부. `test/unit/wiggle-area.test.js`: 공개 baseline geometry, source grain, missing/zero 및 양립하지 않는 scale 거부. |
| Violin bandwidth와 폭 | `test/unit/actions/data/density-data.test.js`, `test/charts/cars-density-area/reference-values.test.js`: 네 kernel의 독립 공식, explicit/auto bandwidth, weighted mass와 0 contribution 선검증, missing numeric/degenerate auto 경계. `test/unit/grammar/transforms/numeric-invariants.test.js`: 음수·0·양수 관측의 nonnegative KDE와 독립 적분 약 1. `test/unit/grammar/categorical-density.test.js`: shared/independent width와 split 양쪽의 literal 폭. `test/unit/actions/charts/violin-plot-facade.test.js`: 공개 full/half/split/horizontal, density 옵션·profile grain·weighted auto facet 재계산. |

width가 음수라는 경우와 관측값이 음수라는 경우를 혼동하지 않는다. 각 family의 현재 계약에 따라
거부, 유효 데이터, degenerate, missing run을 구분한 기존 담당 시험을 연결한다. 모든 가능한
옵션 조합을 전수 검증했다는 의미는 아니며, 최종 후보의 expected/actual/diff 제출은 후행이다.

## AT-23: 첫 감사 checkpoint에서 pending을 유지한 이유

`GRAPHS.md`와 `FLOWS.md`에는 deterministic seed, topology/adjacency, node/edge source rows,
flow total/common thickness scale, DAG cycle 거부와 cyclic lane 계약이 있다. 기존
`test/unit/grammar/graph-{normalize,model,layout,force}.test.js`,
`test/unit/flow-layouts.test.js`, `test/unit/resources/flow-{plots,consumers}.test.js`는 각각
독립 수치·위상·lineage를 검사한다. Graph tooltip은
`test/browser/interaction-animation.browser.js`의 실제 Canvas/SVG DPR 1/2 overlap 사례가
candidate 순서, 표시문, 선택과 teardown을 검사한다.

원 AT-23은 tooltip/adjacency도 요구한다. 짧은 native expectation에서 tooltip이라는 단어가
빠졌다는 이유로 원 요구를 제거하지 않는다. 현재 읽은 flow consumer 시험은 source/target/value와
원행, 접근성 데이터까지 확인하지만 **실제 flow node/link tooltip의 표시 의미와 source/target,
adjacency, 원행 연결을 함께 소유하는 시험은 확인하지 못했다**. Generic Point tooltip이나
Graph edge tooltip의 성공을 Flow 증거로 대신 세지 않는다. 이 경계를 pending 이유로 구체화한다.
후속은 기존 session inspect/accessible formatter/Flow final-item을 사용하는 literal 통합 fixture와
실제 Canvas/SVG tooltip 시험이며, runtime 결함이 없으면 새 공개 API는 필요하지 않다.

## 검증과 보존 범위

이번 변경은 세 acceptance group의 owner 객체에 한정한다. 요구 30개, acceptance group 79개,
consumer 577개, required/check 목록, 다른 모든 owner와 consumer applicability는 그대로다.
candidate-results 또는 qualification pass 파일을 만들지 않는다. 구조 검사는 경로 실재·suite 발견·
정본 범위를 검증하며, 이 감사에서 연결한 기존 수치 시험 전체를 재실행했다는 뜻이 아니다.
실행 결과(Node 22.23.1):

- `node scripts/native-capability-completion.js`: exit 0. Candidate null, group 79/79 및
  consumer 577/577 pending, qualification pending. Assigned group은 44→46이며 33개는 미할당이다.
- `node --test test/contracts/native-capability-completion.test.js`: 16/16, exit 0.
- 저장한 변경 전 manifest와 비교해 세 owner를 원복하면 JSON 전체가 deep equal임을 확인했다.
  Runtime/API/types/package 입력은 변경하지 않았으므로 새 package 설치·성능 측정은 하지 않았다.
- [구조 검사 원본](native-acceptance-owner-evidence/native-at-owners-structure.log.gz),
  [pending 집계](native-acceptance-owner-evidence/native-at-owners-pending.json.gz),
  [범위 보존 확인](native-acceptance-owner-evidence/preservation.json).

이 파일과 매핑을 별도 metadata checkpoint로 commit/push한다. AT-23 후속 인수 시험과 전체
STEP-077 목표는 남아 있다.

## AT-23 후속: native Flow tooltip 인수 증거

앞 절의 owner 매핑은 `d3fd845dd`로 검증·push했다. 그 뒤 원 요구의 누락 시험을 채우라는
root 지시와 기존 전체 승인을 재사용했다. 아래는 별도 개념 checkpoint다.

기존 `createInteractionSession().mount()`의 inspect binding, `getMarkItems`와
`exportAccessibleData({format:"items"})`를 실제 hit item key로 연결했다. Host tooltip은
기존 계약대로 DOM을 소유하며, public program의 graph adjacency와 exact source row 참조를
읽는다. 별도 tooltip API, endpoint 수정, hash 변경, lineage 대체나 runtime 수정은 없다.

- `test/support/flow-inspection.js`: 숫자 `1`과 문자열 `"1"`을 구별하는 세 node 및 3/1 유량의
  두 edge. Cyclic은 `"1"→1`, 유량 2의 return edge를 추가한다. Host description과
  source 조회를 Node/browser가 같은 공개 호출로 소비한다.
- `test/unit/resources/flow-consumers.test.js`: 새 3개 사례. DAG/cyclic 실제 node/link hit의
  동일 item key, 4/3/1 및 return 2 유량, incoming/outgoing/imbalance, typed neighbors,
  layout ref와 원행 rowKey/index/revision을 독립 literal로 확인한다. 원본 edge 재정렬·값 두 배·
  source revision·editable codec 뒤 같은 key가 새 원행과 유량 6을 읽고 이전 program은 보존된다.
- `test/browser/flow-layouts.browser.js`: 새 4개 test가 각각 DPR 1/2에서 실행된다.
  DAG/cyclic × 실제 Canvas/SVG에 포인터를 움직여 node와 ribbon을 가리킨다. 표시문뿐 아니라
  실제 hit role/key, native 접근성 fields, typed adjacency, 원본 행과 layout revision을
  Node의 독립 기대값과 대조한다. 선택 지점에 실제 ink가 있으며 physical Canvas 크기가
  DPR과 일치한다. 빈 영역에서 tooltip/ARIA가 해제되고 unmount/destroy 뒤 callback이 없다.
  기존 네 primitive/public renderer pair 시험도 함께 실행했다.

최초 실패 두 개는 시험 fixture 문제로 보존했다. Revised ribbon의 x=41 probe는 node의
기존 hit slop 안이었으므로 실제 ribbon 내부 x=50으로 옮겼다. Browser host는 tooltip을
표시할 때 중앙정렬 main의 크기가 바뀌어 다음 pointer 좌표가 낡았다. 기존 공개 문서와 같이
tooltip 공간을 고정하고 상속된 Canvas border를 없앴다. Hit 알고리즘·guard·event policy를
완화하지 않았다.

실행(Node 22.23.1):

- 새 unit owner `node --test test/unit/resources/flow-consumers.test.js`: 8/8.
- `node --test test/browser/flow-layouts.browser.js`: 8/8. 새 실제 browser 구성은
  2 methods × 2 renderers × 2 DPR = 8개이며, 각 구성에서 node/forward link 및 cyclic return을 확인했다.
- AT-23의 관련 graph normalize/model/fixed/circular/force·observed graph·layout/hit·Flow
  수치/plots/consumers 10개 unit 파일과 native manifest/discovery 2개 contract 파일: 111/111.
- 구조 validator exit 0. AT-23 owner만 변경한 뒤 다른 JSON 값 전체가 동일함을 확인했다.
  Assigned group 46→47, pending owner group 33→32. Candidate null, group 결과 79/79 pending,
  consumer 결과 577/577 pending, qualification pending은 유지한다.
- 패키지/runtime/types/public contract 입력이 그대로여서 새 archive·coverage·설치·성능 측정은
  실행하지 않았다. 기존 graph-tooltip browser owner는 경로를 등록했고 이 후속에서 재실행하지
  않았다. 최종 후보의 해당 owner 실행과 expected/actual/diff qualification은 여전히 필요하다.

[범위와 실행 기록](flow-tooltip-evidence/scope.json),
[관련 111개 검사](flow-tooltip-evidence/flow-tooltip-owning.log.gz),
[실제 browser 검사](flow-tooltip-evidence/flow-tooltip-browser.log.gz),
[최초 unit 실패](flow-tooltip-evidence/flow-tooltip-first.log.gz),
[최초 browser 실패](flow-tooltip-evidence/flow-tooltip-browser-first.log.gz),
[최종 pending 집계](flow-tooltip-evidence/flow-tooltip-pending.json.gz).

AT-23에는 이제 `GRAPHS.md`/`FLOWS.md`/`INTERACTION.md`/`ACCESSIBILITY.md`와 발견 가능한
기존 graph owners 및 위 Flow owners를 등록한다. 시험 담당자 매핑의 빈칸을 메운 것이며,
native 전체 acceptance 통과나 STEP-077 완료로 계산하지 않는다.

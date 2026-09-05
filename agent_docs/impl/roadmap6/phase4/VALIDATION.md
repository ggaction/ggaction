# Phase 4 — A 검증과 V/X acceptance

이 문서는 A/V 준비 당시의 baseline과 acceptance를 보존한다. 현재 W1–W5는 구현되었으며 최신 실행 결과·승인 상한·남은 통합 검사는 [INTEGRATION.md](INTEGRATION.md)를 따른다. 아래의 미구현·미승인·옛 package 한도는 해당 기록 시점의 상태다.

A는 layoutSeries 이름 변경을 포함해 승인되었다. V는 아직 미승인이다. 이 문서 앞부분은 **실제로 실행한 현재 baseline 검증**, 뒷부분은 **미래 구현 acceptance**다.
[계약 검토](CONTRACT_REVIEW.md), [후보 원장](candidates.json), [승인 상태](GATES.md)를 함께 읽는다.

검증된 A package commit은 `f229fa003d5de81f7131d4c23811b834bd36d50e`이며 원격 branch에 push했다.
후속 checkpoint는 Gate ref와 준비 완료 상태만 기록하며 승인이나 production 변경을 포함하지 않는다.

## A 준비에서 실제 실행한 것

| 확인 | 실제 결과 |
| --- | --- |
| Baseline probe | 49/49 snapshot replay 일치. 199번의 action 전후 이전 program/trace/caller 입력 불변 |
| 관련 기존 tests | 아래 28 files, 200/200 pass, fail/cancelled/skip 0 |
| 현재 색상 차트 생성 대조군 | V3의 4개 입력에서 미래 midpoint 옵션만 뺀 기존 생성 호출 모두 성공. 새 midpoint/transition 검증이 아님 |
| Production 상태 | source/types/knowledge tree와 Phase 3 승인본 동일. 새 public 구현 0 |
| Current/Planned | Current 177, Planned 0. Phase-local 후보만 4개 기록 |
| 최종 문서 검사 | Navigation/documentation-truth 10/10. 변경 Markdown 12개 local route 273개 존재 확인, whitespace 오류 0 |
| 신규 primitive/public render | 미실행. 이 A는 target 계획이며 렌더링 완료 증거가 아님 |

Baseline commit `93dceb3761e170207058e6a7280060fedd471244`, source tree
`6d5a80e311cabdc67dff5da739dcce3346e3841d`, types tree `38cbb7b6d7feaa5b044a56189ea874b8bde5d581`.
[Probe source](baseline.probes.mjs)와 [관측 JSON](baseline-results.json)은 git에 포함한다.
일반 재현은 flag 없이 실행한다. --record는 의도적인 baseline 갱신에만 쓰며 구현 후 결과로 덮어쓰지 않는다.
Source가 바뀌면 probe가 중단하므로 이 A의 고정 review commit을 checkout하여 재현한다.

~~~sh
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"
node agent_docs/impl/roadmap6/phase4/baseline.probes.mjs
node --test \
  test/unit/actions/encodings/area-encodings.test.js \
  test/unit/actions/encodings/area-color-encoding.test.js \
  test/unit/actions/encodings/bar-color-encoding.test.js \
  test/unit/actions/encodings/grouped-bar-color-encoding.test.js \
  test/unit/actions/encodings/bar-authoring-order.test.js \
  test/unit/actions/encodings/continuous-bar-color.test.js \
  test/unit/actions/encodings/category-order.test.js \
  test/unit/actions/encodings/radius-encoding.test.js \
  test/unit/actions/encodings/ranged-bar-encodings.test.js \
  test/unit/actions/marks/create-area-mark.test.js \
  test/unit/actions/marks/edit-area-mark.test.js \
  test/unit/actions/marks/arc-mark.test.js \
  test/unit/actions/marks/create-arc-mark.test.js \
  test/unit/actions/scales/edit-scale.test.js \
  test/unit/actions/scales/scale-consumers.test.js \
  test/unit/actions/scales/discretized-color.test.js \
  test/unit/actions/guides/continuous-legends.test.js \
  test/unit/actions/guides/legend-edit-actions.test.js \
  test/unit/actions/guides/legend-lifecycle.test.js \
  test/unit/grammar/arcs.test.js \
  test/unit/grammar/transforms/series-layout.test.js \
  test/unit/grammar/scales/continuous-color.test.js \
  test/unit/grammar/scales/discretized-color.test.js \
  test/contracts/category-order.test.js \
  test/contracts/shared-scale-refresh.test.js \
  test/contracts/scale-capability-contract.test.js \
  test/contracts/agent-docs-navigation.test.js \
  test/contracts/documentation-truth.test.js
git diff --check
~~~

Local logs는 `.artifacts/roadmap6-authoring/phase4-baseline.log`, `phase4-baseline-replay.log`,
`phase4-focused-tests.log`다. 원격 재현은 위 명령과 git의 source/JSON을 사용하며 ignored log가 필수는 아니다.
Probe 초안에서 JSON이 생략한 undefined와 in-memory undefined를 직접 비교해 replay가 실패했다.
Evidence를 동일 JSON 표현으로 비교하도록 수정하고 성공적으로 다시 실행했다. Source 동작이나 기대값을 바꾼 수정이 아니다.
L03은 성공만 기록하지 않고 L01과 concrete item properties가 동일함도 확인했다. 새 stack 설정이 실제 geometry를 바꾸지 않는다.

누적 2,585 tests, coverage 95.09/91.31/98.76, 72 critical floors, same-tarball installed consumer의
근거는 [Phase 3 X](../phase3/REVIEW.md)다. Realistic 전체 210/212 후 수정된 3 modules 13/13이며,
이를 이번 단계에서 full 212/212를 새로 실행한 것으로 쓰지 않는다. Production이 같아 이번 문서 작업에서
전체 suite·render·browser·coverage·package를 반복하지 않았다.

## 독립 수치 oracle 계획

기존 source의 mapper/stack 결과를 기대값으로 복사하지 않는다. Literal anchors와 독립 수학을 둘 다 사용한다.
아래는 앞으로 구현을 검사할 oracle 명세이며 새 renderer를 실행한 결과가 아니다.

| 기능 | Literal anchor / invariant |
| --- | --- |
| simple Area | y=[2,4,3], baseline=0. 두 boundary를 같은 y scale로 매핑, closure와 source x 순서 검사 |
| signed Area | y=[2,-2,3], baseline=1, nice:false domain [-2,3]. Endpoint는 baseline을 넘을 수 있고 강제 swap 없음 |
| log Area | x value [2,4,3], baseline 1, domain [1,4]. Independent y와 log(value) 위치를 별도 계산 |
| break | x=0..4, y=[2,3,null,4,2]는 segment [0,1] 및 [3,4], 각각 closure. 결측을 잇는 edge 없음 |
| aligned stack | group a=[2,4,3], b=[1,2,1]. 첫 위치 [0,2],[2,3]. Fill [0,2/3],[2/3,1] |
| center | 같은 첫 위치 [-1.5,0.5],[0.5,1.5]. 매 위치 total 중심=0 |
| diverging | [-2,3,-4,5]는 [0,-2],[0,3],[-2,-6],[3,8]. Positive/negative 분리와 총합 보존 |
| all-zero fill | 두께 0, domain [0,1], NaN/Infinity 없음. 별도 정당한 empty fixture |
| Rose | R=140, r0=70, 값 2/3/4의 outer=[110.67971810589327,126.19429464123962,140]. r²-r0² 비=2:3:4 |
| Radial bar | 동일 fixture outer=[105,122.5,140]. r-r0 비=2:3:4. 둘 모두 양수 sector 3개 |
| legacy sqrt 대조 | 첫 radius=119.49747468305833, annulus fraction=0.6380711874576984. Rose의 0.5와 구분 |
| category aggregate | A=2,A=1,B=3,C=4 → category values [3,3,4], 3 sectors, A sourceIndices 길이 2 |
| zero radial | A=0,B=3,C=4 → positive sectors 2, domain categories 3. All-zero는 오류 |
| theta order | [A,B,C]→partial [C,A]→[C,A,B]; unknown/duplicate/empty 오류, ties first appearance |
| legend link | target theta와 item order가 같아도 category→color 대응은 이전과 동일 |
| midpoint | [-2,8],m=0에서 parameters [0,.5,.75,1] for [-2,0,4,8]. RGB blue/white/red→blue/white/#ff8080/red |
| gradient legend | 값 0의 neutral 위치=(0-(-2))/(8-(-2))=.2. Mark 색과 같은 값의 strip 색 일치 |
| midpoint reset | auto 이후 기존 endpoint-linear mapping. Discretized 전환 뒤 midpoint 남지 않음 |

Radial 공식은 overflow를 피하는 동치 계산이 가능하지만 유한성·단조성·0/1 endpoint·비례 보존을 함께 검사한다.
Path curve와 renderer 근사는 기존 정책으로 처리하며 일반 image ink 면적을 완벽한 수학 면적이라고 주장하지 않는다.
Rose의 gap/stroke/outline 장식과 값에 의한 sector 측정은 구분하고 첫 범위에서 padAngle은 0만 허용한다.

## V target 계획과 현재 작성 상태

전체 계획은 **20 variants**이며 F20 제외와는 무관한 시각 사례 수다. V1의 11개는 [실행 fixture](../../../../examples/area-layout/targets.json)로 이전하고 [계획 원장](visual-target-plan.json)은 그 owner만 참조한다. 나머지 V2/V3 9개는 미작성 계획이다.
V1 primitive는 실제 렌더했으며 전체 publicCalls 실행은 여전히 0개다. [V1 검토](VISUAL_REVIEW_V1.md)와 [기록 결과](visual-v1-results.json)가 현재 증거다.

| Gate | targets | 검토하는 차이 |
| --- | --- | --- |
| R6-P4-V1 | area-simple, area-signed-baseline, area-horizontal-log, ribbon-crossing, area-missing-break | baseline·방향·scale·endpoint·break |
| R6-P4-V1 | area-stack, area-fill, area-diverging, area-center, bar-independent-stack, bar-layout-roundtrip | color와 독립한 layout과 전환, 11 variants 합계 |
| R6-P4-V2 | rose-disk, rose-hole, radial-disk, radial-hole, radial-theta-legend-order | 5 variants, 면적/길이·hole·order identity |
| R6-P4-V3 | color-midpoint-asymmetric, color-midpoint-clear, point-gradient-to-interval, bar-gradient-to-interval | 4 variants, neutral과 legend family 전환 |

V1/V2/V3는 독립 승인이 가능하다. V2의 order는 P4-C05, V3의 scale/legend는 P4-C06–C07에 한정한다.
기존 출력만 보존하는 alias 정리·validation 통합·scalar oracle는 A 승인 뒤 비시각 작업으로 진행할 수 있다.
새 mode의 public assignment/rematerialization과 facade 등록은 해당 V 승인 전 시작하지 않는다.

Primitive는 기존 세 primitive와 기존 lower owners로 concrete graphics를 작성하고, 아직 없는 public API를 실행하지 않는다.
기대값 계산은 `test/oracles/`의 src 비의존 함수를 사용한다. A 이후 실제 active slice는 `test/gates/<capability>/`,
이미지는 `.artifacts/test/png/review/<chart>/<variant>/`에 놓는다. Image만 만들지 않고 source/manifest를 git에 넣는다.
승인·구현 이후 완성 pair를 stable `test/charts/`로 옮기고 Gate import/review artifacts를 정리한다.

각 V에서는 primitive semantics·commands·numeric anchors·plot ink를 먼저 확인한다.
Public 구현 후 같은 실행의 primitive/public semantic 결과, concrete graphic properties/draw order,
Canvas calls, decoded PNG RGBA equality를 비교한다. SVG/PDF 구조·paint·geometry도 검사한다.
유효한 all-zero Area/fill은 별도 nonvisual oracle이며 무조건적인 ink 통과에 사용하지 않는다.

## 반드시 통과할 lifecycle / 실패 matrix

| 범위 | 성공 경로 | 실패·rollback 경로 |
| --- | --- | --- |
| Area endpoints | field↔datum; explicit baseline; final-valid pair+scale 재할당 | field+datum 동시, 두 datum, log zero, invalid type, 두 range 동시 |
| Area missing | error→break→error on finite rows, 두 closed segments, stack 공동 break | missing independent/group, infinity, 미존재 grid 행, 중복 grid, 유효 segment 없음 |
| Layout | color 없는 group/stack, group→stack→group, fill→overlay, remove color, Bar per-cell quantitative color | negative stack/fill/center, Bar center, Area group/ribbon stack, group conflict |
| Compatibility adapters | color.layout / measure.stack / offsets가 canonical owner 위임 | stale color.layout/measure.stack 경쟁, auto scale 삭제로 shared consumer 손상 |
| Radius | count/sum, duplicate category, mapping/innerRadius/scale edit, resize | all-zero, negative, overflow, weighted theta, nonzero padding, mismatched hole, mixed shared mapping |
| Category / legend | create/compute/partial/clear, Pie·Polar point/line, linked legend, data reorder | unknown/duplicate/empty, numeric theta, explicit domain conflict, invalidated legend link |
| Midpoint | explicit/auto, RGB·Lab 등 기존 interpolation, reverse/clamp, data/domain edit | outside/on endpoint, constant domain, nonnumeric, temporal/ordinal/position/discretized numeric midpoint |
| Scale transition | sequential↔quantize/quantile/threshold; create/edit/reencode equality | incompatible shared mark 하나, 잘못된 domain/range, unknown policy 충돌 |
| Legend transition | no legend/compatible right legend 동일 mark 결과, inverse transition | custom family-only style, non-right interval, invalid bounds → 전체 rollback |

모든 public failure에서 semanticSpec, graphicSpec, resolvedScales, configs, context, trace와 caller values/options를
검증한다. Action 성공 뒤 재실행 idempotence와 원본 branch 보존도 검사한다. Facade 완료 후 하위 editor를 사용하고
facade를 새로 생성해야만 수정할 수 있는 우회 구조는 허용하지 않는다.

## 소비자·아키텍처·제품 표면 완료 matrix

| 소비자 / owner | 필수 확인 |
| --- | --- |
| Domain/scale resolver | Datum 포함, break 허용 field의 정책 범위, stacked extent, radial/midpoint mapper, 전체 shared consumers preflight |
| Mark grammar/materialization | Area segments, group grain, Bar offsets, Arc aggregate/sourceIndices, legacy default 보존 |
| Axis/grid/legend | Area value title, Polar mapped radius 위치·실제 값 label, theta item order, midpoint strip, compatible family migration |
| Guide facade scoping | 기존 Cartesian/Parallel 유지, 새 Polar helper의 same-target reuse·foreign coordinate/scale 오류 |
| Data/filter/resize | 기존 공개 지원 data edit/filter/bind 경로마다 domain→mark→guide→layout→highlight 수렴. 신규 generic lifecycle은 Phase 6 |
| Selection/highlight | aggregate/sourceIndices와 mark item identity, group/layout/order/missing edit 후 원본 branch 보존·selection 재계산 |
| Labels | 현재 mark별 지원 경로의 data identity와 value, unsupported aggregate label은 오류. 새 label family는 Phase 7 |
| Composition/facet | 현재 허용 Cartesian/Polar 조합에서 canonical fields 보존, scoped resource remap. 미지원 조합을 새 지원으로 주장하지 않음 |
| Schema/immutable/trace | 신규 canonical 경로의 validation·clone/freeze·serialization·namespace remap, 실제 wrapped child, duplicated state 없음 |
| Full/basic/types | 새 3 H0 full only, layoutSeries 양쪽, Basic Bar 지원. 기존 Basic 미공개 editor/order/Polar 유출 0 |
| Catalog/cards/docs/MCP | Current/Planned/action-index/type/options 일치, hierarchy/변경된 기본값·오류 문서, 실제 생성 코드 실행 |
| Render/browser/package | primitive/public parity, PNG/SVG/PDF, 설치된 tarball browser 실행, export boundary와 gzip 상한 |

적용 불가 cell은 실제 이유와 현행 지원 경계를 X에 기록한다. 예를 들어 Area에 Point-only size/shape를 추가하거나
Rose에 Cartesian Bar-specific width를 구현하는 작업은 N/A다. 아직 없는 기능을 broad consumer 지원이라고 쓰지 않는다.

## 최종 X에서 필요한 누적 증거

구현 변화에 맞는 focused positive/negative strict TypeScript, 정상 누적 suite, critical coverage floors,
관련 realistic/generated scenarios, renderer/browser, docs source/build/browser를 수행한다.
Package는 Full/Basic/SVG의 승인된 **237000/125000/25000**을 그대로 측정한다. 초과 시 별도 B 증거가 필요하다.
같은 packed tarball의 설치 테스트·browser·exports를 통과시키고 source/ref/hash를 X package에 기록한다.
후보 4개를 실제 Current로 옮기고 Phase 4의 Planned 잔여 0을 확인하며 schema/default/migration을 명시한다.
D14는 Phase 2의 width/order 교정과 이번 theta/legend 부분을 함께 대조해 닫고, 다른 단계 소유 항목을 선행 완료로 표시하지 않는다.

## A 승인 delta

사용자가 `encodeLayout`을 `layoutSeries`로 바꾸는 결정까지 포함해 P4-C01–C09를 승인했다.
Baseline source/JSON은 당시 이름의 부재 관측을 그대로 보존한다. 현재 계약·후보·미래 target calls만 새 이름을 사용한다.

## 승인 후 비시각 primitive 준비

layoutSeries 이름 변경을 승인 기록과 Planned에 반영했다. 신규 direct 4개와 기존 capability 5개를 등록했고
catalog/contract/navigation 검증 22/22를 통과했다. Public method와 high-level 옵션은 아직 미구현이다.

시각 target에 정확한 의미 상태를 기록하기 위해 editSemantic의 layer.layout.mode, layer.mark.missing,
encoding.group.inferredFrom leaves와 layout container 제거를 추가했다. Closed vocabulary·immutable 저장만 수행하며
그래픽 배치와 segmentation은 실행하지 않는다. Current primitive 계약·typed state·architecture·공개 extension 문서와
생성 산출물을 함께 갱신했다. Focused 44/44, 정상 누적 **2588/2588**, fail/skip 0을 통과했다.
이는 V 승인 전 허용된 비시각 준비이며 layoutSeries/createAreaPlot의 구현 완료가 아니다.

## V1 실제 검증 결과

- 승인 당시 slice: test/gates/area-layout. 현재 승인 pair는 test/charts/area-layout으로 승격했다. Source 추가 이후 runtime/types는 fda8671e와 동일하다.
- 독립 수학·primitive 의미·원본 불변·graphicSpec-only Canvas 동등성: **20/20**.
- Test discovery와 위 focused tests 합계: **33/33**. 새 area-layout capability selector를 등록했다.
- PNG render entry: **11/11**, 모든 plot-region ink/color 조건 통과.
- 기록 runner 재실행: **11/11** source/geometry/pixel hash 및 region 색상 수 일치.
- 정상 누적 npm test: **2608/2608**, fail/cancelled/skip 0.
- 변경 Markdown 8개 local link 266개 존재 확인, git diff --check 통과.
- 처음 전체 검사에서 새 테스트 capability 등록 누락을 발견했다. 등록과 정렬을 교정해 discovery 13/13 및 정상 누적 2608/2608을 통과했다.
- 기록 JSON에서 Map 색상 수가 빈 객체로 저장되는 문제를 명시 객체 변환으로 고쳤고 record/replay 일치를 확인했다.
- API public flow·실제 roundtrip·primitive/public pixel equality·신규 SVG/PDF/browser/package는 아직 실행하지 않았다. V1 target 작성 완료와 공개 구현 완료는 다르다.

실제 이미지, 정확한 미래 public calls, 의도적 교차 표현, primitive scale 준비 경계는 [V1 검토 문서](VISUAL_REVIEW_V1.md)에 묶었다.

## V1 승인 뒤 W1 lower 구현

- Raw Area의 finite datum endpoint·mixed range·missing:error/break를 position/scale/path/selection owner에 연결했다.
- 최종 pair/scale의 pure preflight를 실제 scale 계산과 공유한다. Zero-baseline linear에서 positive-baseline log로 한 번에 편집할 수 있다.
- Primary datum의 title은 실제 측정 field를 따르며 원본 데이터는 그대로 보존한다.
- Focused 21/21, strict positive/negative TypeScript 1/1, docs:generate 성공.
- 정상 누적 **2614/2614**, fail/cancelled/skip 0. 기존 ErrorBand의 그림을 바꾸지 않고 추가 companion trace를 반영했다.
- layoutSeries·Area facade·누적 공동 break·11개 public/primitive 통합은 다음 작업이다. W1/W2 완료로 표시하지 않는다.

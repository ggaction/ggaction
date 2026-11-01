# Hierarchy·Graph·Flow consumer owner 감사

## 진행 상태

- [x] Current와 실제 시험 본문을 대조해 다섯 행의 consumer별 담당 범위 확인
- [x] 기존 tree 세 방향·treemap 두 방식의 SVG/Canvas/PDF primitive parity 보강
- [x] tree/treemap과 DAG/cyclic Flow의 typed key·원행·선택·revision·scoped composition 회귀
- [x] 기존 owner를 보존하고 근거가 있는 61개 셀만 추가 매핑
- [x] 구조·타입·공개 호출·렌더러·브라우저 검사와 변경 범위 보존 확인
- [ ] 미할당 24개 셀의 applicability/구현/설치 담당자 확정
- [ ] 최종 native 후보의 expected/actual/diff 및 전체 qualification

기준은 `9039879b298dfbc6e7bec8de708f3f5285556407`이다.
[전체 승인](../AUTHORIZATION.json)과 root의 기존 native 소비자 증거 보강 지시를 재사용한다.
공개 API·runtime·types·package 입력은 변경하지 않는다. 정본
`test/native-capabilities.json`의 assigned는 담당 시험의 지정이며 candidate 통과가 아니다.

## 기존 기능에서 보강한 시험

`test/charts/tree-layouts/renderer.render.js`와
`test/charts/treemap-layouts/renderer.render.js`가 기존 manifest의 공개 프로그램과 독립
primitive를 그대로 읽는다. 새 그림이나 다른 fixture로 교체하지 않는다.
공유 test helper `hierarchy-renderer-parity.js`는 다음을 확인한다.

- Tree vertical/horizontal/radial과 treemap slice-dice/squarify의 모든 Canvas drawing/state
  operation을 비교한다. 공개 collection의 추가 save/restore만 비교에서 제외하고 실제 native
  Canvas 픽셀을 별도로 exact 비교해 상태 효과가 사라지지 않도록 한다.
- SVG에는 속성 있는 group이 없음을 먼저 확인한다. 속성 없는 wrapper만 제거한 문자열의
  전체 geometry/paint/text/순서가 같으며, 두 SVG를 같은 SVG decoder로 그린 전체 픽셀도 같다.
- 두 프로그램을 각각 native PDF로 출력하고 `pdftoppm -r 72 -singlefile -png`로 decode한다.
  PDF header, page 수, 논리·decode 크기, 전체 픽셀이 같다. Canvas/SVG/PDF 각각 ink가
  1,000 pixels를 넘는다. 서로 다른 backend의 antialias 결과를 같다고 요구하거나 정규화하지 않는다.
- 기존 PNG regression과 concrete geometry/order/identity/codec 시험도 함께 실행한다.

`test/unit/resources/hierarchy-consumers.test.js`에는 각 tree/treemap별 두 회귀를 추가했다.
숫자 `1`과 문자열 `"1"`의 서로 다른 key, leaf 값 3/1과 source revision 뒤 6/1 및 합계 7,
원본 rowKey/index/revision, body+label 강조, 해제 복원, 실제 hit와 accessible selectedBy,
editable codec, 같은 ID를 가진 concat 자식의 독립 edits와 namespace를 확인한다.
각 family의 공개 호출을 직접 실행하며 tree 성공을 treemap 근거로 대신하지 않는다.

`test/unit/resources/flow-consumers.test.js`에는 DAG/cyclic 각각의 typed lifecycle 회귀를
추가했다. Node `1`과 `"1"`, forward value 3/1, cyclic return 2를 기반으로 style/label edit가
stored layout을 공유하는지, 강조가 정확한 body+label에만 적용되는지 확인한다. Edge 재정렬과
두 배 revision 뒤 node total 8, incoming 0 또는 4, source/target/value `[1,"1",6]`, 원행과
revision, scoped link paint 및 sibling 공유, codec 복원을 검증한다. 직전 checkpoint의 실제
node/link tooltip·adjacency·Canvas/SVG DPR 1/2 시험도 owner로 재사용한다.

`test/unit/resources/graph-plots.test.js`의 기존 node/parallel-edge/loop 시험에는 accessible
items가 실제 logical item key/role/fields를 그대로 노출하며 degree 4/2/0과 edge weight
2/3/1을 보존하는 assertion을 추가했다. 새 formatter나 runtime resolver는 만들지 않았다.

## 매핑 근거

각 행의 공통 lifecycle은 해당 Current 계약과 family별 실제 공개 test owner를 연결한다.
선택에는 `MARK_SELECTION.md`, hit에는 `INTERACTION.md`, 접근성에는 `ACCESSIBILITY.md`를
함께 등록한다. 전체 구체 경로는 정본 manifest에 저장한다.

| 행 | owner 지정 수 | 핵심 실제 근거 |
| --- | ---: | --- |
| tree | 14/19 | `HIERARCHY.md`; hierarchy-consumers와 hierarchy-types; tree-layouts의 public/renderer/png |
| treemap | 14/19 | 같은 계약이지만 이번 treemap 별도 typed lifecycle; treemap-layouts의 두 primitive pair |
| graph-nodes | 15/19 | `GRAPHS.md`; graph-plots/hit, observed-graph-types, graph-plots public/pdf/png와 graph-output browser |
| sankey-dag | 14/19 | `FLOWS.md`; 명시 DAG lifecycle·tooltip, flow-types와 기존 네 renderer pair |
| sankey-cyclic | 14/19 | 같은 계약의 명시 cyclic return/lifecycle·tooltip 및 cyclic renderer pair |

Graph의 scene-animation만 추가 지정한다. `graph-tracks.test.js`와 `graph-public.test.js`가
native completed positions, node/edge/arrow, native route, repeated rebase, offline restore,
current hit와 explicit unsupported/fallback 경계를 직접 검사한다. `animation-graph.browser.js`는
실제 sampled/rebased/routed frame을 Canvas/SVG DPR 1/2에 그려 독립 literal probes와 대조한다.
Tree/treemap/Flow에서 단순 `createTransitionScene` snapshot의 성공은 해당 근거가 아니다.

Docs owner는 `test/docs/documentation.test.js`의 실제 catalog route/example 연결과 각 chart의
공개 프로그램 시험을 함께 연결했다. Tree/Graph/DAG의 실행 snippet은
`test/docs/executable-programs.test.js`도 연결한다. Treemap/cyclic의 문서상 chart-example
pair를 독립 executable inline snippet이라고 보고하지 않는다.

## 계속 pending인 범위

- 다섯 행의 encoding/scale/guide 15셀: stored layout의 숫자 배치나 Flow thickness scale을
  field encoding·공개 scale·guide API의 증거로 계산하지 않는다. Current 제한과 required cell의
  정식 applicability 판단을 남긴다. 이번 변경에서 required 목록이나 N/A는 바꾸지 않는다.
- Tree/treemap/DAG/cyclic의 scene-animation 4셀: 실제 family transition/rebase/offline 또는
  명시 fallback owning evidence가 확인되지 않았다. Generic scene은 대체 증거가 아니다.
- 다섯 package 셀: 발견 가능한 family별 installed-package owner가 아직 미할당이다.
  Generic package AST 검사나 source에서 consumer fixture를 실행한 것만으로 지정하지 않는다.

다섯 행의 기존 assigned 10개는 byte-equivalent JSON으로 보존하고 61개만 추가했다.
다른 행, AT-23/27/28을 포함한 모든 group owner, 분모, required 목록, N/A, 결과는 변경하지
않았다. 이 branch 기준 요구 30개, group 79개, consumer 577개다. Root의 별도 Geo/image
applicability 변경은 이 checkout으로 덮어쓰지 않으며 다섯 행의 delta만 합친다.

## 실행과 한계

Node 22.23.1에서 실행했다. [실행·범위 기록](native-family-consumer-evidence/summary.json)에
명령, 원본 로그, 해시와 보존 검사를 기록한다.

- 관련 hierarchy/graph/Flow 공개 lifecycle·Graph typed animation·세 타입 계약·primitive/public·
  native manifest/discovery 17개 파일: **121/121**.
- Graph accessible literal 보강 후 해당 owning 파일과 전체 documentation 구조: **41/41**.
- 새 5개 tree/treemap pair를 포함한 다섯 family renderer/PNG: **28/28**.
- Graph 실제 Canvas/SVG output DPR 1/2 및 rebased/routed sampled frame: **3/3**.
- 마지막 helper의 속성 없는 SVG wrapper assertion 추가 후 tree/treemap **5/5** 재확인.
- Native validator는 candidate null, group 79와 consumer 577 모두 pending, qualification pending.
  저장한 이전 manifest와 비교해 다섯 행의 owner/assignedOwners를 되돌리면 전체 deep equal이다.

Runtime가 그대로여서 새 source coverage·archive·3Node 설치·성능 측정은 실행하지 않았다.
기존 Flow browser 8/8은 `9039879b2`의 변하지 않은 runtime/fixture 증거를 재사용한다.
이번에 지정한 모든 기존 owner를 전수 재실행한 것은 아니며, 실행 snippet의 전수 재검증과
최종 후보 qualification도 주장하지 않는다. Route 성능의 새 source는 여전히 미측정이다.
STEP-077 전체 완료, native SLO 통과 또는 release qualification을 선언하지 않는다.

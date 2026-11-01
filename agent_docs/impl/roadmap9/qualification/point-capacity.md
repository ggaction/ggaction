# Point 명시 capacity 검토안

## 진행 상태

- [x] 기존 action·selector·restore·current 계약과 capacity 측정 확인
- [x] 기존 동등 옵션 없음 확인
- [x] 구체 API·저장·검증·호환 계획 기록
- [x] 통합 담당의 기존 사용자 승인 범위 정합 검토 및 구현 지시
- [x] source·type·current·public docs 동기화와 focused 검증

기준: `2ab9e9f64`. Root가2026-11-01 이 문서의 flat maxItems 구체안을
[`AUTHORIZATION.json#remainingApproval`](../AUTHORIZATION.json)의 기존 사용자 승인 범위로 채택하고 구현·검증·commit/push를 지시했다. 구현 검증 전 상태를 Current 지원 증거로 사용하지 않는다.
사용자의 Roadmap9 STEP077까지 남은 API/schema/architecture/visual 결정 일괄 승인 근거는
정본은 해당 remainingApproval 기록이다. 이 문서는 추가 사용자 승인을 요청하지 않는다.

## 채택한 구현 계약

```js
chart().createData({ id: "raw", values: rows100000 })
  .createPointMark({ id: "points", maxItems: 100000 });
// 또는 createScatterPlot({ x: "x", y: "y", point: { maxItems: 100000 } })
program.editPointMark({ target: "points", maxItems: 75000 });
program.editPointMark({ target: "points", maxItems: undefined }); // 명시 capacity 제거, 기본값 복귀
```

- `maxItems`는 1부터100000까지의 safe integer이며 기본값은 기존50000이다.
  명시 `undefined`는 create에서 생략과 같고 edit에서 저장값 제거 및 기본50000 복귀다.
  편집 시 생략은 보존한다. 현재 raw/items가 새 한도를 넘으면 낮추기와 제거 모두 원자적으로 거부한다.
- `createPointMark`·`editPointMark`가 유일한 authoring owner다. 기존 point style을 받는
  facade들의 closed validator와 선언도 동일 값을 native point 생성으로 전달한다.
  Scatter/Polar뿐 아니라 같은 `CreateScatterPlotOptions["point"]`를 재사용하는 facade에서
  선언과 구현의 차이를 만들지 않는다. facade 전체의 다른 mark family 한도는 그대로다.
- replayable non-semantic authoring intent인 기존 `materializationConfigs.marks[id].maxItems`
  한 곳만 저장한다. 별도 semantic/graphic 필드, registry, persisted bypass token은 없다.
  기존 문서의 생략 필드는 유지하므로 기존 snapshot/version의 의미를 바꾸지 않는다.
- `resolveGraphicItemCapacity`가 실제 point layer/data/graphic type 및 retained child namespace
  소유권을 증명하고 검증한 owner의 명시 maxItems를 반환한다. 공통 core guard는 동일 owner의
  raw selected dataset cardinality와 concrete collection 길이를 각각 검사한다.
  missing skip으로 raw 검사를 우회할 수 없다. 임의 graphic ID/type 또는 다른 family의
  maxItems는 point 한도 승격 근거가 되지 않는다. 잘못된 config 숫자도 guard가 검증한다.
- 생성 시 초기 config를 `createGraphics`보다 먼저 연결하여 initial/incomplete에도 적용한다.
  편집은 후보 maxItems와 현재 raw/items를 먼저 검산하고 기존 wrapped rematerialization을 호출한다.
  source revision/rebind, Canvas/scale, selection/highlight, mixed shape/property array는 같은
  selector/primitive guard를 재사용한다. 기본 오류 metadata50000는 보존한다.
- editable restore는 명시 maxItems의 값과 point owner를 검사하며 뒤의 raw/items 공통 guard를
  재사용한다. config 유실·무효값·nonpoint 이동·owner/type/namespace 위조는 기본/일반 한도로
  거부한다. graphic-only structural validation은 기존 capacity 미검사 경계를 유지한다.
- Full/Basic는 같은 point primitive 경계를 사용한다. composition은 실제 retained child의
  capacity를 재귀 조회한다. facet은 원 source의100000 한도와 각 child raw/items를 각각 검산하고
  독립 collection 합계가100000을 넘는 composition은 각 owner별 검증으로 허용한다.
  일반 generated-item10000/work10M와 다른 family/path 한도는 올리지 않는다.

## 검증 계획

- Full/Basic: 기본49999/50000/50001 유지, 명시99999/100000/100001 및 invalid 값.
- createPoint/incomplete/Scatter/Polar와 공유 point facade 전달, edit 유지/낮춤/제거와 immutable 실패.
- raw missing skip, source revise/rebind, homogeneous/mixed/arrays, resize/scale/highlight,
  primitive unowned/type 위조, editable codec 유실/숫자/owner 변조, graphic-only 경계.
- facet·nested composition·서로 다른 child limit 및 합계100000 초과, renderer full item count와
  hit scene/query를 실제100000 native point 입력으로 확인한다.
- 원 point/hit1k/10k/100k workload 및 full-frame16.7/33/50ms는 줄이지 않는다.
  maxItems는 생성 한도만 연다. animation10k guide endpoint, hit scene100k, load/revise의
  synchronous slice50ms는 독립 경계이므로 이 변경의 성공으로 성능/SLO 완료를 주장하지 않는다.
  sample/drop/downsample 없이 모든 원 row/item 검산을 유지한다.

근거: [MARKS](../../../contract/current/MARKS.md#createpointmark),
[현재 architecture point owner](../../../SECOND_ARCHITECTURE.md#point-owned-graphic-capacity),
[원 workload](native-workloads-tool-evidence/README.md),
[capacity audit](native-workloads-tool-evidence/CAPACITY_AUDIT.md).


## 검증 결과

- 구현은 Current MARKS/PRIMITIVES, 선언, point API 문서, action card·검색·LLM 생성물과 동기화했다.
- 기존 Basic 표면은 `createPointMark`/`createScatterPlot` 범위 그대로다. 편집과 Polar/Strip 등은
  원래 지원하는 Full에서 검증하며 Basic에 새 facade나 editor를 추가하지 않았다.
- 원100000개의 모든 raw row·native 좌표, Canvas arc100000, SVG circle100000,
  PDF fill100001(배경1 포함), PNG/SVG/PDF raster의 대표 잉크를 검산했다.
  facet100000→50000×2와 nested 합계100002도 editable restore를 통과했다.
- 최종 설치 tar의 exported `ggaction`/`ggaction/basic`에서100000개 전수와100001 원자 거부를
  [`packed-smoke.mjs`](point-capacity-evidence/packed-smoke.mjs)로 재현했다.
  SHA·크기·결과는 [`packed.json`](point-capacity-evidence/packed.json)을 따른다.
- Package entries1239와 packed 상한1780500은 유지한다. unpacked 실측8023985가 기존8021400을
  넘으므로 기존 천단위 정책의8024000으로만 올렸다. Full782690/Basic423769 gzip은 기존
  783900/424400 안이어서 browser 상한은 바꾸지 않았다. 공유 point 선언의 유한 증가로
  Regression compact card3667B가 기존3640B를 넘으므로 이 한 card만3670B로 맞췄다.
- hit의 배경 포함100001 scene와 animation10k는 독립 기존 한도로 실제 거부됨을 검증했다.
  이 결과는 원1k/10k/100k workload P95나 sync50ms 충족을 주장하지 않는다.
  benchmark 옵션 전달·전후 hash/fixture/SLO 검산은 통합 담당이 별도 checkpoint로 수행한다.
- 정밀 source hash와 범위·실측은 [`summary.json`](point-capacity-evidence/summary.json),
  최종 focused runner의 code0 기록과 압축 로그는 같은 evidence 디렉터리에 보존한다.
  최종 Node22.23.1 focused unit66/66, contracts40/40, docs58/58, installed exported entry2/2가 통과했다.
  이 checkpoint는 개별 변경 검증이며 통합 후 Node20/22/24·최종 P95 qualification을 대체하지 않는다.

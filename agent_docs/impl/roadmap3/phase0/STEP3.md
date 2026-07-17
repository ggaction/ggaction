# STEP 3 — Focused Edit and Lifecycle Audit

## 진행 상태

- [x] Current 87 direct actions를 lifecycle별로 전수 분류
- [x] Mechanical create/edit name gap과 intentional create-only를 분리
- [x] Empty edit, repeated create와 assignment replacement 정책 확인
- [x] Raw graphic removal 뒤 rematerialization failure를 executable하게 재현
- [x] Legend internal wrapped action과 proposed public name 충돌 확인
- [x] Axis, grid, legend, title과 mark lifecycle 감사
- [x] Error bar, error band, box plot과 regression aggregate ownership 감사
- [x] Focused edit, aggregate edit, removal과 parameter-symmetry 후보 분리
- [x] 추가하지 않을 edit/remove action을 명시
- [x] Step 3 범위 밖의 source, test, contract inventory와 public docs를 변경하지 않음

## 목적

`create*`에 기계적으로 대응하는 `edit*`를 모두 추가하지 않는다. Current action의 lifecycle과 실제
stored ownership을 확인하고 다음 질문으로 public gap을 판정한다.

1. 사용자가 보는 stable component인가?
2. 현재 변경 방법이 generated ID, raw property path 또는 internal state shape를 요구하는가?
3. 여러 semantic/config/graphic child를 하나의 atomic operation으로 바꿔야 하는가?
4. 기존 assignment action을 다시 호출하는 것으로 충분한가?
5. 제거 뒤 Canvas, scale, data 또는 highlight rematerialization이 계속 안전한가?

이 STEP은 candidate를 검증하지만 action 이름, exact parameter와 removal cascade를 확정하지 않는다.
`ACTION_INDEX.json`에 Proposed/Planned entry를 추가하지 않고 Gate A 결정 전까지 current contract를 유지한다.

## Current lifecycle baseline

`ACTION_INDEX.json`의 direct action 87개는 다음과 같다.

| Lifecycle | 개수 | 기본 해석 |
| --- | ---: | --- |
| Mutable resource | 46 | Stable resource에 create/edit 경로가 있음 |
| Assignment | 19 | 같은 encoding action 재호출이 edit임 |
| Aggregate create-only | 10 | Wrapped children을 조합함 |
| Immutable create-only | 7 | 새 immutable dataset/revision ID를 생성함 |
| Primitive | 3 | Extension-level semantic/graphic operation |
| Stable create-only | 1 | Selection identity를 생성하고 다른 action이 소비함 |
| Structural create-only | 1 | Coordinate replacement와 consumer rebinding을 선호함 |

Mechanical name matching으로는 다음 16개 create action에 같은 이름의 edit action이 없다.

```text
createData                 createDensityData
createRegressionData       createIntervalData
createDerivedData          createCoordinate
createRuleMark             createRegression
createErrorBar             createErrorBand
createBoxPlot              createAxes
createXAxis                createYAxis
createGrid                 createGuides
```

이 목록 자체는 API gap이 아니다. 감사 결과 direct edit 후보는 `createRegression`, `createErrorBar`,
`createErrorBand`, `createBoxPlot`, `createXAxis`, `createYAxis`, `createGrid`의 7개다. 나머지 9개는
현재 lifecycle을 유지한다.

## Executable lifecycle observations

Cars point chart에 axes, grid, legend와 title을 만든 뒤 current public action을 직접 실행했다.

### Empty edit

다음 current edit actions는 모두 최소 한 변경값을 요구하고 이전 program을 바꾸기 전에 실패한다.

```text
editTitle({})                    editTitle requires at least one change.
editLegend({ target, ...{} })    editLegend requires at least one change.
editPointMark({ target, ...{} }) editPointMark requires shape, fill, opacity, stroke, or strokeWidth.
editScale({ id, ...{} })         editScale requires at least one editable property.
```

Focused edit도 같은 정책을 따라야 한다. Empty edit을 no-op 성공으로 만들 이유가 없다.

### Repeated create

- Visual stable resource의 duplicate create는 일반적으로 오류다. `createTitle`은 existing semantic title에서
  실패하고, explicit duplicate legend도 missing-resource create contract에서 실패한다.
- `createScale`과 `createCoordinate`는 equivalent definition만 idempotent하고 conflicting definition은
  실패한다.
- Encoding assignment는 같은 action 재호출로 compatible property를 교체한다.
- Dataset과 selection identity는 immutable create-only이므로 기존 ID를 교체하지 않는다.

이 차이는 의도적이다. 모든 create action에 동일한 duplicate policy를 강제하지 않는다.

### Raw removal은 domain removal이 아님

`editGraphics({ target, remove: true })`는 extension primitive로서 요청한 graphic subtree만 제거한다.
Semantic ownership과 materialization config는 정리하지 않는다. 다음 결과가 실제로 재현됐다.

| Raw removal | 즉시 결과 | 이후 `editCanvas` 결과 |
| --- | --- | --- |
| `chartTitle` | Title graphic만 사라짐 | `rematerializeTitle requires an existing chart title graphic.` |
| `point` | Point collection만 사라짐 | `Point mark "point" requires point graphics.` |
| `xAxisLine` | Line만 사라지고 axis semantic/config는 남음 | Resize는 성공하지만 line이 복원되지 않아 partial axis가 됨 |
| Legend symbols | Label/title은 남음 | `editLegendSymbolLines requires existing line symbols.` |
| Legend labels | Symbol/title은 남음 | `editLegendLabels requires existing legend labels.` |
| Legend title | Symbol/label은 남음 | `editLegendTitle requires an existing legend title.` |

따라서 domain removal은 raw graphic deletion의 alias가 될 수 없다. Semantic branch, graphical config,
concrete children, attachment/order와 connected materialization plan을 하나의 immutable transition으로
정리해야 한다.

## Domain lifecycle matrix

### Core resources

| Resource | Current update | Current removal | 판정 |
| --- | --- | --- | --- |
| Canvas | `editCanvas` | 없음 | Complete. Parent Canvas를 제거하는 public action은 만들지 않는다. |
| Source data | 새 dataset ID | 없음 | Intentional immutable. `editData`를 만들지 않는다. |
| Derived data | 새 immutable revision과 rebind | Unreferenced revision은 internal cleanup | Intentional. Generic edit/remove를 만들지 않는다. |
| Coordinate | 새 coordinate와 explicit layer binding | 없음 | Structural create-only 유지. Polar work에서 binding contract만 확장한다. |
| Scale | `editScale` | 없음 | Edit complete. Top-level `palette` parameter만 ergonomics gap이다. |

Standalone `removeScale`은 이번 후보에서 제외한다. Scale은 shared consumer resource이므로 removal intent는
consumer removal/rebinding 없이 안전하게 정의할 수 없다.

### Marks and encodings

| Resource | Current update | Gap 또는 결론 |
| --- | --- | --- |
| Point | `editPointMark`, appearance encodings | Edit는 complete. Create-time appearance option이 부족함. |
| Line | `editLineMark`, group/color/dash encodings | Constant stroke와 opacity가 create/edit에 없음. |
| Bar | `editBarMark`, width/layout encodings | Edit는 complete. Create-time appearance option이 부족함. |
| Area | `editAreaMark` | Create/edit symmetry가 충분함. |
| Rule | Position/appearance encoding 재호출 | `editRuleMark`를 만들지 않음. |
| Encoding | 같은 `encode*` action 재호출 | Assignment lifecycle 유지. 모든 channel에 별도 `edit*`를 만들지 않음. |

Point와 bar는 `fill`, `opacity`, `stroke`, `strokeWidth` create option을 existing edit contract와 맞추는
후보다. Line은 `stroke`, `opacity`를 create/edit 양쪽에 추가하는 후보다. 이는 새 action이 아니라 existing
action parameter 확장이다.

`removeMark`는 필요한 domain removal 후보다. Ordinary layer뿐 아니라 composite owner를 제거할 때
namespaced child layers, unreferenced derived data, mark config, highlights/selections와 guide consumers를 어떻게
정리할지 exact contract가 필요하다. Shared scale을 유지할지 제거할지는 Step 6/Gate A에서 명시적으로
결정해야 한다.

### Cartesian axes and grids

| Resource | Current update | Gap 또는 결론 |
| --- | --- | --- |
| Axis line | Direction별 direct edit | Complete |
| Axis ticks | Direction별 direct edit | Complete |
| Axis labels | Direction별 direct edit | Complete |
| Axis ticks+labels | Direction별 aggregate edit | Complete |
| Axis title | Direction별 direct edit | Complete |
| Complete x/y axis | Child edits를 여러 번 호출 | `editXAxis`, `editYAxis` 후보 |
| Horizontal/vertical grid | Direction별 direct edit | Complete |
| Both-direction grid | 두 child edit를 직접 호출 | `editGrid` aggregate convenience 후보 |

Axis position은 line, ticks, labels와 title에 동시에 영향을 준다. 현재 사용자가 일부 child만 바꾸면
서로 다른 edge에 놓인 partial axis를 만들 수 있으므로 `editXAxis`와 `editYAxis`는 단순 shorthand가 아니라
atomic facade다. 구현은 existing child edit actions를 실제로 호출해 trace hierarchy를 보존해야 한다.

`editAxes`는 만들지 않는다. X와 Y는 독립 stable resources이고 complete-axis facade 두 개면 충분하다.
`editGrid`는 horizontal/vertical option을 받아 선택한 existing directions에 위임하는 aggregate convenience로
검토한다. Direction 하나만 수정할 때는 current direct action을 계속 사용한다.

Removal 후보는 `removeXAxis`, `removeYAxis`, `removeGrid`다. Axis component마다 remove action을 만들지
않고 complete axis 또는 selected grid directions를 atomic하게 정리한다.

### Legend and title

Current `editLegend`는 기능적으로 complete하지만 다음 nested aggregate call을 요구한다.

```javascript
program.editLegend({
  labels: { fontSize: 12, color: "#334155" },
  border: { padding: 8, color: "#cbd5e1" }
});
```

Layout, labels, title, symbols와 border는 독립적으로 보이는 stable visual components다. 다음 focused edit는
justified candidate다.

```text
editLegendLayout
editLegendLabels
editLegendTitle
editLegendSymbols
editLegendBorder
```

기존 `editLegend`는 여러 component를 한 호출에서 바꾸는 aggregate convenience로 유지한다. Focused action은
동일한 canonical option validation/config patch/rematerialization policy에 위임해야 한다.

중요한 naming prerequisite가 있다. Runtime prototype에는 이미 다음 internal wrapped methods가 존재한다.

```text
editLegendBackground
editLegendLabels
editLegendTitle
editLegendSymbols
editLegendSymbolLines
editLegendSymbolPoints
editLegendSymbolSwatches
```

이들은 public direct contract/type에 없는 no-option rematerializers다. 예를 들어 current
`editLegendLabels()`는 style patch를 받지 않고 existing labels를 다시 materialize한다. Proposed public
focused name과 충돌하므로 먼저 `rematerializeLegend*` vocabulary로 rename하고 internal inventory에
누락 없이 기록해야 한다. Public behavior를 internal method signature 위에 덮어쓰지 않는다.

Title은 `editTitle`로 text, subtitle, layout, wrapping과 styles를 이미 부분 수정할 수 있으므로 leaf edit를
추가하지 않는다. Runtime의 `editTitleText`와 `editSubtitleText`도 internal wrapped component이며 public
focused action으로 승격하지 않는다.

Removal 후보는 `removeLegend`와 `removeTitle`이다. Legend removal은 semantic guide, complete kind-specific
config, symbols/labels/title/background, highlight reflection을 함께 정리해야 한다. Title removal은 semantic
title, title config와 every wrapped text graphic을 함께 정리해야 한다.

### Composite and statistical marks

| Aggregate | Current edit path | 문제 | 후보 |
| --- | --- | --- | --- |
| Error bar | Main/cap rule encodings을 ID별 재호출 | Cap IDs와 derived interval ownership 노출 | `editErrorBar` |
| Error band | Owner area edit + boundary line IDs | Boundary/generated IDs와 statistical revision 노출 | `editErrorBand`, `editErrorBandBoundary` |
| Box plot | Body/bar, median/rule, outlier/point child edits | Generated IDs와 summary/outlier revision 노출 | `editBoxPlot` |
| Regression | `editRegressionBand`, `editRegressionLine` | Method/confidence/group revision을 바꿀 owner edit 없음 | `editRegression` |

Appearance-only edit는 current derived rows를 유지하고 ordinary child edit에 위임한다. Statistical option edit는
`editDensity`가 사용하는 revision pattern처럼 새 immutable derived revision을 만든 뒤 owning consumers를
rebind하고 scale/mark/guide plan을 다시 실행해야 한다.

Composite leaf마다 direct action을 만들지는 않는다.

- Error-bar cap은 `editErrorBar`의 owned option이다.
- Box median, whisker와 outlier는 `editBoxPlot`의 nested stable component option이다.
- Regression band/line은 이미 독립 direct edit가 있으므로 유지한다.
- Error-band boundary는 lower/upper line을 함께 소유하는 stable optional component라 별도 focused facade가
  정당하다. Independent lower/upper styling이 필요하면 exact target syntax를 Step 4에서 검토한다.

### Selection and filtering

- `filterMarks`는 immutable selected-item dataset을 만들고 target을 rebind하므로 create-only를 유지한다.
- `selectMarks`는 stable selection identity를 만들고 기존 ID를 교체하지 않는다.
- `highlightMarks`는 같은 selection assignment를 재호출해 appearance를 교체한다.
- `editSelection`, `removeSelection`과 `removeHighlight`는 concrete user request가 없으므로 Phase 1 후보에
  넣지 않는다. Selection/highlight lifecycle이 실제 chart authoring을 막는 사례가 생기면 별도 감사한다.

## Candidate set after audit

### Focused or aggregate edit candidates

```text
editLegendLayout       editLegendLabels
editLegendTitle        editLegendSymbols
editLegendBorder       editXAxis
editYAxis              editGrid
editErrorBar           editErrorBand
editErrorBandBoundary  editBoxPlot
editRegression
```

### Domain removal candidates

```text
removeXAxis
removeYAxis
removeGrid
removeLegend
removeTitle
removeMark
```

### Existing-action parameter candidates

```text
createPointMark: fill, opacity, stroke, strokeWidth
createBarMark: fill, opacity, stroke, strokeWidth
createLineMark/editLineMark: stroke, opacity
editScale: top-level palette mutually exclusive with range
```

이 목록은 Proposed evidence이며 아직 accepted Planned inventory가 아니다.

## Explicit non-candidates

다음 action은 이번 lifecycle 감사에서 추가하지 않는다.

```text
editData / editDerivedData / editDensityData / editRegressionData / editIntervalData
editCoordinate
editRuleMark
editAxes
editGuides
removeCanvas
removeScale
generic removeGuide
per-child box-plot or error-bar edit actions
editSelection / removeSelection / removeHighlight
```

이유는 immutable revision, structural replacement, existing assignment ownership, stable-child facade 또는
concrete use-case 부재 중 하나다.

## Contract questions left for Step 6 and Gate A

1. `removeMark`가 unreferenced generated dataset은 제거하되 user-created source/scale은 항상 보존할지
2. `removeGrid`가 all-directions default와 explicit directional selection을 어떤 syntax로 받을지
3. `editRegression`과 composite edits에서 appearance patch와 statistical revision을 한 action에 어떻게
   mutually exclusive 또는 atomic하게 결합할지
4. `editErrorBandBoundary`가 shared recipe만 편집할지 lower/upper selector를 받을지
5. Focused legend edit가 categorical, size, gradient, opacity와 interval kind에서 지원할 common subset
6. Domain removal 후 같은 deterministic role ID로 create를 다시 호출하는 recreate lifecycle
7. Missing/ambiguous removal을 error로 할지 already-absent removal을 idempotent하게 할지

이 질문은 public contract에 영향을 주므로 implementation에서 임의로 결정하지 않는다.

## Step 3 결론

- Mechanical create/edit symmetry는 action 설계 기준이 아니다.
- Current assignment와 ordinary mark edits는 대부분 충분하다.
- Axis position, legend components와 composite ownership에는 focused facade가 필요하다.
- Raw graphic removal은 stale semantic/config를 만들거나 다음 rematerialization을 실패시키므로 domain removal이
  필요하다.
- Existing internal `editLegend*` names는 public focused API와 충돌하므로 rename prerequisite다.
- 다음 STEP은 Polar/composition/facet stored-state contract를 독립적으로 설계한다. Step 6에서 두 감사 결과를
  합쳐 Proposed inventory와 Phase assignment를 완성한다. Gate A 승인 전에는 구현하거나 Planned로 승격하지
  않는다.

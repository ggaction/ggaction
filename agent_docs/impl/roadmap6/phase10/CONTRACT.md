# Roadmap 6 Phase 10 A — Comparison and composition contract

## 기준과 승인

- Baseline/source ref: `3343c82c`
- 범위: R6-P10-W1~W3, D19와 F19.
- [전체 실행 승인](../APPROVAL.md)이 Phase 10의 A/V/X와 필요한 package/browser ceiling 조정에 적용된다.
- 기존 `facet`, `hconcat`, `vconcat`, `editCompositionLayout`, `replaceCompositionChild`의 현재 호출은 유지한다.

## 발견한 현재 불일치

1. `resolveFacetDefinition`은 explicit `values`와 그 순서를 검증하지만 public `facet` option allowlist와 declaration이
   `values`를 막는다. 내부 능력과 public 계약이 어긋난다.
2. Facet identity는 한 field의 first-appearance order와 index child ID만 저장한다. Row×column 좌표, observed/full
   조합과 empty-cell 의미를 표현할 owner가 없다.
3. Concat은 stable named child를 저장하지만 replacement 외에 insert/remove/reorder가 없어 구조를 바꾸려면 전체
   composition을 다시 작성해야 한다.
4. Cartesian facet의 scale/axis/legend promotion은 구현돼 있다. Polar와 Parallel은 concat child로는 실행되지만
   facet scale/guide resolution이 없으므로 지원된다고 일반화하면 안 된다.

## W1 public surface

```ts
facet(options: {
  id?: string;
  field: string;
  data?: string;
  values?: readonly DatasetScalar[];
  columns?: number;
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}): ChartProgram;

facetGrid(options: {
  id?: string;
  data?: string;
  rows: { field: string; values?: readonly DatasetScalar[] };
  columns: { field: string; values?: readonly DatasetScalar[] };
  combinations?: "observed" | "full";
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}): ChartProgram;

repeatCharts(options: {
  id?: string;
  target?: string;
  channel: "x" | "y";
  fields: readonly [string, ...string[]];
  columns?: number;
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}): ChartProgram;

editFacetSource(options: { program: ChartProgram }): ChartProgram;
```

### One-field facet order

- `values`는 unique finite scalar의 non-empty array다. Source에 관측된 값만 허용하며 지정 순서가 child/header/layout
  순서가 된다. 생략하면 기존 first-appearance order를 유지한다.
- 기존 child IDs `${id}-cell-${index + 1}`과 현재 default/layout/scale/guide 의미는 유지한다.

### Two-dimensional grid

- `rows.field`와 `columns.field`는 서로 다른 nominal/ordinal source field다. 각 축의 `values` 생략은 source
  first-appearance order, 명시는 exact order다.
- `observed`는 실제 관측된 pair만 child로 만들되 각 child의 row/column 좌표를 보존해 빠진 pair가 grid 위치를
  압축하지 않는다. `full`은 Cartesian product를 만들고 관측되지 않은 pair를 명시적인 blank child로 유지한다.
- Child IDs는 `${id}-row-${rowIndex + 1}-column-${columnIndex + 1}`이다. Composition state는 row/column domains,
  각 child의 scalar pair, grid coordinates와 `empty` 여부를 canonical하게 저장한다.
- Header는 최소 구현에서 각 occupied/blank cell 위에 `rowValue · columnValue`를 표시한다. Empty string은 `(empty)`로
  표시한다. 독립적인 shared row/column spanning header는 별도 typography 제안이며 이번 의미 계약에 필요하지 않다.
- Empty `full` cell은 원본과 같은 Canvas 크기의 mark-free child다. Shared channel은 parent/global domain을 사용한다.
  자동 independent domain은 표본이 없으므로 거부하고, explicit semantic domain이 있는 channel만 independent를 허용한다.
- 최대 child 100개와 partition work 10,000,000 한도는 product/observed 결과에 동일하게 적용한다.

### Field repeat

- `repeatCharts`는 한 complete direct-source Cartesian mark의 기존 x 또는 y encoding을 ordered field 목록으로
  교체해 비교 cell을 만든다. `target` 생략은 eligible mark가 정확히 하나일 때만 허용한다.
- 모든 field는 base encoding의 field type과 materialization grain에 맞아야 한다. Composite role, derived dependency,
  Polar theta/radius, Parallel dimension list는 명시적인 이유와 함께 atomic error다.
- Child IDs는 `${id}-field-${index + 1}`, header는 field name이다. Repeated positional channel은 기본
  `independent`, 나머지 사용 channel은 기존 facet처럼 `shared`다. Caller가 repeated channel을 `shared`로 요청하면
  모든 field의 union domain을 사용한다.
- Axes default는 `each`다. Repeated field마다 title/unit이 달라질 수 있으므로 repeated positional channel의
  `outer` promotion은 거부한다. Compatible non-repeated legend는 `shared`로 승격할 수 있다.

### Whole-recipe source revision

- `editFacetSource({ program })`은 facet/grid/repeat parent의 현재 partition/repeat recipe, order, layout,
  scale/guide/header/title policy를 새 complete unit program에 다시 적용한다.
- 새 program은 unfinished action stack이 없어야 하며 현재 recipe의 fields/target role을 만족해야 한다. 성공 시 cell을
  처음부터 재생성하고 실패 시 이전 parent/children/trace와 caller program을 보존한다.
- 동일한 ordered domains/fields에서는 child IDs가 유지된다. Observed domain이 달라지면 새 canonical order에 맞춰
  child closure를 교체한다.

## W2 public surface

```ts
insertCompositionChild(options: {
  id: string;
  program: ChartProgram;
  before?: string;
  after?: string;
}): ChartProgram;

removeCompositionChild(options: { target: string }): ChartProgram;

reorderCompositionChildren(options: {
  order: readonly [string, ...string[]];
}): ChartProgram;
```

- 세 action은 concat composition에서만 동작한다. `id`는 새 stable child name이며 `before`와 `after`는 배타적이다.
  둘 다 생략하면 tail에 삽입한다. Unknown anchor, duplicate ID, incomplete child는 전체 호출을 거부한다.
- Remove는 정확히 한 named child와 snapshot을 제거하고 sibling reference/order를 보존한다. 최소 한 child는 남아야
  하며 tail child 제거와 single-child concat materialization을 지원한다. 마지막 남은 child 제거는 atomic error다.
- Reorder는 현재 child ID 전체를 중복·누락 없이 정확히 한 번 포함해야 한다. Child object reference는 유지하고 새
  순서로 geometry와 namespaced graphic snapshot을 다시 materialize한다.
- Facet-derived children은 위 세 action과 `replaceCompositionChild`로 임의 변경할 수 없다. 허용된 구조 편집은
  `editFacetSource`, `editFacetScales`, `editFacetGuides`, `editFacetHeaders`, `editCompositionLayout`뿐이다.

## W3 coordinate/guide support matrix

| Composition | Cartesian | Polar | Parallel | Parent guide policy |
| --- | --- | --- | --- | --- |
| hconcat/vconcat + named edits | supported unit/nested | supported unit/nested | supported unit/nested | child-owned snapshots; no implicit promotion |
| facet | supported current families | unsupported: theta/radius scale+axis resolver 없음 | unsupported: dimension-axis list resolver 없음 | axes each/outer, compatible shared legend |
| facetGrid | supported same families | same explicit unsupported reason | same explicit unsupported reason | axes each/outer, compatible shared legend |
| repeatCharts | direct Cartesian x/y only | unsupported: theta/radius role differs | unsupported: field list is the axis model | axes each; compatible non-repeat shared legend |

- Supported concat cells are verified through create→insert/remove/reorder/replace→layout→theme/renderer paths for all three
  coordinate families. Parent resize is composition layout; child data/scale/theme revision is performed on the child then
  propagated by named replacement.
- Facet/grid supported cells are verified through source replay, shared/independent scales, each/outer axes, shared legend,
  layout/header/title and renderer paths. Unsupported family calls include the missing resolver in the error and change no state.
- No matrix cell is marked supported from type/docs alone; runtime state, concrete graphics and Canvas/SVG/PNG/PDF consumer
  evidence are required.

## Visual targets and validation

- Grid target: two row values × three column values with one missing pair. `observed` leaves its coordinate empty;
  `full` creates a blank named cell at the same location. Primitive target uses explicit filtered child programs and concat layout.
- Repeat target: three quantitative fields repeated on x with independent domains and shared categorical legend. Primitive target
  uses three explicit re-encoded unit programs.
- Named edit target: unequal Cartesian/Polar/Parallel children reordered and tail-removed, with exact translated Canvas snapshots.
- Same-run primitive/public semantic projection, graphic order, Canvas calls and decoded PNG equality is required where a new facade
  creates pixels. Structural edits compare the public result to a freshly constructed concat target.
- Runtime/type positive and negative cases, immutable failure, action-card/intents/docs/MCP/package boundaries, generated lifecycle,
  realistic corpus, coverage and installed-package checks follow [VALIDATION.md](../VALIDATION.md).

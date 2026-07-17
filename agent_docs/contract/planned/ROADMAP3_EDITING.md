# Roadmap 3 Planned Editing contracts

Gate A에서 승인된 Phase 1과 Phase 10 계약이다. 아직 current public behavior가 아니며 runtime, public
TypeScript와 user documentation에 노출하지 않는다.

## Focused legend edits

```typescript
editLegendLayout({
  target?: UserId;
  position?: "right" | "bottom" | "top" | "left";
  align?: "left" | "center" | "right";
  direction?: "horizontal" | "vertical";
  columns?: PositiveInteger;
  offset?: NonNegativeFinite;
  titlePosition?: "top" | "left";
  itemGap?: PositiveFinite;
}): ChartProgram;

editLegendLabels({ target?: UserId; color?; fontSize?; fontFamily?; fontWeight? }): ChartProgram;
editLegendTitle({ target?: UserId; title?: NonEmptyString | "auto" | false; color?; fontSize?; fontFamily?; fontWeight? }): ChartProgram;
editLegendSymbols({ target?: UserId; symbol?; count?; gradient? }): ChartProgram;
editLegendBorder({ target?: UserId; border: false | true | LegendBorderOptions }): ChartProgram;
```

- 각 action은 `target` 외 최소 한 변경을 요구하고 kind-incompatible option을 preflight에서 거부한다.
- Existing `editLegend`는 여러 stable component를 함께 편집하는 aggregate convenience로 유지한다.
- Existing internal no-option `editLegend*` actions는 public names를 추가하기 전에 `rematerializeLegend*`로
  rename한다.
- Focused action은 같은 canonical config normalization과 wrapped rematerialization을 사용한다.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 1.

## Cartesian guide facades

```typescript
editXAxis({ position?, line?, ticks?, labels?, ticksAndLabels?, title? }): ChartProgram;
editYAxis({ position?, line?, ticks?, labels?, ticksAndLabels?, title? }): ChartProgram;
editGrid({ horizontal?, vertical? }): ChartProgram;
```

- Complete-axis facade는 selected existing leaf edit actions를 실제로 호출하며 one preflight 뒤 atomic하게
  실행한다. Leaf 하나만 바꿀 때는 current direction-specific direct action을 사용한다.
- `editGrid`는 existing horizontal/vertical child patches를 aggregate한다.
- `editAxes`와 `editGuides`는 만들지 않는다.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 1.

## Composite owner edits

```text
editErrorBar
editErrorBand
editErrorBandBoundary
editBoxPlot
editRegression
```

- Appearance-only patch는 current derived data를 유지한다.
- Statistical patch는 새 immutable revision을 한 번 만들고 every owned consumer를 rebind한다.
- Appearance와 statistics를 함께 받으면 entire request를 preflight하고 one final materialization plan을
  실행한다.
- `editErrorBandBoundary`는 `boundary?: "both" | "lower" | "upper"`이고 default는 `"both"`다.
- Stable named subcomponents는 aggregate option으로 편집하지만 generated layer ID를 ordinary target으로
  요구하지 않는다.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 1.

## Domain removal

```typescript
removeXAxis({ coordinate?, scale? } = {}): ChartProgram;
removeYAxis({ coordinate?, scale? } = {}): ChartProgram;
removeGrid({ horizontal?: boolean; vertical?: boolean } = {}): ChartProgram;
removeLegend({ target? } = {}): ChartProgram;
removeTitle(): ChartProgram;
removeMark({ target? } = {}): ChartProgram;
```

- `removeGrid()`는 existing directions를 모두 제거한다. Explicit `false/false`는 오류다.
- Missing/ambiguous target은 오류이며 complete removal 뒤 같은 deterministic role recreate는 허용한다.
- `removeMark`는 owned semantic/config/graphics/selection-highlight와 unreferenced generated data를 제거한다.
  User-created source dataset, coordinate와 scale은 보존한다. Guide는 remaining consumer가 있으면
  rematerialize하고 없으면 제거한다.
- Every removal is one immutable transition; raw graphic deletion의 alias가 아니다.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 1.

## Layer inference and API contract

- `compatible-layer-inference` inherits only encodings valid for the new mark and must converge across equivalent
  mark/encoding authoring orders.
- `exact-public-option-types` replaces broad `ActionOptions` declarations for current guide, coordinate, scale and
  regression-component options and exports the existing named option types from the main declaration entry.
- `api-layer-classification-alignment` aligns catalog and docs audience labels without removing exports.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 1.

## Shared position scale resolution

- Scale identity is separated from mark-specific layout policy so layered bar/line consumers can share semantic
  position without silently shifting pixels.
- Shared, independent, explicit and ambiguous cases require exact resolved-coordinate tests.
- Existing valid single-mark and intentionally independent-scale behavior remains compatible.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 10.

## Cross feature integration

- Polar, composition, facet, directional marks, Canvas/scale/data revisions, selection/highlight, package types,
  installed consumers and documentation are verified as one closeout matrix.
- Unsupported Polar/facet combinations must fail explicitly rather than partially materialize.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 10.

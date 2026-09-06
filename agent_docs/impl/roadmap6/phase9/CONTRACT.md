# Roadmap 6 Phase 9 A — Packing and raincloud contract

Baseline은 `ad1e0f41c8c4558fc52e78d1e33d6c9b55877716`이다. 아래 범위는
[전체 실행 승인](../APPROVAL.md)에 따라 A/V approved이며 구현 결과와는 구분한다.

## W1 public surface

```ts
packPoints(options: {
  target?: string;
  channel: "x" | "y";
  maxOffset?: { band: number } | { pixels: number };
  padding?: number;
  key?: string;
  overflow?: "error" | "overlap";
}): ChartProgram;

removePointPacking(options?: { target?: string }): ChartProgram;

createBeeswarmPlot(options: {
  id?: string;
  data?: string;
  coordinate?: string;
  x: measure | category;
  y: category | measure;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: pointAppearance;
  packing?: false | packingPolicyWithoutTargetAndChannel;
  guides?: false | CartesianGuideOptions;
}): ChartProgram;
```

- X와 y 중 정확히 하나는 quantitative/temporal measure이고 다른 하나는 nominal/ordinal category다.
- `packPoints.channel`은 category channel이어야 한다. Measure coordinate는 bit-for-bit 유지한다.
- `maxOffset` omission은 category slot half-width다. Band fraction은 `(0, 0.5]`, pixels는 positive finite이며
  glyph extent와 plot bounds를 적용한 뒤 slot 안으로 제한한다.
- Packing은 final point shape, area/radius, rotation과 stroke extent를 사용한다. Stable source index 또는
  explicit unique `key`로 measure coordinate, identity 순서의 deterministic placement를 만든다.
- `padding` default는 1px이다. `overflow:"error"`가 기본이며 feasible candidate가 없으면 이전 program을
  보존하고 실패한다. `"overlap"`은 최소 충돌 candidate를 저장하고 resolution에 unresolved item/count를 남긴다.
- Packing과 jitter는 한 Point에서 배타적이다. `removePointPacking`은 semantic scale positions를 다시
  materialize한다. Data/scale/Canvas/radius/shape/stroke edit는 stored policy를 처음부터 replay한다.
- `createBeeswarmPlot`은 ordinary Point/position/appearance/guide child와 `packPoints`만 조합하는 Aggregate
  create-only facade다. Child actions가 후속 편집을 소유한다.

## W2 public surface

```ts
createRaincloudPlot(options: {
  id?: string;
  data?: string;
  coordinate?: string;
  category: EndpointCategoryChannel;
  value: RegressionPlotPositionChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | DensityOptions;
  summary?: false |
    ({ type: "box" } & BoxSummaryOptions) |
    ({ type: "interval" } & IntervalSummaryOptions);
  points?: false |
    ({ type: "strip" } & StripPointOptions) |
    ({ type: "beeswarm" } & BeeswarmPointOptions);
  color?: LineCategoricalColorChannel;
  guides?: false | CartesianGuideOptions;
}): ChartProgram;

editRaincloudPlot(options: {
  target?: string;
  data?: string;
  category?: EndpointCategoryChannel;
  value?: RegressionPlotPositionChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | DensityOptions;
  summary?: false | boxOrIntervalSummary;
  points?: false | stripOrBeeswarmPoints;
  color?: LineCategoricalColorChannel | false;
}): ChartProgram;
```

- Defaults는 vertical, side `before`, density enabled, box summary, beeswarm points다. Density/summary/points 중
  최소 하나는 enabled여야 한다.
- Cloud, summary와 raw points는 같은 canonical source/category/value를 사용한다. Density와 summary는
  existing statistical owners가 각 parameter를 검증하고 raw points는 source rows를 유지한다.
- Half-cloud와 summary/points slot은 category band-relative role offset을 사용한다. `before`/`after`는 화면
  좌우/상하가 아니라 category 축의 낮은/높은 방향이다. Orientation 변경에도 semantic side가 유지된다.
- Stable child ids는 `${id}Cloud`, `${id}Summary`, `${id}Points`와 각 existing owner의 namespaced descendants다.
  Child appearance는 lower editors가 소유하고 composite editor는 source/statistical role만 원자적으로 교체한다.
- Parent source edit는 세 child를 함께 재작성한다. Child-only `filterMarks`는 population을 바꾸지 않는다.
  Parent `data` revision만 density/summary/packing population을 다시 계산한다.

## 검증 matrix

- Packing: literal overlap oracle, measure invariance, category bounds, mixed glyph extent, deterministic clone/order,
  key uniqueness, infeasible error/overlap, resize/style/data/scale replay와 remove restoration.
- Beeswarm: vertical/horizontal, one/multiple categories, lower hierarchy/state/Canvas/decoded PNG equality,
  Full-only runtime/types/cards/package.
- Raincloud: vertical/horizontal, box/interval, strip/beeswarm, side, child source/provenance equality, parent role edit,
  child style edit, narrow-slot overflow와 renderer equality.
- 모든 rejected aggregate는 caller, previous program과 trace를 바꾸지 않는다.

Global force simulation, arbitrary 2D graph layout, implicit scale expansion, automatic outlier removal와 survival
analysis는 범위 밖이다.

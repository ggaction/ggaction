# Current Composite Mark contracts

## `createBoxPlot`

```typescript
createBoxPlot({
  id?: UserId;
  target?: UserId;
  data?: UserId;
  x?: PositionChannel;
  y?: PositionChannel;
  coordinate?: UserId;
  whisker?:
    | { type?: "tukey" }
    | { type: "minmax" };
} = {}): ChartProgram;
```

- Exactly one position is categorical and the other is quantitative. Categorical x produces vertical boxes;
  categorical y produces horizontal boxes. Omitted x/y는 current 또는 unique compatible encoded source에서
  data, coordinate와 scale과 함께 추론한다. 아니면 `createBoxPlot()`이 owner를 먼저 만들고 later
  `encodeX`/`encodeY`가 완성할 수 있다.
- Omitted first ID는 `boxPlot`이다. Summary/outlier datasets와 whisker/cap, median, outlier resources는 owner
  ID에서 deterministic하게 namespace된다. 두 번째 box plot은 explicit ID가 필요하다.
- Linear `(n - 1) × p` quartiles, Tukey factor `1.5`, observed in-fence whiskers와 source-order outliers를
  immutable derived datasets에 저장한다. Empty categories are not synthesized; missing category/measure rows are
  omitted and non-missing non-finite measures fail.
- `{ type: "minmax" }` stores observed minima/maxima as whiskers and creates no outlier dataset, layer or graphic.
  Public factor customization remains planned; Tukey currently uses the fixed default `1.5`.
- Concrete order는 whiskers/caps → ranged bar body → median → outliers다. Body width는 category band의 `0.7`,
  box opacity는 `1`, box/median/whisker widths는 `1.5`, outliers는 black diamond radius `3`, opacity `0.75`다.
  Outlier rows가 없으면 outlier dataset/layer/graphic을 만들지 않는다.
- Body는 ordinary bar with y/y2 or x/x2, whiskers는 explicit `createErrorBar`, median은 ordinary rule, outliers는
  ordinary point actions를 wrapped children으로 조합한다. Canvas/scale changes rematerialize every concrete consumer.
- Lifecycle은 aggregate create-only다. No `editBoxPlot`; later changes use supported ordinary child actions.

### Formal values — `createBoxPlot`

- Implemented: vertical/horizontal orientation, Tukey defaults, minmax whiskers and documented inference.
- Planned (NOT IMPLEMENTED): public Tukey factor, width/style options and `outliers: false`.
- Proposed (NOT IMPLEMENTED): subgroup partition/offset and notched or variable-width boxes.

### Value coverage — `createBoxPlot`

- ✅ Covered: direct and deferred position order, encoded-source inference, deterministic IDs, exact Cars primitive
  equality, missing/outlier ownership, Canvas rematerialization, trace and immutability.
- ✅ Covered: 1.5px box, median and whisker/cap defaults; opaque colored body and black diamond outliers.
- ✅ Covered: horizontal x/x2 body, minmax provenance, vertical median/caps, no outlier resources and pixel equality.
- 🟡 Planned: configurable factor/style/outlier variants in the remaining Phase 8 gate.
- Evidence: `test/unit/actions/statistics/create-box-plot.test.js`,
  `test/charts/cars-box-plot/public.test.js`, and `test/charts/cars-box-plot/png.render.js`.

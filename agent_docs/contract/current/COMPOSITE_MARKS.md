# Current Composite Mark contracts

## `createBoxPlot`

```typescript
createBoxPlot({
  id?: UserId;
  target?: UserId;
  data?: UserId;
  x?: { field: FieldName; fieldType: "nominal" | "ordinal" | "temporal"; scale?: PositionScale };
  y?: { field: FieldName; fieldType?: "quantitative"; scale?: PositionScale };
  coordinate?: UserId;
} = {}): ChartProgram;
```

- Current orientation은 categorical x와 quantitative y를 가진 vertical Tukey box plot이다. Omitted x/y는
  current 또는 unique compatible encoded source에서 data, coordinate와 scale과 함께 추론한다. 아니면
  `createBoxPlot()`이 owner를 먼저 만들고 later `encodeX`/`encodeY`가 완성할 수 있다.
- Omitted first ID는 `boxPlot`이다. Summary/outlier datasets와 whisker/cap, median, outlier resources는 owner
  ID에서 deterministic하게 namespace된다. 두 번째 box plot은 explicit ID가 필요하다.
- Linear `(n - 1) × p` quartiles, Tukey factor `1.5`, observed in-fence whiskers와 source-order outliers를
  immutable derived datasets에 저장한다. Empty categories are not synthesized; missing category/measure rows are
  omitted and non-missing non-finite measures fail.
- Concrete order는 whiskers/caps → ranged bar body → median → outliers다. Body width는 category band의 `0.7`,
  box opacity는 `1`, box/median/whisker widths는 `1.5`, outliers는 black diamond radius `3`, opacity `0.75`다.
  Outlier rows가 없으면 outlier dataset/layer/graphic을 만들지 않는다.
- Body는 ordinary bar with y/y2, whiskers는 explicit `createErrorBar`, median은 ordinary rule, outliers는 ordinary
  point actions를 wrapped children으로 조합한다. Canvas/scale changes rematerialize every concrete consumer.
- Lifecycle은 aggregate create-only다. No `editBoxPlot`; later changes use supported ordinary child actions.

### Formal values — `createBoxPlot`

- Implemented: the vertical Tukey signature above and its documented defaults/inference.
- Planned (NOT IMPLEMENTED): horizontal orientation, minmax whiskers, factor/width/style options and `outliers: false`.
- Proposed (NOT IMPLEMENTED): subgroup partition/offset and notched or variable-width boxes.

### Value coverage — `createBoxPlot`

- ✅ Covered: direct and deferred position order, encoded-source inference, deterministic IDs, exact Cars primitive
  equality, missing/outlier ownership, Canvas rematerialization, trace and immutability.
- ✅ Covered: 1.5px box, median and whisker/cap defaults; opaque colored body and black diamond outliers.
- 🟡 Planned: horizontal/minmax and configurable factor/style/outlier variants in later Phase 8 gates.
- Evidence: `test/unit/actions/statistics/create-box-plot.test.js`,
  `test/charts/cars-box-plot/public.test.js`, and `test/charts/cars-box-plot/png.render.js`.

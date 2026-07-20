# Violin plot contract

## `createViolinPlot`

```javascript
createViolinPlot({
  id?, data?, coordinate?, x, y,
  split?, color?, density?, area?, guides?
})
```

- `x`, `y`: field string 또는 `{ field, fieldType?, scale? }`. Exactly one categorical
  (`"nominal" | "ordinal"`) role과 one quantitative role을 요구하며 field type 생략 시 current
  dataset의 finite number 여부로 추론한다.
- `id`: 생략 시 deterministic role ID `"violinPlot"`. 같은 role이 이미 존재하면 explicit ID가
  필요하다.
- `data`, `coordinate`: explicit value, unique/current inference, documented default, error 순서를 따른다.
- `split`: `{ field, domain?: readonly [unknown, unknown] }`. Category field와 다른 field만 허용하고,
  domain 생략은 exactly two observed values에서 first-appearance order로 해결해 provenance에 저장한다.
- `color`: category field 또는 split field의 nominal encoding. String shorthand와 ordinary categorical color
  object를 받는다. Category=color이고 legend를 명시하지 않으면 중복 legend를 생성하지 않는다.
- `density`: `{ bandwidth?, extent?, steps?, kernel?, normalization?, width? }`.
  `width` default는 `{ band: 0.8, resolve: "shared" }`; `band` is `(0, 1]`, resolve는
  `"shared" | "independent"`다. Split half는 independent mode에서도 category-local maximum을 공유한다.
- `area`: `{ fill?, opacity?, stroke?, strokeWidth?, curve? }`. Field color와 constant fill은 mutually
  exclusive다. Explicit `strokeWidth` without `stroke`는 각 path의 materialized fill을 outline color로 사용한다.
- `guides`: omission/객체/`false` aggregate semantics를 따른다. Axis title은 original x/y field에서
  추론하며 default grid는 horizontal이다.
- Effect: `createAreaMark`, optional fill-outline config, `encodeDensity`, optional `encodeColor`, optional
  `createGuides`를 wrapped child로 호출한다. Category당 child chart를 복제하지 않고 one Cartesian
  coordinate의 band center와 quantitative value scale에 closed path를 materialize한다.
- Lifecycle: aggregate create-only. Statistics/placement은 `editDensity`, path appearance는 `editAreaMark`,
  field mapping은 encoding action, guides는 guide action이 소유한다.

### Formal values — `createViolinPlot`

- Implemented: `createViolinPlot({ id?: UserId; data?: UserId; coordinate?: UserId; x: FieldName | ViolinPlotPositionChannel; y: FieldName | ViolinPlotPositionChannel; split?: { field: FieldName; domain?: readonly [unknown, unknown] }; color?: FieldName | CategoricalColorEncoding; density?: { bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; width?: { band?: UnitIntervalExclusiveOrOne; resolve?: "shared" | "independent" } }; area?: AreaAppearance; guides?: false | CreateGuidesOptions })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createViolinPlot`

- Position/inference: ✅ Covered — shortest string call, explicit types/scales, vertical/horizontal, invalid same-role pair,
  unknown/ambiguous data와 atomic failure.
- Density/width: ✅ Covered — defaults, explicit bandwidth/extent/steps, shared/independent, full/half/split, unit/count,
  invalid band/side/split domain.
- Appearance/guides: ✅ Covered — color, fill-following outline, redundant legend suppression, explicit legend,
  axis/grid opt-out.
- Lifecycle: ✅ Covered — Canvas/scale/data/filter/selection/highlight rematerialization, baseline↔category revision,
  facet replay,
  overlay scale sharing, caller/earlier-program immutability.
- No proposal remains for this completed facade contract.
- Evidence: `test/unit/actions/charts/violin-plot-facade.test.js`,
  `test/unit/actions/encodings/{encode-density,edit-density}.test.js`,
  `test/charts/cars-acceleration-violins/`.

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
- `density`: `{ bandwidth?, extent?, steps?, kernel?, normalization?, width?, side? }`.
  `width` default는 `{ band: 0.8, resolve: "shared" }`; `band` is `(0, 1]`, resolve는
  `"shared" | "independent"`다. `side` default는 `"both"`; category-x는 `left/right`, category-y는
  `top/bottom` half를 지원한다. Split과 explicit side는 함께 쓸 수 없다. Split half는 independent mode에서도
  category-local maximum을 공유한다.
- `area`: `{ fill?, opacity?, stroke?, strokeWidth?, curve? }`. Field color와 constant fill은 mutually
  exclusive다. Explicit `strokeWidth` without `stroke`는 각 path의 materialized fill을 outline color로 사용한다.
- `guides`: omission/객체/`false` aggregate semantics를 따른다. Axis title은 original x/y field에서
  추론하며 default grid는 horizontal이다.
- Effect: `createAreaMark`, optional fill-outline config, `encodeDensity`, optional `encodeColor`, optional
  `createGuides`를 wrapped child로 호출한다. Category당 child chart를 복제하지 않고 one Cartesian
  coordinate의 band center와 quantitative value scale에 closed path를 materialize한다.
- Lifecycle: stable owner. Source/category/value/split/orientation/statistics는 `editViolinPlot`, lower density
  resource는 `editDensity`, path appearance는 `editAreaMark`, guides는 guide action이 소유한다.

### Formal values — `createViolinPlot`

- Implemented: `createViolinPlot({ id?: UserId; data?: UserId; coordinate?: UserId; x: FieldName | ViolinPlotPositionChannel; y: FieldName | ViolinPlotPositionChannel; split?: { field: FieldName; domain?: readonly [unknown, unknown] }; color?: FieldName | CategoricalColorEncoding; density?: { bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; width?: { band?: UnitIntervalExclusiveOrOne; resolve?: "shared" | "independent" }; side?: "both" | "left" | "right" | "top" | "bottom" }; area?: AreaAppearance; guides?: false | CreateGuidesOptions })`.
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

## `editViolinPlot`

```javascript
editViolinPlot({ target?, data?, x?, y?, split?, density? })
```

- Stable violin owner를 current/unique/explicit target 순서로 찾는다. `data`, `x`, `y`는 create와 같은
  vocabulary를 사용하며 omitted role은 현재 owner에서 보존한다.
- `x`/`y`는 항상 one categorical + one quantitative pair여야 한다. 두 role의 위치를 바꾸면 orientation,
  category/value scale definition, axes와 measure grid를 같은 immutable result에서 교체한다. Scale ID는
  channel identity로 보존한다.
- `split` object는 replace, `false`는 remove다. Split을 color로 사용하는 동안 제거할 수 없으며 group/color
  selector가 역할 변경의 의미를 잃는 경우 전체 호출을 거부한다.
- `density`는 partial patch다. KDE parameter, width와 side를 보존 또는 교체하고 `${target}DensityDataRevision${n}`
  revision으로 owner를 rebind한다. Labels, filters, selections와 highlights는 ordinary density
  rematerialization lifecycle을 그대로 재생한다.
- Area appearance는 계속 `editAreaMark`가 소유한다. Owner editor는 child appearance API를 숨기지 않는다.

### Formal values — `editViolinPlot`

- Implemented: `editViolinPlot({ target?: UserId; data?: UserId; x?: ViolinPlotPositionChannel; y?: ViolinPlotPositionChannel; split?: false | ViolinPlotSplitOptions; density?: ViolinPlotDensityOptions })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editViolinPlot`

- ✅ Covered: source/category/value/split/orientation/statistics in one edit, stable owner and scale IDs, derived
  revision/release, axes/grid handoff, highlight replay, lower appearance edit and atomic invalid roles.
- Evidence: `test/unit/actions/charts/violin-plot-facade.test.js`,
  `test/unit/actions/encodings/edit-density.test.js`.

# Complete chart facades

기존 mark·encoding·guide owner를 조합하는 full `ggaction` 전용 H0다. Basic에는 추가하지 않는다.
새 chart state나 compiler를 만들지 않는다. Canvas와 materialized source data는 먼저 작성한다.
Data는 explicit/current/unique, coordinate는 explicit/bound/unique/family default 순으로 선택하며 모호하면 오류다.
새 mark에 resolved data를 명시해 다른 mark의 encoding을 우연히 상속하지 않는다.
Guide 생략/{}는 자기 layer의 compatible guide를 확보하고 false는 이번 확보만 생략한다.
기존 guide를 삭제하거나 충돌하는 resource를 덮지 않는다. 모든 실패는 caller와 이전 program/trace를 보존한다.

## `createPiePlot`

`createPiePlot({ id?, data?, coordinate?, category, value?, aggregate?, color?, arc?, guides? })`.
Default id는 `piePlot`, lifecycle은 Aggregate create-only다.

- Category: field string 또는 `{ field, fieldType?: "nominal" | "ordinal", scale? }`. 숫자 shorthand도 nominal이다.
  Scale은 `{id?, type?:"band", domain?, range?, reverse?}`만 지원한다. Explicit domain은 모든 source category를 포함한다.
- Aggregate: value 없음은 count. Value field를 주면 `aggregate:"sum"`을 반드시 함께 쓴다. Sum-without-value와 count+value는 오류다.
  Sum은 중복 category의 nonnegative finite weights를 합친다. Invalid weight와 all-zero denominator는 오류다.
- Color: 생략은 category, false는 field color 생략, field string 또는 `{field, fieldType?:nominal|ordinal, scale?, palette?}`.
  다른 field는 각 final slice 안에서 유일해야 한다. Scalar `arc.fill`과 함께 쓰면 오류다.
- Arc: `{innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth?}`. InnerRadius는 availableRadius의 [0,1) 비율,
  padAngle은 nonnegative degrees, opacity는 [0,1]. Stroke는 create에서 string만 지원한다.
  기본은 innerRadius 0, padAngle 0, opacity 1, white stroke width 1. Optional undefined는 생략과 같다.
- Guides: `{axes?:false, grid?:false, legend?:false|PieLegendOptions}` 또는 false.
  Categorical color legend만 생성한다. Count/gradient legend와 color 외 channels는 거부한다.
  Color가 없는데 legend를 요청하면 오류다. Zero-total category의 sector는 생략하지만 color-domain legend에는 남을 수 있다.
- Effects: `createArcMark → encodeTheta → encodeColor? → guide fulfillment`의 wrapped child trace다.
  Semantic은 raw source binding과 theta/category/aggregate/weight/color/scale/coordinate, graphic은 concrete sector paths다.
  별도 slice-share cache나 derived aggregate dataset을 생성하지 않는다.
- Editing: `editArcMark`, `encodeTheta`, `encodeColor`, `removeEncoding`, scale·legend editor가 소유한다.
  Count/sum reassignment, Canvas resize와 supported sector selection은 같은 lower 경로로 동작한다.
- Donut은 `arc.innerRadius`로 작성한다. `createDonutPlot` alias는 없다. Labels와 새 theta-order API는 이 계약에 포함하지 않는다.

### Formal values — `createPiePlot`

- Implemented: `createPiePlot(options: CreatePiePlotOptions): ChartProgram`.
- Required: category. Value를 지정하면 aggregate sum이 필수다. 알려지지 않은 key, 잘못된 역할/weight/style,
  이미 존재하는 mark id와 foreign guide/coordinate/scale 충돌은 오류다.
- Proposed (NOT IMPLEMENTED): No proposal in this action contract. Labels와 별도 ordering action은 future capability다.

### Value coverage — `createPiePlot`

- ✅ Covered: shortest count, explicit sum, numeric categories, 0/invalid weights, donut geometry, scalar color opt-out,
  wrong roles/options/styles/guides, guide reuse/conflicts, prior program/caller immutability, lower edits/resize.
- ✅ Covered: 세 canonical public/primitive의 semanticSpec·graphicSpec·draw order·Canvas calls·decoded PNG pixels.
- Evidence: `test/unit/actions/charts/pie-plot.test.js`, `test/charts/pie-plot/{primitive,public}.test.js`,
  `test/charts/pie-plot/{png,vector}.render.js`, `examples/pie-plot/program.js`, `scripts/package-consumer.js`.

## `createDensityPlot`

`createDensityPlot({ id?, data?, coordinate?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, valueScale?, densityScale?, color?, area?, guides? })`.
Default id는 `densityPlot`, lifecycle은 Aggregate create-only다.

- Field는 필수 quantitative source field다. GroupBy 생략/false는 ungrouped, string은 explicit group이다.
  새 Area에 resolved data를 명시하며 다른 mark의 group/position을 상속하지 않는다.
- 기존 kernel vocabulary, gaussian default, bandwidth/extent auto, steps 100, unit normalization을 유지한다.
  유효 numeric rows만 사용한다. Constant/singleton은 explicit positive bandwidth와 increasing extent로 작성한다.
  As는 distinct output field pair다. Derived snapshot은 group(있을 때), value와 density만 유지한다.
- DensityChannel y는 x=value/y=density, x는 x=density/y=value다. Baseline만 지원하고 category placement는 Violin owner다.
  Value/density scale는 기존 quantitative position vocabulary며 density는 zero를 포함해야 한다.
- Color는 생략하면 없음. String/object field를 지정하면 groupBy와 같아야 하며 fieldType nominal/ordinal,
  categorical scale/palette와 overlay layout만 지원한다. Raw metadata join·stack/center·auto group color는 없다.
- Area는 fill/opacity/stroke/strokeWidth/curve다. 기본 opacity .2. Explicit field color와 scalar fill은 충돌한다.
  StrokeWidth는 stroke가 필요하며 create stroke:false는 미지원이다. Optional undefined는 생략과 같다.
- Guides는 Cartesian axes, horizontal/vertical grid, categorical color legend만 지원한다.
  두 orientation의 자동 grid는 현행 y축 기준 horizontal이다. Explicit color가 없는데 legend를 요구하면 오류다.
- Effects: `createAreaMark → encodeDensity → encodeColor? → guide fulfillment`의 실제 wrapped trace다.
  KDE·derived revision·area closure는 lower owner가 수행한다. Source/statistical provenance는 dataset,
  final position/group/color/coordinate는 semantic layer, concrete closed paths는 graphicSpec에 저장한다.
- Editing: `editDensity`, `editAreaMark`, scale/guide editors와 현재 selection/resize를 그대로 사용한다.
  Color/selection과 충돌하는 group/source revision은 immutable failure다. Orientation edit는 신규 지원하지 않는다.

### Formal values — `createDensityPlot`

- Implemented: `createDensityPlot(options: CreateDensityPlotOptions): ChartProgram`.
- Required: field. Unknown key, invalid statistical/scale/appearance option, conflicting source/group/color/guide는 오류다.
- Proposed (NOT IMPLEMENTED): No proposal in this action contract. Metadata joins and new orientation editing are separate capabilities.

### Value coverage — `createDensityPlot`

- ✅ Covered: shortest defaults, explicit group/no-color/opt-out, invalid/missing rows, singleton, custom output names,
  role/option/style/guide errors, shared guides, optional undefined, selected profile membership, immutable failures.
- ✅ Covered: three public/primitive semantic/graphic/order/Canvas pairs and lower statistics/style/scale/resize revisions.
- Evidence: `test/unit/actions/charts/density-plot.test.js`, `test/charts/density-plot/{primitive,public}.test.js`,
  `test/charts/density-plot/{png,vector}.render.js`, `examples/density-plot/program.js`, `scripts/package-consumer.js`.

## `createHorizonPlot`

`createHorizonPlot({ id?, data?, coordinate?, x, y, groupBy?, bands?, baseline?, extent?, resolve?, missing?, overflow?, palette?, area?, guides? })`.
Default id는 `horizonPlot`, lifecycle은 Aggregate create-only다.

- X/y는 필수 field string 또는 HorizonXEncoding/HorizonYEncoding이다. X는 quantitative/temporal,
  temporalUnit은 temporal x에만 지원한다. Y는 quantitative, folded linear scale [0,1]만 지원한다.
- 기존 bands 3, baseline 0, extent auto, shared resolution, missing break, overflow clip,
  positive blues/negative reds palette를 유지한다. GroupBy 생략/false는 ungrouped, string은 explicit group이다.
  여러 group은 하나의 coordinate에 overlay하며 facade가 small multiples를 만들지 않는다.
- Explicit coordinate는 기존 `createCoordinate` child로 연결한다. Lower encodeHorizon의 옵션은 늘리지 않는다.
- Area는 opacity/stroke/strokeWidth/curve만. Palette가 internal band color를 소유하므로 fill/generic color는 오류다.
  기본 opacity 1이며 explicit opacity는 encodeHorizon 뒤 editAreaMark로 적용한다. Optional undefined는 생략과 같다.
- Guides는 original x axis와 vertical grid만 확보한다. Axes.y, grid.horizontal, legend는 false만 받는다.
  Lower createYAxis/createLegend를 명시적으로 호출하는 경로는 유지하지만 folded amplitude와 internal band key를
  원본 측정값의 y축·legend라고 추론하지 않는다.
- All-baseline data는 original x domain과 resolved extent 0을 가진 정당한 empty path collection이다.
  Nonempty area series는 기존 최소 두 점 계약을 따르며 singleton group을 자동 삭제하지 않는다.
  Missing/duplicate x·invalid palette/statistical/scale options는 lower owner의 검증을 따른다.
- Effects: `createAreaMark → createCoordinate? → encodeHorizon → editAreaMark? → x guide fulfillment`.
  Source fields/units와 signed-fold provenance는 dataset, final x/y/y2/group/color는 ordinary layer encoding,
  concrete closed paths는 graphicSpec이 소유한다. 새 계산·상태·renderer 분기는 없다.
- Editing: `editHorizon`, `editAreaMark`, x scale/guide editor, selection/resize를 사용한다.
  Selection은 derived final band membership을 따르며 raw amplitude field를 보존한다고 약속하지 않는다.
  Shared x guide는 derived field 이름이 아니라 original x title로 호환성을 검증한다.

### Formal values — `createHorizonPlot`

- Implemented: `createHorizonPlot(options: CreateHorizonPlotOptions): ChartProgram`.
- Required: x, y. Unknown keys, unsupported roles/styles/guides, missing fields and conflicting resources fail immutably.
- Proposed (NOT IMPLEMENTED): No proposal in this action contract. Original-amplitude guides and small multiples are separate capabilities.

### Value coverage — `createHorizonPlot`

- ✅ Covered: shortest signed defaults, temporal input units, nonzero baseline, zero extent, explicit coordinate/opacity,
  missing/overflow policy, guide reuse/conflict, role/option errors, derived selection, source/caller immutability.
- ✅ Covered: three public/primitive semantic/graphic/order/Canvas pairs and lower band/style/scale/resize revisions.
- Evidence: `test/unit/actions/charts/horizon-plot.test.js`, `test/charts/horizon-plot/{primitive,public}.test.js`,
  `test/charts/horizon-plot/{png,vector}.render.js`, `examples/horizon-plot/program.js`, `scripts/package-consumer.js`.

## `createAreaPlot`

- Implemented: `createAreaPlot(options: CreateAreaPlotOptions): ChartProgram`; full only, Aggregate create-only.
- Required x/y. ValueChannel defaults to y; the opposite field is quantitative or temporal. Independent options are
  field/fieldType/temporalUnit/scale. Measurement is a field string, `{field,scale?}`, or `{lower,upper,scale?}`.
  Bounds are field strings or finite `{datum}`; at least one field is required. Simple baseline defaults to 0.
  Explicit range and baseline conflict. Crossing endpoints retain their roles without sorting or swapping.
- Optional id defaults to areaPlot; data/coordinate follow the shared facade resolver. GroupBy is an explicit
  nominal field or unique nonempty tuple. Color is optional nominal/ordinal field appearance, constant within each
  series; it does not infer a group. Area accepts fill/opacity/stroke/strokeWidth/curve; opacity defaults to .2.
  Explicit fill conflicts with field color. Unknown keys, nested target/coordinate, aggregate/bin/stack are errors.
- Layout defaults to overlay; stack/fill/diverging require one field and baseline 0 on an aligned unique group grid.
  Center additionally requires vertical nonnegative values. Missing defaults to error; break accepts null/undefined
  measure endpoints and emits segments of at least two valid samples. Stacked series break together at each gap.
- Wrapped children: createAreaMark → encodeGroup? → independent position → range endpoint owners → layoutSeries
  → encodeColor? → scoped guides. No derived source column, chart recipe, geometry cache or renderer policy is added.
- Semantic effects: mark.missing, field/datum endpoints, encoding.group and layer.layout.mode. Graphic effects:
  closed concrete paths; endpoint/layout values drive scales, guides and source-owned selection. Guides false skips
  this facade's creation; omitted guides secure compatible Cartesian axes/grid and optional categorical color legend.
- Editing uses encodeX/YRange, encodeX2/Y2, encodeGroup, layoutSeries, editAreaMark and existing scale/guide/data editors.
  Log baselines must be valid for the final pair. Invalid input/resource/grain/style/guide transitions preserve the
  complete previous program, action trace and caller-owned input.

### Formal values — `createAreaPlot`

- Implemented: required x/y; valueChannel x|y; layout overlay|stack|fill|diverging|center; missing error|break.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createAreaPlot`

- ✅ Covered: shortest/lower equivalence, signed/log/ribbon/stack/fill/diverging/center/break, invalid roles/options,
  immutable edits, exact semantic/graphic/order/Canvas and decoded PNG pairs.
- Evidence: `test/unit/actions/charts/area-facade.test.js`, `test/unit/actions/encodings/series-layout.test.js`,
  `test/charts/area-layout/`, `examples/area-layout/program.js`, `test/contracts/area-endpoint-types.test.js`.

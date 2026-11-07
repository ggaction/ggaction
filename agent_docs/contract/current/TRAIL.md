# Trail plots

## `createTrailPlot`

- Signature: `createTrailPlot(options: TargetedOptions<CreateTrailPlotOptions>): ChartProgram`.
- Full 전용. Canvas와 dataset 뒤에 x/y 또는 theta/radius, width가 필요하다. 기본 id trail;
  data/coordinate는 기존 explicit/current/unique 규칙이며 임의 첫 리소스를 선택하지 않는다.
- width는 finite nonnegative logical screen pixel 상수 또는 그런 값의 field 이름이다.
  point size나 하나의 strokeWidth가 아니며 각 sample의 normal 양쪽 width/2로 채워진 ribbon을 만든다.
  별도 width-scale API는 없고 필요한 계산은 createComputedData로 명시한다.
- layer.trail={width:{field}|{datum},missing}와 encoding의 position/group/pathOrder/color가 의미를 소유한다.
  markConfigs[id].trailPlot은 curve/tension/lineJoin/lineCap/miterLimit/fillRule/closed/body/clip만 소유한다.
  body fill/stroke/strokeWidth/opacity는 #2563eb/none/0/1, outline/shadow는 공통 옵션이다. blend는 mark 의미다.
- Cartesian direct field position은 한 축이 quantitative이며 반대 축은 quantitative/temporal/nominal/ordinal과 기존 scale을 지원한다.
  aggregate/bin/datum/conditional은 이 native sample grain에 허용하지 않는다. generic encodeX/Y/color 대신
  create/editTrailPlot의 position/color patch를 사용한다. color는 시리즈별 한 값이어야 한다.
- groupBy:string|string[]는 typed tuple 시리즈를 만든다. 생략 시 categorical color grouping과 기존 single-series
  규칙을 따른다. order:string|{field,order:ascending|descending}는 Cartesian 시리즈 순서를 정한다.
  생략 시 기존 path x/domain order다. 서로 다른 group을 연결하지 않는다.
- Cartesian curve는 기존 9개 보간법, tension은 cardinal에서만 허용한다. 위치와 scalar width는 같은
  interpolation·subdivision을 공유한다. 중간 cubic width가 음수면 clamp 없이 오류다. 연속 같은 화면 좌표는
  마지막 width로 합치며 source membership은 보존한다. step의 zero-length generated samples도 같은 규칙이다.
- Polar는 theta/radius와 기존 coordinate projection/scale을 사용하고 radius는 quantitative다.
  projected linear interpolation만 허용하며 order/tension은 금지한다. closed:true는 마지막/처음을 연결한
  두 반대 winding contour다. 기본 false. missing gap이 있는 그룹은 closed여도 gap을 연결하지 않는다.
- missing:error 기본, break는 nullish position/width에서 run을 끊는다. 그 row는 자동 position domain에서도
  제외되며 filter가 gap을 제거해 거짓 연결을 만들지 않는다. negative/nonfinite는 항상 오류다.
- 기본 lineJoin:miter, lineCap:butt, miterLimit:4, fillRule:nonzero, clip:true. bevel/round,
  square/round, evenodd를 공통 Path로 지원한다. 정확180도 반전은 두 capped run으로 나눈다.
  단일 sample은 butt에서 면적0이며 square/round는 해당 cap이다. zero width는 degenerate geometry다.
  자기 교차는 fillRule로 해석하고 geometry repair를 하지 않는다.
- sample/subdivision 최대10000, Path command 최대30000. geometry overflow나 tolerance/budget 실패는 거부한다.
- body structured FillPaint/outline/shadow, blend, color scale/legend, createMarkLabels의 explicit field/value,
  selection/filter/highlight/hit, Canvas/scale/source revision, facet/nested target, theme, accessibility와
  editable/graphic/scene offline 소비자를 기존 책임으로 연결한다. source-owned label은 마지막 유효 endpoint를
  쓰고 baseline-before-highlight 원칙을 유지한다. label field는 마지막 source member에서 읽는다.
- 값/shape/scale/primitive 후보와 최종 shared frame/guide를 state-changing child 전에 검사한 뒤
  wrapped applyTrailMark와 materializeTrailPlot을 명시 호출한다. 겹치는 Cartesian 영역은 공통
  Y scale을 사용하며 독립 Y binding 또는 중복 visible Y guide는 원본과 trace를 바꾸기 전에 거부한다.

### Formal values — `createTrailPlot`

- Implemented: `createTrailPlot(options: TargetedOptions<CreateTrailPlotOptions>): ChartProgram`.
- Proposed (NOT IMPLEMENTED): No proposal.
- Required: `width`, either `x` + `y` or `theta` + `radius`.
- Optional: `id`, `data`, `coordinate`, `groupBy`, `order`, `missing`, `curve`, `tension`, `lineJoin`, `lineCap`, `miterLimit`, `fillRule`, `closed`, `body`, `color`, `clip`, `blend`, `guides`.

### Value coverage — `createTrailPlot`

- ✅ Covered: numeric width/curve/bounds, public lifecycle, Canvas/SVG/PNG/PDF primitive pairs, browser DPR1/2, 5 authentic datasets and source-free package consumers.
- Evidence: `test/unit/grammar/trail.test.js`, `test/unit/grammar/trail-curve.test.js`, `test/unit/grammar/trail-series.test.js`, `test/unit/trail-plot.test.js`, `test/charts/trail/public.test.js`, `test/charts/trail/renderer.render.js`, `test/browser/trail.browser.js`, `test/contracts/realistic-trail-plots.test.js`, `scripts/consumers/fixtures/node/trail-plots.mjs`.

## `editTrailPlot`

- Signature: `editTrailPlot(options: TargetedOptions<EditTrailPlotOptions>): ChartProgram`.
- target은 existing Trail의 explicit/current/unique 또는 scoped child target이다. 생성 옵션을 patch하되 id는
  바꾸지 않는다. 생략은 보존; null/undefined 및 empty patch는 오류다. Cartesian/Polar family 전환은 금지한다.
- groupBy/order/color:false는 해당 binding을 제거한다. outline/shadow:false와 blend:normal은 효과를 제거한다.
  curve를 cardinal 이외로 바꾸고 tension을 생략하면 예전 tension을 제거한다. guides 생략은 현재 guide 존재를 보존한다.
- typed group/member identity는 source row keys에 근거하며 sample index/label 문자열로 만들지 않는다.
  broken runs는 하나의 logical series identity와 여러 concrete roles를 가진다.

### Formal values — `editTrailPlot`

- Implemented: `editTrailPlot(options: TargetedOptions<EditTrailPlotOptions>): ChartProgram`.
- Proposed (NOT IMPLEMENTED): No proposal.
- Required: nonempty patch.
- Optional: `target`, every create option except `id`.

### Value coverage — `editTrailPlot`

- ✅ Covered: immutable edits/revise/computed width/selection/labels/theme/facet/scoped codec, strict declarations and source-free installed consumers.
- Evidence: `test/unit/trail-plot.test.js`, `test/contracts/trail-types.test.js`, `scripts/consumers/fixtures/trail.ts`, `scripts/consumers/fixtures/node/trail-plots.mjs`.

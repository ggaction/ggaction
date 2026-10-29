# Pyramid plots

## `createPyramidPlot`

- Signature: `createPyramidPlot(options: TargetedOptions<CreatePyramidPlotOptions>): ChartProgram`.
- Full 전용 chart authoring. Canvas와 materialized dataset이 필요하다. id 기본 pyramid이며 두 번째
  생성은 명시 ID가 필요하다. data와 coordinate는 explicit→current→unique→documented main 순서로
  해석하고 모호하면 거부한다. stage/value는 필수 field 문자열이다.
- stage 값은 string/finite number/boolean이고 중복 가능하다. identity는 기존 dataset typed row key와
  lineage이며 단계명·행 순서를 identity로 쓰지 않는다. value는 finite nonnegative다. input order를 유지한다.
- orientation down(default)/up/right/left. gap 기본0, finite nonnegative logical px. 폭과 높이는 현재
  coordinate의 plot viewport에서 가져온다. 자체 stage layout이므로 Cartesian x/y encodings/axes는 없다.
- encoding width(default): 같은 단계 높이, topWidth=W×value/max, bottomWidth는 다음 단계 폭.
  마지막은 lastStage flat(default)/point. area: bottomWidth=taperRatio×topWidth, taperRatio 기본.8∈[0,1].
  area는 lastStage를, width는 taperRatio를 거부한다. mode 전환은 이전 mode 전용 설정을 해제한다.
- percentBase는 first/total/previous 중 명시할 때만 비율을 계산한다. previous 첫 단계와0분모는 null.
  빈 입력은 빈 collection, all-zero는 모든 단계 metadata를 유지하는 폭0 geometry다.
- stages defaults: fill #2563eb, stroke none, strokeWidth0, opacity1. fill은 FillPaint, stroke는 문자열,
  strokeWidth는 finite≥0, opacity는[0,1]. outline/shadow와 false reset은 공통 mark effect 계약이다.
- labels는 false 또는 {content?,format?,fill?,fontFamily?,fontSize?,fontWeight?,outline?,shadow?}.
  content stage(default)/value/percent. percent에는 percentBase가 필요하고 null label은 생성하지 않는다.
  format 기본 auto는 공통 Text formatter다. 빈 auto 문자열도 label을 생성하지 않는다. label style 기본 #0f172a/sans-serif/12/normal.
  body와 label은 같은 logical item key를 가지며 highlight 시 label stroke는 body stroke와 분리한다.
- 라벨은 4px inset의 stage 내부 직사각형에 공통 word/grapheme wrapping으로 배치한다. 전체 줄 높이는
  fontSize+(줄 수−1)×1.2×fontSize다. 내부에 들어가지 않으면 down/up은 stage 오른쪽, left/right는
  stage 아래의 같은 진행 구간 내 viewport 빈 lane을 사용한다. 양쪽 모두 부족하면 명시 오류다.
  Canvas/값/geometry를 자동 확대·수정하지 않으며 label의 Text.lines와 anchor만 저장한다.
  `labels:false`는 측정과 배치를 생략한다. 공통 formatter의 원문 text와 resolved lines는 구분한다.
  exact font profile은 wrapping 중 필요한 모든 query를 준비해야 하며 누락 측정·줄 높이 오류는
  create/edit의 첫 state-changing child 전에 거부한다. Canvas 크기·fontSize 또는 labels:false로 해결한다.
- color는 field 문자열 또는 {field,fieldType?,scale?,palette?}, false로 해제. fieldType 기본 nominal,
  ordinal/quantitative/temporal 지원. 척도 정의·mapping·legend 전환은 기존 색상 owner를 사용한다.
  기본 scale ID `<mark>-color`. color가 있으면 그 mapping이 stages.fill보다 우선한다.
  `createLegend`로 명시 생성한다. clip 기본 true이며 plot viewport를 사용한다.
- semantic `layer.pyramid`가 stage/value/options/label meaning을, mark config `pyramidPlot`이 stages/labels
  appearance와 clip을 소유한다. canonical graphic은 Path+Text collection이다. renderer는 semantic을 읽지 않는다.
- 전체 의미·값·geometry·style·scale 후보를 첫 state-changing child 전에 검증한다. 생성은 wrapped
  semantic actions→materializePyramidPlot→graphic primitives 순서다. 오류는 기존 program/trace를 보존한다.

### Formal values — `createPyramidPlot`

- Implemented: `createPyramidPlot(options: TargetedOptions<CreatePyramidPlotOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): 자동 단계 정렬 또는 implicit percent denominator.

### Value coverage — `createPyramidPlot`

- ✅ Covered: 수치·경계·immutable lifecycle, 독립 primitive, Canvas/SVG/PNG/PDF 및 browser 1×/2×, source-free package 소비자를 같은 공개 호출로 검증한다.
- Evidence: `test/unit/pyramid-plot.test.js`, `test/unit/grammar/pyramid-layout.test.js`, `test/charts/pyramid/public.test.js`, `test/charts/pyramid/renderer.render.js`, `test/browser/pyramid.browser.js`, `test/charts/mark-shadows/resource-consumers.render.js`, `scripts/consumers/fixtures/node/pyramid-plots.mjs`.

## `editPyramidPlot`

- Signature: `editPyramidPlot(options: TargetedOptions<EditPyramidPlotOptions>): ChartProgram`.
- target은 기존 pyramid다. create의 모든 field/style/layout 옵션을 patch하며 stage/value 생략은 유지한다.
  target만 있거나 빈 patch, explicit undefined, unknown key는 거부한다. labels:false 후 labels:{}는
  stage/auto와 native label style로 재활성화한다. 명시 data/coordinate 재결합도 전체 사전 검증한다.
- 동일 dataset의 source revision/reorder는 row identity를 유지하고 새로운 geometry를 계산한다. Canvas,
  coordinate, color scale, typography, theme, filter/highlight와 같은 materializer를 공유한다.
- selection은 stage당 한 항목이다. row fields·semantic channels·concrete properties·source rows를
  inspection에 제공한다. body/label hit는 같은 item key다. nested concat scoped edit와 facet source
  projection/replay, editable/graphic codec 및 scene는 동일 graphic identity를 보존한다.
- color:false는 해당 color legend도 제거한다. scale family 변경과 customized guide 충돌은 기존
  legend owner의 명시 규약이다. removeMark/removeData/bindMarkData는 기존 typed ref 수명 경계를 사용한다.
- theme는 stages.fill→mark, stages.stroke→background, labels→text/font를 적용하고 명시 style을 보존한다.
  removeTheme는 native defaults를 복원한다. font는 기존 exact metric/renderer preparation을 사용한다.

### Formal values — `editPyramidPlot`

- Implemented: `editPyramidPlot(options: TargetedOptions<EditPyramidPlotOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): graphic index를 stage identity로 사용하는 편집.

### Value coverage — `editPyramidPlot`

- ✅ Covered: source revise/rebind/remove, resize/coordinate/scale, facet/concat, selection/filter/highlight, hit/accessibility, theme/font, codec/scene 및 오류 atomicity.
- Evidence: `test/unit/pyramid-plot.test.js`, `test/contracts/realistic-pyramid-plots.test.js`, `test/contracts/pyramid-types.test.js`, `scripts/consumers/fixtures/node/pyramid-plots.mjs`.

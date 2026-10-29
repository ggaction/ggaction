# Waterfall plots

## `createWaterfallPlot`

- Signature: `createWaterfallPlot(options: TargetedOptions<CreateWaterfallPlotOptions>): ChartProgram`.
- Full 전용이며 Canvas와 materialized data가 필요하다. 기본 id는 waterfall, data/Cartesian coordinate는
  명시/current/unique 규칙이다. x는 categorical field string 또는 {field,fieldType?:nominal|ordinal,scale?},
  role/value는 필드 이름이며 필수다. reset은 optional boolean source field 이름; reset:false는 binding을 제거한다.
- 소스 순서가 누적 순서다. delta는 finite value를 현재 누적값에 더한다. subtotal은 value 필드가 없어야 하며
  현재 누적값을 0 기준으로 그린다. total은 명시 finite value 또는 현재 누적값을 0 기준으로 그린다.
  total의 명시 값은 running balance를 변경하지 않는다. total/subtotal의 reset:true만 다음 누적값을 0으로 만든다.
  delta에 reset 필드가 존재하면 false도 오류다. null/undefined, overflow, 미지 역할은 오류이며 추정하지 않는다.
- encoding.x/y는 categorical stage와 value field/scale을 소유한다. layer.waterfall은 role/reset/label meaning,
  markConfigs.waterfallPlot은 width/bars/connectors/labels/clip을 소유한다. 값을 중복 저장하지 않는다.
- yScale은 기존 quantitative position 옵션이다. 기본 zero:true/nice:false이며 실제 start/end 값에서 범위를 계산한다.
  기본 scale id는 <id>-x/<id>-y. x 중복은 행을 합치지 않으며 같은 band 위치에서 겹칠 수 있다.
- width는 {band:.72} 기본, 또는 {pixels:positive}. 두 정책은 배타적이다. bars는 positiveFill/negativeFill/
  totalFill/subtotalFill/stroke/strokeWidth/opacity/outline/shadow. 기본 fill은 #16a34a/#dc2626/#2563eb/#64748b,
  stroke #334155, width 1, opacity 1. structured FillPaint와 공통 outline/shadow를 지원한다.
- connectors 기본 enabled object이며 false로 제거한다. stroke/strokeWidth/opacity/outline/shadow만 허용하고
  기본 #64748b/1/1이다. 현재 stage가 소유하는 incoming connector를 이전 bar 오른쪽에서 현재 bar 왼쪽까지
  runningBefore 높이에 그린다. 명시 total의 value와 달라도 연결 높이는 누적값이며 reset 다음 연결은 0이다.
- labels 기본 false. {}는 content:value/format:auto, sans-serif 12/normal, fill #0f172a, offset 6이다.
  content:end|category, 일반 Text format, fill/fontFamily/fontSize/fontWeight/offset/outline/shadow를 지원한다.
  bar의 화면 상단 위에 배치하며 exact prepared font metric이 없으면 첫 child 전에 실패한다.
- color는 기존 field/color-scale 옵션으로 bar fill을 override한다. false는 역할별 fill로 복귀한다.
  clip 기본 true이며 plot viewport에 clip한다. guides는 기존 axes/grid/legend 옵션 또는 false다.
- 전체 후보의 값/scale/primitive/font/guide 호환성을 첫 state-changing child 전에 검사하고 wrapped
  materializeWaterfallPlot을 명시 호출한다. generic encoder로 자체 누적 position을 덮어쓰지 않는다.
- 각 stage는 dataset typed row key로 stable item identity를 가진다. bar/connector/label은 같은 logical item이다.
  delta/명시 total은 자신의 source row, implicit subtotal/total은 reset 이후 delta 기여 행과 자신의 control row를
  projection으로 보존한다. membership 작업은 공통 work 한도 안에서 할당 전에 검증한다.
- source revise/rebind, scales, Canvas/coordinate, typography, theme, selection/highlight, filterMarks, facet/nested target,
  inspection/accessibility/hit, editable/graphic codec, offline Canvas/SVG/PNG/PDF를 공통 소비자로 연결한다.
  filterMarks 이후 보존된 source rows의 순서로 다시 누적한다. facet은 panel별로 누적한다.

### Formal values — `createWaterfallPlot`

- Implemented: `createWaterfallPlot(options: TargetedOptions<CreateWaterfallPlotOptions>): ChartProgram`.
- Required: `x`, `role`, `value`.
- Optional: `id`, `data`, `coordinate`, `reset`, `yScale`, `width`, `bars`, `connectors`, `labels`, `color`, `clip`, `guides`.

### Value coverage — `createWaterfallPlot`

- ✅ Covered: explicit contribution roles/reset, source membership, cumulative domains, literal geometry and typed stage identity.
- Evidence: `test/unit/waterfall-plot.test.js`, `test/unit/grammar/waterfall-plot.test.js`, `test/unit/grammar/financial-roles.test.js`, `test/charts/waterfall/public.test.js`, `test/charts/waterfall/renderer.render.js`, `test/browser/waterfall.browser.js`.

## `editWaterfallPlot`

- Signature: `editWaterfallPlot(options: TargetedOptions<EditWaterfallPlotOptions>): ChartProgram`.
- target은 existing waterfall mark의 명시/current/unique 규칙이며 scoped composition target을 지원한다.
  create 옵션을 patch하되 id를 바꾸지 않는다. 생략은 보존, null/undefined와 empty patch는 오류다.
  reset:false, connectors:false, labels:false, color:false 및 outline/shadow:false는 해당 선택을 제거한다.
  guides 생략은 현재 guide 존재를 보존한다. scale 교체는 shared guide 재결합을 사전검사한다.
- source revision/reorder는 같은 typed row identity를 보존하며 실제 누적값/connector/labels는 재계산한다.
  theme는 muted stroke와 label typography를 적용하며 contribution 역할의 fill 의미는 유지한다.

### Formal values — `editWaterfallPlot`

- Implemented: `editWaterfallPlot(options: TargetedOptions<EditWaterfallPlotOptions>): ChartProgram`.
- Required: nonempty patch.
- Optional: `target`, every create option except `id`.

### Value coverage — `editWaterfallPlot`

- ✅ Covered: immutable patch, reset/connector/label removal, font and guide atomicity, revise/rebind, theme, selection and scoped composition.
- Evidence: `test/unit/waterfall-plot.test.js`, `test/contracts/waterfall-types.test.js`, `test/contracts/realistic-waterfall-plots.test.js`.

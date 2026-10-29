# OHLC plots

## `createOHLCPlot`

- Signature: `createOHLCPlot(options: TargetedOptions<CreateOHLCPlotOptions>): ChartProgram`.
- Full 전용. Canvas와 materialized data가 필요하다. id 기본 ohlc, data와 Cartesian coordinate는
  명시→current→unique 규칙이며 모호하면 거부한다. x, low, high, open, close는 필수다.
- x는 field 문자열 또는 {field,fieldType?,scale?,temporalUnit?}. 생략한 fieldType은 기존 façade
  추론 규칙이다. low/high/open/close는 field 문자열이고 yScale은 기존 quantitative scale 옵션이다.
  자동 척도 ID는 `<id>-x`, `<id>-y`; y/y2가 같은 price scale을 공유한다. 가격의 기본 zero/nice는 false다.
- 가격은 finite low≤min(open,close)≤max(open,close)≤high다. invalid error(default)/omit-row.
  omit-row는 잘못된 가격 행 전체를 위치·가격·색 도메인, geometry, label, selection에서 제외한다.
  유효 가격 행의 잘못된 x/color는 오류다. input order를 유지하고 duplicate x를 합치지 않는다.
  typed dataset row key가 identity이며 label, price 또는 배열 index를 key로 사용하지 않는다.
- stem은 low↔high Line, body는 open↔close Rect다. close>open은 upFill #16a34a, close<open은
  downFill #dc2626. flat은 doji line(default)/none으로 수평 Line 또는 body없음이다. 가격과 높이를
  보기 좋게 확대하지 않는다. body/stem 기본 stroke #334155, strokeWidth1, opacity1.
- width는 기존 Bar의 band/pixels/interval 중 하나다. categorical 기본 band.72, numeric/time 기본
  pixels5. numeric band는 거부한다. interval은 temporal UTC interval start와 covering domain을 요구한다.
- body는 {upFill?,downFill?,stroke?,strokeWidth?,opacity?,outline?,shadow?}, stem은 fill 두 개를
  제외한 동일 style. FillPaint/outline/shadow는 공통 owner이며 false effect reset을 지원한다.
- labels 기본false. 객체는 {content?,format?,fill?,fontFamily?,fontSize?,fontWeight?,offset?,outline?,shadow?}.
  content close(default)/open/low/high, format auto. 스타일 #0f172a/sans-serif/12/normal, offset6.
  low/high의 화면 상단 위에 bottom-aligned Text로 배치하고 actual font/metric owner를 재사용한다.
  clip 기본true는 plot viewport다. text를 가격 body rectangle로 대체하지 않는다.
- color는 false/field문자열/{field,fieldType?,scale?,palette?}; 기본nominal, ordinal/quantitative/temporal.
  color가 있으면 body fill만 mapping으로 대체하며 stem은 자체 style이다. 기존 categorical/continuous
  legend 전환 정책을 사용한다. guides false 또는 기존 axes/grid/legend 객체이며 create 기본{}다.
- semantic encoding.x/y/y2가 x/low/high와 scale을, layer.ohlc가 open/close/invalid/doji/label meaning을
  소유한다. config.ohlcPlot은 width/body/stem/labels/clip만 보존한다. wrapped materializeOHLCPlot이
  Line/Rect/Text collection을 쓴다. 모든 row role은 같은 item key이고 renderer는 graphicSpec만 읽는다.
- 의미·데이터·스케일·도형·style 후보와 guide binding 계획은 첫 state-changing child 전에 검증한다.
  같은 Cartesian frame의 기존 mark·guide가 있는 경우 yScale에 그 Y 리소스 ID를 명시해 공유한다.
  create/edit의 독립 가격 Y 또는 두 번째 visible Y guide는 후보 단계에서 거부한다.
  schema는 closed own-data이며 explicit null/undefined, 잘못된 scale option 객체를 거부한다.

### Formal values — `createOHLCPlot`

- Implemented: `createOHLCPlot(options: TargetedOptions<CreateOHLCPlotOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): label로 가격 역할 추론, body 높이의 자동 확대.

### Value coverage — `createOHLCPlot`

- ✅ Covered: finite OHLC inequalities, whole-row omission, typed row compound identity, literal primitives and four backend comparison.
- Evidence: `test/unit/ohlc-plot.test.js`, `test/unit/grammar/ohlc-plot.test.js`, `test/unit/grammar/financial-roles.test.js`, `test/charts/ohlc/public.test.js`, `test/charts/ohlc/renderer.render.js`, `test/browser/ohlc.browser.js`.

## `editOHLCPlot`

- Signature: `editOHLCPlot(options: TargetedOptions<EditOHLCPlotOptions>): ChartProgram`.
- target은 existing ohlc mark이며 명시/current/unique 규칙이다. create 옵션을 patch하되 id를
  바꾸지 않는다. 빈 patch/target만 있는 patch를 거부하고 생략한 의미·style은 유지한다.
- labels:false 후 labels:{}는 close/auto/native text style로 재활성화한다. color:false는 해당 범례도
  제거한다. edit의 guides 생략은 기존 guide를 새로 만들지 않는다; 기존 guide는 scale/source 변경으로 갱신된다.
- source revision/reorder와 Canvas/coordinate/scale/font/theme는 동일 materializer를 사용한다.
  stem/body/label은 row당 한 논리 항목이며 highlight offset은 모든 역할에 동일하게 적용한다.
  label은 body stroke를 물려받지 않는다. filter는 whole row, hit는 동일 logical key다.
- editable/graphic codec, facet/nested child scope, scene/offline rendering은 기존 concrete identity를 유지한다.
  theme는 labels의 text/font와 body/stem stroke→mutedText를 적용하고 명시 style을 보존한다.
  up/down fill은 가격 방향 의미가 있으므로 하나의 theme mark색으로 덮지 않는다.

### Formal values — `editOHLCPlot`

- Implemented: `editOHLCPlot(options: TargetedOptions<EditOHLCPlotOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): stem/body를 서로 다른 행으로 편집하거나 index를 item identity로 사용.

### Value coverage — `editOHLCPlot`

- ✅ Covered: source/scale/Canvas revise, labels/effects, color legends, selection/highlight/hit, facet/nested, codec, Full-only types and immutable error behavior.
- Evidence: `test/unit/ohlc-plot.test.js`, `test/contracts/ohlc-types.test.js`, `test/charts/ohlc/public.test.js`.

Outlined stem/doji roles use an explicit open M→L Path with the exact original endpoints; removing the outline restores the ordinary Line. The common outline renderer owns appearance; no line-specific renderer schema is added.

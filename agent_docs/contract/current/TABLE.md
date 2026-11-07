# Table plots

## `createTablePlot`

- Signature: `createTablePlot(options: TargetedOptions<CreateTablePlotOptions>): ChartProgram`.
- Full 전용. Canvas와 source dataset 뒤에 columns가 필요하다. 기본 id는 table이며 data/coordinate는
  기존 explicit/current/unique 규칙을 따른다. Cartesian viewport에 셀을 배치하며 x/y position axes는 없다.
- columns는 field 문자열 또는 `{key?,field,label?,format?,missingText?,cell?,footer?,width?,align?,wrap?}` 배열이다.
  key는 typed RowKey이며 기본 field다. 중복 canonical key는 거부하며 숫자1과 문자열1은 서로 다르다.
  label은 기본 field, format은 auto, missingText는 —다. 같은 표시 label은 허용한다.
- `layer.table`의 columns는 key/field/label/format/missingText/cell/footer, sortBy는 의미를 소유한다.
  markConfigs[id].tablePlot은 열 key와 width/align/wrap, 행 높이·padding·header·clip·rowLimit·역할별 appearance만 소유한다.
- cell은 text 기본, bar, 또는 `{type:sparkline,x,y,xType?,temporalUnit?,xDomain?,yDomain?,resolveY?,curve?,tension?,missing?}`다.
  text와 bar의 null/undefined/NaN은 missingText로 표시하고 Infinity/객체는 거부한다. bar는 finite number만 허용한다.
  bar의 `{type:bar,domain:[min,max]}`는 zero를 포함해야 한다. 생략하면 전체 source의 zero 포함 extent다.
  값은 공통 linear mapping으로 inner cell에 clamp되지만 accessible 값은 바뀌지 않는다.
- sparkline의 field는 원 행의 nested row 배열이다. 기존 Line 정렬·curve·missing owner를 재사용한다.
  xType 기본 quantitative, temporal은 year/timestamp 선택 가능. x extent는 열의 전체 source에 공유한다.
  resolveY 기본 shared, independent는 행별 y extent이며 명시 yDomain과 함께 쓸 수 없다.
  curve 기본 linear, cardinal만 tension을 받는다. missing 기본 error, break는 실제 gap을 유지한다.
  빈 배열/null은 missingText다. singleton은 strokeWidth/2 원으로 실제 한 sample을 표시한다.
- width 기본 auto는 동일 text-metrics owner가 측정한 전체 source/표시 header/footer 최대 폭+padding에 비례한다.
  고정 폭은 양수 logical pixel이며 남은 viewport를 auto 열들이 나눈다. 고정 폭만 있으면 남은 영역은 비운다.
  align 기본 left, center/right 지원; wrap 기본 word, character/false 지원. 기본 rowHeight28, padding4다.
  줄 높이는 기존 Text 1.2×fontSize이며 넘치는 마지막 줄은 grapheme 경계를 보존한 …로 끝난다.
  indicator조차 안 들어가거나 rowHeight가 글꼴보다 작으면 첫 child 전에 오류다. full text는 accessible cell에 유지한다.
- sortBy는 기존 SortKey 배열로 안정 정렬한다. rowLimit은 nonnegative safe integer이며 기본 전체 행이다.
  생략 행이 있으면 실제 `N of M rows shown` notice가 추가된다. rows/header/footer/notice 전체 높이가
  viewport를 넘으면 명시 오류다. 원 source rows·순서는 바뀌지 않고 정렬/열 순서 변경에도 typed cell key를 유지한다.
- footer는 false 기본 또는 scalar aggregate명/`{op,missing?,empty?,format?}`다. missing 기본 drop, empty 기본 null.
  기존 summary owner가 rowLimit 이전 전체 source를 집계하며 input/used/excluded rows를 accessible channels로 공개한다.
  sparkline footer는 count만 허용한다. 한 열이라도 footer가 있으면 blank sibling을 포함한 footer row가 생긴다.
- header/clip 기본 true. cell마다 기존 named collection clip을 사용하며 clip:false는 outer plot clip만 제거한다.
  모든 renderer는 같은 완성 Rect/Path/Circle/Text와 collection clip을 읽는다. 새 schema나 backend compiler는 없다.
- cells/bars는 fill/stroke/strokeWidth/opacity/outline/shadow, labels는 fill/fontFamily/fontSize/fontWeight/outline/shadow,
  headerStyle/footerStyle은 fill/color/fontWeight, sparklines는 stroke/strokeWidth/opacity/outline/shadow를 받는다.
  defaults: cells white/#cbd5e1/1/1, bars #93c5fd/none/0/1, sparklines #2563eb/1.5/1,
  labels #0f172a/sans-serif/12/normal, header/footer #f1f5f9/#0f172a/bold.
- color는 기존 categorical/continuous native field/scale/palette 옵션이며 body cell 배경만 source row별로 바꾼다.
  header/footer/inline bar·line은 각 역할 appearance를 유지한다. 일반 legend와 scale revision을 재사용한다.
  generic encodeX/Y/color 대신 create/editTablePlot의 color와 역할별 appearance patch를 사용한다.
- selection/hit의 item은 row key+column key+header/body/footer 역할이다. body는 원행 하나,
  aggregate footer는 전체 source membership, header/blank footer는 membership0이다.
  highlight/filter/typed keys/Canvas·source rematerialization/facet/nested target/theme/font/codec는 기존 owner를 사용한다.
  createMarkLabels 대신 column label/format과 cells의 실제 Text가 Table label 의미를 소유한다.
- 10000 rows/columns/cells/generated graphics, 10000 nested samples, 10M work 한도와 finite geometry 검증을 적용한다.
  모든 값·텍스트·완성 graphic 후보를 첫 state-changing child 전에 검사한다. explicit applyTableMark와
  materializeTablePlot은 wrapped trace에 남으며 renderer에서 계산·fetch하지 않는다.

### Formal values — `createTablePlot`

- Implemented: `createTablePlot(options: TargetedOptions<CreateTablePlotOptions>): ChartProgram`.
- Proposed (NOT IMPLEMENTED): No proposal.
- Required: `columns`.
- Optional: `id`, `data`, `coordinate`, `sortBy`, `rowLimit`, `rowHeight`, `padding`, `header`, `clip`, `cells`, `labels`, `headerStyle`, `footerStyle`, `bars`, `sparklines`, `color`.

### Value coverage — `createTablePlot`

- ✅ Covered: literal cell/data/text oracles, primitive four-output parity, typed identity, source/facet/nested/font/strict types, five authentic datasets and the same source-free archive on Node20/22/24.
- Evidence: `test/unit/grammar/table-cells.test.js`, `test/unit/grammar/table-data.test.js`, `test/unit/materialization/table-content.test.js`, `test/unit/table-plot.test.js`, `test/charts/table/public.test.js`, `test/charts/table/renderer.render.js`, `test/browser/table.browser.js`, `test/contracts/table-types.test.js`, `test/contracts/realistic-table-plots.test.js`, `scripts/consumers/fixtures/node/table-plots.mjs`.

## `editTablePlot`

- Signature: `editTablePlot(options: TargetedOptions<EditTablePlotOptions>): ChartProgram`.
- existing Table의 explicit/current/unique 또는 scoped child target. id 제외 생성 옵션을 patch한다.
  생략은 보존, columns는 전체 교체, sortBy:false/rowLimit:false/color:false는 해당 선택을 제거한다.
  outline/shadow:false는 효과를 제거한다. null/undefined/empty patch와 모호한 target은 거부한다.
- row/column typed identity는 현재 source lineage와 key를 유지하며 dataset labels/배열 index를 identity로 쓰지 않는다.

### Formal values — `editTablePlot`

- Implemented: `editTablePlot(options: TargetedOptions<EditTablePlotOptions>): ChartProgram`.
- Proposed (NOT IMPLEMENTED): No proposal.
- Required: nonempty patch.
- Optional: `target`, every create option except `id`.

### Value coverage — `editTablePlot`

- ✅ Covered: immutable source/Canvas/facet/nested edits, selection, color/legend/theme, four-output effects, offline scene endpoints and installed consumers.
- Evidence: `test/unit/table-plot.test.js`, `test/contracts/table-types.test.js`, `test/contracts/realistic-table-plots.test.js`, `scripts/consumers/fixtures/node/table-plots.mjs`.

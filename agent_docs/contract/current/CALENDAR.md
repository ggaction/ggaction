# Calendar cell과 month boundary

## 공통 계약

Full chart-authoring API다. 주소 가능한 `layout` resource가 날짜→cell 의미를 소유하고,
Calendar mark가 cell·월 경계·날짜 label을 concrete Rect/Path/Text로 만든다. Basic에는
이 API와 calendar layout 복원이 없다. renderer는 graphicSpec만 읽는다.

입력은 닫힌 own-data record다. unknown property, accessor, 잘못된 수치·날짜는 오류다.
명시 ID가 우선이고 생략한 참조는 current eligible, 유일한 eligible 순이다. 후보가 여럿이면
명시 ID를 요구한다. 실패는 caller 입력, 이전 program과 trace를 보존한다.

## `createCalendarLayout`

- Signature: `createCalendarLayout({ id?, data?, date, value?, start, end, timeZone, weekStartsOn, aggregate, missing })`.
- 기본 ID는 calendarLayout이며 중복이면 명시 ID를 요구한다. data는 materialized dataset이다.
  date는 날짜 열 이름, value는 수치 열 이름이다. count는 value를 금지하고 나머지 집계는 필수다.
- start/end는 inclusive strict YYYY-MM-DD civil 날짜다. timeZone은 UTC 또는 유효 IANA zone,
  weekStartsOn은0(Sunday)부터6(Saturday)까지 정수다. aggregate는 count/sum/mean/median/min/max,
  missing은 empty/omit를 모두 명시한다. 관측 날짜가 범위 밖이면 오류다.
- 원본 날짜는 finite integer epoch milliseconds 또는 strict ISO 문자열이다. offset이 있는 ISO는
  절대 instant이며 timezone에서 civil 날짜로 그룹화한다. offset 없는 문자열은 명시 zone의
  기존 calendar parser를 사용한다. 모호하거나 존재하지 않는 local time을 정규화하지 않고 거부한다.
  invalid/null/missing source row를 버리지 않는다. value는 finite number이며0과 음수도 유효하다.
- 같은 날 관측은 지정한 집계로 합친다. civil 날짜순으로 정렬하며 sourceIndices는 실제 입력
  기여 행 순서를 보존한다. empty는 값 null·기여 행0개인 cell을 만들고 omit는 만들지 않는다.
  관측 집계0은 missing과 다르다. DST는 civil 날짜로 이동하고24시간 덧셈으로 계산하지 않는다.
- 각 연도는 Jan1 이전 또는 같은 주 시작일부터 week0이다. weekday0은 weekStartsOn이다.
  yearIndex는 실제 연도 오름차순이며 연도별 frame을 사용한다. 일부 윤년은54개 week가 필요하다.
- month boundary는 실제 생성한 cell의 grid-edge union이다. missing:omit에서 island/hole을 유지한다.
  outer와 hole은 반대 winding이다. 월 label은 경계의 가로 중심, 연도·주·요일은 명시 role이다.
- 입력 관측과 생성 civil days는 각각10000 이하이며 boundary/정렬/달력 연산의 누적 work는
 10000000 이하다. finite overflow나 표현 불가 날짜는 오류다.
- resource kind:layout, revision0, algorithmVersion1, authored ownership, 정확한 data input 하나를 저장한다.
  options는 method:calendar, fields:{date,value?}, 정규화 civil options다. result는
  algorithm:civil-day-cells@1, years[{year,yearIndex,weeks}], cells, months이며 options를 복제하지 않는다.
  cell은 key,instant,year,month,day,yearIndex,week,weekday,value,sourceIndices다. month는
  key,year,month,yearIndex,cells,bounds,polygons다. sourceRows는 원본 row key와 calendar-day role이다.
- 복원은 같은 bounded kernel로 source/result/provenance 정합성을 검증하며 저장 결과를 대체하거나
  graphical materializer를 실행하지 않는다. label 문자열 기반 날짜 정렬은 사용하지 않는다.

### Formal values — `createCalendarLayout`

- Implemented: `createCalendarLayout(options: TargetedOptions<CreateCalendarLayoutOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit date extent or timezone inference.

### Value coverage — `createCalendarLayout`

- ✅ Covered: leap/year-end/DST/all week starts, duplicate and missing dates, all aggregates, budgets, immutable failures and corrupted restore.
- Evidence: `test/unit/calendar-layout.test.js`, `test/unit/resources/calendar-plots.test.js`, `test/contracts/calendar-plot-types.test.js`.

## `createCalendarPlot`

- Signature: `createCalendarPlot({ id?, layout?, coordinate?, color?, cells?, monthBoundary?, labels?, clip? })`.
- 기본 ID는 calendar다. Calendar layout과 compatible Cartesian coordinate를 선택한다. Canvas가 필요하며
  coordinate가 없으면 main을 만든다. layout을 만들기만 해서는 그리지 않는다.
- 연도는 위에서 아래로, week는 왼쪽에서 오른쪽으로, weekday는 위에서 아래로 배치한다.
  모든 cell은 정사각형이다. available frame의 가로/세로 중 작은 배율로 크기를 정하며 resize에 반응한다.
- color는 기존 continuous/discretized quantitative color options다. 기본 sequential scale ID는
  `<mark>-color`이며 domain은 실제 관측 집계값만 사용한다. null cell은 domain에서 제외한다.
  관측이 없는 auto domain은 기존 empty-scale 오류다. 명시 domain 또는 color:false를 사용한다.
- color:false는 fixed fill이다. cells는 fill:#2563eb, emptyFill:#f1f5f9, stroke:none,
  strokeWidth:0, opacity:1, gap:0.08가 기본이다. gap은 cell 크기에 대한[0,1) 비율이다.
  fill/emptyFill은 공통 FillPaint를 받으며 opacity0은 유효하다.
- monthBoundary는 false 또는 stroke:#64748b, strokeWidth:1, opacity:1의 style이다.
  labels는 false 또는 month/weekday/week/year별 false/style이다. 기본은 모두 enabled이며
  fill:#0f172a, fontFamily:sans-serif, fontSize:10, fontWeight:normal이다. font는 기존 명시 resource
  측정 경계를 재사용한다. cell/boundary/label style은 outline/shadow 및 false reset을 공유한다.
  label fill은 FillPaint를 받는다. clip 기본 true다. Canvas/SVG shadow는 기존 준비 API를 따른다.
- semantic layer는 calendarBinding.layout exact ref, calendarLabels enabled roles, optional intrinsic
  color encoding만 저장한다. mark config의 calendarPlot은 paint/placement만 저장한다.
- item grain은 civil day 하나다. key는 mark/layout ID와 YYYY-MM-DD이며 reorder/resize에 안정적이다.
  fields는 date,instant,year,month,day,week,weekday,value,empty와 유일한 원본 필드를 포함한다.
  rows와 typed row keys는 그날의 실제 기여 행이다. 빈 cell은 rows가 없다. lineage는 exact layout ref다.
  month/weekday/week/year decoration은 selectable item을 만들지 않는다. highlight는 cell body만 바꾼다.
- legend는 createLegend로 명시 생성한다. 일반 x/y/row encoding을 추가하지 않는다.
  inspection, accessible data, scene, codec, Canvas/SVG/PNG/PDF는 동일 materialized output을 사용한다.

### Formal values — `createCalendarPlot`

- Implemented: `createCalendarPlot(options?: TargetedOptions<CalendarPlotOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): arbitrary row encodings on calendar coordinates.

### Value coverage — `createCalendarPlot`

- ✅ Covered: shortest call, explicit references, empty/zero days, scale/legend closure, labels, effects, exact day identity and four renderer pairs.
- Evidence: `test/unit/resources/calendar-plots.test.js`, `test/charts/calendar/public.test.js`, `test/charts/calendar/png.render.js`, `test/charts/calendar/renderer.render.js`, `test/browser/calendar.browser.js`.

## `editCalendarPlot`

- Signature: `editCalendarPlot({ target?, layout?, coordinate?, color?, cells?, monthBoundary?, labels?, clip? })`.
- target은 기존 calendar mark다. 생략 값은 유지한다. 비어 있거나 undefined인 patch는 오류다.
  label:false 이후 role style을 주면 그 role만 기본값+patch로 다시 켠다. boundary도 동일하다.
- 기존 scale identity를 유지하며 명시 새 ID면 legend binding을 갱신한다. color:false는 해당
  color legend를 제거한다. customized legend family 변경은 기존 명시 remove/recreate 규약을 따른다.
- resource와 coordinate/scale/paint 변경은 같은 graphical owner를 rematerialize하며 기존 highlight와
  source lineage를 재사용한다. primitive IDs를 날짜 의미로 역해석하지 않는다.

### Formal values — `editCalendarPlot`

- Implemented: `editCalendarPlot(options: TargetedOptions<EditCalendarPlotOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): date topology mutation through primitive IDs.

### Value coverage — `editCalendarPlot`

- ✅ Covered: color/fixed paint, enabled role restoration, clipping, resize, scoped editing, named highlights and atomic invalid patches.
- Evidence: `test/unit/resources/calendar-plots.test.js`, `test/contracts/calendar-plot-types.test.js`.

## Layout lifecycle and composition

기존 [editLayout](LAYOUTS.md#editlayout)은 calendar layout에
`{target?,options:{date?,value?,start?,end?,timeZone?,weekStartsOn?,aggregate?,missing?}}`을 받는다.
비어 있지 않은 options가 필수이며 order는 civil 날짜순이므로 거부한다. count로 바꾸면 이전 value
field를 제거한다. source는 bound data를 유지하며 raw/computed/parameter/prepared revise를 따라간다.
같은 source의 모든 calendar 후보를 먼저 계산·검증한 뒤 최종 상태에서 scale/mark/guide union을 한 번
materialize한다. 실패하면 전체 이전 상태를 보존한다. 같은 ID의 revision은1 증가한다.

hconcat/vconcat과 scoped edits를 지원한다. facet/repeatCharts는 resource-backed calendar의
암묵적 partition을 수행하지 않는다. 명시 layout과 composition을 사용한다. 후행 composition
소비자 통합의 책임은 roadmap의 STEP035에 유지한다. [removeResource](CORE.md#removeresource)는
live authored mark를 cascade에서도 제거하지 않는다. removeMark 후 layout을 명시 제거한다.

# Calendar cell과 month boundary

## 진행 상태

- [x] STEP024/AT25/OR19 및 기존 날짜 owner 대조
- [x] 기존 전체 승인 범위와 순수 kernel 계약 기록
- [x] civil-day 집계와 year/week/day cell kernel·독립 oracle
- [x] 공개 Calendar action·원본 갱신·전체 소비자 계약과 구현
- [x] 타입·문서·실데이터·renderer·설치 및 최종 checkpoint

[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다. 사용자에게 남은
설계·시각 Gate 승인을 다시 요청하지 않는다. Root는 Contour `2a7549a0b` 종료 후 독립 Calendar
kernel·oracle 진행을 지시했다. 공개 연결 전 최신 통합 checkpoint를 병합한다.

## 순수 계산 계약

`normalizeCalendarOptions`와 `layoutCalendarDays`는 명시 `start/end`(strict YYYY-MM-DD),
`timeZone`(UTC/IANA), `weekStartsOn`(0–6), `aggregate`(count/sum/mean/median/min/max),
`missing`(empty/omit)을 받는다. 필수 선택을 데이터에서 추측하지 않는다. points는
`{date,value?}`의 own-data 배열이며 date는 epoch milliseconds 또는 strict ISO다.
count에는 value를 받지 않고 다른 집계에는 finite value가 필요하다.

날짜 파싱은 기존 `parseDataDateValue(format:'iso')`, civil 투영은 `calendarParts`,
날짜 범위·경계 검증은 `calendarDay`를 재사용한다. 새로운 DST/모호 시간 정책을 만들지 않는다.
날짜 범위 밖·존재하지 않는 civil date·잘못된 값·getter·sparse는 오류다. 잘못된 행을 버리지 않는다.
동일 civil day의 행은 지정 집계로 합치며 sourceIndices를 원본 순서대로 유지한다.
`empty`는 `value:null, sourceIndices:[]`인 셀을 만들고 `omit`은 없는 날을 생성하지 않는다.

Gregorian UTC surrogate의 day ordinal만 정수 날짜 계산에 사용한다. Zoned instant에 24h를
누적하지 않는다. 각 year의 Jan1 이전 week anchor와 weekStartsOn으로 week/weekday를 정하며,
yearIndex는 범위의 year 순서다. 부분 범위·빈 입력에도 명시 범위의 year frame을 보존한다.
Day identity는 civil YYYY-MM-DD이고 output은 civil-date 순서다. 모든 입력은 보존한다.

Month boundary는 실제 emitted cell square의 directed edge union이다. missing:omit의 islands와
holes를 임의로 연결하지 않는다. Contour와 동일한 cancel/stitch/containment 계산을
`grammar/gridBoundary.js`로 이동해 공유하고 별도 outline 알고리즘을 복제하지 않는다.
월 결과는 year/month, cell keys, normalized bounds와 closed polygons를 가진다. 후행 label은 이
bounds를 frame에 투영하므로 임의 pixel 위치를 저장하지 않는다.

기존 generated item 한도로 point/day 수를 제한하고 calendar boundary 계산·point 파싱·집계·edge
처리의 누적 work를 사전 검사한다. 순수 kernel은 프로그램, I/O, trace, renderer를 읽지 않는다.

## 검증 계획

독립 Gregorian arithmetic과 literal anchors로 2024년 366일/2월 29일, 1900/2000 leap rule,
연말/54-week frame, weekStartsOn 전체7값, NY spring/fall DST와 skipped civil day를 검증한다.
독립 polygon area/perimeter·cell occupancy oracle로 month union·hole·island·omit/empty를 검증한다.
중복 날짜 집계6종, 0/음수/overflow, 입력 순서 변경, 빈 입력, descriptor 및 budget 오류도 포함한다.
새 owner에 기존 grammar floor95/90/100을 적용하고 Contour 회귀를 함께 실행한다.

공개 `createCalendarPlot`/편집·resource schema·source revision·selection·resize·week/day/month label,
font/paint/effects·모든 backend·scene/codec·composition·타입/문서/설치는 다음 공개 연결 범위다.
현재 이 기록은 공개 API 구현 완료나 전체 STEP077 종료를 의미하지 않는다.

## 순수 kernel checkpoint 검증

Calendar/Contour kernel22개, 기존 날짜·Contour source/mark 회귀81개, source/discovery27개,
Contour renderer10개가 통과했다. 새 Calendar owner2개는 lines/branches/functions100%,
공유 gridBoundary는100/96.72/100이며 기존 grammar floor95/90/100을 적용했다.
초기 두 실패는 oracle 호출 wrapper가 getter를 먼저 읽은 시험과 skipped-day 오류 문구였다.
생산 코드 수정 없이 실제 경계를 직접 호출하고 명시 오류 의미를 검증해 회복했다.
Discovery의 신규 파일 미등록도 canonical calendar capability에 연결해 회복했다.

Node20.20.2/22.23.1/24.22.1 package dry-run은 모두882 entries/5,881,526unpacked,
packed1,278,849/1,276,103/1,278,849였다. ceiling은 최소1000bytes 단위
882/1,279,000/5,882,000으로 조정한다. private 계산 checkpoint이며 공개 surface는 그대로다.
전체 installed·docs build는 공개 Calendar final에서 한 번 실행한다.

## 공개 연결 계약

기존 전체 승인 안에서 다음 도메인 조합을 구현한다.

- `createCalendarLayout({id?, data?, date, value?, start, end, timeZone, weekStartsOn, aggregate, missing})`
  는 명시 civil policy와 source field를 한 번 저장한다. date/value는 원본 own field 이름이고
  count에는 value가 금지된다. 생략 data는 기존 current/unique dataset 규칙, id는 첫 calendarLayout
  역할의 결정적 이름을 사용하며 충돌하면 명시 id가 필요하다.
- `createCalendarPlot({id?, layout?, coordinate?, color?, cells?, monthBoundary?, labels?, clip?})`와
  `editCalendarPlot({target?, ...patch})`는 resource-backed calendar layer를 만든다.
  layout/coordinate는 기존 current/unique eligible inference, 기본 mark id는 calendar다.
  color는 quantitative scale 옵션이며 `{}`가 기본, false는 cells.fill 사용이다.
- `editLayout({target?, options:{...}})`는 calendar의 date/value field와 civil policy를 패치한다.
  order는 calendar의 intrinsic civil 순서를 바꿀 수 없으므로 명시 오류다. source rebind는
  기존 reviseData의 exact source revision closure를 따른다.

`layout` resource는 정확한 data InputRef 1개를 가진다. options는
`{method:'calendar',fields:{date,value?},options:<resolved civil policy>}`이며 result에는
`{algorithm,years,cells,months}`만 저장해 options를 중복 소유하지 않는다. sourceRows는 원본
row key·logical id·revision·calendar-day role을 보존한다. restore는 명시 input의 bounded 결정적
검산으로 cells/집계/month topology/provenance를 검증하며 저장 결과를 변경하지 않는다.

layer의 `calendarBinding.layout`은 exact ref, `encoding.color`는 선택적 intrinsic value binding이다.
`calendarLabels`는 month/weekday/week/year의 enabled meaning만 소유하고, config.calendarPlot은
cells paint, emptyFill, gap, monthBoundary paint, labels paint/spacing 및 clip만 소유한다.
Body/label fill은 shared FillPaint, outline/shadow는 기존 mark effect owner를 사용한다.
null missing cell은 emptyFill이고 quantitative color domain에서 제외되며 실제 0과 구분한다.

셀은 year frame별 week x weekday 정수격자를 Cartesian coordinate에 responsive 투영한다.
월 boundary/label 위치는 실제 month polygon bounds에서 파생한다. year는 세로순으로 놓고,
month/weekday/week/year labels는 기본 활성화하되 각 역할 false로 끌 수 있다. 날짜순서는
locale label 문자열과 독립이며 표시 기본값은 고정 English short month/day 및 숫자 week/year다.

Selection item grain은 civil day다. key는 layout id+date key로 reorder에 안정적이고,
sourceIndices가 실제 member row keys/rows를 제공한다. 빈 셀은 contribution이 없다.
월 경계와 날짜 격자 labels는 같은 exact layout lineage에 고유 decoration identity를 가지며
cell selection에 섞지 않는다. highlight는 cell body만 바꾸고 labels/month boundaries는 보존한다.
모든 source 후보를 preflight한 다음 final semantic state에서 scale/mark union을 한 번 적용한다.
renderers는 기존 rect/path/text concrete output만 읽는다.

## Public source checkpoint (qualification pending)

28 focused kernel/public tests, 1 declaration fixture, 3 independent primitive variants,
6 Node renderer pairs and 3 browser DPR1/2 cases passed. Five authentic temporal datasets
and three recipes each passed (16 checks including action witnesses). Source-only consumer
fresh-process and graphics/scene checks passed; this does not claim installed-package verification.
New owners measured 100% lines/functions and 98.16% branches; each existing 95/90/100 floor holds.
Initial failing style fixtures used non-contract pattern/font options and were corrected without
runtime changes. Source docs passed176/179: search bound2 corrected, uncommitted source-link1
requires a committed checkpoint. Source boundaries/types/cards39/40 passed; discovery count repaired.

Mixed Calendar+Contour source revision with a shared color scale exposed duplicate materialization.
The parent authorized one final deferred plan across resource families, with no global pending state,
after merging main2d92baea0. Final qualification includes graphSubset/graphPrepared preservation,
Calendar theme roles, three-family revision, packages, docs and required full checks.
Evidence: `calendar-evidence/public-source/`.

공통 source revision의 최종 resource 후보·단일 materialization union과 Calendar theme/font 역할 연결을
2d92baea0 통합 상태에서 검증했다. 타입·실제 고정 archive·전체 coverage·문서 검증은 다음 기록에 남긴다.


## 최종 통합 qualification

Runtime source는 `80b84bac1`, 실행 입력은 `83fffcfd8`, 합산 baseline은 `2d92baea0`이다.
후속 수리는 시험·생성 catalog·architecture 목록에 한정하며 src/types/knowledge/README/CHANGELOG와
고정 package payload는 변경하지 않았다. 원본 실패와 owning 재검증은
[final/status.json](calendar-evidence/final/status.json)에 분리해 보존했다.

- 전체 normal coverage 최초 7,965 중 7,957 통과, lines/branches/functions 96.66/94.59/99.02.
  8개 실패는 catalog/internal 목록, primitive evidence/파일 누락, package 문서 항목·한도,
  과거 point graphic ID 고정 기대, Calendar timing 등록이다. Owning normal 35/35로 회복했다.
- 기존 graph source bridge가 새 final-source planner 이후 미실행된 부분은 exact source proof,
  candidate graph edit→inference→layout 및 codec/immutable 회귀 83/83으로 검증했다.
  layouts 100/100/100, resources 100/93.10/100이며 원본 full의 다른 owner들과 각각 대조해
  critical 434개 기준을 충족한다. 두 실행을 합쳐 새 전체 coverage를 실행한 것처럼 주장하지 않는다.
- Realistic 26 중 25 통과: 실제 날짜를 가진 5개 dataset×3개 recipe와 신규 action direct witness는
  모두 통과했다. 단일 excluded option count 기대를 10,179로 맞춘 owning inventory 7/7로 회복했다.
- Calendar renderer 6/6, browser 3/3(Canvas/SVG DPR1/2), 독립 primitive의 leap-year 366일,
  관측 292일·month closed outlines·bounds 회귀 통과. 기존 Text shadow variant의 chart ID를
  공개 registry와 맞춘 후 public pair와 4 backend/codec 회귀도 통과했다.
- 동일 archive `bb5b531b1e990b337db9a3133d44a46f6d4987d9f198a4c72ac555f50d8e4ec2`를
  Node20.20.2/22.23.1/24.22.1에 각각 설치했다. 최초 runtime 237/238의 실패는 inspect sourceRefs에서
  layout뿐 아니라 원본 data도 제공하는 최신 계약을 fixture가 누락한 것이다. 이 fixture만 고친 뒤
  동일 archive의 전체 Node runtime 238/238을 각 환경에서 재검증했다. Types/MCP/tutorial84 및
  4 bundle qualification은 최초 세 환경 모두 통과했으므로 반복하지 않았다.
- Docs source180/180, built166pages/1428artifacts, desktop search와 전체320/390/768px browser 통과.
  첫 build는 system Ruby 선택으로 실패했으며 기존 Ruby3.3 경로를 지정한 retry가 통과했다.

Package는 920entries, Node22 packed1,316,966/unpacked6,061,365bytes이며 Node20/24 packed최대
1,319,887로 ceiling920/1,320,000/6,062,000을 적용했다. 동일 minified JS의 Node별 zlib gzip 최대는
Full658,183, Basic367,366, SVG20,196, interaction82,474이며 ceiling659,000/368,000/25,000/83,000이다.
기존 test/coverage 기준은 낮추지 않았다. Measurement tar와 실제 설치 tar의 hash는 구분해 기록했다.

최종 합산에서 부모가 공통 recipe 영향 3파일 `realistic-lifecycle-factor-effects`,
`realistic-scenario-generator`, `realistic-scenario-generation-isolation`을 한 번 실행한다.
GraphPlot/Calendar 등 resource-backed 가족의 자동 facet 정책은 STEP035의 기존 통합 의무다.
추가로 resource-only inferred graph와 ordinary point의 facet도 different-logical-source projection을
기존 graph same-source proof에 넘겨 거부됨을 STEP035 소유자에게 전달했다. 이 경로를 지원한다고
문서화하지 않았고 Calendar source revision 및 explicit composition 계약은 모두 검증했다.
STEP024 checkpoint는 Roadmap9 전체 또는 STEP077 완료를 의미하지 않는다.

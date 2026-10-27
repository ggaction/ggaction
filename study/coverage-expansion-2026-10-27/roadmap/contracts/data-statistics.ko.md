# 데이터 AST 통계와 조건부 인코딩 계약

## 기존 구현을 먼저 재사용

src/grammar/computed.js, transforms.js, datasetSchema.js와 src/actions/data의 현행 transform을 inventory하여 create/edit/revise/schema/lineage/selection 연결을 각각 표시한다. summary/bin/bin2d/stack/window/fold/flatten/lookup/impute/regression/density/ECDF/timeUnit이 이미 있다는 이유로 새로 만들지 않는다. 부족한 옵션과 invalidation 경로를 보강한다. 현행 계약의 numerical defaults를 이 계획 때문에 바꾸지 않는다.

## Expression AST

canonical node 종류는 literal, field, parameter, unary, binary, call, if다. discriminated object의 unknown key는 거부한다. field는 schema에서 resolve한 필드 이름이며 임의 prototype path 접근을 허용하지 않는다. 함수는 versioned closed registry다. JS source, eval, Function, global name lookup, property getter를 실행하지 않는다. normalize에서 depth≤64, nodes≤4096, call 인수 수를 검증한다.

신규 predicate는 boolean strict다. and/or는 short-circuit, 비교 대상 missing/null은 false, isMissing/isNull/isFinite로 명시 분기한다. equality는 typed equality이고 string '1'과 number1은 다르다. arithmetic invalid는 missing을 반환하고 diagnostics count를 수집한다. 0분모는 missing, finite geometry 생성 단계에서 결측 정책을 적용한다. if는 선택된 branch만 평가한다. 날짜는 epoch milliseconds+명시 timezone 의미, 문자열 concatenate는 string 인수만 허용한다. 현행 computed 계약과 충돌하면 기존 AST version을 유지하고 신규 version으로 명시 migration한다.

필수 function 그룹은 abs/min/max/pow/sqrt/log/exp/round/floor/ceil, lower/upper/length/substring/replace, isNull/isMissing/isFinite, date part/time floor, array scalar access와 범위 검사다. 지원 여부를 registry로 introspect한다. 임의 locale/timezone의 host default를 쓰지 않는다. parameter dependency는 normalize 시 추출하고 cycle을 topological sort에서 차단한다.

## 조건부 encoding

{conditions:[{when:PredicateAST,value:EncodingValue},...],otherwise:EncodingValue}로 제안한다. 순서대로 첫 true를 사용하며 otherwise는 필수다. field/scale/value 채널 계약을 기존 encoder와 공유한다. selection predicate는 stored logical selection을 참조한다. topology를 바꾸는 조건과 appearance 조건을 구분한다. opacity0을 missing으로 판정하지 않는다. branch별 field/type validation은 현재 선택되지 않은 branch도 수행한다. evaluator는 현재 branch만 계산한다.

## 통계별 구현 체크리스트

| 영역 | 반드시 명시할 것 | 독립 기대값 |
|---|---|---|
| summary | missing, sample/population, group order, weight | [1,2,3] mean2, sampleVariance1, populationVariance2/3 |
| quantile | 기존 interpolation method와 endpoint | sorted[1,2,3,4], linear q.25=1.75, q.5=2.5 |
| histogram | extent/step, 마지막 bin 포함, invalid rows | edges[0,1,2,3], values[0,1,2,3] counts[1,1,2] |
| bin2d | 동일 bin contract 두 축, empty cells 정책 | 4 points corners가 4 cells에 각1 |
| stack | group/order/offset/negative 분리 | values[2,3] endpoints[0,2],[2,5]; -2는 양수누계와 별도 |
| window | frame rows/range, ties, partition, stable sort | values[1,2,3], trailing2 means[1,1.5,2.5] |
| pivot | duplicate cell aggregation 필수, missing cell | A/x1,A/x2 → agg sum3; agg 없으면 error |
| lookup | 1:1/1:many, duplicates, unmatched | left key2가 없으면 nullable joined fields, left row 보존 |
| regression | singular/constant x, CI method | (0,1),(1,3),(2,5) slope2/intercept1 |
| LOESS | span, degree1/2, tricube, robust iterations, ties | exact line은 interior에서 오차≤1e-9; singular local fit은 documented constant fallback |
| density | kernel, bandwidth, grid, normalization | one point0,h1 Gaussian f(0)=0.3989422804014327 |
| ECDF | ties, weight, inclusive/right continuity | [1,1,3]: F(0)=0,F(1)=2/3,F(3)=1 |
| timeUnit | timezone, DST, weekStart, calendar grain | leap2024-02-29 유효; 2023-02-29 오류 |

위 수치는 해당 옵션을 명시한 fixture다. 기존 quantile/bin default가 다르면 default를 바꾸는 대신 explicit option fixture로 검증한다. LOESS는 n=0/1, 동일x, span<최소점수, robust weight0도 포함한다. Python/hand oracle는 production kernel을 import하지 않는다. floating 비교는 absTol+relTol×max(abs(expected),abs(actual))를 사용한다.

## 데이터 의존성 실행

parameter→filter→aggregate→stack→scale→mark→guide→highlight 순서의 closure를 만든다. changed parameter를 읽지 않는 branch/resource를 재계산하지 않는다. filter로 모든 값이 제거되면 empty dataset/scale 상태를 기존 계약에 따라 저장하고 과거 domain으로 생긴 빈 공간을 남기지 않는다. empty domain 정책은 preserve/explicit/fallback 중 명시 선택이며 숨은 유지가 아니다. cycle, missing field, invalid transform을 action preflight에서 거부한다.

source row eligibility는 최종 visual grain에서 한번 결정한다. scale domain에는 포함하지만 graphic에서는 제외하는 식의 불일치를 금지한다. 모든 derive operation은 resolved options, input revisions, output field roles, lineage를 기록한다. reviseData가 source만 바꾸고 derived graph/calendar/partition가 옛값을 가리키지 않게 resource ref collector와 revision plan을 확장한다.

## 시간과 달력

calendar는 epoch/ISO 입력을 지정 timezone의 civil day로 투영한 뒤 day ordinal로 배치한다. 24h ms를 계속 더해 날짜를 만드는 방식은 DST에서 실패한다. day ordinal+weekStart로 week index를 계산하고 month boundary는 실제 cell 경계 union으로 만든다. duplicate date는 지정 aggregate, missing date는 empty cell/omit 중 explicit policy다. 2024년 day count366, February29, DST 전환일도 한 civil day cell이다.

## 데이터 source resolver와 field 접근

inline values, named resource, URL 및 relative URL CSV/JSON을 명시 구분한다. baseURL은 host resolver가 주입하고 renderer나 grammar가 fetch하지 않는다. resolver 결과는 bytes hash/MIME/encoding/parser version/schema와 함께 immutable original dataset으로 commit한다. parameter-dependent URL은 AST dependency이며 stale response를 revision token으로 폐기한다. offline bundle에는 실제 data bytes 또는 parsed rows를 포함한다.

CSV는 quoted delimiter/newline/escaped quote/BOM/CRLF/빈cell을 검증한다. parse directives는 field별 string/number/boolean/date와 timezone을 선언하고 실패 row를 임의삭제하지 않는다. JSON dotted literal field와 nested field path를 다른 AST node로 표현한다. 예를 들어 field name a.b는 literal key이고 fieldPath:[a,b]만 nested access다. prototype key와 getter 접근은 거부한다. trig sin/cos/tan/atan2와 명시 angle unit, datePart의 month/day/hour/minute/second 등 기존 year-only 경계를 확장하고 function registry에서 인수/return type을 고정한다.

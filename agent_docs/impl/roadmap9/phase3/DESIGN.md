# G-EXPR — AST v2 core 검토안

상태: **Proposed**. D1의 방향만 사용자 “진행”(2026-10-28)으로 이어받는다.
D2–D6의 정확한 공개/저장 계약은 이 문서의 신규 제안이며 아직 구현 또는 승인되지 않았다.
범위는 STEP-013의 AST core다. 전체 STEP-013/AT-16 완료에는 [남은 의무](obligations.json)도 필요하다.

## D1 — 기존 의미 보존과 명시적 v2

기존 `{field}`, `{constant}`, `{op,...}`를 legacy v1으로 해석하고 값·오류·한도를 보존한다.
기존 저장 데이터에 version을 삽입하거나 새 규칙으로 재계산하지 않는다.
새 호출도 기존 `createComputedData`/`editComputedData`를 사용한다. 수식 전체 교체가 명시적인
v1→v2 전환이며 preview/preflight와 기존 dependent 처리 후 atomic commit한다.
자동 변환 함수와 별도 computed action family를 만들지 않는다.

| 입력 | 기존 v1 | 제안 v2 |
|---|---|---|
| `1 / 0` | RangeError | missing + divide-by-zero count |
| `eq("1", 1)` | TypeError | false |
| `eq(null, null)` | true | false |
| `neq(null, 1)` | true | false |
| `if(false, 1/0, 7)` | 7 | 7, diagnostics 0 |
| 알려지지 않은 field가 비선택 branch에 있음 | error | error |

## D2 — 닫힌 노드와 저장 계약

공개 expression 인자의 v2 형태는 `{version:2, registry:"standard@1", root:Node}`다.
두 version 식별자는 필수이며 unknown version/registry/key는 오류다. 선언 초안은
[proposal.d.ts](review/proposal.d.ts), 정확한 호출은 [calls.ts](review/calls.ts)에 있다.

| type | 정확한 추가 key | 의미 |
|---|---|---|
| literal | value | finite number/string/boolean/null |
| field | name | literal column name; `a.b`는 하나의 column |
| fieldPath | root, path | root column 아래 1–8개 literal own string key |
| parameter | id | typed parameter ID; normalize 시 dependency 추출 |
| unary | op, operand | negate/not |
| binary | op, left, right | add/subtract/multiply/divide/eq/neq/lt/lte/gt/gte/and/or |
| call | name, args, options? | registry에 있는 함수와 그 함수에 한정된 options |
| if | condition, then, else | boolean 조건, 선택된 branch만 평가 |

원안의 일곱 node에 fieldPath를 명시적으로 추가한다. 이는 같은 원안의 “literal dotted field와
nested path를 다른 AST node로 표현” 요구를 해결한다. getPath를 임의 property access로 확장하지 않는다.
FieldPath는 prototype keys(`__proto__`, `prototype`, `constructor`), index, dynamic key,
getter를 거부한다. 배열 원소는 별도 at 함수가 맡는다.
Parameter resource의 공개 create/edit/remove와 computed 연결은 G-PARAM 검토가 선행해야 한다.
그 전에는 pure kernel의 explicit parameter environment만 시험하고, 제품에 parameter placeholder를
저장하거나 처리되지 않는 공개 node를 노출하지 않는다. D2 승인만으로 resource schema가 승인되지 않는다.

정규화된 v2 envelope를 기존 computed transform.expression에 한 번 저장한다.
Editable outer schema4와 tagged codec을 유지하는 additive 변경으로 제안한다. 이전 reader는
v2 node를 unknown AST로 거부해야 하며 legacy editable1–3 reader에는 v2 payload를 허용하지 않는다.
Fresh-process restore→edit→reviseData→serialize의 결과가 동일해야 한다. Graphic-only schema는 변하지 않는다.

## D3 — 타입, null, missing, 진단

- 계산값의 missing은 `undefined`, 명시적인 null은 `null`이다. literal node에는 undefined를 허용하지 않는다.
  Known optional field의 부재/undefined와 범위를 벗어난 at, invalid arithmetic에서 missing이 생긴다.
  Unknown field 이름, 잘못된 parameter ID는 missing으로 숨기지 않는다.
- Dataset의 missing 출력도 own property `undefined`로 저장한다. 기존 tagged codec으로 null과 구별하고
  schema는 optional=true로 표현한다. 이 저장 가능성은 현재 API의 round-trip으로 먼저 검증한다.
- Scalar output은 number/string/boolean/null/missing이며 한 materialization의 non-nullish type은 하나다.
  Array는 field/fieldPath에서 at/arrayLength로 전달하는 중간 입력에만 허용한다. Object 출력/array 출력은 오류다.
- 숫자와 문자열을 자동 변환하지 않는다. 명시 toNumber는 기존 decimal/scientific grammar를 재사용한다.
  알고 있는 타입 불일치는 선택되지 않은 branch도 거부한다. Unknown/mixed schema는 실행한 branch에서 검사한다.
- 모든 비교에서 어느 쪽이든 null/missing이면 false다. eq/neq의 서로 다른 non-nullish scalar type은
  false/true다. 순서 비교는 동일 scalar type만 허용하며 문자열은 Unicode code-point 순서다.
- and/or/not/if는 boolean strict다. and/or/if/coalesce는 lazy value evaluation이고, 전체 구조·field·함수·
  option·정적 type 검증은 먼저 한다. coalesce는 null과 missing을 모두 건너뛰고 전부 nullish면 missing이다.
- 산술의 null/missing 입력은 missing으로 전파하며 진단 건수는 늘리지 않는다. 0 나눗셈, log/sqrt/pow 정의역,
  비유한 결과, 유효 범위 밖 날짜는 missing과 원인별 건수로 기록한다. 잘못된 인수 타입·구조·옵션은 atomic error다.
- 진단은 기존 calculation report 경로를 사용한다: algorithm=`expression@2`, registry=`standard@1`,
  evaluatedRows, missingRows, counts:{divideByZero,domain,nonFinite,dateRange,arrayBounds}.
  counts는 실제 평가된 실패 연산 수이고 missingRows는 최종 output missing 행 수다. 원본 cell 값은 넣지 않는다.
  inspectProgram의 calculations에서 조회하고 revision마다 보고서를 교체한다.

## D4 — standard@1 함수 등록표

[registry.json](review/registry.json)이 이름·arity·입출력·options·평가 방식의 검토용 단일 표다.
제품 등록표는 승인 후 `src/grammar/expressionFunctions.js`가 소유하고 declaration/문서/조회가 공유한다.
기존 ggaction/inspection에 `getExpressionFunctions({registry:"standard@1"})`를 추가하는 안이다.
불변 descriptor 목록만 반환하며 함수 구현체·사용자 callback 등록·global name lookup은 제공하지 않는다.

- 숫자: abs/min/max/pow/sqrt/log/exp/round/floor/ceil, toNumber.
  log는 natural log, round는 Math.round의 tie toward +Infinity 및 signed zero 의미다.
  NaN/Infinity 결과와 pow의 non-real 결과는 missing이다. min/max는 1–64개 인수다.
- 삼각함수: sin/cos/tan/atan2. `options.angleUnit`은 radians/degrees 중 필수다.
  atan2 인수는 y,x이며 반환값도 지정 단위다. 유한 IEEE-754 계산을 쓰고 tan 특이점 근처의
  큰 유한값을 임의로 잘라내지 않는다.
- 문자열: lower/upper는 locale-independent Unicode case mapping; length/substring은 code-point 기준이다.
  substring(text,start,end)는 0-based 정수, 0≤start≤end≤length이며 잘못된 범위는 오류다.
  replace(text,search,replacement)는 nonempty literal search의 첫 exact match만 바꾸며 `$`는 literal이다.
  search/replacement는 literal string node만 허용한다. concat은 1–64개 string이고 coercion은 없다.
- 판단/분기: isNull/isMissing/isFinite와 coalesce(2–64). isFinite는 유한 number만 true다.
- 배열: arrayLength(array), at(array,index). Array는 own data elements만 허용한다. index는 nonnegative
  safe integer이며 길이 이상이면 missing+arrayBounds, hole/undefined element는 missing이다.
  선택 원소의 허용 type은 scalar/null/missing이며 nested array/object는 오류다.
- 날짜: parseTime(text,{format})은 `%Y-%m-%d`, `%d/%m/%Y`, `%m/%d/%Y`, `iso-offset` 중 필수다.
  세 calendar format은 UTC이며 잘못된 날짜 rollover를 거부한다. iso-offset은 timezone suffix가 있는
  완전한 ISO datetime만 허용한다. 잘못된 날짜 값은 missing+dateRange; 잘못된 format은 오류다.
- datePart(epochMs,{part,timeZone})는 year/quarter/month/day/weekday/hour/minute/second/millisecond;
  Gregorian astronomical year, month1–12, day1–31, weekday0–6(Sunday0), quarter1–4다.
  timeFloor(epochMs,{unit,timeZone,weekStartsOn?})는 year/quarter/month/week/day/hour/minute/second다.
  timeZone은 UTC 또는 명시 IANA 이름이며 host default는 없다. weekStartsOn은 week에서만 필수0–6이다.
  기존 timeUnit의 calendar boundary 정책을 재사용한다: fold는 가장 이른 instant, gap은 같은 bucket의
  최초 유효 경계; 경계가 없으면 missing+dateRange. 날짜에 고정24h를 더해 순회하지 않는다.
  Date TimeClip 범위와 정수 절삭은 기존 계약을 따른다. 임의 IANA tzdb의 영구 byte 동일성은 보장하지 않으며
  DST qualification은 지원 runtime matrix와 명시 zone fixture로 확인한다.

## D5 — 접근자와 비용의 경계

모든 node/options/array는 plain own-data snapshot으로 검사한 후 복사한다. getter/setter, symbol key,
non-enumerable extra key, cyclic input, function, Date/Map/typed array instance를 거부한다.
plain Object prototype 또는 null prototype만 허용한다. 임의 Proxy의 trap 실행까지 차단하는 JS sandbox라고
주장하지 않는다. 외부 입력의 안전 경계는 JSON/기존 codec으로 만들어진 plain data다.

Action 인자 요약은 domain validator보다 먼저 실행된다. 따라서 computed validator만 고치면 불충분하다.
공유 action summary를 descriptor 기반으로 바꿔 getter를 읽지 않고 accessor 표식을 남기며, domain에서
AST 전체를 거부한다. 정상 own-data 인자의 기존 trace 모양은 유지한다. scoped target의 사전 접근도 검사한다.
이 변경의 모든 action 회귀 검사를 실행하고 인자 스냅샷에 getter 실행이 없는지 별도로 검증한다.
현재 getter 실행 재현은 결함의 baseline이며 안전성 통과 증거로 세지 않는다.

| 한도 | v1 | 제안 v2 |
|---|---:|---:|
| root 포함 depth | 16 | 64 |
| occurrence node 수 | 128 | 4,096 |
| call args | 기존 계약 | 64, 함수별 arity가 우선 |
| path key 수 | 8 | 8 |
| row×전체 node 수 | 10,000,000 | 10,000,000 |
| 단일 string input/output | 기존 계약 | 1,048,576 UTF-16 units |
| 단일 array operand | 기존 계약 | 100,000 elements |
| 전체 string/array work | 기존 계약 | 10,000,000 units |

같은 node 객체를 두 번 참조하면 두 occurrence로 센다. AST budget은 lazy branch도 포함한다.
동적 work는 실제 읽거나 만드는 각 string의 UTF-16 길이와 각 array scan의 원소 수를 누적한다.
replace는 source/search/replacement/output 길이, Unicode 변환은 input/output 길이를 모두 센다.
Literal/type 검사도 단일 크기 한도를 먼저 적용한다. 초과는 structured resource-limit atomic error이고
일부 row를 저장하거나 truncated 결과를 반환하지 않는다. 신규 한도는 v1에 소급하지 않는다.

## D6 — 통합과 승인 범위

순수 계산은 grammar, named field/parameter 조회는 schema/selector, create/edit/revise orchestration은
기존 data action 계층이 맡는다. 의존성 추출은 AST를 임의 Object.values 순회하지 않고 정규화된 node
종류별로 수행한다. fieldPath는 root column을, parameter는 ID를 dependency로 기록한다.

D2–D6 승인 후 AST core의 pure kernel·독립 시험을 진행할 수 있다. 공개 v2 노출 및 STEP-013 완료는
G-PARAM/G-DATA 검토와 consumer matrix를 함께 해결한 후 진행한다. 같은 D1–D6 결정을 재승인받지 않는다.
새 parameter CRUD/상태, CSV/JSON async resolver API와 prepared result commit은 이번 Gate에 포함하지 않는다.
해당 요구는 [obligations.json](obligations.json)에 원안 task와 연결하여 보존한다.

제품 통합은 생성/편집/데이터 교체, lineage, 빈 데이터, schema, 저장 복원, registry 조회, Full/Basic 타입,
네 렌더 경로와 scene/inspection에 같은 의미를 전달해야 한다. Renderer는 AST를 평가하지 않는다.
현재 [architecture](../../../SECOND_ARCHITECTURE.md)의 action→materialization 경계를 유지한다.
새 시각 형상은 없으므로 이번 설계 Gate에 새 visual approval을 만들지 않는다.

## 검토 자료와 구현 인수 시험의 구별

[검토 runner](review/verify.mjs)는 현재 v1 API 동작, tagged missing/null 보존, getter baseline,
registry 표 완결성, 독립 literal oracle를 검사한다. [호출 타입 검사](review/calls.ts)는 **제안 선언**만 검사한다.
둘 다 v2 제품 구현의 통과 증거가 아니다. 독립 oracle는 src 계산 함수를 사용하지 않는다.
현재 전체 suite는 코드 변경이 없는 baseline 회귀 확인이다. 승인 후 kernel의 actual을 같은 기대값과
비교하고 모든 invalid/lazy/budget/immutability/fresh-process 시험을 추가해야 한다.

# 내부 expression core

현재 pure evaluator는 package export에 없는 내부 구현이다. Public computed는 기존 implicit v1과
v2 envelope를 지원하며 `ggaction/inspection`은 읽기 전용 registry 조회를 제공한다. 이 파일은 내부 호출 경계를
설명하며 공개 action 계약과 저장 schema를 대체하지 않는다.

- `normalizeExpressionV2(expression, environment)`는 `{version:2,registry:"standard@1",root}`를
  검증·복사·동결한다. 8종 node별로 field/parameter dependency를 수집한다. 공유 node는
  occurrence마다 세며 모든 branch를 검증한다. Caller-owned 객체는 freeze/mutate하지 않는다.
- Environment는 `{fields?: {[name]: {type, optional?}}, parameters?: {[id]: {type,value}}}`다.
  Field type은 number/string/boolean/array/object/unknown/mixed, parameter는 scalar/unknown/mixed다.
  Unknown/mixed는 runtime 검사이며 known missing reference는 빈 입력이나 lazy branch도 오류다.
  이 environment는 호출자가 명시적으로 전달하는 순수 값이고 ChartProgram resource schema가 아니다.
- `evaluateExpressionV2(expression, rows, environment)`는 frozen `{values,report,fields,parameters}`를
  반환한다. Missing은 undefined, explicit null은 null이다. 최종 non-nullish scalar type은 행 전체에서
  하나여야 한다. 선택한 array 원소는 scalar만 허용하며 own hole은 missing이다.
- `expressionFunctions.js`의 frozen `EXPRESSION_FUNCTIONS`가 30개 함수의 이름·arity·타입·option
  정책 소유자다. Custom callback/registration과 dynamic name lookup은 없다. 날짜는 기존
  `parseTime`/`timeUnit`의 명시 timezone·calendar boundary 계산을 공유한다.
- Arithmetic nullish는 missing으로 전파한다. 모든 nullish 비교는 false이며 eq/neq는 coercion하지
  않는다. Ordering은 같은 scalar type만, 문자열은 Unicode code point 순서다. Boolean은 strict다.
  if/and/or/coalesce는 lazy다. Invalid structure/type/options는 throw하며 숫자 정의역·비유한 결과·
  0 나눗셈·날짜 범위·array bounds는 missing과 실행 횟수 진단을 반환한다. 잘못된 decimal string은
  toNumber type error이며 수치 overflow는 nonFinite다.
- Report는 algorithm expression@2, registry standard@1, evaluatedRows, missingRows,
  counts(divideByZero/domain/nonFinite/dateRange/arrayBounds)만 담는다. 원본 cell은 보관하지 않는다.
- `EXPRESSION_LIMITS`는 depth64/nodes4096/args64/path8/rowWork10M/string1Mi UTF-16 units/
  array100K/valueWork10M을 소유한다. 함수별 arity가 우선이며 전체 AST의 행 비용은 실행 전에 검사한다.
  문자열 처리 input/output과 array scan의 실제 work를 집계한다. 단순 최종 scalar 검증은 재스캔이 아니다.
  한도 초과는 structured resource-limit error이며 부분 결과를 반환하지 않는다.
- Own-data 검사는 getters/setters, symbol/hidden key, 비표준 객체·배열과 AST cycle을 거부한다.
  JSON/codec plain data가 안전 경계이며 Proxy trap을 격리하는 JavaScript sandbox는 아니다.

검증은 `test/unit/grammar/expression-*.test.js`가 소유한다. 정상 v1 computed/trace 회귀는 기존 action
suite와 함께 실행한다. `expression-kernel` coverage family는 신규 파일에도 자동 적용한다.
Public create/edit/revise, persistence, schema/lineage, parameter lifecycle와 registry query의
통합은 해당 capability의 action·persistence·renderer·installed consumer 시험으로 검증한다.
`materialization/computedInputs.js`가 저장된 exact parameter vector와 schema를 검증하고,
action binding은 현재 revision을 명시적으로 저장한다. Persistence는 재평가하지 않는다.
CSV/JSON resolver kernel의 공개 commit·offline source lifecycle 연결은 별도 진행 범위다.

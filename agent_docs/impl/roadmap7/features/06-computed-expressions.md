# R06 — 조건·문자열·null 계산식

원래 감사 번호: **6**. Primary owner: **Phase 1**. 상태: **primary 구현 완료 / R02 edit 통합 대기**.
`b891d1d5`에서 typed AST·평가·facet/encoding 연결·공개 타입·Current 계약·설치 패키지를 구현했다. `editComputedData`와 source revision 재실행은 R02가 소유하므로 Phase 4에서 닫는다.

## 목적과 현재 연결점

현재 수치 사칙연산을 확장해 라벨용 분류와 결측 대체를 데이터 provenance 안에 표현한다. 원본 데이터를 문자열로 임의 변환하거나 범용 평가기를 도입하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/computed.js`
- `src/actions/data/computed.js`
- `src/grammar/transforms.js`
- `types/program.d.ts`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// 기존 createComputedData 호출 형식 유지; expression union 확장
Expression = ExistingArithmetic
 | {constant: string | boolean | null}
 | {op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte"; left: Expression; right: Expression}
 | {op: "and" | "or"; operands: readonly Expression[]}
 | {op: "not" | "isNull"; operand: Expression}
 | {op: "if"; condition: Expression; then: Expression; else: Expression}
 | {op: "coalesce" | "concat"; operands: readonly Expression[]}
 | {op: "log" | "sqrt"; operand: Expression};
```

## 값·기본값·오류 계약

- 기존 finite arithmetic 동작과 divide-by-zero 오류를 바꾸지 않는다. field 값의 null/undefined는 새 연산에서만 nullable 값으로 다루며 missing field 이름 자체는 오류다.
- 비교는 같은 primitive type만 허용한다. eq/neq는 null/undefined를 같은 null 값으로 취급하고 non-null과 비교하면 false/true; ordered compare의 null은 오류. 문자열 비교는 locale 없는 code-point 순서다. coercion하지 않는다.
- and/or는 boolean만, 최소 2개 operand이며 왼쪽부터 short-circuit; not은 boolean만. if는 boolean condition이며 선택된 branch만 평가한다. 모든 branch의 AST 구조와 field 이름은 미리 검증하되 미선택 branch의 1/0 같은 값 계산은 하지 않는다.
- coalesce는 최소 2개 expression 중 첫 non-null/undefined. 전부 null이면 null. concat은 최소 1개 string이며 null이나 숫자 자동 변환 없음. log는 자연로그·입력>0; sqrt는 입력>=0.
- 출력은 한 실행에서 null을 제외한 primitive type이 하나여야 한다. mixed string/number는 오류. 출력 field collision·depth16·nodes128·rows×nodes 10,000,000 기존 상한을 유지한다.
- null propagation을 산술 기본값으로 켜지 않는다. nullable 산술은 사용자가 if/coalesce로 표현한다. callbacks, eval, 임의 JS 함수, arbitrary regex는 범위 밖.

## 저장 결과와 생명주기

`computed` transform의 expression AST를 canonical provenance로 저장한다. 원본 row 순서/수/기존 cells는 보존한다. 출력 null을 지원하지 않는 downstream quantitative mark가 있으면 R02 edit의 전체 최종 상태 검증에서 거부한다. 새 문자열 출력은 nominal encoding에서 사용할 수 있다. 새로운 expression cache를 semantic state에 중복 저장하지 않는다.

## 구현 순서와 action 계층

1. 기존 AST validator/evaluator를 분리된 node policy 표로 확장하되 공개 plugin registry를 추가하지 않는다.
2. AST 전체 구조/field 의존성을 preflight하고 pure typed evaluation을 수행한다.
3. createComputedData → createDerivedData → materializeComputedData → semantic values 기록의 기존 wrapped 흐름을 유지한다.
4. transforms schema, replay와 output type 검증을 수정한다. R02에서 같은 evaluator를 재사용한다.

## 독립 oracle와 인수 테스트

- x=[-2,0,4], if x>0 then log(x) else null → [null, null, ln4]. log(-2)를 평가하지 않아야 한다.
- name=["A", null,"C"], concat(coalesce(name,"Unknown"),"!") → ["A!","Unknown!","C!"].
- if true then 1 else "x"는 실제 rows 출력이 모두 숫자면 허용, rows별 결과가 number/string 혼합이면 오류.
- exists field의 undefined는 isNull=true; 없는 field 이름, log(0), sqrt(-1), concat(number), malformed 미선택 branch는 각각 오류.
- 기존 수치 표현식의 출력/trace, computed → facet replay, string → color와 null → downstream rejection을 검증한다.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — typed AST

### 닫힌 node union

현재 export ComputedExpression을 직접 확장한다. 새로운 Expression이라는 병행 public 타입을 만들지 않는다.

| node | 정확한 own keys | 평가 타입 |
| --- | --- | --- |
| field | field | row own value; undefined는 null로 정규화 |
| constant | constant | finite number/string/boolean/null |
| add/subtract/multiply/divide | op,left,right | finite number → finite number |
| negate/absolute/log/sqrt | op,operand | finite number → finite number |
| eq/neq/lt/lte/gt/gte | op,left,right | 동형 scalar 비교 → boolean |
| and/or | op,operands | boolean 배열, 길이>=2 → boolean |
| not | op,operand | boolean → boolean |
| isNull | op,operand | scalar → boolean |
| if | op,condition,then,else | condition boolean; 한 branch 결과 |
| coalesce | op,operands | 길이>=2, 첫 non-null 결과 |
| concat | op,operands | 길이>=1, 모든 결과 string → string |

eq/neq에서 null==null은 true, null==non-null은 false. non-null끼리 다른 primitive type이면 TypeError. ordered boolean 비교는 false<true로 정의한다. ordered 문자열은 Unicode code point의 사전순이며 Array.from(string)의 codePointAt(0) 순으로 비교한다. JS 기본 '<'의 UTF-16 code-unit 순서에 의존하지 않는다.

### 2단계 검증

1. validateExpression은 모든 branch를 순회한다. root depth1, 실제 node 방문 수, unknown keys, node arity, constant type, field 이름을 검사한다. depth16/nodes128은 허용, 각각17/129는 RangeError. cycle 입력도 depth 한계 이전/동시에 결정적으로 거절한다.
2. field dependency set을 만든 뒤 모든 row에서 모든 referenced field의 own-property 존재를 검증한다. 빈 source는 구조만 검사하고 []를 반환한다. schema가 없는 빈 source에 가상 field 오류를 만들지 않는다.
3. work=rows.length*nodes를 evaluation 전에 검사한다. 10,000,000 허용, 그 초과 거부. lazy branch도 work 예산에는 포함된다.
4. evaluate는 if/and/or/coalesce의 선택되지 않은 값 연산을 실행하지 않는다. 평가되는 field만 scalar type 검증한다. 구조·field 존재와 실제 값 검증을 섞지 않는다.
5. arithmetic operand의 null/string/boolean은 TypeError, 0 나누기·음수 sqrt·비양수 log·nonfinite 결과는 RangeError.
6. output row를 만들 때 첫 non-null primitive type을 기록하고 이후 불일치하면 전체 실패. all-null output은 허용하며 arbitrary numeric metadata를 만들지 않는다.

### 재생성·성능·회귀

computed는 rowPreserving 그대로다. normalizeExpression은 새 operands/condition/then/else도 깊이 복사해야 한다. 기존 recursive clone이 left/right/operand만 처리하는 것을 놓치지 않는다. 새 evaluator가 null을 반환해도 기존 quantitative consumers의 오류를 완화하지 않는다.

현재 테스트 owner는 test/unit/actions/data/computed-data.test.js. AST validator/evaluator에 대한 새 pure tests는 test/unit/grammar/transforms/computed.test.js에 작성할 수 있다. test expected를 deriveComputedRows로 계산하지 않는다.

### 고정 인수 사례

- R06-N01: x=[-2,0,4], if(gt(x,0),log(x),null) → [null,null,1.3862943611198906].
- R06-N02: name=["A",null,"C"], concat(coalesce(name,"Unknown"),"!") → ["A!","Unknown!","C!"].
- R06-N03: if(true,1,divide(1,0)) → 1; and(false,gt(log(-1),0)) → false.
- R06-E01: if(true,1,{field:"typo"})에서 typo가 없는 row → 선택되지 않아도 Error.
- R06-E02: rows x=[-1,1], if(gt(x,0),1,"negative") → 출력 mixed type TypeError.
- R06-N04: lt("😀","\uE000") → false. UTF-16 비교 구현을 검출하는 fixture.

- R06-L01: computed 문자열 결과 → nominal mark → editComputedData → facet/source replay에서 AST 요청·output type·원본 불변성 유지.

## 완료 조건

- [x] create API의 최단 호출과 explicit source, 누락/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 `test/unit/actions/data/computed-data.test.js`에 독립 기대값으로 구현했다.
- [x] 수치·문자열·null consumer와 facet/Canvas materialization을 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] `editComputedData`와 source revision replay는 R02/Phase 4에서 같은 evaluator로 검증한다.
- [x] Phase 1 승인과 `b891d1d5` 검증 근거를 `phase1/STEP1.md`에 기록했다. appearance 전용 Gate V는 data-only라 새 시각 목표가 없다.

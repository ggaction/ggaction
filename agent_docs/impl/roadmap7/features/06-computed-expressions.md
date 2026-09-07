# R06 — 조건·문자열·null 계산식

원래 감사 번호: **6**. Primary owner: **Phase 1**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

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

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.

# 정수 반올림·거듭제곱과 배열 펼치기 제안

## 진행 상태

- [x] 현재 계산 표현식·데이터 계약과 설치 타입에서 누락 확인
- [x] 새 공개 호출과 저장 결과·호환성·검증 계획 구체화
- [ ] 사용자 승인
- [ ] 구현·회귀 검사·타입/현재 계약/공개 문서 동기화

Gate: **ready-for-review**. 현재 런타임은 바꾸지 않았으며, 아래 호출은 승인할 제안이다.

## 1. 기존 ComputedExpression에 수학 노드 세 개 추가

```js
.createComputedData({
  id: "rounded", as: "column",
  expression: { op: "ceil", operand: { field: "position" } }
})
.createComputedData({
  id: "powered", as: "bound",
  expression: { op: "pow", left: { constant: 10 }, right: { field: "exponent" } }
})
```

- `floor`·`ceil`: 기존 unary node 형태 `{op, operand}`를 그대로 확장한다.
- `pow`: 기존 binary node 형태 `{op, left, right}`를 그대로 확장한다.
- 기존 strict finite-number 정책·null 전파·깊이/노드/work 한도를 재사용한다.
- 수학 결과는 `Math.floor`, `Math.ceil`, `Math.pow`와 동일하다. 비유한 결과(음수 밑의 비정수 지수, 0의 음수 지수, overflow 등)는 기존 계산 오류처럼 거부한다. `0^0`은 JavaScript 수치 규칙에 따라1이다.
- 기존 호출/출력/저장 표현식은 전부 유지한다. 새 op가 포함된 표현식만 새 버전의 소비자가 필요하다.

## 2. 배열 원소를 행으로 펼치는 데이터 액션

```js
.createFlattenData({ id: "rows", fields: ["samples"], as: ["value"] })
```

- 옵션: `id` 필수 새 dataset ID, `fields` 필수 중복 없는 비어 있지 않은 field-name 배열, `as` 선택 동일 길이의 중복 없는 output-name 배열, `source` 선택 기존 current/unique source 추론.
- `as` 생략 시 각 입력 field 이름을 그대로 사용하며, 명시한 field의 배열을 해당 scalar 원소로 교체한다. 다른 기존 field는 보존한다. 새로운 alias는 입력 배열 field를 유지하고 새 scalar field를 추가한다. 입력 배열 field 외의 기존 field와의 alias 충돌은 거부한다.
- 여러 배열은 행별 최대 길이까지 같은 위치끼리 펼치며 짧은 쪽은 null로 채운다. 모든 배열이 빈 행은0개 결과 행을 만든다. null/undefined는 빈 배열, 그 외 non-array 입력은 오류다. 원소 및 보존 값은 소유 복사하고 source/caller 입력은 바꾸지 않는다.
- 별도 custom callback/eval/일반 렌더링 primitive는 추가하지 않는다.
- 저장 계약: 기존 derived dataset 흐름에 `{type:"flatten", fields, as?}` transform provenance와 materialized values를 기록한다. 기존 generic derived-data 생성/수정에서 같은 transform을 사용하도록 연결한다. 새 전용 editor는 이번 범위에 추가하지 않는다.
- 공개 액션은 기존 data-domain 액션의 current source 추론/immutable resource/trace 및 facade replay 경로를 따른다. Backend 경계나 package entry point는 바꾸지 않는다.

## 검증·호환성·문서 영향

- 수학: 양/음/정수/경계/null과 잘못된 타입·shape·비유한 결과, 표현식의 immutable ownership 및 실제 mark 소비를 검사한다.
- 배열: 단일/복수 배열, 빈/null·불균등 길이·alias·중첩 값 ownership, 충돌/잘못된 옵션·source 추론·최대 작업량, source 보존과 정확한 row order를 검사한다.
- generic transform과 전용 액션의 materialized rows/serialized provenance/공개 trace 동등성, facet replay/derived-data 갱신 시 기존 의존자 정책을 검사한다.
- 타입·action card·action contract·공개 문서·생성 reference를 함께 동기화하고 현재 unit/contracts/docs/packed-consumer 검사를 실행한다.
- 기존 차트의 표시 규칙은 바꾸지 않는다. 이번 데이터셋의 필요한 가족은 새 런타임/문서 pin에서 모델로 재번역·재검증한다. 새로운 독립적인 시각 디자인은 추가하지 않는다.

## 승인 범위

위 수학 노드 세 개, flatten transform과 `createFlattenData`의 정확한 옵션·빈 값·alias 정책을 구현하는 승인이다. 패키지 배포/문서 사이트 배포/PR 생성은 포함하지 않는다. 승인 전에는 이 기능에 의존하는 가족만 대기하며 다른 차트 번역은 계속한다.

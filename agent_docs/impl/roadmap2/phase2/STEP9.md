# Roadmap 2 — Phase 2 Step 9: Parameterized Aggregate Operations

## 목표

Parameter object가 필요한 quantile과 ordered first/last를 `encodeY.aggregate` contract에 추가한다.

## 진행 상태

- [x] `{ op: "quantile", probability }` normalization
- [x] Probability `0`, representative, `1`과 invalid boundaries
- [x] `{ op: "first" | "last", orderBy, order? }`
- [x] Stable ties와 source-order fallback
- [x] Missing/invalid order key와 empty group omission
- [x] Grouped grain과 output-field compatibility
- [x] Inferred title, domain과 guide rematerialization
- [x] Action trace와 caller-owned object isolation
- [x] Quantile/ordered approved primitive/public pairs
- [x] Types/docs/current contract/catalog, commits와 push

## 범위 경계

Full-item min/max selection은 scalar output aggregate가 아니며 Roadmap 2 Phase 9의 `selectMarks`가 소유한다.

## 완료 조건

두 parameterized operation family의 deterministic fixtures와 두 approved visual pair가 통과한다.

## 현재 결과

- Quantile은 필수 `[0, 1]` probability와 linear interpolation을 사용하며 finite sample이 없는
  final group을 생략한다.
- Ordered first/last는 comparable order key, explicit direction과 stable source-order fallback을
  사용한다. 생략한 order는 `"ascending"`으로 normalize되어 semanticSpec에 저장된다.
- Line과 ordinal bar는 같은 pure aggregate grammar를 final visual grain에서 사용한다.
- Aggregate reassignment는 automatic domain, path/rect, inferred axis title, axes와 grid를 명시적으로
  rematerialize하며 invalid call은 earlier program을 바꾸지 않는다.
- Quantile과 ordered public program은 승인된 primitive와 semanticSpec, graphicSpec, drawing order,
  Canvas calls 및 2× PNG가 정확히 일치한다.

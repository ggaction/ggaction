# Roadmap 2 — Phase 2 Step 9: Parameterized Aggregate Operations

## 목표

Parameter object가 필요한 quantile과 ordered first/last를 `encodeY.aggregate` contract에 추가한다.

## 진행 상태

- [ ] `{ op: "quantile", probability }` normalization
- [ ] Probability `0`, representative, `1`과 invalid boundaries
- [ ] `{ op: "first" | "last", orderBy, order? }`
- [ ] Stable ties와 source-order fallback
- [ ] Missing/invalid order key와 empty group omission
- [ ] Grouped grain과 output-field compatibility
- [ ] Inferred title, domain과 guide rematerialization
- [ ] Action trace와 caller-owned object isolation
- [ ] Quantile/ordered approved primitive/public pairs
- [ ] Types/docs/current contract/catalog, commits와 push

## 범위 경계

Full-row min/max selection은 scalar output aggregate가 아니며 Roadmap 2 Phase 9의 `selectRows`가 소유한다.

## 완료 조건

두 parameterized operation family의 deterministic fixtures와 두 approved visual pair가 통과한다.

# Phase 5 — Step 1: Regression Statistical Contract

## 목표

구현체와 독립된 deterministic fixture로 regression scatterplot의 row selection,
Origin별 OLS, Student-t mean-response confidence interval을 먼저 고정한다. 이후 primitive
baseline과 domain action은 이 fixture를 import하지 않고 같은 결과를 만들어야 한다.

## 진행 상태

- [x] Regression scatterplot chart contract
- [x] Phase 5 전체 STEP 문서
- [x] Japan/USA filter와 numeric row validation
- [x] Origin별 OLS slope/intercept/residual statistics
- [x] Student-t 95% mean-response confidence interval
- [x] Observed unique x 기반 deterministic regression rows
- [x] Invalid, degenerate, immutable input test
- [x] 전체 regression test
- [x] Conceptual commit과 push

## 통계 규칙

```text
cars
→ Origin ∈ {Japan, USA}
→ finite Displacement/Acceleration
→ Origin first-appearance grouping
→ group별 linear OLS
→ sorted unique observed Displacement
→ predicted Acceleration와 mean-response CI
```

Confidence level 기본값은 `0.95`다. Fixture는 Student-t critical value를 계산하고
`n - 2` degrees of freedom을 사용한다.

각 regression row는 다음 필드를 가진다.

```javascript
{
  Origin,
  Displacement,
  Acceleration,
  __regression_ci_lower,
  __regression_ci_upper
}
```

## 검증 기준

- Japan과 USA 이외 row는 제외한다.
- 잘못된 x/y/group row는 제외한다.
- 각 group은 최소 3개 유효 row와 non-zero x variance를 요구한다.
- Regression x는 임의 sample count가 아니라 observed unique x다.
- 결과 group과 row 순서는 deterministic하다.
- Caller-owned input과 row object를 수정하지 않는다.
- 대표 slope, intercept, CI와 row cardinality를 numerical tolerance로 고정한다.

## 제외 범위

- Semantic/graphic schema 변경
- Canvas renderer 변경
- Primitive chart program
- Public action과 public documentation

## 검증 결과

- USA 254행, Japan 79행을 group별로 회귀했다.
- USA 48개, Japan 25개의 observed unique x에서 총 73개 regression row를 만들었다.
- Student-t critical value는 df 252에서 약 `1.9694223654`, df 77에서 약
  `1.9912543954`다.
- STEP 1 unit test를 포함한 일반 test 319개와 전체 coverage threshold가 통과했다.
- 기존 4개 chart의 public/primitive high-resolution PNG regression이 통과했다.

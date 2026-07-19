# Roadmap 4 Phase 3 — 작은 cross-chart encoding 확장

## 목표

기존 encoding action과 materialization 경계를 유지하면서 다음 두 capability를 독립 vertical slice로 추가한다.

1. `encodeTheta({ aggregate: "sum", weight })`: categorical arc sector의 각도를 행 개수가 아니라
   지정한 quantitative field 합에 비례시킨다.
2. `encodeStrokeWidth({ field, scale })`: line과 rule의 stroke width를 field-driven quantitative encoding으로 만든다.

두 기능은 같은 Phase에 있지만 semantic state, scale owner와 materialization grain이 다르므로 하나의 구현이나
Gate로 합치지 않는다.

## 진행 상태

- [x] Phase 2 exit 승인과 Polar arc / line / rule baseline 확인
- [x] weighted theta exact contract와 Gate matrix 작성
- [x] P3-A weighted theta 구현과 review package 작성
- [x] P3-A 사용자 승인
- [x] P3-B field-driven stroke width 구현과 review package 작성
- [x] P3-B 사용자 승인
- [ ] declarations, package, docs와 누적 회귀 closeout

## Weighted theta 계약

```javascript
program.encodeTheta({
  field: "cluster",
  fieldType: "nominal",
  aggregate: "sum",
  weight: "pop"
});
```

- `field`는 sector category이며 first-appearance scale domain 순서를 유지한다.
- `weight`는 각 source row의 non-negative finite number를 읽는 field 이름이다.
- 같은 category의 weight를 합하고 전체 합에 대한 비율로 full theta range를 나눈다.
- fractional weight와 repeated category를 허용한다. Source row와 dataset은 확장하거나 교체하지 않는다.
- `aggregate: "sum"`은 `weight`가 필요하고, `weight`는 sum mode에서만 유효하다.
- missing, non-number, non-finite, negative weight와 전체 합 0은 state/trace 변경 전 명확한 오류다.
- 개별 합이 0인 category는 zero-sweep graphic을 만들지 않는다.
- 기존 `aggregate: "count"` 결과와 public contract는 그대로 유지한다.
- count와 sum 모두 하나의 category sector가 source member rows를 소유하므로 selection/highlight grain은 동일하다.
- sum→count reassignment는 stale `weight` semantic property를 제거하고 mark/selection을 다시 materialize한다.

## 실행 순서

1. [STEP1](./STEP1.md) — weighted theta contract, pure aggregation과 semantic storage
2. [STEP2](./STEP2.md) — weighted Polar primitive/public chart, Browser Canvas와 Node PNG
3. [STEP3](./STEP3.md) — field-driven stroke width vertical slice
4. [STEP4](./STEP4.md) — Phase closeout

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P3-A | approved | weighted theta source/call chain, chart image와 contract evidence | field-driven stroke width |
| P3-B | approved | line/rule stroke-width source/call chain, chart image와 grain evidence | Phase closeout |
| P3-Exit | pending | declarations, package, docs와 누적 tests | Phase 4 |

모든 Gate는 hard pause다.

## Non-goals

- negative weight의 signed-angle 해석
- implicit weight field 추론
- source row expansion 또는 derived aggregate dataset 생성
- proportional theta axis의 새 guide recipe
- 새로운 renderer primitive

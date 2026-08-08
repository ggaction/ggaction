# Phase 4 Execution Closure Repair

## 발견 경로

R54-P4-C 승인 뒤 paid smoke runner를 무비용으로 준비하던 중 `repair-hold-regression-layers`의 compact packet을 실제
데이터와 Canvas에서 실행했다. 기존 packet은 다음 순서를 제안했다.

1. `createRegressionData`
2. `createLineMark`
3. `encodeX`
4. `encodeY`
5. `createRegression`
6. `createErrorBand`
7. `createAxes`

`createRegressionData`는 정상적으로 data만 만들지만, 이어지는 `createLineMark`가 regression dataset을 current data로
사용하면서 source mark placement를 찾지 못해 `Regression graphic placement requires one source mark layer.`로 실패했다.
Phase 4의 기존 TypeScript validation은 call signature만 검사했기 때문에 이 runtime closure 오류를 잡지 못했다.

## 원인

- Resolver가 `createRegression`이 내부적으로 regression data, line과 default confidence band를 함께 소유한다는 action
  hierarchy를 provider coverage에 반영하지 않았다.
- 그래서 같은 결과를 담당하는 `createRegressionData`, `createLineMark`, `createRegression`, `createErrorBand`를 서로
  독립적인 action처럼 조합했다.
- 독립 regression-layer request에는 `createRegression`이 요구하는 encoded point source prerequisite가 없었다.

## 수정

- `createRegression` provider가 matched request 안의 `mark.line`, `transform.regression`,
  `statistics.regression`, `statistics.errorBand`를 함께 닫도록 했다.
- Scatter facade가 없는 explicit regression-layer request에는 empty-coverage prerequisite로 `createPointMark`를 넣는다.
- Exact action-name lookup은 existing program에 대한 단일-action lookup이므로 prerequisite를 넣지 않는다.
- Phase 2 design fixture의 실행 불가능한 regression-data/line 조합을 실제 facade hierarchy로 교체했다.

수정된 paid-smoke query의 실행 순서는 다음과 같다.

1. `createPointMark`
2. `encodeX`
3. `encodeY`
4. `createRegression`
5. `createAxes`

Focused contract는 packet exact calls와 실제 4-row program을 함께 실행하고 point, regression line, confidence band와 Canvas
render가 모두 생성되는지 검증한다.

## 진행 상태

- [x] Runtime failure 재현
- [x] Regression action hierarchy와 dependency repair
- [x] Exact lookup isolation 유지
- [x] Focused resolver/type/runtime/Canvas contract 통과
- [x] Full regression suite와 cumulative tests — 2,091 / 2,091, docs 45 / 45, package/install pass
- [x] Paid smoke runner/plan dry-run — 16 / 16 routes, external calls/spend 0 / $0
- [x] Replacement candidate와 Gate R54-P4-D checkpoint — candidate `b1bb16c6`, runner `9a518298`
- [ ] User reapproval

R54-P4-C가 승인한 model, settings, 네 task identity, 16-run count와 `$3.00` hard cap은 바꾸지 않는다. 다만 product
candidate hash가 달라지므로 R54-P4-D가 승인되기 전까지 credential read, external model call와 spend는 계속
`0 / 0 / $0`로 차단한다.

Canonical replacement review record는 [`GATE_D.md`](./GATE_D.md)가 소유한다.

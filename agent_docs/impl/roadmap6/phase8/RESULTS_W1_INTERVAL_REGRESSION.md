# Roadmap 6 Phase 8 W1 — Interval and Regression complete facades

## 검증 ref

- Source/remote ref: `aded7c1e593370c436064309ba9bb9a3df22bbf5`
- Branch: `origin/codex/roadmap6-hierarchical-actions`

## 구현 결과

- `createIntervalPlot`은 기존 `createErrorBar`가 소유하는 statistical/explicit interval과 같은 dataset,
  center field, coordinate, position/interval scale과 categorical offset을 Point child에 연결한다.
- `createRegressionPlot`은 `createScatterPlot(guides:false)`와 기존 `createRegression`을 조합하고 regression이
  반영된 shared scale 위에서 guide를 한 번 확보한다. Linear, polynomial, LOESS와 band/line lifecycle은 기존
  statistical owner가 그대로 관리한다.
- 두 facade는 Full entry 전용 Aggregate create-only다. 별도 renderer, compiler, composite registry 또는
  복제된 통계 계산을 추가하지 않았다.
- 기존 runtime과 맞지 않던 `ErrorBarOptions.groupBy`를 `string | false`로 수정했다. Derived transform에는
  정규화된 string grouping만 남는다. [#119](https://github.com/ggaction/ggaction/issues/119)을 재현·수정하고
  검증 ref를 남겨 닫았다.

## 검증 결과

| 범위 | 결과 |
| --- | --- |
| focused facade/lower/type/catalog | 54/54 pass |
| nested scale role | 116 paths, 457 literals pass |
| unit | 2,222/2,222 pass |
| contracts | 316/316 pass |
| generated artifacts | catalog/card/action/reference/signature/search/machine checks pass |
| package | 477 entries, 561,245 packed bytes, 2,697,477 unpacked bytes |

Package source 한 개와 두 action card가 추가되어 승인 범위 안에서 ceiling을 477 entries,
562,000/2,700,000 bytes로 실제 증가량에 맞춰 조정했다.

## 판정

F10은 implemented-verified다. W2의 endpoint composite와 W3의 ECDF가 남아 있어 Phase 8 전체는 진행 중이다.

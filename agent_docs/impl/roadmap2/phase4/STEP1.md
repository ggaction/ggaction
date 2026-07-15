# Roadmap 2 — Phase 4 Step 1: Canonical Baselines and Phase Contract

## 목표

Existing density-area와 regression-scatterplot primitive/public pair를 재감사하고 Phase 4가 공유할 two
canonical baselines와 executable variant contracts를 고정한다.

## 진행 상태

- [x] Complete semantic/graphic/order/Canvas-call diff audit
- [x] Density rows, sample grid, group order와 guide policy 고정
- [x] Filtered rows, regression models, intervals와 layer order 고정
- [x] Baseline primitive/public exact equivalence
- [x] Expanded target chain metadata와 Roadmap 2 gallery pair
- [x] Gallery validation과 high-resolution PNG 확인
- [x] Chart contracts와 Phase status 갱신
- [x] Conceptual commit와 push

## Baseline audit 결과

### Density area

- Source 406 rows, derived density 300 rows; group order는 `USA → Europe → Japan`이다.
- Shared sample grid는 `[8, 24.8]`의 100 points이고 bandwidth는 `0.6`이다.
- Layer 1개, graphic object/order 17개, Canvas call 697개다.
- Primitive/public의 complete semantic, graphic, order와 Canvas calls가 정확히 같다.

### Regression scatterplot

- Source 406 rows, filtered 333 rows, regression 73 rows다.
- Group order는 `USA → Japan`; model rows는 각 254/79개, observed unique x는 48/25개다.
- Point, band, line 3개 layer와 graphic object/order 20개, Canvas call 2,920개다.
- Primitive/public의 complete semantic, graphic, order와 Canvas calls가 정확히 같다.

두 baseline은 expanded public chain과 2× PNG를 가진 Roadmap 2 artifacts로 이관했다.

## 작업 내용

Current public result와 independent primitive를 비교하고 canonical data grain, appearance, guides와 drawing order를
문서화한다. Baseline artifact는 Phase 4 variant manifest가 한 번만 소유한다.

## 완료 조건

두 baseline pair가 complete state와 Canvas calls에서 같고 Phase 4 variants가 shared fixture를 재사용한다.

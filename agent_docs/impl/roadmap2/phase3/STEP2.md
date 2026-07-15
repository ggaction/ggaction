# Roadmap 2 — Phase 3 Step 2: Histogram Bin and Reassignment Primitives

## 목표

Public implementation 전에 exact-step bins, irregular boundaries와 complete histogram reassignment의 final
numeric/graphic target을 raw primitive로 고정한다.

## 진행 상태

- [x] `bin-step` independent boundary/count reference
- [x] `bin-boundaries` independent interval/count reference
- [x] `field-reassignment` Horsepower reference
- [x] Empty bin omission과 last-upper inclusion 확인
- [x] Scale domain, ticks, axes, grids와 stack geometry target
- [x] Existing color scale/legend preservation target
- [x] Expanded target chain metadata
- [x] Browser와 2× primitive PNG 생성
- [x] Gate A 사용자 visual confirmation
- [x] Feedback 반영과 primitive 재확인
- [x] STEP status, conceptual commit와 push

## Primitive 원칙

- Reference calculation은 production histogram/bin/materialization helper를 import하지 않는다.
- Primitive는 future `binStep`, `binBoundaries` 또는 reassignment implementation을 호출하지 않는다.
- Concrete semantic bin definition, rect values, guide values와 render order를 low-level chain으로 명시한다.
- Reassignment target은 complete baseline 뒤 두 번째 `encodeHistogram`을 호출한 final state를 표현한다.

## Gate A 대상

- `bin-step`: Displacement, exact step `60`. Baseline의 inferred `50`과 구분되는 target이다.
- `bin-boundaries`: `[50, 100, 150, 225, 300, 400, 500]`.
- `field-reassignment`: Horsepower, `maxBins: 8`, 기존 Origin color stack과 legend 유지.

## 고정된 수치 결과

- `bin-step`: boundaries `60..480` by `60`, totals `[139, 89, 47, 28, 72, 22, 9]`,
  y domain `[0, 150]`, 12 non-empty rects.
- `bin-boundaries`: totals `[98, 104, 41, 60, 81, 22]`, y domain `[0, 120]`,
  interval width에 비례한 concrete rect width와 12 non-empty rects.
- `field-reassignment`: Horsepower valid rows `400`, boundaries `30..240` by `30`, totals
  `[16, 153, 120, 40, 49, 13, 9]`, y domain `[0, 200]`, 15 non-empty rects.
- Synthetic boundary fixture로 `[lower, upper)`와 final upper inclusion, empty-bin rect omission을 고정했다.

## 완료 조건

세 primitive의 numeric boundary/count, mark/guide geometry와 target action chain이 승인된다.

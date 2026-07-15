# Roadmap 2 — Phase 3 Step 2: Histogram Bin and Reassignment Primitives

## 목표

Public implementation 전에 exact-step bins, irregular boundaries와 complete histogram reassignment의 final
numeric/graphic target을 raw primitive로 고정한다.

## 진행 상태

- [ ] `bin-step` independent boundary/count reference
- [ ] `bin-boundaries` independent interval/count reference
- [ ] `field-reassignment` Horsepower reference
- [ ] Empty bin omission과 last-upper inclusion 확인
- [ ] Scale domain, ticks, axes, grids와 stack geometry target
- [ ] Existing color scale/legend preservation target
- [ ] Expanded target chain metadata
- [ ] Browser와 2× primitive PNG 생성
- [ ] Gate A 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [ ] STEP status, conceptual commit와 push

## Primitive 원칙

- Reference calculation은 production histogram/bin/materialization helper를 import하지 않는다.
- Primitive는 future `binStep`, `binBoundaries` 또는 reassignment implementation을 호출하지 않는다.
- Concrete semantic bin definition, rect values, guide values와 render order를 low-level chain으로 명시한다.
- Reassignment target은 complete baseline 뒤 두 번째 `encodeHistogram`을 호출한 final state를 표현한다.

## Gate A 대상

- `bin-step`: Displacement, exact step `50`.
- `bin-boundaries`: `[50, 100, 150, 225, 300, 400, 500]`.
- `field-reassignment`: Horsepower, `maxBins: 8`, 기존 Origin color stack과 legend 유지.

## 완료 조건

세 primitive의 numeric boundary/count, mark/guide geometry와 target action chain이 승인된다.

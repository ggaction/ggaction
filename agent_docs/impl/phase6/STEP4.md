# Phase 6 — Step 4: Density Baseline Area Materialization

## 목표

기존 y/y2 confidence-band area를 보존하면서 density가 하나의 value/density pair와 zero
baseline만으로 closed path를 만들 수 있도록 area materialization을 확장한다.

## 진행 상태

- [x] Existing ranged-area mode 보존
- [x] y-density zero-baseline mode
- [x] x-density zero-baseline mode
- [x] Value-order sorting과 group path separation
- [x] Density scale zero-domain validation
- [x] Default/fixed fill과 opacity 유지
- [x] Canvas/scale edit rematerialization
- [x] Primitive geometry equivalence
- [x] Invalid mode와 incomplete encoding tests
- [x] Area docs, full regression, commit, push

## Materialization mode

Area materializer는 stored encoding으로 mode를 판별한다.

```text
y + y2 present             → ranged band
x(value) + y(density)      → y-density baseline area
x(density) + y(value)      → x-density baseline area
```

Mode를 context나 호출 순서로 추정하지 않는다. `semanticSpec`의 encoding과 density
transform provenance가 완전한 source of truth다.

## Path 규칙

- Density rows는 value field 오름차순으로 정렬한다.
- y-density: `(firstX, zeroY) → samples → (lastX, zeroY)`.
- x-density: `(zeroX, firstY) → samples → (zeroX, lastY)`.
- Group이 없으면 path 하나, 있으면 observed group마다 path 하나다.
- 각 path는 `closed: true`; default fill/opacity는 createAreaMark config를 따른다.
- 한 group에 path를 만들 sample이 2개 미만이면 오류다.

## 회귀 보호

Regression confidence band의 y/y2 geometry, fill-only rendering, Canvas resize behavior와
public regression scatterplot `graphicSpec`이 변하지 않아야 한다.

## 구현 결과

- Density transform의 `as`와 `groupBy`를 source of truth로 사용해 mode와 series를 판별한다.
- y-density와 x-density 모두 resolved zero 위치를 baseline으로 사용한다.
- Grouped y-density 결과는 Phase 6 primitive fixture의 3개 path, 각 102개 point와 정확히 일치한다.
- Canvas 변경은 positional scales와 density area path를 함께 rematerialize한다.
- 전체 381개 테스트와 coverage gate를 통과했다 (`lines 94.40%`, `branches 89.38%`, `functions 98.50%`).

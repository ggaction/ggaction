# Roadmap 3 Phase 10 — Cross-feature Integration and Release Readiness

## 진행 상태

- [x] STEP 1 — Phase 범위, Planned inventory와 baseline matrix 확정
- [x] STEP 2 — Shared temporal position reference contract
- [x] STEP 3 — Gate K-A primitive layered chart
- [x] STEP 4 — Gate K-A visual approval
- [x] STEP 5 — Shared position scale-resolution 구현
- [ ] STEP 6 — Polar, facet와 nested composition integration
- [ ] STEP 7 — Transitive rematerialization matrix
- [ ] STEP 8 — Gate K-B cross-feature integration approval
- [ ] STEP 9 — Package, TypeScript, docs와 architecture audit
- [ ] STEP 10 — Roadmap 3 closeout와 release-candidate Gate

## 목표

Phase 10은 Roadmap 3에서 추가한 Polar coordinate, concat, facet, directional encoding, text와 rect를 서로
조합해도 immutable state와 concrete rendering이 일관되는지 검증한다. 새 chart family를 넓히는 Phase가 아니라,
현재 Planned에 남은 shared position policy와 cross-feature integration을 Current 또는 명시적 unsupported
validation으로 닫는 안정화 단계다.

첫 대표 계약은 [Cars Temporal Bar and Line](../chart/cars-temporal-bar-line.md)이다. Temporal x와 aggregate y를
공유하는 bar와 line이 하나의 semantic scale identity를 사용하면서도 bar bandwidth와 line point position을
각자의 graphical layout policy로 해석하는지를 검증한다.

## 첫 Gate의 설계 경계

Gate K-A는 shared temporal x scale의 concrete 결과만 승인한다.

- Bar center와 line vertex는 같은 temporal value에서 정확히 같은 x를 가진다.
- Bar bandwidth는 mark layout 결과이고 shared semantic scale의 별도 identity가 아니다.
- `createLineMark`는 두 mark가 모두 지원하는 x/y encoding과 `mean` aggregate를 함께 추론하므로 반복
  `encodeY` 호출을 요구하지 않는다.
- Shared x/y axes는 한 번만 생성된다.
- Line을 위해 별도 `xLine` scale이나 두 번째 axis를 만들지 않는다.
- Aggregate field와 y scale이 같으면 bar top과 line vertex가 일치한다.
- Gate 승인 전에는 current runtime conflict, public types 또는 Current contract를 변경하지 않는다.

## Cross-feature integration boundary

- Polar child는 `hconcat`/`vconcat`과 nested composition에서 지원한다.
- Polar source의 `facet`은 지원 구현이 승인되기 전까지 현재의 명확한 validation error를 유지한다. 빈 child나
  부분 materialization은 허용하지 않는다.
- Facet shared/independent scale과 shared guide는 semantic compatibility를 통과한 조합만 지원한다.
- Child Canvas, scale, data, guide 또는 selection change가 생기면 모든 composition ancestor의 snapshot,
  placement, shared guide와 title bounds를 deterministic하게 다시 materialize한다.
- Equivalent final state는 authoring order와 edit order에 관계없이 같은 `graphicSpec`을 만든다.

## Hard Gates

### Gate K-A — Shared temporal position

Primitive layered chart의 코드, reference geometry와 PNG를 승인한다. 승인 전에는 shared bar/line runtime policy를
구현하지 않는다.

### Gate K-B — Cross-feature integration

Polar child nested composition, supported facet/guide composition, transitive rematerialization 결과와 explicit
unsupported errors를 승인한다. 승인 전에는 integration behavior를 Current contract로 승격하지 않는다.

### Release-candidate Gate

Roadmap 3 closeout matrix, package/type/docs/architecture 결과와 release notes를 제시한다. 기본 후보 version은
`0.1.0`이지만 version 변경과 publish는 사용자 승인 뒤에만 수행한다.

## 완료 조건

- `shared-position-scale-resolution`과 `cross-feature-integration`이 Planned inventory에 남지 않는다.
- 모든 integration matrix case가 `current-pass`, `current-explicit-error` 또는 사용자 승인으로 제거된 상태다.
- Normal, render, browser, coverage, package, installed-consumer와 documentation 검증이 통과한다.
- `SECOND_ARCHITECTURE.md`, Current contracts, public support/limitation docs와 Roadmap status가 일치한다.
- Release-candidate Gate 전에는 package version을 변경하거나 npm publish하지 않는다.

# Roadmap 2 — Phase 3 Step 9: Position Field-Type Compatibility and Orientation

## 목표

Gate D를 재현하고 accepted mark × channel × fieldType compatibility와 bar orientation inference를
구현한다.

## 진행 상태

- [ ] Canonical compatibility matrix와 single owner
- [ ] Point x/y quantitative/temporal/ordinal combinations
- [ ] Line/area independent-axis compatibility
- [ ] Ranged/measure-axis quantitative restrictions
- [ ] Vertical ordinal/temporal x bar
- [ ] Horizontal ordinal/temporal y bar
- [ ] Compatible time/utc, ordinal/band/point와 continuous scale validation
- [ ] Orientation inference without duplicate semantic option
- [ ] Scale/mark/axes/grid deterministic materialization plan
- [ ] Aggregate/bin/stack/range narrowing rules
- [ ] Shared-scale conflict, ambiguity와 atomic failure coverage
- [ ] Two approved primitive/public pairs와 PNG
- [ ] Types/docs/current contract/catalog, commits와 push

## 구현 원칙

- Field type을 자동 변환하거나 unsupported channel pair를 임의 orientation으로 해석하지 않는다.
- Channel action이 field semantics를 저장하고 complete compatible pair가 orientation을 결정한다.
- Generic compatibility owner와 mark-specific grain policy를 분리해 같은 matrix를 여러 action에 복사하지 않는다.
- Renderer는 final rect/line/path/circle/text만 읽고 orientation이나 field type을 추론하지 않는다.

## 완료 조건

Accepted compatibility matrix와 두 approved pair가 통과하고 incompatible pair는 earlier program을 보존한다.

# Roadmap 5.1 — Multi-Legend Layout Completion

> **문서 상태 — 현재 실행 계획.** Phase 0에서 same-edge multi-legend의 exact layout contract와 concrete
> before/after visual target을 검토한다. 현재 Phase pointer는
> [`../ROADMAP_INDEX.json`](../ROADMAP_INDEX.json), proposal은 [`PROPOSALS.json`](./PROPOSALS.json)이 소유한다.
> 현재 observable API는 계속 [`../../contract/ACTION_INDEX.json`](../../contract/ACTION_INDEX.json)이 소유한다.

## 목표

Legend family가 서로 독립적으로 plot-relative absolute 좌표를 계산하는 현재 구조를 하나의 legend lane layout으로
통합한다. 같은 edge의 block은 공통 기준선에 정렬되고 서로 겹치지 않으며, create/edit/remove, scale와 Canvas
rematerialization 뒤에도 같은 최종 `graphicSpec`으로 수렴해야 한다.

## 범위 원장

| ID | 범위 | 제품 결과 | Phase |
| --- | --- | --- | ---: |
| ML-01 | Exact layout contract | block identity, order, alignment, gap와 overflow policy | 0 |
| ML-02 | Primitive visual target | combined categorical/size와 categorical/size/opacity before/after | 0 |
| ML-03 | Side lanes | right/left common anchor와 vertical non-overlap | 1 |
| ML-04 | Horizontal-edge lanes | top/bottom same-row packing과 cross-family alignment | 2 |
| ML-05 | Lifecycle convergence | create/edit/remove/scale/Canvas order independence | 2 |
| ML-06 | Integration | contracts, architecture, docs, stable charts와 renderer/package evidence | 3 |

## 최상위 원칙

- 각 legend family는 intrinsic content와 bounds를 계산하고, lane owner가 absolute placement를 결정한다.
- Same-edge block order는 action 호출 순서가 아니라 owning layer declaration order와 stable family order에서 파생한다.
- 같은 target의 categorical/continuous-color block 뒤에 size, opacity, stroke-width 순으로 배치한다.
- Right/left lane은 top-to-bottom이고 top/bottom lane은 plot left부터 stable order로 block을 packing한다.
- Colliding horizontal rows와 side blocks 사이 gap은 24 logical pixels이며 새 public option으로 노출하지 않는다.
- Existing single-legend output은 가능한 한 보존하고 multi-block일 때만 lane placement를 적용한다.
- Final occupied bounds가 requested margin에 맞지 않으면 Canvas를 확장하거나 block을 숨기지 않고 atomic error를 낸다.
- Renderer는 계속 fully materialized `graphicSpec`만 읽고 legend 의미나 배치를 추론하지 않는다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | Diagnosis, exact contract와 primitive visual Gate |
| 1 | completed | Right/left shared legend lane implementation |
| 2 | in-progress | R51-P2-A review 대기 — top/bottom row packing과 cross-family alignment revision |
| 3 | planned | Stable evidence, docs/contracts/package와 Roadmap closeout |

## Approval Gates

Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. 사용자의 명시적 승인 없이
다음 Gate로 이동하지 않는다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R51-P0-V | 0 | Two before/after comparisons, order/alignment/gap와 overflow policy | Runtime layout 변경 |
| R51-P1-A | 1 | Right/left lane owner, combined/independent blocks와 rematerialization | Top/bottom 구현 |
| R51-P2-A | 2 | All-edge layout, lifecycle convergence와 four-renderer parity | Closeout |
| R51-Exit | 3 | Current contracts, architecture, docs, stable charts, package와 cumulative tests | 완료 선언 |

## Phase 0 — Exact contract and visual target

현재 Cars regression의 categorical/size 22-pixel offset과 categorical/size/opacity overlap을 executable
before로 보존하고, common-anchor/non-overlap after primitive를 나란히 제시한다. Review package는
[`phase0/`](./phase0/), chart contract는 [`chart/multi-legend-layout.md`](./chart/multi-legend-layout.md)가 소유한다.

## Phase 1 — Side legend lanes

각 family의 intrinsic bounds와 right/left lane placement를 분리한다. Same-target combined block과 independent
target block을 deterministic order로 배치하고 creation/edit/removal이 sibling 전체를 rematerialize하게 한다.

## Phase 2 — Horizontal edges and lifecycle

Top/bottom block을 plot-left sequential flow로 packing하고 title baseline, graphical-element start와 12-pixel gap을
통일한다. 남은 plot width가 부족할 때만 다음 outward row로 넘긴다.
Scale, Canvas, encoding, selection/highlight와 composition/facet rematerialization의 최종 수렴과 margin collision을
검증한다.

## Phase 3 — Integration and closeout

Current legend contract와 architecture, public docs, stable chart/reference oracle, Canvas/SVG/PNG/PDF evidence,
installed package와 cumulative suites를 동기화한다. 별도 R51-Exit 승인 뒤에만 완료 상태로 전환한다.

## Explicit non-goals

- Automatic Canvas or margin expansion
- User-configurable legend block order, wrapping algorithm or inter-block gap
- Drag-and-drop/free-positioned legends
- New legend family, encoding channel, scale or renderer primitive
- Responsive layout engine or arbitrary collision solver
- PR creation, merge, release, package publish or documentation deployment

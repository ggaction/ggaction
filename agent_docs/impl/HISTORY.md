# Roadmap history

이 문서는 Roadmap의 시간 순서와 결과를 빠르게 찾기 위한 인덱스다. 각 Roadmap의 원본 STEP, Gate와
closeout 기록은 그대로 보존한다. 과거 문서가 현재 API 계약을 소유하지는 않는다.

## Roadmap 1 — Initial Chart Foundations

Primitive action, immutable trace, explicit materialization과 Canvas/PNG renderer를 구축하고 scatterplot,
line, histogram, grouped bar, regression과 density-area vertical slice를 완성했다.

- 기록: [`roadmap1/ROADMAP.md`](roadmap1/ROADMAP.md)

## Roadmap 2 — Planned Contract Completion and Initial Release

초기 Planned action을 chart-driven 방식으로 구현하고 guides, statistical charts, selection,
transformed scale과 graphic hierarchy를 확장했다. npm `0.0.1`과 corrective `0.0.2` 배포 기반을 만들었다.

- 기록: [`roadmap2/ROADMAP.md`](roadmap2/ROADMAP.md)

## Roadmap 2.1 — External Evaluation Corrections

`0.0.2` 외부 평가의 F-001~F-007을 재현하고 bar baseline, ranged mark, error band, size legend,
temporal label과 public inspection 문제를 공유 원인 수준에서 수정했다.

- 기록: [`roadmap2.1/ROADMAP.md`](roadmap2.1/ROADMAP.md)
- Closeout: [`roadmap2.1/CLOSEOUT.md`](roadmap2.1/CLOSEOUT.md)

## Roadmap 3 — Polar, Composition, Facet, and Ergonomics

Polar coordinate, arc/radar/radial charts, child-program composition, chainable facet, text/rect mark와 focused
editing을 추가했다. 외부 평가 안정화와 organization transfer를 거쳐 `0.0.4`를 배포했다.

- 기록: [`roadmap3/ROADMAP.md`](roadmap3/ROADMAP.md)

## Roadmap 4 — Native Ownership and Advanced Static Charts

Phase 0~15를 완료했다. Runtime bug 안정화, Basic Chart facade, jitter, window/2D bin, gradient
distribution, ordered path, categorical density, horizon, parallel coordinates, collision-aware label layout과
facade consistency를 완료했다. Phase 15에서 public docs verification과 release-readiness 검증을 닫았다.

- 기록: [`roadmap4/ROADMAP.md`](roadmap4/ROADMAP.md)

## Roadmap 4.1 — Authoring Lifecycle and Compatibility Completion

Phase 0~9를 완료했다. 새 chart capability를 추가하지 않고 existing encoding, selection/highlight, guide,
statistical owner, 2D-bin과 facet의 explicit edit/remove lifecycle을 완성했다. Current action inventory,
cross-capability regression, generated docs와 package consumer를 동기화하고 R41-Exit에서 closeout했다.

- 기록: [`roadmap4.1/ROADMAP.md`](roadmap4.1/ROADMAP.md)

## Roadmap 4.2 — SVG and PDF Vector Renderers

Phase 0~4를 완료했다. Browser-safe SVG document string과 Node-only single-page vector PDF output을 추가하고,
기존 Canvas/PNG와 같은 fully materialized `graphicSpec`을 소비하도록 renderer boundary를 유지했다. Exact
package entry/declaration, selectable PDF text와 metadata, SVG accessibility, all-public-chart renderer matrix,
installed consumer와 Canvas/SVG/PNG/PDF visual parity를 R42-Exit에서 닫았다.

- 기록: [`roadmap4.2/ROADMAP.md`](roadmap4.2/ROADMAP.md)

## Roadmap 5 — Temporal Derivation, Ordering, and Directional Marks

Phase 0~6을 완료했다. UTC time-unit derivation, semantic category ordering, moving mean/sum, Tick mark lifecycle,
point/tick angle과 non-negative center-stacked area를 Current surface로 추가했다. Stable examples,
Canvas/SVG/PNG/PDF parity, generated docs, strict declarations와 installed-package evidence를 R5-Exit에서 닫았다.

- 기록: [`roadmap5/ROADMAP.md`](roadmap5/ROADMAP.md)

## Roadmap 5.1 — Multi-Legend Layout Completion

Phase 0~3을 완료했다. Same-edge legend block을 right/left shared columns와 top/bottom left-packed rows로
통합하고 title, symbol, label 기준선과 간격을 맞췄다. Lifecycle convergence, actual Cars stable evidence,
Canvas/SVG/PNG/PDF parity, public docs와 installed-package 검증을 R51-Exit에서 닫았다.

- 기록: [`roadmap5.1/ROADMAP.md`](roadmap5.1/ROADMAP.md)

## Roadmap 5.2 — Repository Integrity and Maintainer Hardening

Phase 0~5를 완료했다. Protected `main`과 strict six checks, community/security entry points, dependency automation,
documentation truth guards와 current-contract coverage를 정리했다. CI action runtime과 compatible dependencies를
갱신하고 Basic browser bundle promise를 복원했다. PR #23 merge 뒤 community profile, Dependabot, ruleset,
environments와 merged-main identity를 재검증해 R52-Exit에서 닫았다.

- 기록: [`roadmap5.2/ROADMAP.md`](roadmap5.2/ROADMAP.md)

Machine-readable 상태와 nullable active pointer는 [`ROADMAP_INDEX.json`](ROADMAP_INDEX.json)이 소유한다.

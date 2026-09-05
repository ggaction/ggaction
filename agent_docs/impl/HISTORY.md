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

## Roadmap 5.3 — LLM-Friendly Knowledge and Local MCP

별도 branch에서 173개 action metadata, executable recipes, deterministic retrieval, local stdio MCP와 strict
real-LLM evaluation을 구축했다. Frozen Gate V 136-run 결과에서 structured knowledge는 docs-only보다 final
correctness를 20.6 percentage points 높였지만 task-level median token이 89.5% 증가하고 call/time threshold도
미달했다. Product `main`에는 통합하지 않고 R53-Exit에서 completed, not integrated 연구 기록으로 닫았다.

- 요약 기록: [`roadmap5.3/ROADMAP.md`](roadmap5.3/ROADMAP.md)
- 원격 evidence checkpoint: `23212bf5d4dcdca1e842de889c8258ac662c7945`

## Roadmap 5.4 — Compact Knowledge Delivery and Intent Resolution

Phase 0~6을 완료했다. 173개 action card, deterministic multi-intent resolver, bounded authoring task packet과
local read-only stdio MCP를 same-package distribution으로 통합했다. Public docs browsing, direct compact packet,
local MCP와 bounded fallback을 24 tasks × 2 repetitions × Terra/Luna/Nano에서 비교했고, 576-run 결과를 compact
aggregate benchmark와 원본 provenance hash로 정리했다. PR #27의 strict six checks와 merged-main tree identity를
확인해 R54-Exit에서 닫았다.

- 기록: [`roadmap5.4/ROADMAP.md`](roadmap5.4/ROADMAP.md)
- Benchmark: [`../../benchmarks/llm-authoring-v1/`](../../benchmarks/llm-authoring-v1/)

## Roadmap 6 — Hierarchical Chart Authoring and Action Consistency

현재 Phase 2 공통 작성 계약 검토 준비 단계다. 액션 173개의 감사 결과를 기반으로 오류 8건·설계 문제 20건·추가 액션군 19개를
12단계, 46개 작업 묶음과 차트군 계약 13개로 연결했다. 2026-09-05 사용자 선택으로 F20은 범위에서 제외했다.
사용자의 “밀자” 지시로 Phase 0을 닫고 Phase 1의 W1–W5를 구현·검증했다. 전체 기본 테스트 2,329개와
관련 렌더 쌍 2개가 통과했다. 2026-09-05 “승인한다”로 [R6-P1-X 결과](roadmap6/phase1/REVIEW.md)를 승인받아 Phase 1을 닫았다.
B01 lower 작성 순서는 Phase 2에 남으며 후속 새 API는 Proposed다. 로드맵 전체를 완료한 기록이 아니다.

- 계획: [`roadmap6/ROADMAP.md`](roadmap6/ROADMAP.md)
- 전체 항목: [`roadmap6/TRACEABILITY.md`](roadmap6/TRACEABILITY.md)

Machine-readable 상태와 nullable active pointer는 [`ROADMAP_INDEX.json`](ROADMAP_INDEX.json)이 소유한다.

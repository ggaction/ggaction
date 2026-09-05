# Roadmap 6 Phase 3 Gates — First complete chart facades

## 공통 상태

Phase 2 X 결과 승인은 기록했다. **R6-P3-A는 2026-09-05 사용자 “승인한다”로 approved**다.
V는 2026-09-05 사용자 “승인한다”로 approved, X는 planned다. 허용 상태: planned | ready-for-review | approved | changes-requested.
세 Planned 등록과 9개 primitive target 작성을 완료했다. 승인된 9개 시각 목표에 맞는 public flow 구현과 consumer 검증을 진행한다.

## R6-P3-A — Contract and scope

- 상태: approved
- 범위: [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md)의 P3-C01–C07과
  [Pie/Donut](../chart/pie-donut.md), [Density](../chart/density.md), [Horizon](../chart/horizon.md).
- 결정: full-only H0 3개, Donut은 Pie innerRadius 옵션, count/explicit sum, baseline Density와 explicit group color,
  Horizon x-only guides·기존 coordinate child·post-encode opacity 적용, 현재 bundle ceilings 유지.
- Baseline commit: `9625e71c374868756652fb8dff8153dc61500c6e`.
- Source tree: `9d3bd5e26b67634851e6009faac4b8c7c9e15002`; types tree: `25e66ad6bb83ea1481194255e3521d5f2911dbea`.
- Review package commit: [`bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`](https://github.com/ggaction/ggaction/commit/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3). 원격 `origin/codex/roadmap6-hierarchical-actions` push 확인.
- 실제 증거: [baseline.probes.mjs](baseline.probes.mjs), [52건 snapshot](baseline-results.json),
  [176건 기존 tests와 consumer matrix](VALIDATION.md). Chart 계약에는 Current lower chain과 proposed H0를 구분했다.
- 호환성: production/source/types/Current/basic 변경 없음. 기존 explicit lower Pie/Density/Horizon과 guide escape 유지.
- 승인 효과: 이 계약의 Planned 등록, 비시각 작업과 9개 primitive target 작성·검증을 연다.
  해당 V 승인 전 신규 public 시각 flow 구현은 차단한다.
- 승인 전 차단: production 의미/API 구현, 신규 primitive target authoring과 후속 dependent 작업.

## R6-P3-V — Visual target

- 상태: approved
- 검토: [VISUAL_REVIEW.md](VISUAL_REVIEW.md). Pie count/weighted/donut, Density vertical/grouped/horizontal,
  Horizon signed/temporal/baseline-style의 총 9개. Exact input/call은 single manifests와 generated 화면에 있다.
- Primitive source commit: [`fa603c29e820014caae7b8c0d9d205b34e2cc241`](https://github.com/ggaction/ggaction/commit/fa603c29e820014caae7b8c0d9d205b34e2cc241), 원격 push 완료.
- Review package commit: [`1f7debaab66856597deaf8a039648ce23b123e41`](https://github.com/ggaction/ggaction/commit/1f7debaab66856597deaf8a039648ce23b123e41), `origin/codex/roadmap6-hierarchical-actions` push 확인.
- 사용자 V 승인: 2026-09-05 “승인한다”. 승인 기준 HEAD `73790eacb2afcaaf71e925332e9f6d9baf2bdd50`.
- 승인 범위: 위 package의 9개 target/call, Density y축 기준 grid 유지와 Horizon 7개 관측값 포함. A의 세 full-only facade 구현과 consumer 검증을 연다. X·조건부 bundle B·배포·PR 승인은 포함하지 않는다.
- 증거: [source·input·semantic·PNG·pixel 결과](visual-results.json), [generator](render-review.mjs),
  [실제 이미지와 정확한 public call](../../../../.artifacts/roadmap6-authoring/phase3-visual-review.html),
  [9개 이미지 개요](../../../../.artifacts/roadmap6-authoring/phase3-visual-overview.png).
- 검증: normal 2,451/2,451(새 slice 19 포함), PNG 9/9, 12개 plot 영역의 ink와 필요한 색·독립 numeric oracle.
- A 이후 명확화: Density 자동 grid는 두 orientation 모두 현행 y축 기준 horizontal.
  Horizon V 입력은 band 구분을 위해 2점에서 7개 관측값으로 구체화했다. 기존 2점 baseline과 production 의미는 유지했다.
- Artifact: `.artifacts/test/png/review/<chart>/<variant>/`와 generated variant.json.
- 현재: accepted Planned 3개 / Current 174개, 신규 public API 미구현. Public parity 미실행.
- Source/types: A에서 검증한 tree와 동일. Full/Basic/SVG ceilings 변경 없음.
- 승인 효과: 확인한 variant의 public action flow 구현만 연다.
- 승인 전 차단: 새 public flow와 primitive/public equality 완료 선언. 독립 target 수정은 별도 V 검토한다.

## R6-P3-X — Result and closeout

- 상태: planned
- 범위: W1–W3의 승인 결과, exact source/ref, 누적 tests·strict types·실제 trace·immutable failure,
  Current/discovery/generated docs·package 동기화.
- 시각 증거: 승인된 9개 targets의 same-run graphicSpec·draw order·Canvas calls·decoded pixels 일치,
  numeric oracle와 renderer consumer coverage.
- 후속 범위: labels/theta order/Density orientation edit/new amplitude guides/composition을 이 단계에 섞어 완료로 세지 않는다.
- 승인 효과: 이 결과를 전제로 하는 후속 Gate 준비. 다음 API의 자동 승인은 아님.
- 승인 전 차단: Phase 3 completed 표시와 dependent implementation.

## 조건부 독립 Gate

현재 bundle budget 증가를 제안하거나 승인한 사실은 없다. Full 235,000 / Basic 125,000 / SVG 25,000 bytes를 유지한다.
구현의 실제 installed consumer 측정이 이를 초과하고 의미를 유지하는 수정만으로 해소하지 못하면,
구체 delta·artifact·검증을 갖춘 별도 R6-P3-B를 먼저 선언하고 승인받는다. 이 A는 그 승인을 포함하지 않는다.

## 승인 기록

- Review commit: [`bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`](https://github.com/ggaction/ggaction/commit/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3).
- Remote branch: `origin/codex/roadmap6-hierarchical-actions`; push 완료.
- 사용자 승인 근거: 2026-09-05 Phase 3 A 승인 질문에 “승인한다”라고 답했다.
- 승인 기준 HEAD: `0f3531ae9c242190df9457b1ed4289491963ba77`; 계약 package `bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`의 P3-C01–C07과 9개 target 작성 범위.
- 효과: Planned 등록·비시각 준비·primitive target 작성 가능. V/X와 조건부 bundle B는 승인하지 않았다.
- 실제 검증: baseline 52/52, related existing tests 176/176, 문서 lower calls 3/3, 최종 navigation 10/10, local links 214개. 재현 명령은 [VALIDATION.md](VALIDATION.md).
- Planned 등록: accepted 3개, Current 174개 유지. `npm run test:contracts` 260/260, fail/skip 0.
- 남은 작업: public implementation·누적 acceptance·X 승인.

# Roadmap 6 Phase 3 Gates — First complete chart facades

## 공통 상태

Phase 2 X 결과 승인은 기록했다. **R6-P3-A는 2026-09-05 사용자 “승인한다”로 approved**다.
V/B/X는 2026-09-05 사용자 “승인한다”로 approved다. Phase 3은 completed이며 Phase 4 A 계약 검토 준비로 이동한다.
허용 상태: planned | ready-for-review | approved | changes-requested.
세 public flow와 9개 same-run public/primitive 검증을 완료했다(Current 177 / Planned 0).
B 승인 뒤 Full 상한 237,000 bytes를 적용했다. 같은 tarball의 package와 실제 browser 검증이 통과했다.

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
- V 승인 당시: accepted Planned 3개 / Current 174개, 신규 public API 미구현. 당시 public parity 미실행. 이후 구현은 [STEP1](STEP1.md)을 따른다.
- Source/types: A에서 검증한 tree와 동일. Full/Basic/SVG ceilings 변경 없음.
- 승인 효과: 확인한 variant의 public action flow 구현만 연다.
- 승인 전 차단: 새 public flow와 primitive/public equality 완료 선언. 독립 target 수정은 별도 V 검토한다.

## R6-P3-B — Full browser bundle budget

- 상태: approved. 2026-09-05 사용자가 Full 235,000 → 237,000 bytes 조정 질문에 “승인한다”라고 답했다.
- 승인 기준 HEAD: `d2b1f7bf05d11357b9b9b6ed5520f442ef3d07f4`. Review package `c7ff0309d19729251b569e61498d52ca714f80bc`의 Full 상한 변경·같은 tarball 재검증·X 준비만 승인했다.
- 범위: [BUNDLE_REVIEW.md](BUNDLE_REVIEW.md)의 Full gzip 상한 235,000 → 237,000 bytes 제안.
  Basic 125,000 / SVG 25,000, 측정 방식과 fixture는 유지한다.
  적용 commit `81225436461eec0e0298a29f98ca42cc569e6201`의 변경은 canonical guard와 architecture 표 두 줄이다.
- 근거: 같은 installed tarball에서 Full 235,923 bytes로 923 bytes 초과. Basic 124,897 / SVG 6,418 통과.
  Node/MCP/strict TypeScript/tutorial 기능 검증은 통과했지만 package 전체는 exit 1이다.
- Runtime source commit: `80999264535b312d82ca3f58928b4428bf749ac5`.
  Test 교정 commit: `39b082d643412c5190c3ca51f180d10c2c7efa72`, packaged source와 같은 bytes.
- 증거: [같은 tarball 소비자와 bundle](package-results.json), [9개 public 시각 결과](public-visual-results.json),
  [구현과 누적 검증](RESULTS.md#최종-통합-검증). 전체 realistic 210/212의 두 inventory 실패는 관련 모듈 13/13 재검증으로 교정했다.
- Review package commit: [`c7ff0309d19729251b569e61498d52ca714f80bc`](https://github.com/ggaction/ggaction/commit/c7ff0309d19729251b569e61498d52ca714f80bc). 원격 `origin/codex/roadmap6-hierarchical-actions` push 확인. 이 ref의 기능·검증·용량 제안만 B 검토 범위다.
- 승인 효과: canonical guard와 architecture 표의 Full 상한만 수정하고 installed package를 재검증한다.
  이후 X 검토 준비를 연다. 새 API·다음 Phase·PR·배포·publish 승인은 아니다.
- 승인 전 차단: bundle 상한 변경과 package 통과 선언. X는 package 실패가 남아 있는 동안 planned로 유지한다.
- 승인 후 결과: [package-approved-results.json](package-approved-results.json). 같은 SHA-256의 tarball을 재사용해
  Node/MCP/strict types/tutorial/Vite 전체 exit 0, installed browser 1/1, contracts 263/263을 확인했다.

## R6-P3-X — Result and closeout

- 상태: approved. 2026-09-05 사용자가 Phase 3 결과 확정과 다음 계약 검토 질문에 “승인한다”라고 답했다.
- 승인 기준 HEAD: `b128c5536c899f06821b815a81265ea345b94558`. Review package `80fd495dc30d128eebd9d395e41c84964d4a4fa4`의 결과·한계·후속 범위를 승인했다.
- 검토 문서: [REVIEW.md](REVIEW.md). Runtime source `80999264`, scenario 교정 `39b082d6`,
  승인 상한 적용 `81225436461eec0e0298a29f98ca42cc569e6201`. 세 commit의 packaged runtime/types/knowledge는 같다.
- Review package commit: [`80fd495dc30d128eebd9d395e41c84964d4a4fa4`](https://github.com/ggaction/ggaction/commit/80fd495dc30d128eebd9d395e41c84964d4a4fa4). 원격 `origin/codex/roadmap6-hierarchical-actions` push와 ref 일치를 확인했다.
- 범위: W1–W3의 승인 결과, exact source/ref, 누적 tests·strict types·실제 trace·immutable failure,
  Current/discovery/generated docs·package 동기화.
- 시각 증거: 승인된 9개 targets의 same-run graphicSpec·draw order·Canvas calls·decoded pixels 일치,
  numeric oracle와 renderer consumer coverage.
- 실행 결과: normal 2,585, coverage 72 critical floors, 계약 263/263, realistic 전체 210/212 후 관련 교정 모듈 13/13,
  9개 public 시각 동등성·V pixel 보존, 새 실제 데이터 사례 45/45, 문서 124페이지·browser,
  같은 tarball package exit 0·installed browser 1/1. Realistic 전체를 새로 212/212 실행했다고 표시하지 않는다.
- 범위 처분: F01/F06/F07 Current, 전체 Current 177 / Planned 0, F20 제외. Stable evidence는 test/charts로 이관했다.
- 후속 범위: labels/theta order/Density orientation edit/new amplitude guides/composition을 이 단계에 섞어 완료로 세지 않는다.
- 승인 효과: 이 결과를 전제로 하는 후속 Gate 준비. 다음 API의 자동 승인은 아님.
- 승인 전 차단: Phase 3 completed 표시와 dependent implementation.

## 조건부 독립 Gate

A P3-C07은 Full 235,000 / Basic 125,000 / SVG 25,000 bytes를 유지하도록 승인되었다.
실제 installed 측정은 공통 helper 중복 정리 뒤에도 Full이 923 bytes 초과한다. 이를 근거로 위 R6-P3-B를
구체 delta·artifact·검증과 함께 별도 선언했다. A/V와 사용자의 “계속해”를 새 상한 승인으로 기록하지 않는다.
B에 대한 별도 “승인한다”를 기록한 뒤 상한을 적용했다. 당시 대안과 이전 실패 evidence는 B 문서에 보존했다.

## 승인 기록

- Review commit: [`bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`](https://github.com/ggaction/ggaction/commit/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3).
- Remote branch: `origin/codex/roadmap6-hierarchical-actions`; push 완료.
- 사용자 승인 근거: 2026-09-05 Phase 3 A 승인 질문에 “승인한다”라고 답했다.
- 승인 기준 HEAD: `0f3531ae9c242190df9457b1ed4289491963ba77`; 계약 package `bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`의 P3-C01–C07과 9개 target 작성 범위.
- 효과: Planned 등록·비시각 준비·primitive target 작성 가능. V/X와 조건부 bundle B는 승인하지 않았다.
- 실제 검증: baseline 52/52, related existing tests 176/176, 문서 lower calls 3/3, 최종 navigation 10/10, local links 214개. 재현 명령은 [VALIDATION.md](VALIDATION.md).
- Planned 등록: accepted 3개, Current 174개 유지. `npm run test:contracts` 260/260, fail/skip 0.
- 현재 상태: X 사용자 승인으로 Phase 3을 완료했다. F01/F06/F07 Current와 결과를 확정하고 Phase 4 A 준비로 이동한다.

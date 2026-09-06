# W5 — Opt-in Canvas fitting과 Cartesian label layout 결과

## 공개 계약

- Full unit program에 `fitCanvas(options?)`를 추가했다. 기존 Canvas 크기는 고정하고
  top→right→bottom→left 순서의 bounded binary search로 margin만 0.25px 격자에서 줄인다.
- 기본값은 `padding: 0`, `minPlotWidth: 160`, `minPlotHeight: 120`,
  `iterationLimit: 32`, `overflow: "error"`다. `"report"`는 마지막 유효 layout과
  구체적인 issue를 저장한다.
- 같은 layout/policy의 반복 호출은 graphic과 config가 정확히 같은 상태로 수렴한다.
  결과 signature는 마지막 명시적 fitting을 기록하며 이후 layout 변경은 다음 호출에서 재계산한다.
- Cartesian axis label에 `rotation`, `maxWidth`, `wrap`, `lineHeight`, `overlap`을 추가했다.
  줄바꿈은 shared deterministic metric으로 확정한 concrete text line을 저장한다.
  `overlap: "allow"`는 label-label 교차만 허용하고 Canvas/title 충돌은 계속 거부한다.
- Basic은 `fitCanvas`를 노출하지 않는다. Cartesian label layout option은 Full/Basic의 기존
  axis action에 공통으로 적용한다. Parallel label 타입에는 Cartesian layout option을 섞지 않았다.

상세 설계는 [CONTRACT_W5_FITTING.md](CONTRACT_W5_FITTING.md), 현재 공개 계약은
[CORE.md](../../../contract/current/CORE.md#fitcanvas)와
[AXES.md](../../../contract/current/AXES.md#shared-axis-label-contract)를 따른다.

## 구현과 계층

- `src/actions/canvas/fitting.js`가 existing immutable `editCanvas({ margin })`를 probe로 사용한다.
  따라서 scale/mark/guide/title의 기존 rematerialization과 collision 정책을 우회하지 않는다.
- 성공 trace는 `fitCanvas → editCanvas → registered consumers` 계층을 보존한다. 이미 같은
  layout/policy에 수렴한 호출은 child가 없는 `fitCanvas` 기록만 추가한다.
- `materializationConfigs.fitting`은 normalized policy, status, final margin/plot, iteration 수,
  issues와 layout signature를 소유한다. Canvas 확대나 guide 이동은 하지 않는다.
- Axis label wrapping은 각 원래 tick을 group으로 유지한 채 concrete line으로 펼치고,
  rotation-aware bounds와 grouped overlap을 검사한다. Canvas/scale replay는 같은 policy로 다시 만든다.
- `fitted-long-labels` vertical slice는 680×420 Canvas의 margin을
  `{ top: 60, right: 4, bottom: 81.5, left: 39.75 }`로 수렴시켰다. Explicit-margin
  primitive와 public fitting 결과의 semantic/graphic/tree/order/renderer/PNG가 정확히 같다.

## 검증

- W5 focused unit/contract/visual 검증 PASS. Fixed Canvas, 0.25px output, exact repeat,
  minimum plot error/report, iteration-limit report, invalid options, composition scope, Basic 경계,
  long wrapped title/legend, explicit scale range, axis rotation/wrap/reset/overlap와 replay를 포함한다.
- 전체 일반 suite **3062/3062 PASS**.
- Coverage **95.54% lines / 92.56% branches / 98.98% functions**, **88 critical floors PASS**.
- 전체 render suite **208/208 PASS**, charts gallery **171 variants**, review gallery **0**.
- Docs source **47/47**, Jekyll build **125 pages**, desktop search와 전 페이지
  320px/390px/768px Chromium 검증 PASS.
- 공개 action은 **201개**, 그중 user-facing **195개**, advanced **3개**, primitive **3개**다.

## 패키지 소비자 경계

- 구현·문서 commit `6064c8c17ac49bbc873659dbfe68ff837c0132ad`를 원격
  `codex/roadmap6-hierarchical-actions`에 동일하게 푸시했다.
- [Canonical package evidence](package-fitting-results.json): SHA-256
  `22852f2b09f6c857e141ab7606c12740f8da92f619788f457fd7fe3f209978f2`,
  **461 entries / 529516 packed / 2524769 unpacked bytes**.
- 같은 tgz의 installed Node/runtime/types/MCP/tutorial consumer와 Chromium **1/1 PASS**.
  Full/Basic/SVG gzip은 **265859 / 147407 / 6437 bytes**, module 수는
  **408 / 251 / 15**다.
- 새 Full-only module을 반영해 Full gzip ceiling만 **267000 bytes**로 최소 조정했다.
  Basic **148000**, SVG **25000**, packed **531000** 상한은 유지했다.

## 처분

D17과 F18의 theme/typography/format/fitting 범위를 모두 implemented-verified로 닫는다.
W1–W5가 완료되어 Phase 5를 닫고 Phase 6 data/statistics/composite lifecycle로 이동한다.

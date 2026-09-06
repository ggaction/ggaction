# W4 — Program theme와 local override 결과

## 공개 계약

- Full과 Basic `ChartProgram`에 `applyTheme({ theme: "light" | "dark" })`와
  `removeTheme()`를 추가했다. 두 호출은 새 program을 반환하며 입력 program을 바꾸지
  않는다.
- Theme은 `materializationConfigs.theme`의 persistent owner다. Theme 적용 뒤 생성·편집된
  mark, Canvas, Cartesian/Polar/Parallel axis, grid, legend, title, annotation과 통계
  component도 top-level action 완료 시 같은 owner로 수렴한다.
- 우선순위는 explicit local > theme > built-in default다. 사용자가 built-in default와
  같은 값을 명시한 경우도 local로 보존한다. `removeTheme()`는 local 선택을 유지하면서
  theme 소유 값만 light built-in으로 되돌린다.
- Theme은 appearance만 바꾼다. Semantic spec, resolved scale, dataset, grouping, domain,
  graphic draw order와 field-driven palette assignment는 바꾸지 않는다.
- 공개 action 수는 **200**, 그중 user-facing은 **194**다.

상세 계약은 [CONTRACT_W4_THEME.md](CONTRACT_W4_THEME.md), 현재 공개 계약은
[CORE.md](../../../contract/current/CORE.md)를 따른다.

## 구현

- `src/theme/defaults.js`에 light/dark token과 background, mark, text, axis, grid,
  border, size symbol, regression band, box, reference, gradient-center 역할을 정의했다.
- `src/actions/theme/`가 apply/remove lifecycle, explicit override 수집, config와 graphic
  reconciliation을 소유한다. Field-driven mark와 categorical/continuous data palette는
  theme 대상에서 제외한다.
- `src/core/action.js`의 top-level 완료 hook이 한 public action의 모든 자식 action이 끝난
  뒤 theme을 한 번 수렴시킨다. 수렴 과정은 해당 public trace의 child로 남아 immutable
  action 구조를 유지한다.
- Direct mark와 chart facade, complete axis/legend, Parallel field axis, Box/Gradient,
  reference line/band, ErrorBar body/caps, ErrorBand body/boundaries, annotation과 regression
  band의 explicit style을 owner별로 추적한다. 복합 action은 nested trace에서 실제 생성·
  편집 target을 찾아 동일 기본값의 명시도 보존한다.
- 다크 테마 산점도를 stable vertical slice로 추가했다. Primitive program과
  `.applyTheme({ theme: "dark" })` public program의 최종 state와 render가 정확히 같다.

## 전수·회귀 검증

- Public chart registry의 58개 중 composition 7개를 제외한 **51개 unit chart 전수**에
  dark theme을 적용했다. 모든 사례에서 semantic spec, resolved scales와 draw order가
  byte-stable이었다.
- Theme unit/contract 집중 검증 **25/25 PASS**.
- 전체 일반 suite **3048/3048 PASS**.
- 전체 render suite **207/207 PASS**, charts gallery **170 variants**, review gallery
  **0 pending variants**.
- Coverage **95.55% lines / 92.57% branches / 98.98% functions**, **88 critical floors
  PASS**.
- Docs source **47/47**, Jekyll build **125 pages**, desktop search와 전 페이지
  320px/390px/768px Chromium 검증 PASS.
- 다크 테마 산점도 primitive/public state와 render parity PASS. 결과는
  `.artifacts/test/png/charts/program-theme/dark-theme-scatterplot/default/`에 있다.

## 패키지 소비자 경계

- [Canonical package evidence](package-theme-results.json): SHA-256
  `efa03d4f7f1fff2f7bd778905088f5befa5059463a7fd40b09eafdf6158084fb`,
  **460 entries / 526163 packed / 2510292 unpacked bytes**.
- 같은 tgz의 installed Node/runtime/types/MCP/export consumer와 Chromium **1/1 PASS**.
  Full/Basic/SVG gzip은 **263863 / 146373 / 6437 bytes**, modules는
  **407 / 250 / 15**다.
- Theme source 증가에 맞춰 실측 여유만 반영해 Full/Basic gzip ceiling을
  **265000 / 148000 bytes**로 조정했다. SVG ceiling은 유지했다.
- 로그:
  `.artifacts/roadmap6-authoring/theme-{full-test,render-test,coverage,canonical-package-consumer,browser-consumer}.log`.

## 남은 범위

W5 opt-in fitting과 guide label layout, Phase 6–11, 0.0.13 실제 릴리즈는 남아 있다.
이 결과로 D17/F18의 theme 부분만 닫고 fitting 부분은 W5에서 계속 추적한다.

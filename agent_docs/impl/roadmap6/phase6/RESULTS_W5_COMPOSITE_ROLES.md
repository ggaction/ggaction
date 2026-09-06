# Phase 6 W5 결과 — Violin·ErrorBar·ErrorBand 역할 revision

## 결과

- `editViolinPlot({ target?, data?, x?, y?, split?, density? })`이 stable Violin owner에서 source,
  category/value 역할, orientation, split과 density 설정을 함께 바꾼다. Density derived data는 새 immutable
  revision으로 교체하고 기존 area owner, scale·guide 역할과 선택/highlight를 다시 물질화한다.
- `editErrorBar`에 `data`, `x`, `y`, `xOffset`, `yOffset`, `groupBy`를 추가했다. 통계 interval과 explicit
  center/lower/upper interval을 양방향으로 전환하고 orientation이 바뀌어도 main rule과 enabled cap ID를
  유지한다. 보존한 categorical offset은 independent axis를 따라 이동하며 통계 group grain에 포함된다.
- `editErrorBand`에 `data`, `x`, `y`, `groupBy`를 추가했다. Area body와 optional boundary ID를 유지하면서
  source, interval mode, orientation과 path grouping을 한 호출에서 바꾼다. `groupBy: false`는 grouping을
  제거하고 active color/selection과 충돌하는 변경은 결과를 노출하기 전에 거부한다.
- Statistical revision은 새 namespaced interval dataset을 만들고 모든 owned sibling과 source-owned label을
  함께 rebind한다. Explicit 전환과 다음 revision은 더 이상 참조되지 않는 이전 derived dataset을 해제한다.
  Stored selection/highlight는 새 concrete items에 replay된다.
- 모드 전환 뒤 이전 `intervalField`/`centerField`, temporal unit, offset 설정이 남지 않으며 기존 ErrorBar의
  explicit group provenance도 후속 역할 편집에서 보존된다.

## 오류와 불변성

- Unknown source, missing/non-numeric interval field, ambiguous channel 역할, incomplete explicit bounds,
  incompatible scale/offset/orientation, invalid statistics, group/color/selection 충돌은 첫 반환 state 전에
  거부된다. 이전 program과 caller input은 변경되지 않는다.
- Statistical interval field는 missing values를 허용하되 최소 하나의 finite value를 요구한다. 이 검사는
  empty derived output이 뒤늦게 ordinal-domain 오류로 보이던 잘못된 진단을 field 오류로 바로잡는다.
- Appearance-only 편집과 `editErrorBandBoundary`는 그대로 유지되며 생성된 cap/boundary ID를 public
  parameter로 노출하지 않는다.

## 계약과 검증

- Public declarations, Current statistics/Violin contracts, action index/cards, API/reference/search/LLM 문서를
  실제 옵션과 동기화했다. Strict nested scale inventory는 86 paths, 346 literals를 모두 실행한다.
- ErrorBar/ErrorBand focused create/edit: 50/50 pass. Role source/orientation/mode, stable children, offset 이동,
  label rebind, highlight replay와 atomic failures를 포함한다.
- Unit suite: 2,191/2,191 pass. Contract suite: 310/310 pass. Documentation suite: 47/47 pass.
- 누적 normal suite: 3,111/3,111 pass. W3/W4 뒤 남아 있던 ErrorBar Student-t method와 Regression
  selectors/confidence primitive 기대값도 현재 provenance와 맞춰 같은 실행에서 닫았다.
- Revised statistical-owner contract는 source와 orientation을 바꾼 ErrorBar/ErrorBand를 Canvas와 Node PNG로
  실제 render한다. Violin은 facade/density unit contract와 installed package runtime으로 검증했다.
- Installed package consumer는 Node, SVG/PNG/PDF, strict TypeScript, Basic, browser bundle과 MCP를 통과했다.
  [artifact 원장](package-composite-role-results.json)은 473 entries, 550,832 packed bytes,
  2,634,911 unpacked bytes, SHA-256 `26233288f7b0f3f5921e6a3451d9eccebb63a6bad2d88d3437ef0da35c1542a4`다.
- Browser gzip은 Full 278,904 / Basic 149,769 / SVG 6,437 bytes다. W5 owner revision 증가에 맞춰 packed
  ceiling을 550,000→552,000, Full gzip ceiling을 276,000→279,000 bytes로 최소 조정했다. Entry,
  unpacked, Basic과 SVG ceiling은 유지했다.

## 다음 작업

- Phase 6 누적 closeout에서 W1–W5의 migration, visual/runtime matrix, generated freshness와 exact remote ref를
  다시 검증하고 X 결과를 기록한다.

# Phase 5 W1 A1 — Polar 구성요소 생성 결과

범위는 [W1 계약의 A1](CONTRACT_W1.md#a1--polar-focused-생성-공개)이다. 기준 commit은 `f4814aedc9a4faef65666d2447e4cdb4d430018a`, branch는 `codex/roadmap6-hierarchical-actions`다. 결과 source와 검증은 이 문서를 추가한 commit에 함께 들어간다. W1 전체나 D07/F17 완료를 의미하지 않는다.

## 구현 결과

- Theta/Radial line·ticks·labels·title의 기존 wrapped 생성 owner 8개를 Full direct public API로 공개했다. Basic은 그대로다. Direct inventory 189개 중 user-facing 183개이며 Planned는 0개다.
- 완성 축에서 `title: false`로 생략한 제목을 독립 생성·편집할 수 있다. 전체 축 제거 뒤 필요한 구성요소만 생성하는 경로도 제공한다.
- Radial의 첫 구성요소가 각도를 결정하고 이후 구성요소가 이를 공유한다. Theta focused create는 무의미한 `angle`과 radial title 전용 `position`을 거부한다.
- [#82](https://github.com/ggaction/ggaction/issues/82): 제목을 먼저 생성할 때 요청 각도 대신 기본 90도로 공간을 검사하던 오류를 수정했다. 300×500, margin 50, angle 180의 제목이 line-first 생성과 같은 x=150, y=358에 놓인다. Tick/label preflight도 이미 결정한 각도를 사용한다.
- 선언과 루트 type export, Current/index/internal inventory, cards, public reference·API 예제·LLM 문서를 동기화했다. 별도 schema나 renderer 분기는 없다.

## 실제 검증

로그는 `.artifacts/roadmap6-authoring/phase5-polar-create-*.log`에 있다. 임시 파일·npm cache·브라우저는 repository 내부 `.artifacts/repository-study/`를 사용했다.

| 검사 | 실제 결과 |
| --- | --- |
| `npm test` | 2,766/2,766, 실패·skip 0 |
| 새 focused unit | 9/9; 두 축 각각 24가지 순서, complete/focused semantic/config/graphic/Canvas/SVG 동등성, replay·복원·오류 불변성 |
| Direct-root scenario | 일반 검사에 포함; user-facing 183개 모두 root call 실행, baseline/edge integrity·SVG 검증 |
| Public option inventory | required path 4,827, path literal 2,569, family literal 174; lifecycle 5개를 더한 실제 ledger 7,758 |
| Coverage | lines 95.18%, branches 91.77%, functions 98.81%; critical floor 74개 통과 |
| 기존 Polar PNG 회귀 | `node --test test/charts/polar-guides/png.render.js`: 1/1 |
| 실제 tarball Node·types·MCP·tutorials | [package-polar-create-results.json](package-polar-create-results.json): PASS |
| 같은 tarball Chromium | `node --test test/browser/package-consumer.browser.js`: 1/1; 첫 Radial title, 8개 생성, Canvas/SVG 확인 |
| Docs 예제 | `docs/api/axes.md`의 새 JavaScript block을 추출해 실행; 두 title 결과 PASS |
| Built docs | locked Ruby/Bundler preflight·build와 125개 page link/asset 검사 PASS |
| Docs browser | desktop search·keyboard·Axe·no-JS와 모든 문서 page의 320/390/768px 검사 PASS |
| 최종 내부 기록 검사 | action catalog·agent docs navigation 18/18 PASS |

Package SHA-256: `bc669465a657cce38962de08c9c6b3c40502186eae681b372e6243bb500f33b3`. 443 entries, packed 497,488 bytes, unpacked 2,382,889 bytes다. Full/Basic/SVG gzip은 각각 247,108 / 136,936 / 6,437 bytes로 기존 249,000 / 138,000 / 25,000 한도 안이다. Package 버전은 개발 중인 0.0.12이며 0.0.13 릴리즈가 아니다.

첫 package 검사는 새 option type의 root export 누락으로 실패했다. `types/index.d.ts`를 보완하고 source type 검사도 root entry를 참조하게 한 뒤 위 새 artifact로 전체 consumer를 통과시켰다. 첫 실패 tarball은 PASS 증거로 사용하지 않는다. Ledger는 diversity 요구 2개를 독립 feature 개수에 더하지 않는 기존 정의를 확인하여 실제 7,758개로 기록했다.

## 남은 범위

W1 A2 Cartesian/Polar optional component의 false 생략·제거·복원 정렬, A3 Parallel field 기반 편집·생성·제거는 남아 있다. W2–W5와 이후 Phase도 미완료다. 이번 공개 승격은 기존 geometry를 재사용하므로 새 visual target은 N/A다. 전체 Phase realistic/renderer/browser 통합 검증은 Phase 5 종료 시 수행하며 이 focused 결과로 대체하지 않는다.

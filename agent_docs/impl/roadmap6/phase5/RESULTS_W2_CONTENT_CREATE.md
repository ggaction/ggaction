# Phase 5 W2 B1 — Explicit legend content와 symbol provenance

기준 `96c01b5e18cac40c1889210cf58562cd3e486e27`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [#88](https://github.com/ggaction/ggaction/issues/88)과 [#89](https://github.com/ggaction/ggaction/issues/89)를 수정했다. B2 partial removal/content editing과 inferred point 오류 #90은 남아 있다.

## 수정

기존 point dispatch는 explicit channels보다 shape/size encoding의 존재를 우선했다. `["color"]`, `["shape"]`, `["color","shape"]`에도 size block이 추가됐고, 필요한 `["color","shape","size"]`는 categorical validator에서 거절됐다. Color-only recipe도 다른 shape encoding 유무에 따라 swatch/point로 달랐다.

이제 explicit 채널은 생성할 content의 정확한 집합이다. Point color/shape/size의 nonempty subset 7개를 Full/Basic에서 처리한다. Categorical와 size를 두 owner에 분리하며 선택하지 않은 size는 추가하지 않는다. Color-only는 swatch, selected shape는 typed point다. Count는 categorical 요청에 size도 선택했을 때만 허용한다. Combined block의 fields/domains/count와 retained size 호환성을 첫 component action 전에 검증한다. 기존 omitted color+shape(+size) inference는 보존한다.

Creation과 editor의 automatic symbol resolver를 recipe owner에 모았다. Config.inferredSymbol이 omitted/auto와 explicit recipe를 구분한다. Symbol auto reset과 encoding removal은 automatic recipe를 재추론하고 caller recipe를 보존한다. Matching line은 selected color field/scale이 공유될 때만 사용한다.

이 과정에서 #89도 확인했다. Editor가 기존 symbol ID Set만 비교해 layer 순서를 바꾸지 않았고, 추가 symbol도 기존 layer 뒤에 놓았다. Layer 집합/순서가 바뀌면 해당 components를 선언 순서로 재생성한다. Border는 새 symbol anchor가 존재한 뒤 구성해 recipe 교체+border 동시 편집도 성공한다. Auto reset과 reverse layer+border가 최종 recipe로 직접 create한 graphics와 정확히 일치한다.

기존 lifecycle fixture는 원하는 size를 명시하도록 migration했고, shape 제거 후 automatic color-only symbol의 기대값도 swatch로 갱신했다. Invalid/duplicate/empty channel은 create/remove의 공통 validator로 검증한다. 새 direct action은 추가하지 않았다.

## 시각·실행 증거

구현 전에 기존 lower flows로 color-only, shape-only, color-size 목표의 PNG와 graphicSpec을 캡처하고 표시했다. 구현 후 세 public 결과 모두 pre-implementation graphics와 정확히 일치했다. 영구 `test/contracts/legend-content-render.test.js`는 직접 작성한 createGraphics/editGraphics primitive로 세 variant의 graphics, drawing order, renderer calls와 same-run decoded pixels를 비교한다.

Stable artifact는 `.artifacts/test/png/charts/legend-layout/legend-content/{color-only,shape-only,color-size}/`다. Review subtree는 비교 후 제거했다. Color-only swatches x508, label x530; color-size lane swatches x539/label x574, size samples x546/y181·221·261과 radii `sqrt([24,110,196]/π)`를 literal primitive로 검증한다.

로그 prefix `.artifacts/roadmap6-authoring/phase5-legend-channels-`.

| 검사 | 실제 결과 |
| --- | --- |
| Normal final | 2,825/2,825, 실패·skip 0 |
| Coverage | lines95.29%, branches92.03%, functions98.91%; 77 critical floors PASS |
| 기존 Cars scatter/regression/multi-legend PNG | 20/20 |
| Actual Cars 400 rows 별도 sweep | Origin/Cylinders × 7 channel subsets × 2 label colors =28/28; mark preservation, resize/style order, filter, remove/recreate |
| Installed Node/types/MCP/tutorial/renderers/budgets | PASS |
| 동일 tarball Chromium Canvas/SVG | 1/1 |
| Docs generate/preflight/build/static | 125 pages PASS |

Final artifact `.artifacts/roadmap6-authoring/package-legend-channels/ggaction-0.0.12.tgz`, SHA-256 `54e4f6137cba8496ba5fc8452a14cbe59c1d72c91adc7cb6c9ada9b3056aea29`. Entries447, packed503300/unpacked2409765 bytes, Full/Basic/SVG gzip250034/137938/6437 bytes. 기존 한도 내이며 Basic은 138000 한도에 근접했다. [정확한 package 기록](package-legend-channels-results.json). 이번 변경은 docs interaction/layout을 바꾸지 않아 현재 source/static 검증과 installed browser를 사용했고, 전체 docs responsive 검사는 직전 C1 결과를 유지한다. 0.0.12 개발 artifact이며 0.0.13 release가 아니다.

## 남은 범위

[#90](https://github.com/ggaction/ggaction/issues/90)은 실제로 확인한 별도 inference 오류다. Color-only 또는 shape-only point에서 채널을 생략하면 line symbol, color+size에서 생략하면 size 누락이 발생한다. 현재 문서에는 explicit channels 사용을 안내하지만 이 우회 안내를 수정 완료로 취급하지 않는다. Inference migration, B2 partial channel 제거/target content editing, auto/explicit recipe의 전체 replay matrix, C2 family×edge 공통 배치, W3–W5와 후속 Phase 및 실제 0.0.13 release는 active다.

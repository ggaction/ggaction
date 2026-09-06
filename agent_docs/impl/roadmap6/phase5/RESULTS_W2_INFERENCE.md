# Phase 5 W2 — Point 범례 채널 생략 추론 수정

기준 `041995fd594db4ee95ec1b333c9661e5aa84a0b5`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [#90](https://github.com/ggaction/ggaction/issues/90)을 수정했다. B2 전체 content lifecycle과 C2 edge layout 완료를 뜻하지 않는다.

## 재현과 결과

Point가 color-only 또는 shape-only일 때 `createLegend()`는 line-series 기본 symbol로 떨어졌다. Color+size는 size block을 누락했다. Shape+size도 올바른 combined 생성 경로를 타지 않았다. 이미 작동하던 explicit content 경로와 생략 추론 경로가 다른 채널 집합을 사용한 것이 원인이다.

이제 ordinal color/shape와 quantitative size의 7개 nonempty subset 모두 생략·explicit 선택의 semanticSpec, guide config, graphicSpec이 일치한다. Full/Basic의 직접 createLegend, explicit target, createGuides, complete Scatter facade에서 검사했다. Color-only는 color owner의 swatch, shape-only는 series owner의 typed point다. Color+size/shape+size는 해당 categorical block과 size block을 모두 생성한다. Count를 생략하면 기존 5 samples이며, count3도 같은 owner로 전달된다.

Point 후보는 color 또는 shape를 가진 target을 찾고 실제 존재하는 categorical 채널을 전달한다. Categorical config는 resolved definition의 채널로 symbol recipe를 결정한다. Size companion 후보가 여럿이면 explicit target을 요구하여 categorical-only로 조용히 축소하지 않는다. 기존 explicit size/categorical count/side layout 검증은 유지한다. Sequential/discretized color와 opacity 등 다른 family dispatch를 확대했다고 간주하지 않는다.

## 소비자 영향과 시각 증거

Color-only의 inferred semantic owner가 series에서 color로 바로잡혔다. MCP 실행 결과, composition child, numeric ordinal category, graphic attachment/removal, Window Rank 차트의 계층 inventory에서 기존 raw series ID 기대값을 color로 옮겼다. Caller의 layered symbol recipe는 계속 보존하며, Window Rank의 custom point recipe도 color owner 아래 유지된다. 기본 shorthand는 최종 categorical kind에 따라 검증된다.

`test/contracts/legend-content-render.test.js`에서 기존 독립 createGraphics/editGraphics primitive를 사용하여 inference용 color-only/color-size/shape-only 세 variant를 먼저 렌더링했다. 수정 전 새 테스트 2개가 실제 실패했으며, 수정 후 primitive/public graphic hierarchy, renderer calls와 decoded PNG pixels가 정확히 일치한다.

- 경로: `.artifacts/test/png/charts/legend-layout/legend-inference/{color-only,color-size,shape-only}/`
- 목표 call: 해당 encoding을 가진 base의 `createLegend()` 또는 color-size `createLegend({ count: 3 })`.
- 800×700, right margin300. Color-only swatch x508/y76,104; color-size shared lane x539, size centers x546/y181,221,261. Radius는 독립 literal `sqrt([24,110,196]/π)`.
- Primitive만 먼저 생성된 뒤 사용자에게 세 target 이미지를 표시했으며 [전체 승인](../APPROVAL.md)을 적용했다.

## 검증

로그 prefix: `.artifacts/roadmap6-authoring/phase5-legend-inference-`.

| 검사 | 결과 |
| --- | --- |
| 수정 전 새 회귀 | red.log: 11 중 2 실패로 문제 재현 |
| 직접·facade·primitive focused | 11/11 PASS |
| 기존 소비자 migration focused | 48/48 PASS |
| 전체 normal | 2,827/2,827, fail/skip0 |
| source coverage | lines95.29%, branches92.03%, functions98.91%, critical floors77 PASS |
| 기존 Cars scatter/regression/multi-legend/window-rank와 Polar PNG | 24/24 PASS |
| 실제 Cars lifecycle | 유효392 rows, Origin/Cylinders ×7 channel subsets ×2 styles =28/28 PASS |
| 실제 데이터 검사항목 | inferred/explicit semantic·graphic parity, style/resize 순서 수렴, mark 보존, filter replay, remove/recreate parity |
| 설치된 artifact | Node/renderers, strict TypeScript, MCP, tutorials, bundle budgets PASS |
| 동일 artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | generate/preflight/Jekyll build/125 built pages PASS |

초기 전체 테스트에서는 잘못된 series ID를 기대하던 기존 검사6개가 실패했다. 원인을 수정한 final normal 결과가 위 2,827/2,827이며 초기 실패를 숨기거나 전체 성공으로 기록하지 않았다. Docs UI 변경은 없으므로 이번에는 static/source 검증과 package browser를 실행했다. 전체 docs responsive browser를 이번에 재실행했다고 주장하지 않는다.

패키지 원장: [package-legend-inference-results.json](package-legend-inference-results.json). Artifact `.artifacts/roadmap6-authoring/package-legend-inference/ggaction-0.0.12.tgz`, SHA-256 `f3b712255735beb21e0f94ecfbeceba9625fe9143b1abe3a6b49b55a26733c94`. Entries447, packed503310, unpacked2409826 bytes. Gzip Full250036/Basic137969/SVG6437로 기존 한도 안이다. Basic 여유는31bytes이며 다음 변경의 실제 artifact 측정 후 승인된 한도 조정이 필요할 수 있다.

## 남은 작업

B2 partial channel removal/target content editing과 automatic recipe 전체 replay matrix, C2 전체 family×edge layout, W3–W5, Phases6–11과 실제0.0.13 release는 남아 있다. 현재 artifact는 개발용0.0.12이며 릴리즈 완료가 아니다. Current/createLegend의 지위나 direct action 수는 변경하지 않았다.

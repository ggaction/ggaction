# Phase 5 W2 — Automatic legend recipe replay

기준 `195ea2053df0127a14ac2759b4a5fb16a6ee17ad`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [#93](https://github.com/ggaction/ggaction/issues/93)을 재현·수정했다. B의 content selection/revision에 이어 automatic recipe replay를 확인했으며 C2와 나머지 Phase는 남아 있다.

## 재현과 수정

Point color+shape 범례를 먼저 만든 뒤 동일 field/color scale의 Line을 추가하면 자동 recipe가 point-only로 남았다. 같은 Line을 먼저 만들면 line+point였고, 그 Line을 removeMark로 제거해도 line+point 심벌이 남았다. 초기 회귀3개 중2개가 실패했고 explicit recipe 보존1개는 통과했다.

기존 rematerializeLegend는 domain/field/title/scales만 갱신했다. 이제 inferredSymbol인 categorical config의 recipe를 같은 resolveLegendSymbol/normalizeRecipe owner로 재계산한다. 바뀐 concrete symbol type과 순서는 lifecycle.js의 공통 reconciler가 제거·생성하며 일반 editor도 같은 helper를 쓴다. 기존 wrapped component actions를 사용하고 renderer 또는 raw action inventory에 새 API를 추가하지 않는다.

Caller recipe는 다시 추론하지 않는다. Symbol 순서, title visibility, labels, categorical order와 기존 companion size 설정을 보존한다. Matching 조건은 기존 selected color+shape 및 동일 color field/scale이다. 이번 변경은 새 matching 조건이나 category별 companion coverage 정책을 도입하지 않는다. Mark의 실제 strokeWidth를 legend sample width로 자동 복사하는 계약도 추가하지 않는다.

Scale consumer와 detached-scale dependency plan이 기존 rematerializeLegend를 이미 호출하므로 mark/encoding owner에 별도 refresh 분기를 추가하지 않았다. Full/Basic의 line-before/after-legend가 정확히 같은 graphicSpec과 guide config로 수렴하고 Full의 removeMark, removeEncoding, color scale rebind가 stale line component를 지운다. Explicit recipe reset은 기존 editLegend({symbol:"auto"}) 경로를 유지한다.

## 검증

로그 prefix: `.artifacts/roadmap6-authoring/phase5-legend-recipe-`.

| 검사 | 결과 |
| --- | --- |
| 수정 전 회귀 | 3개 중2 실패로 creation-order/removal 재현 |
| dedicated replay | 4/4 PASS; Full/Basic 순서, removal/rebind, explicit recipe, scale/filter/Canvas |
| 초기 focused content/recipe 묶음 | 19/19 PASS; 이후 dedicated replay 1개 추가 |
| primitive/public | content render5 tests PASS, 총14 variants; 새 companion-added/removed 2개 exact equality |
| normal | 2,846/2,846, fail/skip0 |
| source coverage | lines95.37%, branches92.13%, functions98.97%;80 critical floors PASS |
| Cars/Polar 기존 PNG | 24/24 PASS |
| 실제 Cars | 유효392 rows; Origin/Cylinders ×4 edges ×visible/hidden =16/16 PASS |
| 실제 데이터 검사 | early/late 생성 exact graphicSpec, filtered companion 제거, title 보존, resize/removal 수렴 |
| 설치 package | Node, strict types, PNG/PDF/SVG, MCP, tutorials, Full/Basic bundles PASS |
| 동일 artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | generate/preflight/build/125 built pages PASS |

새 renderer 알고리즘이나 legend geometry를 설계한 변경이 아니다. 기존 late-creation의 line+point 결과와 point-only 결과를 목표로 삼았다. 독립 literal primitive는 `test/contracts/legend-content-render.test.js`의 기존 shape geometry에 palette와 line component를 명시하여 비교한다. Line x508..540, point center524, labels550, item y82/110이며 removal은 point-only geometry로 돌아온다. `addLine(base.createLegend({target:"points",channels:["color","shape"]}))`와 그 뒤 `removeMark({target:"lines"})`가 대상 호출이다.

이미지 경로: `.artifacts/test/png/charts/legend-layout/legend-recipe-replay/{companion-added,companion-removed}/`. graphicSpec/drawing order/Canvas calls/decoded pixels가 정확히 일치하며 added 이미지를 직접 확인했다. Responsive docs UI를 변경하지 않았으므로 full responsive browser를 이번에 재실행했다고 주장하지 않는다.

[패키지 원장](package-legend-recipe-results.json): SHA-256 `282b52babd795f1cf9c354bc7d0a4bbd1e844dd966a90a0b6f9aa74e4e9cf49c`. Entries449, packed505706, unpacked2420049, gzip Full251748/Basic138351/SVG6437. 기존 한도 내이며 추가 budget 변경은 없다.

## 남은 범위

C2의 size/width/interval/combined와 모든 edge 배치 통합, W3–W5, Phases6–11과 실제0.0.13 릴리즈는 미완료다. 이 개발 checkpoint를 전체 로드맵이나 릴리즈 완료로 기록하지 않는다.

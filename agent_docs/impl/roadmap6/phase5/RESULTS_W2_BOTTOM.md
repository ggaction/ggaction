# Phase 5 W2 C1 — 명시적 categorical bottom layout

기준 `d0b5be694bbbdec8e9016f6279dfa384ea0d11c5`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [#87](https://github.com/ggaction/ggaction/issues/87)의 mode 전환 오류를 수정했다. Categorical mode만 완료하며 W2 B content 재작성과 C2 전체 family×edge layout은 남아 있다.

## 계약과 구현

기존 createLegend는 option 존재 여부로 bottomGrid를 추론했고, editor가 보존할 이전 값을 모두 전달하면서 label color만 바꿔도 compact y572가 grid y489로 이동했다.

이제 `layout: "edge" | "legacy-bottom"`를 categorical createLegend/editLegend/editLegendLayout과 nested guides에서 지원한다. Default edge는 reserved-margin grid다. Position bottom + legacy-bottom은 Canvas 하단 고정 single-row를 명시하며 labels y=height−28, title y=height−52다. Layout 하나만 canonical config에 저장하고 bottomGrid는 제거했다. Edit omission, Canvas/scale/encoding-removal replay는 stored mode를 보존한다.

Legacy는 align/itemGap/recipe/styles/border를 지원한다. Columns, vertical direction, left title, offset≠8은 edge가 필요하다. 다른 position으로 옮길 때도 같은 edit에 layout edge를 명시한다. Invalid/null vocabulary와 incompatible control은 이전 program 변경 없이 거절한다. Full/Basic 모두 생성하며 editor는 기존 Full 경계다. Continuous/size/width/interval의 layout option 및 아직 없는 edge는 이 변경에서 새로 지원하지 않는다.

Cars Histogram과 mark-selection의 기존 public program·variant call chain·튜토리얼을 legacy-bottom으로 migration했다. 기존 그림은 보존한다. MCP의 실행 가능한 bottom authoring preset은 edge 배치에 offset70을 명시하여 기본 x-axis title과 충돌하지 않는다. 이는 preset 옵션이며 runtime offset default8을 변경한 것이 아니다.

## 시각 증거

구현 전에 기존 compact 생성과 explicit offset8 grid 생성에 low-level label fill만 적용한 primitive를 PNG와 graphicSpec으로 캡처했다. 목표 call은 `base.createLegend({channels:["color"],position:"bottom",layout}).editLegendLabels({color:"#b91c1c"})`다. 640×600 Canvas에서 edge labels y489, legacy labels y572를 확인했다.

구현 후 두 mode 모두 캡처한 pre-implementation graphicSpec과 정확히 일치했다. 영구 `legend-lifecycle-render.test.js` pair는 explicit editGraphics styling과 public focused edit의 graphics/drawing order/mock renderer/same-run decoded pixels를 비교한다. Stable artifact는 `.artifacts/test/png/charts/legend-layout/legend-lifecycle/{edge,legacy-bottom}/`이며 review subtree는 제거했다.

## 검증

로그 prefix `.artifacts/roadmap6-authoring/phase5-bottom-layout-`.

| 검사 | 결과 |
| --- | --- |
| Normal final | 2,816/2,816, 실패·skip 0 |
| Coverage | lines95.30%, branches92.04%, functions98.91%; 77 critical floors PASS |
| 기존 Cars Histogram/Line/multi-legend와 mark-selection PNG | 22/22 |
| Actual Cars 400 rows 별도 sweep | Origin/Cylinders × 2 modes × 3 colors =12/12; resize/style order, hidden title, filter, auto restore, remove/recreate, immutability |
| Final installed Node/types/MCP/tutorial/renderers/budgets | PASS |
| 동일 final tarball Chromium Canvas/SVG | 1/1 |
| Docs source | 47/47 |
| Docs built/browser | 125 static pages; desktop search/keyboard/Axe/no-JS와 전체 320/390/768px PASS |

전체 docs browser 검증 뒤 최종 Histogram tutorial/recipe prose migration을 반영해 다시 build하고 125 static pages를 확인했다. 최종 튜토리얼의 실행은 위 final installed-package gate가 검증한다.

Final package는 `.artifacts/roadmap6-authoring/package-bottom-layout-final/ggaction-0.0.12.tgz`다. SHA-256 `eed7eec5c9b6905719fea27bddbefeeee9444509702ad0b6f1fdc058c378aa95`, entries447, packed502812/unpacked2407909 bytes. Full/Basic/SVG gzip249852/137713/6437 bytes이며 기존 한도를 유지했다. [정확한 artifact 기록](package-bottom-layout-results.json). 0.0.12 개발 검증 artifact이며 0.0.13 release가 아니다.

첫 PNG 실행의 7개 실패는 명시 call-chain migration 뒤 남은 generated variant metadata 충돌이었다. 해당 metadata만 재생성한 뒤 기존 primitive/public 22개가 통과했다. 첫 package tutorial 실행은 Histogram 문서에 남은 implicit bottom 호출 때문에 timeout했다. 튜토리얼과 연결 recipe까지 migration한 final package 검사는 모두 통과했다. 실패를 누락하거나 미검증 artifact를 final로 기록하지 않는다.

## 남은 범위

W2 B partial content 제거/재작성, auto/explicit recipe provenance, C2 sampled/interval/combined four-edge 공통 placement와 matrix, W3–W5, 후속 Phase와 실제 0.0.13 release는 active다. C1의 완료를 W2나 Phase5 완료로 표시하지 않는다.

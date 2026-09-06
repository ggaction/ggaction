# Phase 5 W2 — Legend content와 edge layout 통합 결과

상태: W2 A/B/C 및 D08 구현·통합 검증 완료. [전체 승인](../APPROVAL.md), [원계약](CONTRACT_W2.md), [통합 계약](CONTRACT_W2_INTEGRATION.md)을 적용했다. 결과는 이 문서를 포함한 commit이다. Phase5 전체와 Roadmap6/0.0.13 release 완료를 뜻하지 않는다.

## 전체 kind×edge×lifecycle

Stable `test/unit/actions/guides/legend-family-lifecycle.test.js`는 Full9family×4edge×border2=72개 authoring 상태와288개 edge 전환을 검사한다. 각 상태의 생성, focused label edit, hidden/auto title, remove/recreate, Canvas resize, scale edit, encoding reassignment를 direct authoring과 비교한다. GraphicSpec뿐 아니라 semanticSpec/resolvedScales도 정확히 일치하고 이전 program은 불변이다. Basic7family×4edge×border2=56개는 Full과 같은 의미·스케일·그래픽을 생성한다. ItemGap은 명시28로 고정하여 기존 edit의 option 보존과 edge별 creation default를 혼동하지 않는다.

| Family | Full 네 edge·lifecycle | Basic 네 edge 생성 | 의미 있는 recipe/배치 차이 |
| --- | --- | --- | --- |
| Categorical color | PASS | PASS | swatch 또는 명시 layered recipe |
| Categorical line | PASS | PASS | color/dash line 및 compatible composite |
| Mapped shape | PASS | PASS | scale의 typed point shape; 실제 path/miter bounds |
| Continuous gradient | PASS | PASS | strip length/thickness와 ticks; item columns/direction/symbol 미지원 |
| Discretized interval | PASS | PASS | color interval swatches; edge layout만 지원 |
| Quantitative size | PASS | PASS | equal-area samples/count/scale; arbitrary symbol 미지원 |
| Stroke width | PASS | N/A: Basic에 해당 encoding 없음 | line samples/count/scale; arbitrary symbol 미지원 |
| Opacity | PASS | N/A: Basic에 해당 encoding 없음 | 단일 point recipe; generic item grid columns/direction 미지원 |
| Categorical+size | PASS | PASS | 공유 typography, 별도 label gap, retained standalone styles |

Basic에는 lifecycle editors가 없으므로 생성만 대조한다. Categorical side는 vertical/center/한 열/top title, horizontal item grid는 direction/columns/inline title을 지원한다. Explicit legacy-bottom은 categorical bottom 단일 row 전용이며 combined·sampled·interval에는 적용하지 않는다. Gradient/opacity의 layout option은 지원하지 않는다. 자세한 runtime 검증과 defaults는 current LEGEND_AND_TITLE 계약이 소유한다.

## 함께 닫은 content·geometry 경계

- A sampled size 편집과 B explicit/inferred content/partial removal/replacement는 [W2 A](RESULTS_W2_SIZE.md), [B1](RESULTS_W2_CONTENT_CREATE.md), [inference](RESULTS_W2_INFERENCE.md), [removal](RESULTS_W2_REMOVAL.md), [editing](RESULTS_W2_CONTENT_EDIT.md), [recipe replay](RESULTS_W2_RECIPE_REPLAY.md)에 기록했다. Stable legend-content-editing/removal/recipe-replay tests와 독립 legend-content-render가 전체 normal에서 통과한다.
- Four-edge interval/width/size/combined primitive pairs와 occupied alignment/hidden title/legacy target을 유지했다. Same-edge collision·border grouping·authoring order는 guide-collisions, combined-legend-edges, occupied-legend-alignment로 검증한다. Gradient↔interval 전환은 scales/color-transitions가 네 edge의 호환 보존과 immutable rejection을 검사한다.
- 큰 sample/font는 categorical240case+mapped96case, interval/width72case와 opacity matrix로 검사한다. 기존80case overlap audit은 errors0/overlap0. Cars finite392rows의 categorical48case와 interval/width24case는 filter+Canvas replay까지 통과한다.
- 통합에서 발견한 side option #108과 edge-dependent combined default #109도 각각 수정·검증했다. Probe의 부적합한 columns/implicit itemGap 가정과 실제 runtime 오류를 구분했다. 실패 사례를 숨기거나 supported family를 제외하여 완료하지 않았다.

## 최종 공통 검증

Normal2931/2931, source coverage95.46%lines/92.35%branches/99.02%functions 및86critical floors PASS. 대표 primitive/reference/PNG와 Cars regression variants11/11, 별도 semantic 통합10/10 PASS. 누적 #106 checkpoint에서 affected categorical charts PNG49/49도 검증했고 이후 geometry 변경은 없다. #109는 title fill만 변경한다.

최종 canonical tgz의 Node/strict TypeScript/MCP/export/bundle consumer, 동일 artifact Chromium Canvas/SVG1/1과 docs generate/preflight/Jekyll/built125pages PASS. Artifact의 exact hash와 bytes는 [package-combined-appearance-results.json](package-combined-appearance-results.json)에 있다. Public inventory는194direct/188user-facing, 신규 action promotion 없이 기존 mutable guide contracts를 완성했다.

범례의 complete/focused hierarchy와 renderer-neutral materialization을 유지한다. W3 final-item labels/reference/common format, W4 program theme, W5 opt-in fitting 및 Phase6–11을 계속한다. Full Phase/최종 release의 realistic corpus와 전체 renderer/browser release gates는 해당 closeout에서 별도로 수행한다.

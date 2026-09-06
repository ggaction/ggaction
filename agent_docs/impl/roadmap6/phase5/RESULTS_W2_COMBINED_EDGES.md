# Phase 5 W2 C2 — Combined categorical+size horizontal group

기준 `0ce0dd0fc9e69bc40045079b867b7590311dec4d`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [item/group 계약](CONTRACT_W2_ITEM_EDGES.md)에 따라 [#97](https://github.com/ggaction/ggaction/issues/97)을 수정·검증했다. 전체 C2, W3–W5, Phases6–11과 실제0.0.13 릴리즈는 미완료다.

## 문제와 구현

Create는 combined top/bottom을 거부했으나 right 생성 뒤 top 편집은 통과했다. Canvas1000×800/margin250/count2에서 color bounds y205–242.25와 size y183–220이 겹쳤다. Horizontal lane이 두 block을 같은 group으로 묶은 뒤 group 수1이면 placement를 생략한 것이 원인이다.

이제 생성/편집/content replacement에서 combined 네 edge를 지원하고 legacy-bottom 결합은 명시적으로 거부한다. Horizontal에서는 categorical의 position/align/direction/columns/titlePosition/offset/itemGap이 두 content의 effective geometry를 결정한다. Size의 자체 layout/count/title/visibility/label offset/border는 계속 보존하며 categorical 제거 시 자체 layout으로 돌아간다. Shared typography patch와 categorical title edit의 기존 의미를 바꾸지 않았다.

Pure `layout/legendLane.js`의 group 계산은 독립 content를 categorical→size 순서로 occupied gap40을 두고 배치한다. 폭을 넘으면 기존 horizontal grammar처럼 outward row로 wrap한다. Default top title 아래 gap12는 sample뿐 아니라 큰 label 높이도 포함한다. 별도로 보존된 size font60에서 제목과 label이 겹치는 경우를 찾아 수정했다. Inline title은 자기 content와 함께 이동한다.

그 다음 nested size border를 포함한 전체 bounds를 union하고 categorical의 shared outer border를 재계산한다. Single combined group의 outer occupied bounds는 plot width의 align과 plot edge offset을 따른다. 여러 group이 있으면 이 결합 결과를 하나의 atomic content로 외부 lane에 전달하여 두 제목이나 내부 테두리가 흩어지지 않는다. Renderer 변경이나 새로운 public direct action은 없다.

Size 생성은 categorical 뒤, 이미 존재하는 independent continuous companion 앞에 graphics를 넣는다. 이를 통해 opacity-first/combined-first 생성과 content replacement의 drawing order까지 일치한다. Size title 복원도 자기 labels 다음에 두고 categorical title 복원은 size background보다 앞에 둔다. 단순 좌표 비교로 order 차이를 숨기지 않았다.

## Primitive와 compatibility

Public 구현 전에 `.artifacts/roadmap6-authoring/combined-horizontal-targets.mjs`로 top/bottom literal primitive를 작성·렌더링하고 top 이미지를 확인했다. Stable source는 `test/contracts/combined-legend-edges.test.js`다. Target public call은 `base.createLegend({channels:["color","size"],position,count:2,offset:30,itemGap:20,border:true})`다.

Canvas1000×800/margin250, colors A/B, size values0/10, radii2/6이다. Top outer border x370.575/y158/width258.85/height61.5, title centers y176.5, categorical item center201.25, size center201이다. Bottom은 title599, categorical623.75, size623.5, border y580.5다. Sample stroke까지 포함한 measured bounds 때문에 categorical/size center는0.25px 차이가 난다. Initial decimal target의 binary floating-point 끝자리만 exact arithmetic 값으로 명시해 graphic equality를 유지했다.

Stable artifact는 `.artifacts/test/png/charts/legend-layout/combined-legend-edges/{top,bottom}/`이며 primitive/public graphicSpec, drawing order, Canvas calls, same-run decoded pixels가 정확히 일치한다. Review subtree는 stable pair로 승격 후 제거했다.

이전 top rejection unit은 실제 combined 생성 검증으로 변경했다. Regression fixture의 작은 bottom Canvas는 이제 공간 부족으로 거부하고 충분한 bottom margin과 columns2를 가진 positive variant를 추가했다. Current vocabulary test의 낡은 side-only Korean prose assertion은 제거하고 dedicated executable four-edge matrix로 대체했다. 기존 side/다른 family의 exact geometry assertion은 완화하지 않았다.

## 검증

로그 prefix `.artifacts/roadmap6-authoring/phase5-combined-`.

| 검사 | 결과 |
| --- | --- |
| combined focused + exact primitive | 8/8 PASS |
| final side/size + pure lane + combined primitive integration | 34/34 PASS |
| migrated compatibility tests | 14/14 PASS |
| 실제 Cars | 392 rows,2recipes×2edges×2radii×2visibility=16/16 PASS |
| 실제 데이터 replay | Filter/Canvas order, whole content rewrite, radii/gaps/fonts/visibility PASS |
| representative Cars/Polar/weighted-rule PNG | 25/25 PASS |
| final normal | 2,877/2,877 PASS; fail/skip0 |
| final coverage | lines95.38%, branches92.21%, functions98.97%;81 critical floors PASS |
| final installed package | Node/strict TypeScript/SVG/PNG/PDF/MCP/tutorials와 Full/Basic/SVG budgets PASS |
| same final artifact Chromium | Canvas/SVG1/1 PASS |
| docs generate/preflight/build/built pages | PASS;125 built pages |

첫 normal 실행에서 Node22.23.2 child가 GC safepoint와 optimizing worker의 상호 대기에 멈췄다. Process sample `.artifacts/roadmap6-authoring/phase5-combined-normal-process.txt`로 상태를 확인했고 같은 grouped-bar module의 독립4tests는 통과했다. 멈춘 child를 종료해 initial runner를 terminal failure로 수거했다. 이 실행은 정상 통과 증거가 아니다. 후속 정상 실행이 드러낸 side-only 기대값3개는 새 계약과 executable evidence로 migration했다.

[Package 원장](package-combined-edges-results.json)은 마지막 tall-label gap 수정까지 포함한 final artifact를 기록한다. Final artifact는 `.artifacts/roadmap6-authoring/package-combined-edges-final/ggaction-0.0.12.tgz`, SHA-256 `e60bf170355c9e6523b6633240198fa809a15b3c28e78f892108494d493af586`다. Entries450, packed508622, unpacked2433900, gzip Full253617/Basic139807/SVG6437다. 이전 `package-combined-edges`의 SHA268eb233…는 superseded다. Full gzip ceiling253000→254000은 실제 증가량을 반영한 최소1000byte 조정이며 Basic140000/SVG25000과 package entry450/packed510000/unpacked2500000은 유지한다.

## 남은 범위

Combined top/bottom 완료를 C2 전체 완료로 해석하지 않는다. Categorical/continuous 전체 occupied alignment, title/axis collision의 symmetric replay, gradient↔interval transition matrix, W3 labels/reference/format, W4 themes, W5 opt-in fitting과 Phases6–11 및 실제0.0.13 릴리즈를 계속 진행한다. 현재0.0.12는 개발 checkpoint artifact 버전이다.

최종 runtime 변경 뒤 normal/coverage와 package/browser를 실행했다. 이후 nested size border 앞 categorical title 복원 drawing-order assertion만 추가해 focused8tests를 다시 통과했다. Docs UI 변경이 없어 전체 responsive browser는 이번에 재실행하지 않았다.

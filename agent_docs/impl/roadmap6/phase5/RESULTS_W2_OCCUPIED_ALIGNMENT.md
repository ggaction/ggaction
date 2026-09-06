# Phase 5 W2 C2 — Single horizontal legend occupied alignment

기준 `17e3691fa5450e9f39762d135389a42d1d9b2285`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [계약](CONTRACT_W2_OCCUPIED_ALIGNMENT.md) 아래 [#102](https://github.com/ggaction/ggaction/issues/102)를 수정·검증했다. W2 전체와 실제 0.0.13 릴리즈는 미완료다.

## 문제와 구현

기존 single horizontal legend는 nominal sample slot과 title/grid 치수를 정렬했다. 실제 endpoint label, swatch/line stroke, circle이 사용하지 않는 slot 부분과 border stroke 때문에 align/offset이 family마다 달랐다. 7family×2edge×3align×2border의 84cases에서 alignment 오류 66개, offset 오류 48개를 재현했다.

이제 final foreground/background union을 기준으로 전체 block을 이동한다. Left/right는 plot x edge, center는 plot center에 맞추며 top offset은 occupied bottom과 plot top, bottom offset은 plot bottom과 occupied top의 거리다. 내부 collection과 stroke까지 포함한다. Horizontal single/multi 배치의 wrapped owner는 rematerializeHorizontalLegendLane이고 pure layout/legendLane.js가 translation과 최종 Canvas fit을 계산한다. Family의 초기 intrinsic 좌표가 Canvas 밖이어도 최종 배치가 들어가면 허용한다. 최종 overflow는 기존 program을 바꾸지 않고 거절한다.

Same-target size의 effective edge를 categorical에서 받아 combined grouping을 유지한다. Explicit legacy-bottom은 edge lane에서 제외하므로 independent opacity legend와 함께 있어도 고정 anchors를 유지한다. Multi-block packing, side layout, renderer의 의미는 보존한다. Block descriptor는 background만이 아니라 foreground/background 전체 union을 사용한다.

## Primitive와 관찰 가능한 변화

Public source 수정 전에 `.artifacts/roadmap6-authoring/create-occupied-alignment-targets.mjs`로 literal primitive를 작성·render했다. 기존 intrinsic 좌표에 독립적으로 계산한 plot edge/center translation을 적용한 목표다. Stable explicit method chains는 `test/contracts/occupied-legend-alignment.test.js`가 소유한다. Gradient와 color target PNG를 확인했다.

Canvas 1200×1000/margin300/offset40/bordertrue 기준:

| Variant | Public target | Final occupied bounds |
| --- | --- | --- |
| Color | `createLegend({position:"top",align:"left",offset:40,border:true})` | L300,R407.64,T198,B260 |
| Gradient | `createLegend({position:"bottom",align:"right",offset:40,border:true})` | L744.02,R900,T740,B826 |
| Size | `createLegend({position:"top",align:"center",offset:40,border:true})` | L371.5980234021147,R828.4019765978853,T194.20269166066282,B260 |

각 chain은 먼저 해당 field encoding을 작성한다. Color의 group A/B, gradient/size의 m0..10 입력과 전체 runnable chain은 stable test에 있다. Full graphicSpec, drawing order와 same-run decoded PNG pixels가 일치한다.

이 observable correction에 맞춰 density inline title y116→115.5, top swatch stroke에 따른 center 이동, bordered composite의 edge translation, interval/size/width의 literal occupied center를 갱신했다. Hidden categorical border도 offset을 보존하도록 이동한다. Histogram의 기존 60px bottom margin은 outer border까지 포함하면 62px가 필요해 positive fixture를 70px로 명시했다. 기존 nominal 위치 때문에 거절되던 multi-block 80px margin은 정상 허용하며 실제 부족한 60px margin은 거절한다. 고정 legacy sample 좌표는 유지한다.

## 검증

- Full7/Basic5 family × edge/align/border 144creationcases와 Full hidden/restore/opposite edge/Canvas/scale/remove-recreate 검증.
- Zero horizontal margin에서 final fit을 허용하고 offset1000 overflow에서 이전 JSON state 불변 검증.
- Original audit 84cases: alignment 오류0, offset 오류0.
- Real Cars 392rows, 84cases: 실제 bounds와 filter/Canvas replay 수렴 PASS.
- New primitive/public 3variants, interval/size/width 네 방향 primitive regression PASS.
- Normal 2893/2893 PASS. 이후 추가한 combined reserved-bound touching/intersection 및 마지막 primitive 정리의 focused 검사도 PASS.
- Representative existing PNG 30/30 PASS: density, line variants, multi-legend, regression scatterplot.
- Packed Node/types/SVG/PNG/PDF/MCP/tutorial 소비자 PASS. Full/Basic gradient의 border 포함 edge/align/offset 검사 포함.
- 같은 최종 artifact의 Chromium Canvas/SVG 1/1 PASS.
- Docs generate/preflight/build/built PASS,125pages.

[Package 원장](package-occupied-alignment-results.json): SHA-256 `c4c90b017c355a04272b6720d45df5cbb058c0f83fb183160f32b5ac0c80478b`,452entries,packed509903,unpacked2437436,gzip Full254000/Basic140242/SVG6437. 기존 한도 내이며 한도를 변경하지 않았다. 현재 0.0.12는 개발 checkpoint version이다.

최초 normal 실패15개는 이전 nominal-coordinate 기준과 margin fixture를 분류해 수정했다. 후속 normal에서 남은 density primitive literal 한 곳도 수정해 전부 통과했다. 새 package probe는 border 설정의 lineWidth와 concrete property strokeWidth를 혼동한 오류를 바로잡은 뒤 통과했다. 새 critical floor의 functions100%가 기존 combined reserved-bound callback 미검증을 드러내, touching/overlap 검증을 추가했다. 최종 source coverage는 lines95.42%,branches92.26%,functions99.02%이며 86critical floors를 모두 통과했다. 마지막 focused 검사11/11과 catalog/navigation/documentation closeout21/21도 통과했다.

## 남은 범위

Large sample/font의 block 내부 간격, side option의 실제 지원과 전체 kind×edge 통합은 C2에서 계속 검증한다. W3 final-item labels/reference/format, W4 themes, W5 fitting, Phases6–11과 실제 0.0.13 릴리즈도 남아 있다. Single horizontal alignment 수정만으로 W2 전체를 완료로 기록하지 않는다.

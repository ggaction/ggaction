# Phase 5 W2 C2 — Opacity sample occupied spacing

기준 `23a64dbcf28f8964cca1ed38acd58cb0b4f8316e`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [계약](CONTRACT_W2_OPACITY_SPACING.md) 아래 [#104](https://github.com/ggaction/ggaction/issues/104)를 수정·검증했다. W2 전체와 실제 0.0.13 릴리즈는 미완료다.

## 문제와 수정

Opacity layout은 원 radius와 고정 pitch만 사용한 뒤 stroke를 더했다. 큰 sample,굵은 stroke,큰 label/title이 허용되는 입력인데 이웃 sample·label·title과 겹쳤다. Default side label은 labels.offset에서2px를 뺀 실제10px로 표시했다. 6styles×6edge/title arrangements36cases 중22overlap cases와20gap 불일치를 재현했다.

이제 occupied radius=radius+strokeWidth/2를 위치·측정·background에 일관되게 사용한다. Labels.offset은 visible sample edge에서 측정하고 side의2px 보정을 제거한다. Side의 최소 center pitch는 큰 sample/label 높이에 맞춰 늘어나며 첫 item은 visible title 뒤12px를 확보한다. Horizontal top-title는 기존 최소56px/2×itemGap center spacing을 유지하되 큰 sample/label 폭과 itemGap을 수용한다. Inline은 occupied diameter와 label width를 합친 item 사이에 itemGap을 둔다. Hidden title은 content 측정에서 제외하며 복원은 같은 계산을 사용한다.

공유 left lane 검증은 mirrored label anchor의 음수 center distance가 default44px column으로 축소되던 추가 원인도 발견했다. Pure side lane은 절대 거리를 사용해 label을 symbol 오른쪽으로 옮겨도 간격을 보존한다. 큰 opacity의52px center distance는 shared68px label column이 된다. Common column 때문에 작은 sibling의 간격은 더 커질 수 있다. 기존 guide의 공통 column/read order 계약은 유지한다. Renderer·public signatures·Basic opacity 지원범위에는 변화가 없다.

## Primitive-first와 관찰 가능한 변화

Public opacity 수정 전에 `.artifacts/roadmap6-authoring/create-opacity-spacing-targets.mjs`로 right mixed,top stacked,bottom inline의 literal primitive를 작성·렌더링하고 stacked target을 확인했다. Shared-left 문제를 발견한 뒤 lane 수정 전에 `.artifacts/roadmap6-authoring/create-opacity-lane-target.mjs`로 네 번째 primitive를 렌더링·확인했다. Stable explicit chains는 `test/contracts/opacity-legend-spacing.test.js`가 소유한다.

Canvas2400×2000/margin500/count3/offset40,values0/5/10에서:

- Right radius30/stroke20/label50/title60: symbol x1980,y602/682/762,label x2032. 실제 gap12이고 title bottom550→첫 sample top562다.
- Top stacked radius40/stroke20/label80/title60: symbol x1072/1200/1328,y318,label y420,title y226. Symbol outer diameter100,center pitch128,outer gap28,vertical label gap12다.
- Bottom inline radius30/stroke20/label50/title60: total width497.168,occupied x951.416..1448.584,y1540..1620. Labels.offset8과 itemGap20을 확보한다. Literal floating-point 값은 독립 width 계산의 연산 순서를 보존한다.
- Left shared color/opacity: 작은 default44 column 대신68을 요구하며 symbol/title은24px 왼쪽으로 이동하고 label anchor는 보존한다. Opacity border는 넓어진 content를 포함한다.

각 target의 full graphicSpec, drawing order와 same-run decoded PNG가 일치한다. 큰 target의 renderer test는 logical2400×2000/pixelRatio1을 명시해 기존 physical pixel ceiling을 넘지 않는다. Target 자체는 처음부터 같은 크기로 렌더링했다.

기존 Cars field-opacity legend label은 x664→666으로 바뀐다. Independent reference도 diameter14+offset12로 바로잡았다. 다른 기존 대표 PNG는 변경되지 않았다. 기본 side sample anchors는 그대로이며 stroke/큰 글꼴에서만 필요한 공간을 추가한다.

## 검증

- Original36cases:22overlap/20gap mismatch → 모두0.
- New unit:72style×edge/title×border cases,hidden/restored title,hidden font1000,Canvas/scale replay,remove/recreate;focused style/count/content/filter edits;shared lanes/order/removal;oversized radius/stroke/font immutable overflow.
- Focused existing/new + pure lane + primitive46/46 PASS.
- Real Cars392rows,36bordered cases: internal bounds와 filter/Canvas replay PASS.
- Representative existing PNG20variants: 최초 field-opacity reference1개를 수정한 뒤 scatter9/9 PASS,이전 multi-legend/regression11개도 PASS.
- Packed Node/types/SVG/PNG/PDF/MCP/tutorials PASS. 네 edge의 실제 stroke-label gap과 left shared lane을 검사한다.
- Docs generate/preflight/build/built PASS,125pages.

[Package 원장](package-opacity-spacing-results.json)의 SHA-256은 `867cdea99ba8c83b91ab714e4872eb33f03b3c845ddb94409f356e762f965cf6`다. Entries452,packed510051,unpacked2437972,gzip Full254123/Basic140277/SVG6437. Packed size가 기존510000 ceiling을51bytes 초과하여 전체 승인 아래511000으로 조정했다. Browser255000/141000/25000와 unpacked2500000 한도는 유지한다. 현재0.0.12는 개발 checkpoint version이다.

최초 audit script는 Canvas plot-bounds 함수와 concrete graphic-bounds 함수를 혼동해 실패했으며, 실제 item ID 기반 함수로 고친 뒤에만 baseline을 기록했다. 초기 primitive render test는 기본 pixelRatio2에서 physical ceiling을 넘어서1로 명시했다. Inline literal의2e-13 수준 차이는 목표 폭497.168의 독립 연산 순서를 명시해 해결했다. 최초 normal은 기존 side label literal와 package ceiling2개만 실패했으며 둘 다 위 계약/승인대로 수정했다. 최종 normal2904/2904,coverage lines95.44%/branches92.29%/functions99.02%와86critical floors,동일 artifact Chromium Canvas/SVG1/1,closeout21/21을 모두 통과했다.

## 남은 범위

Categorical 큰 font/shape/stroke와 interval/width actual sample extent를 계속 감사한다. W2 전체 kind×edge 통합, W3 labels/reference/format,W4theme,W5fitting,Phases6–11과 실제0.0.13release는 남는다. Opacity 수정만으로 W2 전체를 완료 처리하지 않는다.

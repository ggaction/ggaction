# Phase 5 W2 C2 — Size item owner와 standalone 네 방향

기준 `cb2361faf5bc7a9a2dcc9b0d434055ea1a3151ad`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [item 계약](CONTRACT_W2_ITEM_EDGES.md)을 구현하고 [#96](https://github.com/ggaction/ggaction/issues/96)을 수정했다. Combined horizontal과 C2 전체 collision/transition 통합은 미완료다.

## 구현

Full/Basic의 standalone size createLegend는 right/left/top/bottom, layout edge, horizontal align/direction/columns/titlePosition, offset/itemGap, title/labels/titleStyle와 border를 지원한다. Full editLegend/editLegendLayout 및 focused title/label/count는 같은 owner를 사용한다. Side는 vertical/center/one column/top title이다. Edge를 바꾸면 omitted direction은 새 edge를 따르고 명시 grid/alignment/title controls는 호환성을 검증한다.

Size materializer는 categorical layout의 private `.size` 좌표를 읽지 않는다. Scale/formatter/area mapping/실제 radii는 size owner가 소유하고, pure item layout에는 slot dimensions와 각 circle의 실제 relative bounds를 전달한다. Categorical left layout에서도 size 전용 metrics/좌표 계산을 제거했다. 양쪽 block은 독립 content를 만든 뒤 기존 lane에서 결합한다. Renderer나 새 direct action은 추가하지 않았다.

Minimum sample slot width32, 실제 최대 diameter를 측정해 필요할 때 slot을 확장하고 circle을 중앙에 둔다. Labels.offset은 slot 오른쪽 간격(default12)으로 통일했다. 이전 default는 center-relative28이었다. Radius≤16인 slot32에서는 기본 상대좌표를 유지한다. Explicit offset은 새 기준으로 해석하므로 기존 offset≥16에서 동일 간격을 원하면 16을 뺀 값을 지정한다. 큰 circle에서도 default gap12를 확보한다. Font/color/count5/formatter/equal-area mapping은 유지한다.

Standalone side title/item 시작 위치는 plot.y+20/+52로 통일했다(이전 +78/+112). Item pitch는 최소40이며 실제 sample/font 높이를 수용한다. 큰 title/item은 title 아래 gap12를 확보한다. Combined side에서 title-item 간격도 기존34에서32가 되어 기존 representative size items를2px 올렸고 exact primitive baseline에 반영했다.

## #96과 border/label lifecycle

기존 radius40 sample은 center+28에 위치한 label을 덮고 pitch40으로 인접 circle에도 겹쳤다. Standalone의 visible bounds 검사도 없어 큰 title/sample 또는 작은 Canvas를 조용히 잘랐다. 이제 실제 circle/text/background가 Canvas를 벗어나면 생성·편집·Canvas/scale replay가 오류를 내고 원본 program과 trace를 보존한다. Hidden title은 측정에서 제외하고 저장된 title의 복원 시 다시 검사한다.

Side lane의 shared label start44는 최소값이다. 각 block의 sample center와 요청 label 간격을 측정해 필요한 만큼 공통 column을 확장한다. 따라서 큰 size samples와 explicit label gap이 lane 때문에 겹치지 않는다. Combined 생성 시 명시한 labels.offset도 size의 자체 offset에 보존하고, inherited typography를 후속 편집해도 해당 offset을 유지한다. 기존 일반 크기의 다른 family lane 좌표는 유지한다. Standalone에서 만든 size border를 보존한 채 categorical block에 합치면 내부 size border도 content를 따라 재배치하고 outer group border가 그 occupied bounds를 포함한다. Categorical만 제거하면 size의 자체 position/style/border를 다시 materialize한다.

Private inheritAppearance는 내부 combined orchestration에만 남고 public standalone createLegend는 해당 option을 거부한다. 기존 직렬적 owner/styles와 remove/recreate/whole-content replacement를 같은 경로로 검증한다.

## Primitive 및 호환성

Public 구현 전에 `.artifacts/roadmap6-authoring/size-edge-targets.mjs`로 네 literal primitive를 렌더링하고 top 이미지를 확인했다. Stable source는 `test/contracts/size-legend-edges.test.js`다. Canvas1000×700, margins L/R240 T/B200, radii2/6, labels0/10, title m, count2다. Right circle center806, y252/292; left center167.36; top circle centers441.02/532.3399999999999, y164; bottom y561이다. Title은 side x790/151.36, y220; top(500,139.5), bottom(500,536.5)이다.

`.artifacts/test/png/charts/legend-layout/size-legend-edges/{right,left,top,bottom}/`에서 primitive/public graphicSpec, draw order, Canvas calls, decoded pixels가 정확히 일치한다. Review artifacts는 stable pair로 승격하고 review subtree를 제거했다.

기존 standalone y와 explicit label offset 기대값, combined size item의2px 이동과 outer border height를 명시적으로 migration했다. Long numeric label fixture는 충분한 margin260으로 유지하고, clipping은 별도 immutable rejection 회귀로 검증한다. Basic boundary test도 margin을 명시해 이전의 잘린 fixture를 교체했다. Legacy-bottom은 size에서 계속 거부하며 오류의 계약만 새 edge normalizer에 맞췄다. Generic chart geometry assertion이나 exact pixel 비교를 약화하지 않았다.

## 검증

로그 prefix: `.artifacts/roadmap6-authoring/phase5-size-edges-`. Normal/coverage/package/browser는 `*-verified.log`, 집중 통합은 `focused-complete.log`, 마지막 public option/primitive는 `options-final.log`다.

| 검사 | 결과 |
| --- | --- |
| 집중 size/content/edit/primitive 통합 | 25/25 PASS |
| 마지막 size options/four-edge primitive | 7/7 PASS |
| explicit shared offset 생성·편집과 content 통합 | 14/14 PASS |
| 기존 multi-legend lane + 새 primitive | 20/20 PASS |
| final normal | 2,869/2,869 PASS; fail/skip0 |
| final coverage | lines95.40%, branches92.18%, functions99.00%;81 critical floors PASS |
| 대표 Cars/Polar/weighted-rule PNG | 25/25 PASS |
| 실제 Cars | 392 rows, standalone4edges/combined2sides ×radius8/36 ×visible/hidden =24/24 PASS |
| 실제 데이터 replay | Filter/Canvas 순서, whole-content replacement, radii/label gaps/typography/title visibility PASS |
| 설치 package | Node, strict types, SVG/PNG/PDF, MCP, tutorials, Full/Basic/SVG budgets PASS |
| 동일 final artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | generate, preflight, build와 125 built pages PASS |

전체 coverage floor81개와 global threshold를 유지했다. Full responsive docs browser는 UI 변경이 없어 이번에 재실행하지 않았다. 초기 normal의 기존 default/legacy-error/primitive expectation 실패는 개별 원인과 새 좌표 계약을 확인한 뒤 수정했다.

[최종 package 원장](package-size-edges-results.json): `.artifacts/roadmap6-authoring/package-size-edges-verified/ggaction-0.0.12.tgz`, SHA-256 `d017f5767e7e245f8e9d862a79af9bfbccd1b7a7cb37f112b2a845ba396d3cf9`. Entries450, packed507219, unpacked2428490. Gzip Full252771/Basic138988/SVG6437. 이번에는 ceilings를 늘리지 않았다. 중복 categorical-size 좌표를 제거해 이전 checkpoint보다 Full/Basic bundle이 작아졌다. Private-option guard 전 `package-size-edges`와 explicit-offset 보존 전 `package-size-edges-final` artifact는 최종 증거가 아니다.

## 남은 범위

다음은 categorical+size의 top/bottom group layout과 그 lifecycle이다. Size가 단독으로 네 edge를 지원한다는 사실로 combined matrix를 완료한 것으로 처리하지 않는다. Categorical/continuous 전반의 alignment/collision 대칭성, compatible gradient↔interval transition, W3–W5, Phases6–11 및 실제0.0.13 릴리즈도 남아 있다.

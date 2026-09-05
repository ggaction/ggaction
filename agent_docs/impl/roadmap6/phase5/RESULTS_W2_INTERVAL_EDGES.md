# Phase 5 W2 C2 — Interval 네 방향과 공통 item layout

기준 `b17361a372e02007820f496d889ac81f28fd24c0`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [세부 계약](CONTRACT_W2_ITEM_EDGES.md)을 구현하고 [#94](https://github.com/ggaction/ggaction/issues/94)를 수정했다. C2 전체 family×edge 통합은 미완료다.

## 구현 범위

Interval legend는 Full/Basic createLegend에서 right/left/top/bottom과 layout:"edge"를 지원한다. Full editLegend/editLegendLayout 및 content 교체도 같은 layout을 사용한다. Horizontal edge는 align, direction, columns, titlePosition top/left를 지원한다. Side는 vertical single column, center alignment, top title이다. Columns1은 허용하며 position 전환 중 omitted direction은 새 edge에 맞춰 추론한다. 나머지 명시 controls는 보존하고 incompatible 요청은 오류다.

`src/layout/legendItems.js`는 scale이나 program state 없이 formatted labels와 sample dimensions를 받아 content를 측정하고 edge 좌표를 계산한다. Existing categorical grid 측정을 공유한다. Interval action은 scale/format/option/style 검증과 explicit wrapped materialization을 소유한다. `lane.js`는 interval의 실제 config.position을 읽고 interval border도 group bounds에 포함한다. New direct API는 없고 action inventory194개를 유지한다.

Right 기본 좌표는 유지했다: origin=plot.right+30, titleY=plot.y+20, itemY=plot.y+52+index*28. 큰 sample/font는 side pitch를 늘려 같은 block 내부 겹침을 피한다. Left는 visible content 폭을 측정하고 labels를 swatch 오른쪽에 둔다. Top/bottom은 항목 grid를 plot 폭에 정렬한다. Top title과 grid는 gap12, inline title과 grid는 gap20이다. Layout이 Canvas를 자동 확대하지 않는다.

## #94와 invalid side alignment

Gradient/interval/opacity는 titleVisible:false여도 title bounds를 occupied bounds와 border에 포함했다. 세 family 모두 long title을 숨긴 뒤 fitting Canvas로 줄일 때 margin error가 나는 것을 수정 전 직접 재현하고 이슈에 기록했다. 이제 보이지 않는 title은 측정에서 제외하며 horizontal inline opacity는 title width/gap도 제거한다. Bottom continuous content는 hidden title의 위쪽 공간을 더 이상 예약하지 않는다. Stored title은 보존하고 실제로 넘치는 제목 복원은 기존 program을 변경하지 않고 실패한다.

기존 interval의 side align left/right는 저장만 되고 좌표에는 아무 효과가 없었다. 새 item-side 계약은 이 무효 입력을 거부한다. 따라서 기존 transition style 회귀의 redundant align:left를 center로 migration했다. Source gradient가 align:left를 가진 채 interval로 전환되면 destination normalizer가 mutation 전에 명확한 오류를 내는 별도 회귀를 추가했다. 양 family의 모든 edge transition을 이 변경으로 완료한 것으로 주장하지 않는다.

## Primitive 목표

Public 구현 전 `.artifacts/roadmap6-authoring/interval-edge-targets.mjs`로 네 literal primitive를 작성·렌더링하고 top 이미지를 확인·표시했다. Target call은 `base.createLegend({channels:["color"],position:"top"})` 및 나머지 세 edge다. Stable 재현 source는 `test/contracts/interval-legend-edges.test.js`에 옮겼다.

Canvas1000×700, margins L/R240 T/B200, labels `< 5`/`≥ 5`다. Right swatch x790, label812, itemY252/280; left swatch165.32, label187.32; top swatches444.5/510.82, itemY164, title(500,139.5); bottom itemY561, title(500,536.5). 한 label의 binary floating representation을 literal532.8199999999999로 기록했으며 픽셀 목표는 바뀌지 않았다.

`.artifacts/test/png/charts/legend-layout/interval-legend-edges/{right,left,top,bottom}/`의 primitive/public graphicSpec, drawing order, Canvas calls, decoded pixels가 정확히 일치한다.

## 검증 결과

로그 prefix: `.artifacts/roadmap6-authoring/phase5-interval-edges-`.

| 검사 | 결과 |
| --- | --- |
| 초기 기존 family/content focused | 27/27 PASS |
| 새 unit/hidden/primitive | 8 tests, 모두 최종 normal에 포함; edge16 전환과 Full/Basic8 생성 포함 |
| transition 통합 focused | 26/26 PASS |
| final normal | 2,854/2,854; fail/skip0 |
| final coverage | lines95.39%, branches92.17%, functions98.97%;81 critical floors PASS |
| 기존 Cars/Polar PNG | 24/24 PASS |
| 실제 Cars | 392 rows, 3 scale kinds ×4 edges ×visible/hidden =24/24 PASS |
| 실제 데이터 검사 | filtered-data shape/cardinality/style/title, Canvas/filter 순서 수렴, content 재작성 수렴 |
| 설치 package | Node, strict types, PNG/PDF/SVG, MCP, tutorials, Full/Basic budgets PASS |
| 동일 final artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | final generate/preflight/build/125 built pages PASS |

Initial normal/coverage는 이전의 ignored side align:left를 보존하려는 transition test1개 때문에 실패했다. Contract와 destination preflight, positive/negative 회귀를 동기화한 뒤 final normal/coverage가 통과했다. Geometry assertion을 약화하지 않았다. 새 pure layout critical floor90/80/100을 추가했고 기존 floor는 낮추지 않았다. Full responsive docs browser는 UI 변경이 없어 이번에 재실행하지 않았다.

[최종 패키지 원장](package-interval-edges-results.json): `.artifacts/roadmap6-authoring/package-interval-edges-final/ggaction-0.0.12.tgz`, SHA-256 `aaf1c9cd4d730319ad58c5b34e6ebdf44841b08d6df44158114736f273d1eddd`. Entries450, packed506884, unpacked2425356. Gzip Full252584/Basic138964/SVG6437. 승인 범위에서 entries449→450, Full ceiling252000→253000으로 조정했다. Basic139000 및 packed/unpacked/SVG ceiling은 유지했다. Transition preflight 추가 전 d77e385a artifact는 최종 증거가 아니다.

## 남은 범위

Size/width/combined의 같은 item/edge owner 적용, 기존 categorical/continuous 배치와의 전체 collision 및 scale-family transition matrix, W3–W5, Phases6–11과 실제0.0.13 릴리즈는 남아 있다. 현재 single item-edge 결과와 기존 multi-block lane 확인을 전체 guide collision 대칭성 증명으로 대신하지 않는다. C2와 D08은 계속 미완료다.

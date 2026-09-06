# Phase 5 W2 C2 — Stroke-width 네 방향과 overflow 검증

기준 `b297514189c9bee5e58d828eafb5c2fee1a0699a`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [공통 item 계약](CONTRACT_W2_ITEM_EDGES.md)에 따라 Full의 stroke-width 범례를 확장하고 [#95](https://github.com/ggaction/ggaction/issues/95)를 수정했다. Size/combined를 포함한 C2 전체는 계속 미완료다.

## 구현과 계약

`createLegend`, `editLegend`, `editLegendLayout`은 strokeWidth content에 right/left/top/bottom, layout edge, offset/itemGap, horizontal align/direction/columns/titlePosition을 지원한다. 생성 시에도 title/labels/titleStyle/border를 받으며 기존 focused title/label/count 편집 경로를 유지한다. Side는 vertical, center, one column, top title이다. Edge 전환 중 omitted direction은 새 edge를 따르고 명시 columns/align/titlePosition은 보존·검증한다. Border는 resource registry에 등록하여 생성·편집·제거·재생성·lane replay가 같은 ID와 순서를 사용한다.

기존 scale의 linear/log/pow/sqrt/symlog mapping, count5, 선 길이32, label offset12, font/color defaults와 side pitch32를 유지한다. Right title/item 시작 위치를 공통 item layout의 plot.y+20/+52로 통일했다(이전 +28/+62). 큰 sample/label/title에는 title 아래 최소 gap12를 확보하고 side pitch와 grid row가 두꺼운 선을 수용한다. Scale/formatter는 family owner에 남고 edge/grid는 기존 pure item layout을 사용한다. Renderer나 새로운 direct action을 추가하지 않았다.

Basic에는 기존부터 strokeWidth encoding 및 width legend registrar가 없다. 최초 테스트의 Full/Basic 가정을 실제 등록 경계와 대조한 뒤 Full-only로 바로잡았다. Basic에 새 action을 추가하지 않으며 공통 item helper 변경에 대한 기존 interval 및 package 회귀는 유지한다.

## #95

이전 width materializer는 sample/label/title의 Canvas 범위를 검사하지 않아 잘린 그래픽을 성공으로 반환했다. 각 sample의 실제 stroke extent, visible text와 optional background를 검증하며 hidden title은 측정하지 않는다. 생성·편집·Canvas/scale replay의 공간 부족 요청은 원본 program과 trace를 보존한 채 실패한다. 큰 숨긴 title을 저장한 채 Canvas를 줄일 수 있으나 넘치는 제목 복원은 거부한다.

기존 distinct numeric label 테스트의 16자리 숫자는 right margin200을 넘었다. Formatter 검사를 유지하면서 margin260으로 수정하고 overflow 자체는 별도 immutable negative regression으로 검증했다. 작은 160×120 renderer/browser fixture 및 margin30 rule fixture도 유효한 공간으로 수정했다. 기존 weighted-rule primitive는 새 default title/sample 시작 좌표만 반영했고 graphics/Canvas calls/decoded pixels의 exact 비교를 유지했다.

## Primitive와 실행 증거

Public 구현 전에 `.artifacts/roadmap6-authoring/stroke-width-edge-targets.mjs`로 네 primitive를 렌더링하고 top 이미지를 확인했다. Stable source는 `test/contracts/stroke-width-legend-edges.test.js`다. Canvas1000×700, margins L/R240 T/B200, samples2/10, labels0/10, title m이다. Digit width의 font metric 계수0.61을 반영해 초기 수동 좌표 계산을 보정했다. 최종 right x790, y252/284; left x151.36; top x429.02/512.3399999999999, y164; bottom y561이다. Title은 side(각 x,220), top(500,139.5), bottom(500,536.5)이다.

`.artifacts/test/png/charts/legend-layout/stroke-width-legend-edges/{right,left,top,bottom}/`의 primitive/public graphicSpec, drawing order, Canvas calls 및 decoded pixel hash가 정확히 일치한다. Review artifact는 stable pair로 승격했다.

## 검증

최종 로그는 `.artifacts/roadmap6-authoring/phase5-width-edges-` 아래 `*-verified.log`가 기준이다. PNG는 `png.log`, 집중 검사 초기 통합은 `focused-final.log`, 마지막 geometry는 `final-geometry.log`다.

| 검사 | 결과 |
| --- | --- |
| 집중 통합 | 37/37 PASS |
| 최종 width/interval geometry | 14/14 PASS |
| 최종 normal | 2,862/2,862 PASS, fail/skip0 |
| 최종 coverage | lines95.40%, branches92.18%, functions99.00%; 81 critical floors PASS |
| 대표 Cars/Polar 및 weighted-rule PNG | 25/25 PASS |
| 실제 Cars | 392 rows, 5 scale kinds ×4 edges ×visible/hidden =40/40 PASS |
| 실제 데이터 replay | Filter/Canvas 순서, whole-content 재작성, endpoint widths, styles/hidden title PASS |
| 설치 package | Node, strict TypeScript, renderers, MCP, tutorials, Full/Basic/SVG budgets PASS |
| 동일 최종 artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | generate, preflight, build 및 125 built pages PASS |
| catalog/navigation/documentation truth | 21/21 PASS |

초기 normal의 default 좌표·작은 fixture·resource ID 기대값과 stale generated docs 실패를 각각 수정했다. 중간 coverage의 budget 문서 불일치도 SECOND_ARCHITECTURE의 canonical table에 동기화했다. 모든 geometry assertion은 유지했으며 threshold를 낮추거나 테스트를 제외하지 않았다. UI 변경이 없어서 전체 responsive docs browser는 재실행하지 않았다.

[패키지 원장](package-width-edges-results.json): `.artifacts/roadmap6-authoring/package-width-edges-verified/ggaction-0.0.12.tgz`, SHA-256 `03ace5b7d89862bd462030cb7c80a88e9390c9f52a9c892d97b1d3f0aaf7ab20`. Entries450, packed507622, unpacked2428299. Gzip Full252903/Basic139085/SVG6437. Shared item helper 확장으로 초기 Basic139059가 이전 ceiling139000을 넘었으므로 전체 승인 아래 ceiling140000으로 조정하고 README/architecture와 동기화했다. Full253000, SVG25000 및 package ceilings는 유지했다. 이전 `package-width-edges`, `-final`, `-complete` tarball은 최종 runtime 증거가 아니다.

## 남은 범위

다음은 size/combined의 공통 item-edge 적용이다. Categorical/gradient/opacity까지 포함한 전체 family×edge alignment, guide/title collision 대칭성, compatible scale-family transition matrix는 남아 있다. 이번 standalone width의 Canvas 범위 및 기존 multi-block lane 검증을 전체 collision 통합 증거로 대신하지 않는다. W3–W5, Phases6–11과 실제 0.0.13 릴리즈도 남아 있다.

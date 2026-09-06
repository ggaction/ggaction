# Phase 5 W2 A — Standalone size 범례 편집 복구

기준 commit `4d7e37d41713c5a9d6ed51959fcf0e01f2b75a01`, 결과는 이 문서를 추가한 commit이다. [W2 계약](CONTRACT_W2.md)의 A를 구현했다. [전체 승인](../APPROVAL.md)을 적용하며 B content 재작성과 C four-edge layout은 아직 남아 있다.

## 오류와 수정

[#85](https://github.com/ggaction/ggaction/issues/85): 단독 size legend 생성 후 `editLegend({count:3})`, `editLegendTitle({title:"Mass"})`, `editLegendLabels({fontWeight:700})`가 undefined continuous config를 읽으며 실패했다. Size dispatch가 없었고 materializer도 고정 typography와 항상 존재하는 title을 가정했다.

Size와 stroke-width의 공통 sampled content editor가 count, title mode, partial labels/titleStyle과 title graphic lifecycle을 검증·저장한다. Size는 같은 mapper의 equal-area radius와 기존 right geometry/defaults를 유지한다. Title custom/auto/false, focused text/count, generic label offset을 지원한다. Count2..10,000이며 unsupported layout/symbol/border/gradient/order는 명확한 원자적 오류다. Label offset default28은 sample center 기준이며 titleStyle offset은 지원하지 않는다.

Size materializer는 같은 target의 categorical config만 상속한다. 반대 방향에서도 left categorical layout은 같은 target의 size만 측정한다. 마지막 review에서 size title 변경이 다른 target의 색상 범례 x 좌표까지 바꾸는 것을 red test로 재현하고 이 두 번째 경로도 수정했다. 독립 색상 범례의 graphicSpec을 정확히 비교한다.

Basic은 기존 size legend 생성을 유지하지만 editor는 Full-only다. 잘못된 첫 test 초안의 Basic create rejection 기대를 그대로 남기지 않고 실제 runtime/declaration 경계를 확인해 수정했다. 새 public method나 type parameter는 없으며 기존 generic/focused 선언을 installed strict type test로 검사한다.

## 시각 및 수치

구현 전에 기존 create-count3 + low-level text edits로 primitive PNG를 만들고 표시했다. Target은 `sizeLegendProgram(5).editLegend({count:3,title:"Mass",labels:{color:"#123456",fontWeight:700},titleStyle:{color:"#654321"}})`다.

영구 회귀 증거는 `test/contracts/legend-lifecycle-render.test.js`의 size-content pair다. Independent baseline은 count3 생성 후 명시적 editGraphics chain이며 public branch는 count5에서 editor로 count3을 만든다. GraphicSpec, drawing order, mock renderer calls와 same-run decoded pixel hash가 정확히 같다. Stable artifact는 `.artifacts/test/png/charts/legend-layout/legend-lifecycle/size-content/`이고 review subtree는 정리했다.

명시 size range `[4π,36π]`와 values `[10,20,30]`의 radius는 `[2,√20,6]`이다. Sample y `[152,192,232]`, labels x534, title `(490,118)`의 literal geometry를 검증했다. Width740/offset32로 바꾸면 labels x638, domain `[0,40]`의 label은 `[0,20,40]`이며 style과 radius가 보존된다.

## 검증

로그 prefix `.artifacts/roadmap6-authoring/phase5-size-edit-`.

| 검사 | 실제 결과 |
| --- | --- |
| 새 lifecycle + 기존 size/strokeWidth + render 집중 | 17/17 |
| `npm test` | 2,806/2,806, 실패·skip 0 |
| Coverage | lines95.33%, branches92.01%, functions98.91%; 77 critical floors PASS |
| 기존 combined/multi-legend chart PNG | 11/11 |
| 실제 Cars 독립 sweep | Acceleration/Horsepower/Weight_in_lbs × count2/3/5 × title visible/hidden =18/18; resize/filter/style/title restore/remove-recreate |
| Node installed package | root/types/MCP/tutorial/renderers/bundle PASS |
| 같은 tarball Chromium | 1/1, edited radii/title·hidden SVG·auto restore |
| Docs | generate·preflight·build·125 static page PASS; desktop search/keyboard/Axe/no-JS와 전 page 320/390/768px PASS |

[package-size-edit-results.json](package-size-edit-results.json)의 SHA-256 `6066f782ee5e3eaccfa82a5e8dc638e0f0c13cd8c337baf5b258565d9740e9ce`가 Node와 Chromium의 동일 tarball이다. Entries447, packed 502,536, unpacked 2,406,784 bytes. Full/Basic/SVG gzip 249,699/137,576/6,437 bytes이며 기존 한도를 유지했다. 0.0.12 개발 artifact이며 0.0.13 release가 아니다.

## 남은 W2

[#86](https://github.com/ggaction/ggaction/issues/86)은 shape-only 재작성 시 unrelated line이 있으면 없는 color.field를 읽는 오류다. [#87](https://github.com/ggaction/ggaction/issues/87)은 label color만 편집해도 bottomGrid false→true와 y572→489가 되는 오류다. 각각 재현·이슈 기록했으며 아직 수정 완료로 표시하지 않는다. Combined channel 부분 제거/재작성, 명시적 legacy-bottom mode, sampled/interval/combined의 four-edge 공통 layout과 matrix 통합을 계속한다. W2 전체·D08·Phase5·후속 Phase·0.0.13 목표는 active다.

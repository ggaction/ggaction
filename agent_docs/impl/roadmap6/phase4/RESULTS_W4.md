# Phase 4 W4 — Theta와 범례 순서

[로드맵 전체 승인](../APPROVAL.md)에 따라 P4-C05를 구현·검증했다. W3 Rose/Radial, W5 midpoint와 Phase 4 전체 검증은 남아 있다.

## 결과와 책임

- `orderCategories`/`removeCategoryOrder`는 기존 x/y 외 categorical theta의 Arc/Polar Point/Line을 지원한다. Partial list·summary·stable tie·shared-scale 규칙은 같은 grammar owner를 사용한다.
- Weighted Pie는 category별 weight·각도 크기·sourceIndices와 색 배정을 유지한다. Theta 위치 순서는 path vertex·series·drawing order를 재지정하지 않는다.
- Categorical `createLegend`/`editLegend`의 `order`는 `"scale"`, `{ values }`, `{ channel: "x"|"y"|"theta" }`다. 정책은 semantic guide의 order 한 곳에 저장하고 config의 domain은 계산된 item 순서다.
- Explicit list의 누락 category는 source first appearance로 붙이고, source에 없는 explicit appearance-domain 항목도 마지막에 유지한다. 색·shape·dash는 기존 scale에서 category 값으로 조회한다.
- Link는 같은 target의 같은 categorical field와 category set을 요구한다. Position scale/order·Canvas 편집은 범례도 갱신한다. 인코딩 제거·불일치 field/domain 변경은 atomic 오류이며 먼저 `order:"scale"`로 reset한다.
- Combined legend의 appearance channel 제거 후 재생성도 policy를 보존한다. Continuous/interval/size/opacity/stroke-width의 order는 오류다.
- 추가 재현·수정: category order가 남은 theta를 새 id의 linear scale로 재할당하면 `[2,3,4]`라는 잘못된 numeric domain을 만들었다. 공통 scale consumer가 비범주 position의 잔여 order를 거부하도록 교정하고, reset 뒤 `[2,4]` 정상 domain을 검사한다.
- 설계 문서 교정: `encodeRadius`는 `encodeR` alias가 아니라 point glyph 크기다. 새 radial mapping은 `encodeR`에만 추가한다.

## 재현과 검증

[실행 예제](../../../../examples/theta-legend-order/program.js)는 C/A/B weighted sectors와 linked legend, 동일 sector의 B/A/C 독립 legend 두 결과를 만든다.
[Primitive·manifest·tests](../../../../test/charts/theta-legend-order/)는 명시적 semantic leaf와 materialization chain을 사용한다.
Literal angles `0→160→240→360`, per-category colors, 원본 rows, graphics와 Canvas 명령을 독립적으로 확인한다.

| 검사 | 결과 |
| --- | --- |
| `npm test` 최종 실행 | 2,661/2,661; fail/skip/cancel 0 |
| Public/primitive semantic·graphic·Canvas | 2 variants, normal suite 포함 |
| `node --test test/charts/theta-legend-order/png.render.js test/charts/theta-legend-order/vector.render.js` | 4/4; decoded PNG equality, SVG/PDF parity |
| `npm run test:browser` | 60/60. 이후 first-appearance edge 정리 뒤 새 theta 예제의 browser test도 1/1 재검증 |
| Strict positive/negative declaration test | normal suite 포함. Installed consumer도 같은 옵션·배타 union 실행 |
| Docs/catalog/card/reference/search/LLM generation | 생성 후 normal freshness 검사 통과 |
| Installed tarball | [기계 결과](package-order-results.json). Node runtime/renderers, 새 theta/legend 호출, MCP, strict types, tutorials, browser bundle 모두 통과 |

Artifact SHA-256: `55d3c354c7a97542ad37f500ae06b85b0f4bfba53d5752292a333d59f5f262c8`.
Full/Basic/SVG gzip은 241,200 / 129,138 / 6,418 bytes이며 기존 242,000 / 130,000 / 25,000 상한 안이다.
상한 추가 변경 없음. Package entries 439, packed 488,061 bytes.

로그는 `.artifacts/roadmap6-authoring/theta-legend-*.log`에 있다. 원본 normal 실패 기록(예제 registry/hierarchy inventory 및 search freshness 누락)은 보존했고 해당 누락을 수정한 최종 전체 실행은 모두 통과했다.
PNG는 `.artifacts/test/png/charts/category-order/theta-legend-order/`에 있다. Linked PNG를 직접 열어 C/A/B와 원래 hue 대응을 확인했다.
Coverage·realistic 전체·모든 render·built docs는 이 변경에서 재실행했다고 주장하지 않는다. Phase 전체 통합 검증에서 확인한다.

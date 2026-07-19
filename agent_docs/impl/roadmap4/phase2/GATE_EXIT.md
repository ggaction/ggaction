# P2-Exit — Basic Chart facade closeout

## 진행 상태

- [x] 다섯 facade runtime과 strict TypeScript declaration
- [x] Current inventory와 generated action catalog
- [x] canonical examples와 approved primitive exact parity
- [x] facade-specific semantic compiler/materializer/renderer branch 부재
- [x] Browser Canvas와 2x Node PNG
- [x] full tests, coverage와 critical floors
- [x] package artifact와 installed-package consumer
- [x] README, public docs, generated references와 canonical examples 동기화
- [x] docs build와 link/signature/capability 검증
- [x] 사용자 승인

Gate 상태: `approved`

## 확정 public surface

```typescript
createScatterPlot(options: CreateScatterPlotOptions): ChartProgram;
createLinePlot(options: CreateLinePlotOptions): ChartProgram;
createBarPlot(options: CreateBarPlotOptions): ChartProgram;
createHistogram(options: CreateHistogramOptions): ChartProgram;
createHeatmap(options: CreateHeatmapOptions): ChartProgram;
```

각 facade의 최소 의미와 실제 wrapped hierarchy는 다음과 같다.

| Facade | 최소 의미 | Stable ID | Wrapped children |
| --- | --- | --- | --- |
| `createScatterPlot` | `x`, `y` | `scatterPlot` | point → x → y → optional color/size/shape → guides |
| `createLinePlot` | `x`, `y` | `linePlot` | line → x → y → optional color/group/dash → guides |
| `createBarPlot` | `x`, `y` | `barPlot` | bar → x → y → optional color/width → guides |
| `createHistogram` | `field` | `histogram` | bar → atomic histogram → optional color → guides |
| `createHeatmap` | `x`, `y`, `color` | `heatmap` | rect → x → y → color → guides |

Canvas와 data는 선행 state가 소유한다. Data는 explicit → current → unique 순으로만 해석하고 ambiguity에서
첫 후보를 고르지 않는다. Omitted ID는 stable role이 비어 있을 때만 사용한다. `guides: false`는 guide branch를
만들지 않는다. 생성 후 편집은 기존 encoding, mark, scale와 guide action이 담당하며 aggregate edit facade는 없다.

## Canonical programs와 구조

- `examples/cars-scatterplot/program.js`
- `examples/cars-line-chart/program.js`
- `examples/jobs-grouped-bar/program.js`
- `examples/cars-histogram/program.js`
- `examples/gapminder-life-expectancy-heatmap/program.js`
- Primitive/public parity: 각 대응 `test/charts/*/public.test.js`
- 2x PNG: 각 대응 `test/charts/*/png.render.js`
- Phase closeout audit: `test/contracts/roadmap4-phase2-closeout.test.js`

승인된 임시 `test/gates/basic-*` slices는 제거했다. 기존 public chart registry가 소유하는 canonical examples를
facade 기반으로 갱신하고, tutorial과 gallery call chain이 같은 프로그램을 가리키게 한다.

## 누적 검증 증거

- Full suite: 1595/1595 통과
- Contract suite: 152/152 통과
- Coverage: 94.93% lines, 90.35% branches, 98.59% functions; critical floors 55/55
- Render suite: 113/113 통과; Roadmap 2/3 gallery 검증 통과
- Docs source: 27/27 통과; Jekyll built pages 85개 link/asset 검증과 desktop/mobile Chromium smoke 통과
- Package artifact: 327 entries, 283,495 packed bytes, 1,318,174 unpacked bytes
- Installed tarball SHA-256: `29d00cc8752075a9a0e2f41f863204f7528b9a6066b4b5fb5320284a40a18602`
- Installed tarball: Node, extension, PNG, TypeScript, tutorial consumer와 private-export rejection 통과
- Generated action catalog check와 `git diff --check`: 통과

## 호환성과 문서 상태

- 다섯 API와 option types는 additive다. 기존 action signature와 stored semantic/graphic schema를 바꾸지 않는다.
- Renderer와 materializer는 facade 이름을 알지 못하고 fully materialized `graphicSpec`만 소비한다.
- README와 Getting Started는 Basic Chart API를 기본 경로로 연결한다. API, recipes, tutorials, supported-features,
  exact action reference와 generated LLM docs는 shortest call, inference/error, guide opt-out, heatmap text non-goal과
  resource-specific edit escape hatch를 현재 구현과 함께 설명한다. GitHub Pages 배포는 수행하지 않는다.

## 승인 결과

2026-07-20 사용자 승인으로 Phase 2를 `completed`로 전환하고 Phase 3 진입 조건을 열었다.
Phase 3 구현은 별도 시작 요청 전까지 진행하지 않는다.

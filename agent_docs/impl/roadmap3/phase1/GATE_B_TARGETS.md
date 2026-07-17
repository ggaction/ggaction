# Gate B Target Contracts

## 진행 상태

- [x] Mark/scale symmetry targets rendered
- [x] Focused guide targets rendered
- [x] Composite edit targets rendered
- [x] Domain removal targets rendered
- [x] User visual approval

Gate B는 아래 public call-chain suffix의 final state를 승인한다. Complete executable call chains는
`test/gates/roadmap3-focused-editing/manifest.js`가 canonical하게 소유한다.

## Target families

```text
mark-and-scale-ergonomics
  createPointMark appearance + editScale palette
  createBarMark appearance
  createLineMark/editLineMark constant appearance

focused-component-editing
  editLegendLayout / Labels / Title / Symbols / Border
  editXAxis / editYAxis / editGrid
  editErrorBar / editErrorBand / editErrorBandBoundary
  editRegression / editBoxPlot

domain-removal
  removeXAxis / removeYAxis / removeGrid / removeLegend / removeTitle
  removeMark
```

## Approved Gate A policy carried forward

- Focused legend actions use stable option subsets and an owning mark target.
- Composite appearance/statistics patch is atomic.
- Error-band boundary default is both, with lower/upper selection available.
- `removeGrid()` removes all existing directions; explicit false/false is invalid.
- Removal missing/ambiguity is an error and complete cleanup permits recreate.
- `removeMark` removes owned state but preserves user source data and independently shared resources.

## Executable evidence

- 11 primitive-only variants: `test/gates/roadmap3-focused-editing/manifest.js`
- Semantic/graphic and trace assertions: `test/gates/roadmap3-focused-editing/primitive.test.js`
- High-DPI PNG registry: `test/gates/roadmap3-focused-editing/png.render.js`
- Planned/public boundary lock: `test/contracts/roadmap3-phase1-gate-b.test.js`
- Gallery: `.artifacts/test/png/roadmap3/index.html`

`removeMark` target은 complete resource removal을 요구한다. Current primitive evidence에는 empty semantic layer
shell이 남는 한계를 의도적으로 assertion하며, 승인 뒤 resource-level semantic removal primitive를 먼저 추가한
후 public action parity를 검증한다.

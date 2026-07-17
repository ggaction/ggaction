# Gate B Target Contracts

## 진행 상태

- [ ] Mark/scale symmetry targets rendered
- [ ] Focused guide targets rendered
- [ ] Composite edit targets rendered
- [ ] Domain removal targets rendered
- [ ] User visual approval

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

# Roadmap 3 Planned Advanced Facet contracts

Phase 7 direct-source facet은 Current로 승격되었다. 이 문서는 Phase 8의 확장 계약만 소유한다.

## Facet resolution and derived replay

```javascript
.facet({
  field: "Origin",
  scales: { x: "shared", y: "independent", color: "shared" }
});
```

- Shared auto domains resolve from the full facet source; independent auto domains resolve from cell-filtered data.
  Explicit domains take precedence.
- Omitted scale channels remain shared. Phase 8 accepts channel policies for `x`, `y`, `xOffset`, `color`, `size`,
  `shape`, `opacity` and `strokeDash`; Polar channel integration remains Phase 10 scope.
- Regression, density, interval/error band and box dependencies replay their registered immutable transform DAG per
  cell.
- Density preserves requested auto bandwidth/extent separately from each revision's resolved values so cell replay
  can recompute statistical defaults rather than copying the base result.
- `guides.axes: "outer"` keeps x axes on each column's bottommost occupied cell and y axes on each row's leftmost
  occupied cell.
- Remaining parent guide composition covers outer-only axes and categorical, gradient, discretized color, size and
  opacity shared legends without merging child semantics. Guide sharing remains independent from scale resolution and
  requires concretely compatible represented scales.
- Phase 8 has two hard pauses: Gate I-A for scale/derived behavior and Gate I-B for guide composition.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 8.

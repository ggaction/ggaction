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
- Regression, density, interval/error band and box dependencies replay their registered immutable transform DAG per
  cell.
- Remaining parent guide composition covers outer-only axes and non-categorical legend families without merging
  child semantics. The Phase 7 shared categorical legend remains independent from scale resolution.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 8.

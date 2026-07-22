# Gate R41-P6-A — Statistical Owner Revisions

## Gate state

`planned`

## Review target

Phase 6의 error bar/band statistical revision, error-band boundary lifecycle, density source/field/group revision과
regression data/x/y/group revision vertical slice 전체다.

## Exact public calls

```javascript
program.editErrorBar({
  statistics: { center: "median", extent: "iqr" }
});

program.editErrorBand({
  statistics: { extent: "ci", level: 0.9 },
  boundaries: false
});
program.editErrorBand({
  boundaries: { stroke: "#334155", strokeWidth: 1.5 }
});

program.editDensity({ source: "observations", field: "value", groupBy: false });
program.editRegression({ data: "observations", x: "time", y: "value", groupBy: false });
```

Omitted option은 current owner provenance/component state를 보존한다. Exact accepted statistical combinations, target
resolution, no-op semantics, trace decomposition과 resulting component state는 implementation mapping과 executable evidence로
이 Gate를 `ready-for-review`로 전환할 때 고정한다.

## Required evidence

- Statistical-owner-only interval dispatch and complete interval candidate validation
- Boundary false/object removal, retained body/data and ordinary recreation
- Density/regression source, role and grouping revisions with preserved stable identities
- Immutable derived revision, exact rebind/rematerialization/release trace
- Scale/guide/selection/highlight replay and downstream failure atomicity
- Previous program, caller input, source rows and unrelated resource preservation
- Existing valid call compatibility and focused/cumulative/Browser/PNG/package evidence

## Approval effect

Approval은 Phase 6 statistical/data owner revision과 boundary lifecycle 결과를 고정하고 Phase 7 box/gradient data and
positional-role revisions를 허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 7 box/gradient data and positional-role revisions.

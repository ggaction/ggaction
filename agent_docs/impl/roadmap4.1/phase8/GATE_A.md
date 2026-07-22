# Gate R41-P8-A — Facet Policy Editing

## Gate state

`planned`

## Review target

Phase 8의 facet columns layout edit, scale/guide policy partial edit, retained-unit child rederivation과 atomic parent
snapshot replacement vertical slice 전체다.

## Exact public calls

```javascript
faceted.editCompositionLayout({ columns: 2 });
faceted.editFacetScales({ x: "independent", color: "shared" });
faceted.editFacetGuides({ axes: "outer", legend: "shared" });
```

Omitted layout, scale와 guide option은 current composition intent를 보존한다. `columns`는 facet-only이며 concat에서
거부한다. Exact equivalent-call behavior, child replay trace, resulting state와 compatibility는 implementation evidence로
이 Gate를 `ready-for-review`로 전환할 때 고정한다.

## Required evidence

- Facet-only dispatch and complete layout/policy preflight
- Stable field/data/value/child identity and retained header/title/layout intent
- Shared/independent scale child rederivation and derived-data replay
- Each/outer axis ownership and compatible shared-legend promotion
- Selection/highlight replay and immutable previous parent/children/caller inputs
- Downstream failure atomicity and unrelated state preservation
- Existing concat/facet compatibility and focused/cumulative/Browser/PNG/package evidence

## Approval effect

Approval은 Phase 8 facet policy editing 결과를 고정하고 Phase 9 cross-capability regression, inventory/docs/package
closeout을 허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 9 cross-capability regression, inventory/docs/package closeout.

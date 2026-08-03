# Gate R51-P2-A — All-Edge Legend Layout and Lifecycle

## Gate state

`planned`

## Approval target

- Top and bottom same-edge blocks stack away from the plot with at least 24 logical pixels between occupied bounds
- Existing block-local left/center/right alignment, direction, grid and title placement remain intact
- Layer declaration and family order determine placement independently of authoring call order
- Create/edit/remove, scale and Canvas replay converge without stale sibling geometry
- Insufficient margin or Canvas space fails atomically without resizing, relocation or hidden content
- Actual-data Canvas/SVG/PNG/PDF outputs consume the same final concrete coordinates

## Approval effect

Approval permits Phase 3 integration and Roadmap closeout. It does not authorize PR creation, merge, release,
publish or documentation deployment.

## Remote checkpoint

The complete verified Phase 2 package must be committed and pushed before this Gate becomes `ready-for-review`.

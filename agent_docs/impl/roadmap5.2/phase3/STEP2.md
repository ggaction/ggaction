# STEP 2 — Add the Missing Direct Boundaries

## Added executable cases

- Deeply nested source rows and unusual scalar cells remain owned and frozen.
- Area fill validation and exact opacity 0/1 endpoints execute at the direct action boundary.
- Empty x-axis-line edit explicitly re-infers geometry.
- Y ticks survive repeated count/value mode replacement.
- Y labels survive auto/percent/fixed-decimal/auto transitions and font-weight boundaries.
- Complete y tick-and-label nested appearance forwards through one aggregate call.
- Explicit y-title rotation survives repeated data-space location changes.

Existing density/regression/filter/primitive/legend/resize tests already covered many stale partial statements. Those are
linked as current evidence rather than copied into redundant tests.

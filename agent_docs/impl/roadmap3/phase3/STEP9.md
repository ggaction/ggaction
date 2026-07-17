# STEP 9 — Aggregate Dispatch, Focused Edits and Rematerialization

## 진행 상태

- [x] Polar dispatch in `createAxes` and `createGuides`
- [x] Focused axis component edits
- [x] Aggregate `editThetaAxis` / `editRadialAxis` facades
- [x] Canvas, scale and encoding revision convergence
- [x] Removal and unsupported-coordinate errors

Aggregate edit facade는 trace hierarchy를 보존한다. Radial-axis angle 변경은 line, ticks, labels와 title을 함께
움직이므로 이 facade가 변경을 소유한다.

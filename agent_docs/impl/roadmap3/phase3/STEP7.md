# STEP 7 — Polar Grid Actions

## 진행 상태

- [x] `createThetaGrid` / `editThetaGrid`
- [x] `createRadialGrid` / `editRadialGrid`
- [x] Polar dispatch in `createGrid` / `editGrid`
- [x] Explicit drawing order before marks
- [x] Canvas and scale rematerialization

Grid action은 기존 grid option vocabulary인 scale, coordinate, count/values, color, lineWidth와 strokeDash를
재사용한다. Theta grid는 spoke를, radial grid는 concentric command path를 그린다.

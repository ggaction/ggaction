# STEP 1 — Tick Geometry and Point/Tick Angle

## 진행 상태

- [x] Existing point-shape, Cartesian position과 mark lifecycle boundary 확인 시작
- [x] Independent cardinal/intercardinal geometry fixtures 작성
- [x] Primitive direction comparison과 actual-data rug distribution 작성
- [x] 두 visual target의 four-renderer review artifacts 작성
- [x] R5-P4-V approval — 2026-08-02
- [x] Tick create/edit/materialization and generic removal integration
- [x] Angle assignment/removal and point/Tick rematerialization
- [ ] Strict declarations, Current contracts, docs, example와 package synchronization
- [ ] Stable visual graduation and four-renderer equivalence
- [ ] Focused/cumulative verification and remote Gate checkpoint

## Approved contract

```javascript
const ticks = chart()
  .createData({ id: "directions", values })
  .createTickMark({
    id: "ticks",
    length: 14,
    stroke: "#111827",
    strokeWidth: 2
  })
  .encodeX({ target: "ticks", field: "x" })
  .encodeY({ target: "ticks", field: "y" })
  .encodeAngle({ target: "ticks", field: "direction" });

const reset = ticks.removeEncoding({
  target: "ticks",
  channel: "angle"
});
```

- Tick은 complete Cartesian x/y anchor를 가진 centered line glyph다.
- `length`는 positive finite logical pixel, `strokeWidth`는 non-negative finite이고 appearance는 constant다.
- Angle은 point/Tick에만 허용하며 finite constant 또는 quantitative field degree를 scale 없이 직접 사용한다.
- 0°는 위쪽, 양수는 시계 방향이며 constant/field reassignment은 complete assignment를 교체한다.
- Removal은 angle assignment를 삭제하고 unrotated baseline geometry를 rematerialize한다.
- Tick endpoints와 rotated point path commands는 renderer-neutral concrete `graphicSpec`에 저장한다.

## Required evidence

- 0/45/90/135/180/225/270/315° literal endpoints and triangle commands
- Center, Tick length와 point area invariance, negative/greater-than-360 finite degrees의 periodic geometry
- Incomplete x/y retention, completion order independence, explicit/unique inference와 ambiguity errors
- Tick appearance edit, angle preservation, generic removal and earlier-program immutability
- Constant/field reassignment, removal, invalid/missing/non-finite field와 unsupported mark atomic errors
- Filter, facet, Canvas/scale/position rematerialization, selection/highlight compatibility
- Canvas/SVG/PNG/PDF exact primitive/public parity, strict types, contracts, docs and installed package

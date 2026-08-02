# Gate R5-P4-V — Directional Tick and Point Primitive

## Gate state

`planned`

## Review target

Phase 4 public implementation 전에 고정하는 unrotated Tick, field-rotated Tick과 field-rotated triangle point의
three-panel primitive visual target이다. Eight compass directions share identical x/y anchors across panels.

## Exact target public call chains

아래 세 program을 `hconcat({ gap: 20, padding: 6, align: "start" })`로 나란히 놓는 것이 승인 대상이다.

```javascript
const baseline = chart()
  .createData({ id: "directions", values })
  .createTickMark({
    id: "ticks",
    length: 26,
    stroke: "#64748b",
    strokeWidth: 4
  })
  .encodeX({ target: "ticks", field: "x", fieldType: "quantitative" })
  .encodeY({ target: "ticks", field: "y", fieldType: "quantitative" });

const directionalTicks = chart()
  .createData({ id: "directions", values })
  .createTickMark({
    id: "ticks",
    length: 26,
    stroke: "#2563eb",
    strokeWidth: 4
  })
  .encodeX({ target: "ticks", field: "x", fieldType: "quantitative" })
  .encodeY({ target: "ticks", field: "y", fieldType: "quantitative" })
  .encodeAngle({ target: "ticks", field: "direction" });

const directionalPoints = chart()
  .createData({ id: "directions", values })
  .createPointMark({
    id: "points",
    shape: "triangle-up",
    fill: "#f97316",
    stroke: "#ffffff",
    strokeWidth: 1
  })
  .encodeX({ target: "points", field: "x", fieldType: "quantitative" })
  .encodeY({ target: "points", field: "y", fieldType: "quantitative" })
  .encodeAngle({ target: "points", field: "direction" });
```

현재 executable source는
[`test/gates/directional-tick-plot/primitive.program.js`](../../../../test/gates/directional-tick-plot/primitive.program.js)이고,
아직 `createTickMark` 또는 `encodeAngle`을 호출하지 않는 concrete primitive baseline이다.

## Semantic and visual result

- Direction은 degree를 scale 없이 직접 해석한다. `0°`는 위쪽이고 양수는 시계 방향이다.
- 모든 glyph는 같은 x/y anchor에 중심을 두며 Tick length `26`과 triangle area를 회전 전후 보존한다.
- 첫 panel은 모든 Tick을 `0°` vertical baseline으로, 둘째 panel은 같은 direction field로 회전한 Tick으로,
  셋째 panel은 같은 field로 회전한 `triangle-up` point로 표시한다.
- Centered line Tick은 축 방향만 보이므로 `0°/180°`, `90°/270°`가 각각 같은 선 모양이다. Triangle panel이
  반대 heading을 구별하며 direct-degree convention을 확인한다.
- 전체 logical extent는 `1072 × 372`, PNG review pixel extent는 `2144 × 744`다.

## Evidence

- Independent oracle: `test/oracles/directional-glyph.js`
- Literal fixtures와 invariants: `test/gates/directional-tick-plot/reference-values.test.js`
- Primitive ownership: `test/gates/directional-tick-plot/primitive.test.js`
- Review manifest와 PNG: `test/gates/directional-tick-plot/manifest.js`,
  `.artifacts/test/png/review/directional-tick-plot/baseline-tick-point-directions/`
- Canvas/SVG/PNG/PDF artifacts:
  `.artifacts/test/renderers/review/directional-tick-plot/baseline-tick-point-directions/`
- PNG SHA-256: `0b148cf673eb87a66a14a4eeefe0814ebc3dca5d34fc51d761336608e512ce05`
- Focused normal verification: 20 tests passed
- Focused four-renderer verification: 2 tests passed
- Cumulative normal verification: 1,978 tests passed

## Compatibility and documentation impact

이 Gate package는 test-only primitive와 active review artifact만 추가한다. Runtime, declarations, package exports,
Current contracts와 public docs 동작은 바꾸지 않는다. 승인 뒤 public implementation에서 해당 surface를 함께
동기화한다.

## Remote checkpoint

첫 verified checkpoint commit/push 뒤 기록한다.

## Approval effect

승인하면 이 concrete geometry를 보존하면서 Tick lifecycle와 point/Tick `encodeAngle` public flow 구현을 시작한다.

## Work blocked before approval

- `createTickMark`, `editTickMark`와 Tick materialization
- Point/Tick `encodeAngle` and `removeEncoding({ channel: "angle" })`
- Strict declarations, Current contract와 stable public example promotion

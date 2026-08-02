# Gate R5-P4-V — Directional Tick and Point Primitive

## Gate state

`ready-for-review`

## Review target

Phase 4 public implementation 전에 두 visual target을 고정한다. 첫 target은 unrotated Tick, field-rotated Tick과
field-rotated triangle point의 three-panel comparison이며, 둘째 target은 actual Cars horsepower 400개를 각각
하나의 centered Tick으로 표시하는 one-dimensional rug plot이다.

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

Cars rug target은 x-only inference를 추가하지 않는다. 각 row의 `Baseline: 0`을 explicit y field로 사용한다.

```javascript
const rows = cars
  .filter(car => Number.isFinite(car.Horsepower))
  .map(car => ({ ...car, Baseline: 0 }));

const rug = chart()
  .createCanvas({
    width: 800,
    height: 240,
    margin: { top: 70, right: 40, bottom: 70, left: 60 }
  })
  .createData({ id: "cars", values: rows })
  .createTickMark({
    id: "ticks",
    length: 28,
    stroke: "#2563eb",
    strokeWidth: 1.4,
    opacity: 0.28
  })
  .encodeX({
    target: "ticks",
    field: "Horsepower",
    fieldType: "quantitative",
    scale: { domain: [40, 240] }
  })
  .encodeY({
    target: "ticks",
    field: "Baseline",
    fieldType: "quantitative",
    scale: { domain: [-1, 1] }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: false
    },
    grid: false,
    legend: false
  });
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
- Rug plot은 repo의 actual Cars fixture 중 finite Horsepower 400개를 보존한다. 모든 Tick의 y center는 같은
  `Baseline`이며 opacity overlap이 repeated/nearby horsepower의 밀도를 드러낸다.
- Rug logical extent는 `800 × 240`, PNG review pixel extent는 `1600 × 480`이다.

## Evidence

- Independent oracle: `test/oracles/directional-glyph.js`
- Literal fixtures와 invariants: `test/gates/directional-tick-plot/reference-values.test.js`
- Primitive ownership: `test/gates/directional-tick-plot/primitive.test.js`
- Review manifest와 PNG: `test/gates/directional-tick-plot/manifest.js`,
  `.artifacts/test/png/review/directional-tick-plot/`
- Canvas/SVG/PNG/PDF artifacts: `.artifacts/test/renderers/review/directional-tick-plot/`
- Compass PNG SHA-256: `0b148cf673eb87a66a14a4eeefe0814ebc3dca5d34fc51d761336608e512ce05`
- Rug PNG SHA-256: `b91ddbc793b13c0e093fee36ac4c76e2ad00a6d56ae7c4d484bdd1f8f4641a0f`
- Focused normal verification: 22 tests passed
- Focused four-renderer verification: 3 tests passed
- Cumulative normal verification: 1,980 tests passed

## Compatibility and documentation impact

이 Gate package는 test-only primitive와 active review artifact만 추가한다. Runtime, declarations, package exports,
Current contracts와 public docs 동작은 바꾸지 않는다. 승인 뒤 public implementation에서 해당 surface를 함께
동기화한다.

## Remote checkpoint

이전 checkpoint `8a044b6c`는 2026-08-02 rug plot 추가 요청으로 supersede되었다. Revised checkpoint
`b2fe55a7` (`test: add actual-data Tick rug target`)을
`codex/roadmap5-temporal-ordering-directional-marks`에 push 완료했다.

## Approval effect

승인하면 이 concrete geometry를 보존하면서 Tick lifecycle와 point/Tick `encodeAngle` public flow 구현을 시작한다.

## Work blocked before approval

- `createTickMark`, `editTickMark`와 Tick materialization
- Point/Tick `encodeAngle` and `removeEncoding({ channel: "angle" })`
- Strict declarations, Current contract와 stable public example promotion

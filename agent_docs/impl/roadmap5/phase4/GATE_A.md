# Gate R5-P4-A — Tick Lifecycle and Direction Encoding

## Gate state

`approved` — 2026-08-03 explicit user approval

검증 대상 remote checkpoint: `4ca306f0` on
`codex/roadmap5-temporal-ordering-directional-marks`.

Gate review package checkpoint: `b9a0bbdc`.

## Review target

Approved Tick/point geometry를 public action lifecycle, semantic angle assignment, rematerialization, renderer,
types, Current contracts, docs, examples와 installed package에 연결한 complete Phase 4 vertical slice다.

```javascript
const ticks = chart()
  .createData({ id: "directions", values })
  .createTickMark({ id: "ticks" })
  .encodeX({ target: "ticks", field: "x" })
  .encodeY({ target: "ticks", field: "y" })
  .encodeAngle({ target: "ticks", field: "direction" });

const reset = ticks.removeEncoding({
  target: "ticks",
  channel: "angle"
});
```

## Completed contract

- 첫 unnamed Tick ID는 `"tick"`이다. Defaults는 length `14`, theme mark stroke `"#4c78a8"`,
  strokeWidth `2`, opacity `1`이다.
- Tick은 complete Cartesian x/y scale pair가 있을 때 source row마다 centered concrete line을 만든다.
  x 또는 y가 불완전하면 semantic assignment와 scale을 보존하고 graphic collection은 비운다.
- `editTickMark`는 length와 constant appearance를 부분 수정하고 identity, data, x/y와 angle을 보존한다.
  Generic `removeMark`가 semantic layer, graphic object와 owned config를 함께 제거한다.
- `encodeAngle`은 point와 Tick에만 finite constant degree 또는 quantitative finite field degree를 직접
  배정한다. Scale, legend, radians와 domain normalization은 없다.
- `0°`는 위쪽이고 양수는 시계 방향이다. Reassignment은 complete datum/field branch를 교체하고
  `removeEncoding({ channel: "angle" })`은 unrotated baseline을 rematerialize한다.
- Tick은 center와 length를 보존한 endpoints를, non-circular point는 center와 area를 보존한 path commands를
  `graphicSpec`에 저장한다. Renderer는 angle semantic을 읽지 않는다.
- Filter, facet, Canvas/scale/position replay, stored selection/highlight와 selected-last drawing order를 지원한다.
  Tick highlight 재정렬 뒤에도 row fields, channels와 concrete line properties가 같은 final item을 가리킨다.

## Synchronized surface

- Runtime: `createTickMark`, `editTickMark`, `encodeAngle`, angle removal과 Tick materialization/selection policy
- Strict declarations: `types/program.d.ts`
- Current contracts and inventory: `agent_docs/contract/current/MARKS.md`, `ENCODINGS.md`,
  `MARK_SELECTION.md`, `ACTION_INDEX.json`, generated catalog
- Public docs: mark/encoding/appearance API, generated action reference, types, LLM bundle와 search index
- Package: runtime exports/declarations and installed Node/TypeScript/Canvas/SVG/PNG/PDF consumers
- Stable example: `examples/directional-tick-plot/program.js`
- Stable evidence: `test/charts/directional-tick-plot/`

## Visual and renderer evidence

- Direction comparison PNG:
  `.artifacts/test/png/charts/marks/directional-tick-plot/baseline-tick-point-directions/user-facing.png`
- Direction comparison Canvas/SVG/PNG/PDF pair:
  `.artifacts/test/renderers/charts/marks/directional-tick-plot/baseline-tick-point-directions/`
- Actual Cars horsepower rug Canvas/SVG/PNG/PDF pair:
  `.artifacts/test/renderers/charts/marks/directional-tick-plot/cars-horsepower-rug/`
- Public/primitive `graphicSpec`, Canvas calls, SVG strings, PNG bytes와 PDF bytes가 exact 일치한다.
- Stable approved charts gallery는 127 variants, active review gallery는 0 variants다.

## Verification

- Focused Tick/Angle/position/selection tests: 10 passed
- Focused stable chart, renderer와 vertical-slice tests: 12 passed
- Cumulative normal suite: 2,001 passed, 0 failed
- Render suite: 131 passed, 0 failed; 두 generated gallery의 browser verification 통과
- Coverage: lines `94.71%`, branches `90.08%`, functions `98.45%`; 71 critical floors passed
- Package artifact: 410 entries, 377,866 packed bytes, 1,786,631 unpacked bytes
- Installed package consumer: Node, extension, TypeScript, Canvas, SVG, PNG와 PDF checks 통과
- Browser gzip: full `216,824` / limit `218,000`, basic `121,591` / limit `122,000`,
  SVG `5,760` / limit `25,000`
- Whitespace and generated examples index checks 통과

## Compatibility and limits

- Existing point angle omission은 기존 geometry를 유지하고 circle angle은 valid visual no-op이다.
- Tick은 ordinary x/y position field types를 지원하지만 aggregate, bin과 stack은 거부한다.
- x-only plot-edge rug inference, angle scale/legend, radians, arbitrary transforms와 다른 mark rotation은
  Phase 4 non-goal로 유지한다.
- Public API removal이나 persisted schema migration은 없다.

## Approval effect

승인하면 Phase 4를 완료로 기록하고 Phase 5 center-stacked area primitive visual Gate를 시작할 수 있다.
PR creation, publish, documentation deployment와 release 권한은 포함하지 않는다.

## Work blocked before approval

- Phase 5 center-stack primitive and renderer evidence
- `encodeY({ stack: "center" })` and `encodeColor({ layout: "center" })`
- Phase 6 integration and Roadmap closeout

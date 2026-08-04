# Gate R5-P5-V — Center-stacked Area Primitive

## Gate state

`approved`

사용자 explicit approval: 2026-08-03.

## Review target

Phase 5 public implementation 전에 actual Jobs data로 만든 zero-stack과 center-stack area의 concrete two-panel
comparison을 고정한다. 두 panel은 동일한 series order, values, fills와 x positions를 사용하고 stack baseline만
다르다.

## Exact target public call chains

```javascript
const zero = chart()
  .createCanvas({
    width: 690,
    height: 420,
    margin: { top: 92, right: 142, bottom: 70, left: 72 }
  })
  .createData({ id: "jobs", values })
  .createAreaMark({ id: "occupations", curve: "linear" })
  .encodeX({ target: "occupations", field: "year", fieldType: "quantitative" })
  .encodeY({ target: "occupations", field: "count", fieldType: "quantitative" })
  .encodeColor({
    target: "occupations",
    field: "job",
    fieldType: "nominal",
    layout: "stack"
  })
  .createGuides();

const center = chart()
  .createCanvas({
    width: 690,
    height: 420,
    margin: { top: 92, right: 142, bottom: 70, left: 72 }
  })
  .createData({ id: "jobs", values })
  .createAreaMark({ id: "occupations", curve: "linear" })
  .encodeX({ target: "occupations", field: "year", fieldType: "quantitative" })
  .encodeY({ target: "occupations", field: "count", fieldType: "quantitative" })
  .encodeColor({
    target: "occupations",
    field: "job",
    fieldType: "nominal",
    layout: "center"
  })
  .createGuides();
```

두 program은 `hconcat({ gap: 20, padding: 6, align: "start" })`로 나란히 놓는다. Gate package의 executable
primitive는 future public center action을 호출하지 않고 independent reference endpoints를 concrete paths로
직접 기록한다.

## Semantic and visual result

- Actual Jobs rows를 `year × job`으로 합산하고 Farmer, Operative, Clerical Worker, Teacher, Nurse 순서를 쓴다.
- Zero panel은 `[0, total]`, center panel은 `[-total / 2, total / 2]` 범위를 사용한다.
- 모든 category의 각-year thickness는 두 panel에서 같고 fill/drawing order도 같다.
- Center panel의 zero rule은 stack의 기하 중심을 통과하며 outer area가 guide bounds에 clip되지 않는다.
- Canvas/SVG/PNG/PDF는 동일한 concrete path와 drawing order를 소비한다.

## Evidence required before review

- Independent Jobs aggregation와 literal endpoint fixtures:
  `test/gates/centered-area-stream/reference-values.js`
- Primitive-only trace/structure assertions and source immutability: 4 pass
- Active review metadata and PNG:
  `.artifacts/test/png/review/centered-area-stream/jobs-zero-vs-center/`
- Canvas/SVG/PNG/PDF artifacts:
  `.artifacts/test/renderers/review/centered-area-stream/jobs-zero-vs-center/`
- Logical size: `1416 × 436`; PNG pixel size: `2832 × 872`
- PNG SHA-256: `b941b70b88e274973ccb0d0ddb30c891e776cd8eaf8efdafc0fe58bbbedfb58f`
- Focused normal verification: 13 pass including discovery/capability ownership
- Focused render verification: 2 pass
- Cumulative normal verification: 2,005 pass
- Cumulative render verification: 133 pass; charts/review galleries verified

## Compatibility and documentation impact

Visual Gate는 test-only primitive와 active review artifact만 추가한다. Runtime, declarations, package exports,
Current contracts와 public docs behavior는 바꾸지 않는다. 승인 뒤 public implementation에서 함께 동기화한다.

## Approval effect

승인하면 이 concrete visual target을 보존하면서 center partition grammar, public position/color flow, scale domain,
declarations, Current contracts, docs와 stable example을 구현한다.

## Work blocked before approval

- Production `layoutSeriesPartition(..., "center")`와 area derivation/materialization
- Public `encodeY({ stack: "center" })` and `encodeColor({ layout: "center" })`
- Strict declarations, Current contracts, public docs and package promotion

## Remote checkpoint

- Visual Gate implementation: `df168136` (`test: add center stack visual gate`)
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

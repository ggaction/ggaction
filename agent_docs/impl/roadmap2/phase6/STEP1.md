# Roadmap 2 — Phase 6 Step 1: Contract and Baseline Audit

## 목표

Phase 6 Planned inventory, existing line primitive, position/scale/materialization boundaries and cars fixture를
재감사해 rule/error-bar implementation baseline을 고정한다.

## 진행 상태

- [x] Phase 6 direct actions/capabilities and Planned contract mapping audit
- [x] Existing `line` concrete schema/Canvas renderer reuse confirmation
- [x] Rule mark/channel/coordinate/scale compatibility matrix
- [x] Cars valid-row/group-order and canonical Canvas/guide policy
- [x] Independent interval reference formulas and expected rows
- [x] Variant manifest, artifact path and target call-chain ownership
- [x] Focused baseline tests
- [x] STEP status, conceptual commit and push

## 작업 내용

새 graphical primitive를 추가하지 않고 existing concrete `line` contract를 재사용할 수 있음을 증명한다.
Rule endpoint와 cap fixed-span intent의 state owner, interval transform provenance, generated identity와 action
dependency order를 implementation 전에 testable contract로 고정한다.

## Audit 결과

### Planned inventory

Phase 6 owns exactly six accepted direct actions:

```text
createRuleMark
encodeStroke
encodeStrokeWidth
createIntervalData
createErrorBar
encodeX2
```

Existing `encodeX`, `encodeY`, `encodeY2`, `encodeStrokeDash` and `encodeOpacity` are extended only for the rule
compatibility they own. Rule-specific `encodeY2` reassignment belongs to Phase 6; ranged-area y/y2 reassignment
remains Phase 7. `editRuleMark` and `editErrorBar` are intentionally absent.

### Concrete graphical reuse

Rule graphics reuse the current `line` type without adding a renderer primitive.

```text
required draw properties  x1, y1, x2, y2, stroke, strokeWidth
optional draw properties  strokeDash, opacity (default 1)
collection behavior       one concrete line child per resolved row
```

`src/grammar/schemas/graphic.js` already owns this property vocabulary,
`src/grammar/schemas/concreteGraphic.js` owns finite/style validation, and
`src/renderers/canvas/line.js` draws both browser and Node-PNG paths through the shared Canvas dispatcher.
Existing editor/renderer coverage proves scalar broadcast, per-child distribution, incomplete-line rejection,
dash and opacity state isolation. Phase 6 therefore adds semantic rule materialization, not a new drawable type.

### Endpoint compatibility

```text
x                         full-height vertical span
y                         full-width horizontal span
x + y + y2                bounded vertical interval
y + x + x2                bounded horizontal interval
x + y + x2 + y2           diagonal interval
all other combinations    invalid/incomplete
```

`x2` cannot exist without x, and `y2` cannot exist without y. A secondary endpoint shares the primary channel's
scale and coordinate. A datum-only rule creates one line; field-backed assignments produce one line per valid
resolved row. Error-bar caps are the only internal x+y anchor case: their fixed perpendicular span config makes
the intended line complete without inventing a data endpoint.

### Cars statistical baseline

Source rows total 406. Finite `Acceleration` counts and first-appearance group order are:

| Origin | n | df | Mean | Sample stdev | 95% CI lower | 95% CI upper |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| USA | 254 | 253 | 14.942519685039 | 2.804542325891 | 14.595961849125 | 15.289077520954 |
| Europe | 73 | 72 | 16.821917808219 | 3.010917476236 | 16.119418784340 | 17.524416832098 |
| Japan | 79 | 78 | 16.172151898734 | 1.954936992155 | 15.734269872553 | 16.610033924915 |

The horizontal Horsepower variant has valid counts `250, 71, 79` in the same group order. The independent
reference uses sample variance, `stderr = sampleStdev / sqrt(n)` and pinned two-sided 0.975 Student-t critical
values. It does not import future production interval grammar.

### State and dependency ownership

- Statistical provenance and concrete summary rows belong to an immutable derived dataset.
- Main/cap rule identity and position bindings belong to ordinary semantic layers.
- Constant appearance and cap pixel span belong to mark materialization config.
- Resolved `line` endpoints and styles belong only to `graphicSpec`.
- Canvas and scale edits execute ordered rule/cap rematerialization; the renderer performs no inference.
- Omitted ordinary owner IDs resolve to `rule`/`errorBar` only when unique; advanced `createIntervalData` keeps an
  explicit generated ID when called by the composite.

### Test and artifact ownership

- Independent numeric reference helper: `test/support/interval-reference.js`
- Numeric baseline coverage: `test/unit/grammar/transforms/interval-reference.test.js`
- Future complete vertical slice: `test/charts/cars-error-bar/`
- Future canonical public program: `examples/cars-error-bar/program.js`
- Future variant owner: `test/charts/cars-error-bar/variants/manifest.js`
- Artifacts: `.artifacts/test/png/roadmap2/cars-error-bar/<variant>/`

The chart directory is created with its complete primitive/public/render slice at the first visual baseline rather
than adding placeholder or skipped tests during this audit.

## 검증

- Independent interval reference tests: 4 passed
- Action catalog/Planned-to-Roadmap mapping contract: passed
- Existing line editor/renderer contracts remain the concrete graphical evidence

## 완료 조건

Rule/error-bar의 semantic storage, graphical materialization, numeric oracle와 visual Gate inputs가 모호하지 않다.

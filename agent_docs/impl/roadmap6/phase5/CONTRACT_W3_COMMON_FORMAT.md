# Phase 5 W3 — Common value-format contract

## Scope

Axis labels, Text content, and continuous legend labels share one explicit
format vocabulary and one pure formatter. This adds no direct action. Existing
actions keep their own inference, materialization, and `"auto"` behavior.

## Vocabulary

- `ValueFormat = "auto" | NumericFormatString | UtcFormatString`.
- `NumericFormatString` is `.0` through `.12` precision followed by `f`, `%`,
  or `e`. One-digit zero-padded precision such as `.01f` remains accepted.
- `UtcFormatString` contains at least one of `%Y`, `%m`, `%d`, or `%b` and may
  contain literals. `%%` emits a literal percent sign.
- UTC formatting always uses UTC. It does not infer locale or a host timezone.
- Axis labels alone retain `{ decimals: nonNegativeInteger }` for compatibility.

## Surface behavior

- Axis `format` accepts the common tokens plus its legacy decimals object.
  Numeric tokens require a quantitative scale, UTC tokens require a time scale,
  and discrete scales accept `"auto"` only.
- `encodeText({ format })`, `createTextMark({ format })`, mark labels, and
  annotations accept the common tokens. An explicit UTC token authorizes date,
  ISO-string, or timestamp parsing. Auto remains exact deterministic string
  conversion.
- Continuous gradient, opacity, size, stroke-width, and discretized interval
  legends accept `labels: { format }` and focused
  `editLegendLabels({ format })`. Numeric scales accept numeric tokens and
  temporal scales accept UTC tokens. Categorical legends preserve identity
  labels and reject explicit formatting.
- Continuous legend auto labels retain their prior family-specific distinct
  sampling and tick formatting. Explicit formatting is exact and may produce
  duplicate visible strings.

## Validation and replay

- Precision above 12, unknown/dangling UTC directives, incompatible scale
  families, invalid dates, non-finite numeric values, and percent overflow fail
  without mutating the prior program.
- The selected token is stored in semantic/config state as appropriate and is
  replayed after data, scale, filter, encoding, and Canvas changes.
- `EditLegendLabelsOptions` includes the runtime-supported `offset` and the new
  continuous `format`, closing the previous public type mismatch.

## Evidence

- Pure formatter: `test/unit/grammar/value-format.test.js`.
- Axis: `test/unit/actions/guides/axis-policy.test.js`.
- Text: `test/unit/actions/marks/text-mark.test.js` and
  `test/contracts/text-content-types.test.js`.
- Continuous/discretized legends:
  `test/unit/actions/guides/continuous-legends.test.js`,
  `test/unit/actions/guides/size-legend-editing.test.js`, and
  `test/unit/grammar/scales/discretized-color.test.js`.
- Installed package and browser consumers are required before closeout.

# Phase 5 W3 — Explicit rotation units

## Public boundary

Text appearance and Cartesian axis-title rotation accept:

```typescript
type RotationUnit = "radians" | "degrees";
type RotationInput = number | { value: number; unit: RotationUnit };
```

- A numeric value preserves the existing radians meaning.
- A structured value must be a plain object with exactly `value` and `unit`.
- `value` must be finite and `unit` is a closed two-value vocabulary.
- Actions normalize accepted input to radians before storing materialization config or concrete graphics.
- Creation/edit replay and earlier immutable programs retain the normalized value.

This contract applies to `createTextMark`, `editTextMark`, `createMarkLabels`,
`createAnnotation`, Cartesian focused title create/edit actions, and complete
Cartesian axis title options. Facades delegate to the same lower owner.

## Compatibility boundary

The change does not reinterpret existing numbers. `rotation: Math.PI / 2`
still means 90 degrees. `rotation: { value: 90, unit: "degrees" }` is the new
unit-visible equivalent.

`encodeAngle` and Polar axis/component placement remain numeric degrees. They
describe mark or component placement rather than Text rotation and do not
accept `RotationInput`.

## Validation

- Unit tests cover both units, legacy numeric values, create/edit replay,
  malformed objects, unknown units, and input immutability.
- Type tests accept both structured units and reject missing or unknown fields.
- Installed-package and browser consumers assert normalized concrete radians.
- Full tests, coverage, documentation, package limits, installed consumer, and
  browser consumer run before this conceptual change is closed.

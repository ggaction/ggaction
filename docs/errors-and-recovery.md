---
layout: default
title: Errors and Recovery
---

# Errors and Recovery

ggaction rejects ambiguous state, invalid options, incompatible resources, and
renderer allocation failures instead of guessing. Actions are immutable: when
an action throws, the input program remains usable. Async file renderers also
return rejected promises for validation or filesystem failures.

## Error categories

| Category | Typical meaning | Response |
| --- | --- | --- |
| `TypeError` | Wrong value shape, unknown closed option, or invalid primitive type | Correct the caller contract before retrying |
| `RangeError` | A numeric value or output allocation is outside an accepted range | Reduce or clamp only according to product intent |
| `Error` | Missing/ambiguous resource, incompatible chart state, unsupported combination, or named lookup failure | Add an explicit ID or revise the authoring sequence |
| Rejected renderer promise | Invalid renderer options or filesystem/native output failure | Keep the program, inspect the environment, and retry output separately |

The public API does not currently expose stable machine-readable error codes.
Do not branch production behavior on complete English message text. Use the
documented option and lifecycle contract to prevent expected failures, and log
the message with action context for diagnosis.

## Recover without losing the previous chart

```javascript
let current = buildChart(rows);

function applyRevision(revise) {
  try {
    const candidate = revise(current);
    current = candidate;
    render(current, context);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

const result = applyRevision(program =>
  program.editCanvas({ width: 840, height: 480 })
);
```

Commit the candidate only after the complete action succeeds. Preserve the
request, action name, explicit resource IDs, and package version in diagnostic
logs; do not log sensitive row contents by default.

## Common failures

- **Ambiguous dataset or mark:** provide the documented `data`, `target`,
  `scale`, or coordinate ID. The library does not invent numeric suffixes.
- **Missing field or incompatible field type:** inspect the input schema and
  choose the intended field; do not substitute the first numeric column.
- **Insufficient margin:** increase the appropriate Canvas margin or simplify
  the title/legend layout. CSS overflow does not fix graphic bounds.
- **Scale has no consumer:** attach the named scale to a compatible encoding.
- **Raster allocation rejected:** reduce logical size or `pixelRatio` before
  retrying Canvas or PNG output.
- **Unsupported static capability:** redesign explicitly. Tooltips, animation,
  event handling, geographic projection, 3D charts, and JPEG rendering are not
  silently emulated.

## Diagnosis order

1. Reduce the failure to the shortest complete program with fixed rows.
2. Confirm the exact installed version and public TypeScript signature.
3. Identify the first throwing action; later immutable calls did not run.
4. Inspect the relevant semantic resource and explicit IDs, then the concrete
   `graphicSpec` only if materialization had already succeeded.
5. Test rendering independently from authoring when the program is complete.

## Related

[Troubleshooting](./troubleshooting.md) · [Versioning](./versioning.md) ·
[Action reference](./reference/actions.md) · [Supported features](./supported-features.md)

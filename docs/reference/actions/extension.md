---
layout: default
title: Extension Actions
description: Register wrapped extension actions and use low-level semantic, graphic, and scale primitives.
---

# Extension Actions

Import extension-authoring APIs from `ggaction/extension`; installable packages register on the complete chart program, while ordinary chart authors should prefer chart actions.

Import `action`, `registerExtension`, and `ChartProgram` from
`ggaction/extension`. Primitive methods are available on programs used by
extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Registration | `registerExtension({ name, actions })` |
| Semantic primitive | `editSemantic({ property, value })` or `editSemantic({ property, remove: true })` |
| Graphic primitive | `createGraphics({ id, type, length?, parent?, before?, after? })` |
| Graphic primitive | `editGraphics({ target, property, value })` or `editGraphics({ target, remove: true })` |
| Scale actions | `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, unknown? })`, `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, unknown? })` |

Importing an extension package may register one validated batch of wrapped
actions on the complete `chart()` program. Registration does not affect
`ggaction/basic`, rejects collisions without partial installation, and requires
each action key to match its wrapped `op`.

See [Action authoring](../../extension/action-authoring.md) and
[Primitive API](../../extension/primitives.md).

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)

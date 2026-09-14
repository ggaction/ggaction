---
layout: default
title: Extension Actions
description: Edit semantic and concrete graphics through extension primitives.
---

# Extension Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layer and H0–H4 authoring role are independent classifications.

## `editSemantic`

**API layer:** primitive. **Authoring roles:** H4.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editSemantic(options: EditSemanticOptions): ChartProgram;
```

Named option contracts: [`EditSemanticOptions`](./../types.md#type-editsemanticoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `property` | Required | `string` |
| `value` | Optional / branch-dependent | `unknown` |
| `remove` | Optional / branch-dependent | `boolean \| undefined` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## `createGraphics`

**API layer:** primitive. **Authoring roles:** H4.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createGraphics(options: { id: string; type: GraphicType; length?: number; parent?: string; before?: string; after?: string; }): ChartProgram;
```

Named option contracts: [`GraphicType`](./../types.md#type-graphictype).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `type` | Required | `GraphicType` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `parent` | Optional / branch-dependent | `string \| undefined` |
| `before` | Optional / branch-dependent | `string \| undefined` |
| `after` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## `editGraphics`

**API layer:** primitive. **Authoring roles:** H4.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editGraphics(options: EditGraphicsOptions): ChartProgram;
```

Named option contracts: [`EditGraphicsOptions`](./../types.md#type-editgraphicsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `property` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `unknown` |
| `remove` | Optional / branch-dependent | `boolean \| undefined` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## Extension and scale contracts

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
| Scale actions | `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })`, `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })` |

Importing an extension package may register one validated batch of wrapped
actions on the complete `chart()` program. Registration does not affect
`ggaction/basic`, rejects collisions without partial installation, and requires
each action key to match its wrapped `op`.

See [Action authoring](../../extension/action-authoring.md) and
[Primitive API](../../extension/primitives.md).

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)

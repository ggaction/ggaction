---
layout: default
title: Series Encodings
---

# Series Encodings

{% include chart-example.html id="line" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeColor` | `encodeColor({ field: "group" })` | Current mark, nominal field type, color scale | Semantic grouping and concrete color |
| `encodeStrokeDash` | `encodeStrokeDash({ field: "group" })` | Current line/rule mark and dash scale | Field-driven or constant concrete dash |

Series appearance is authored through color and stroke-dash families. Each
focused page owns the complete options, replacement behavior, and errors for
that encoding.

## Focused series families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./series/color/"><strong>Color</strong><span>Categorical and continuous color, grouping layouts, and aggregate bars.</span></a>
  <a href="./series/stroke-dash/"><strong>Stroke dash</strong><span>Constant and field-driven dash patterns for lines and rules.</span></a>
</div>

## Errors and limitations

Series fields must be nominal. Area color must match its group encoding. Line
group, color, and field-driven stroke dash must use one compatible field.
Combined line legends also require matching ordered domains.

## Related

[Scale options](./scales.md) · [Legends](./legends.md) ·
[Position encodings](./position-encodings.md)


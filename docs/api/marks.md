---
layout: default
title: Marks
---

# Marks

{% include chart-example.html id="scatterplot" %}

Marks define the semantic form of a layer. Create a mark first, then connect it
to data through position, grouping, and appearance encodings. The first mark of
each type infers its ID and current dataset when those choices are unambiguous.

## Choose a mark family

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./point/">
    <strong>Point marks</strong>
    <span>Scatterplots, symbols, field-driven shape, size, and opacity.</span>
  </a>
  <a href="./line-area/">
    <strong>Line and area marks</strong>
    <span>Ordered paths, grouped series, ranged areas, and density geometry.</span>
  </a>
  <a href="./bar/">
    <strong>Bar marks</strong>
    <span>Histograms, aggregate bars, grouped layouts, and observed intervals.</span>
  </a>
  <a href="./rule/">
    <strong>Rule marks</strong>
    <span>Full-span references, bounded intervals, and diagonal endpoints.</span>
  </a>
  <a href="./text/">
    <strong>Text marks</strong>
    <span>Data labels and annotations attached to points, bars, or rules.</span>
  </a>
  <a href="./line-area/#arc-marks">
    <strong>Arc marks</strong>
    <span>Donuts, rose overlays, and radial bars with Polar positions.</span>
  </a>
</div>

## At a glance

| Family | Create | Edit | Initial graphic |
| --- | --- | --- | --- |
| Point | `createPointMark` | `editPointMark` | Point collection |
| Line | `createLineMark` | `editLineMark` | Path collection |
| Area | `createAreaMark` | `editAreaMark` | Closed path collection |
| Arc | `createArcMark` | `editArcMark` | Closed sector path collection |
| Bar | `createBarMark` | `editBarMark` | Rect collection |
| Rule | `createRuleMark` | Encoding actions | Line collection |
| Text | `createTextMark` | `editTextMark` | Text collection |

Use `removeMark({ target? })` to remove one complete stable mark owner. It also
removes generated composite children, unreferenced generated datasets, owned
legends, and selection/highlight state. Source data and resources shared by
another mark remain:

```javascript
const barsOnly = layeredProgram.removeMark({ target: "points" });
```

Generated children such as regression lines cannot be removed directly;
select their stable owner instead.

Creation establishes semantic ownership but may leave an empty collection.
Concrete graphics appear when the required encodings make the mark renderable.
Later Canvas, scale, grouping, or appearance edits explicitly rematerialize
those graphics.

## Shared inference

- `data` defaults to the current dataset.
- The first omitted mark ID uses the semantic role: `"point"`, `"line"`,
  `"area"`, `"arc"`, `"bar"`, `"rule"`, or `"text"`.
- A second mark of the same type requires an explicit ID.
- A newly layered mark can inherit compatible data, coordinate, x, and y
  encodings from the current layer, or one unique source on the current dataset.
- Mark-specific aggregate, bin, stack, and appearance policies are never copied
  implicitly.
- Only field-based positions compatible with the new mark and existing scale
  type are inherited. Incompatible channels remain unencoded.
- Passing `data` explicitly starts independent mark assembly and disables
  layered position inheritance.

## Related

[Encodings](./encodings.md) · [Statistical layers](./regression.md) ·
[Complete action reference](../reference/actions.md)

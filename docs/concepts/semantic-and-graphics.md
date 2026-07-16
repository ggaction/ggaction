---
layout: default
title: Semantic and Graphical State
---

# Semantic and Graphical State

<div class="docs-concept-flow" role="img" aria-label="A domain action updates semantic meaning and concrete graphics, then the renderer reads only graphicSpec">
  <span>semanticSpec<strong>meaning</strong></span>
  <b aria-hidden="true">→</b>
  <span>domain action<strong>materializes</strong></span>
  <b aria-hidden="true">→</b>
  <span>graphicSpec<strong>concrete nodes</strong></span>
  <b aria-hidden="true">→</b>
  <span>renderer<strong>draw only</strong></span>
</div>

`ggaction` keeps chart meaning separate from its fully resolved graphics.

```text
semanticSpec = what the chart means
graphicSpec  = what the renderer draws
```

## Semantic state

`semanticSpec` stores named datasets, semantic layers and marks, data-driven
encodings, scales, coordinates, and guides. Examples include:

- `Horsepower` encoded on x;
- a linear x scale with an automatic domain;
- a point layer using the `main` Cartesian coordinate;
- an x-axis explaining scale `x`.

## Graphical state

`graphicSpec` contains backend-neutral concrete nodes such as canvas, circle,
line, and text. Every stored x/y coordinate, radius, color, line endpoint, and
label string is already resolved.

Named graphics form an explicit ownership tree. A normal Canvas-first chart has
one Canvas root, a plot container for grids, marks, and axes, then Canvas-owned
legends and titles:

```text
canvas
├─ plot
│  ├─ grid
│  ├─ marks
│  └─ axes
├─ legends
└─ title
```

Sibling order is drawing order. Containers do not imply clipping, transforms,
or layout; they only record ownership and order. Repeated concrete mark items
remain in the owning graphic's `items` collection rather than becoming named
tree children.

It never stores field expressions, scale calls, executable functions, or
instructions for a renderer to infer.

## No automatic compiler

There is no automatic semantic-to-graphic compilation step. A domain action
explicitly updates semantic state and invokes the graphical actions required to
materialize that change.

For example, `encodeX` records the field and scale, resolves every consumer,
and writes concrete x values. `render()` later reads only `graphicSpec`.

Appearance-only values such as canvas background, fixed radius, fonts, and
strokes are graphical. User-authored scale domains and ranges remain semantic;
the values produced by applying them are graphical.

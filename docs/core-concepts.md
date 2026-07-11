---
layout: default
title: Core Concepts
---

[Documentation home](./index.md) · [Repository](https://github.com/hj-n/ggaction)

# Core Concepts

This page gives users the minimum conceptual model needed to understand the
library. It is not an implementation reference.

## `ChartProgram`

`ChartProgram` holds semantic state, concrete graphical state, authoring
context, and a hierarchical action trace. Every action returns a new program
without mutating an earlier program or caller-owned input.

```javascript
import { chart } from "ggaction";

const program = chart();
```

## `action()`

The `action()` wrapper records an authoring method call in the trace. Wrapped
actions called inside another wrapped action become children of the calling
action. This behavior is implemented.

## Primitive actions

| Primitive | Responsibility |
| --- | --- |
| `editSemantic` | Create or replace one supported semantic property |
| `createGraphics` | Create a concrete graphical object or homogeneous collection |
| `editGraphics` | Create or replace one concrete property on an existing graphic |

These primitives form the internal authoring foundation. They are not the
long-term user-facing domain API. Their runtime behavior is not implemented
yet.

## Semantic and graphical state

- `semanticSpec` records what a chart means.
- `graphicSpec` records the fully resolved objects and values that a renderer
  draws.
- Semantic changes never trigger an automatic semantic-to-graphic compiler.
- An authoring action must explicitly materialize every graphical change it
  requires.

## Rendering

Once implemented, `render()` will read only a fully materialized `graphicSpec`.
It must not inspect semantic state, authoring context, or the action trace to
infer missing values.

STEP 1 initially targets Canvas with concrete `canvas` and `circle` graphics.

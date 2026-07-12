---
layout: default
title: ChartProgram and Immutability
---

[Documentation home](../index.md) · [Semantic and graphical state](./semantic-and-graphics.md)

# ChartProgram and Immutability

`chart()` returns an empty `ChartProgram`. A program contains the authored chart
state and the history used to produce it.

```javascript
import { chart } from "ggaction";

const empty = chart();
const withCanvas = empty.createCanvas();

console.log(empty === withCanvas); // false
```

Every action returns a new program. Earlier programs and caller-owned input are
not mutated.

## Program state

| Property | Purpose |
| --- | --- |
| `semanticSpec` | Data, layers, encodings, scales, coordinates, and guides |
| `graphicSpec` | Fully materialized backend-neutral graphics |
| `resolvedScales` | Resolved domains and concrete output ranges |
| `context` | Current authoring selections and graphical bounds |
| `trace` | Hierarchical action history |

`context` helps later actions interpret omitted parameters, such as the current
dataset or mark. Rendering does not depend on `context` or `trace`.

Use [Semantic and graphical state](./semantic-and-graphics.md) to understand the
boundary between intent and concrete output.

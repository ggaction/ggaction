---
layout: default
title: ggaction Documentation
---

# ggaction Documentation

`ggaction` models chart authoring as a sequence of immutable actions while
retaining both semantic intent and fully materialized graphics.

> **Current status:** Canvas, immutable data, semantic point marks, quantitative
> x/y/color encodings, constant radius, hierarchical action traces, and Canvas rendering for concrete
> canvas, circle, line, and text graphics are implemented.

## Start here

| Page | Description |
| --- | --- |
| [Core concepts](./core-concepts.md) | `ChartProgram`, actions, primitives, traces, and rendering boundaries |
| [Canvas actions](./canvas-actions.md) | Create and edit chart canvases and their authoring bounds |
| [Data actions](./data-actions.md) | Create immutable named datasets |
| [Mark actions](./mark-actions.md) | Create semantic marks and their concrete graphical collections |
| [Visual encodings](./encoding-actions.md) | Map fields and constants to concrete point properties |
| [Action authoring](./action-authoring.md) | Extend ggaction with custom, traceable actions |
| [PNG rendering](./png-rendering.md) | Export completed programs to PNG files in Node.js |
| [Repository README](https://github.com/hj-n/ggaction#readme) | Project status and development commands |

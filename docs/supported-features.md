---
layout: default
title: Supported Features
---

[Documentation home](./index.md) · [Action index](./reference/actions.md)

# Supported Features

This page describes implemented behavior only.

| Area | Supported now |
| --- | --- |
| Program model | Immutable `ChartProgram`, hierarchical action trace |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable arrays of plain row objects |
| Marks | Semantic point mark with circle graphics |
| Position | Quantitative x/y fields with linear scales |
| Color | Nominal field with ordinal scale and `tableau10` palette |
| Constant appearance | Circle radius |
| Coordinates | Named Cartesian and Polar semantic resources; x/y use Cartesian |
| Guides | Bottom x-axis and left y-axis, including lines, ticks, labels, titles |
| Rendering | Browser Canvas and Node PNG |
| Graphics | Concrete canvas, circle, line, and text nodes |

Polar guide graphics, additional mark types, transforms, facets, legends, and
program composition are not implemented in the current phase. They are not
part of the current API reference.

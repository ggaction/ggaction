---
layout: default
title: Program and Rendering Functions
description: Create, compose, render, and inspect programs without confusing package functions with chainable actions.
---

# Program and Rendering Functions

## Internal trace operations

High-level actions call additional wrapped operations for data, scale, mark,
guide, title, and layout materialization. Names such as
`materializeDensityData`, `materializeWindowData`, `materializeBin2DData`, `rematerializeScale`, `rematerializePointMark`,
`createCategoricalLegend`, `createSizeLegend`, `rematerializeSizeLegend`,
`createLegendSymbols`, and `createTitleText` may appear in
`program.trace`. They are deliberately absent from the public TypeScript
declaration and this direct-call reference. Their arguments and decomposition
may change as implementation details while the parent public action remains
stable.

Use the [Actions and trace trees](../concepts/actions-and-trace.md) page to
inspect these nodes. Extension actions should compose the declared extension
and advanced actions instead of calling an undeclared runtime method.

## Program functions

These package-level functions create programs but are not chainable actions.

| Import | Signature |
| --- | --- |
| `ggaction` | `chart(): ChartProgram` |
| `ggaction/basic` | `chart(): BasicChartProgram` |
| `ggaction` | `hconcat(options: CompositionOptions): ChartProgram` |
| `ggaction` | `vconcat(options: CompositionOptions): ChartProgram` |

See [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable replacement rules.

## Rendering functions

Rendering functions are not actions and do not modify the trace.

| Import | Signature |
| --- | --- |
| `ggaction` | `render(program, canvasContext, { pixelRatio? }?)` |
| `ggaction/basic` | `render(program, canvasContext, { pixelRatio? }?)` |
| `ggaction/png` | `renderToPNG(program, { output, pixelRatio? })` |
| `ggaction/pdf` | `renderToPDF(program, { output, metadata? })` |
| `ggaction/svg` | `renderToSVG(program, { title?, description? }?)` |

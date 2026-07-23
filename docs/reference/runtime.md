---
layout: default
title: Program and Rendering Functions
description: Create, compose, render, and inspect programs without confusing package functions with chainable actions.
---

# Program and Rendering Functions

## Program functions

Package-level functions create, compose, or render programs. They are not
chainable actions and do not modify the action trace.

<!-- BEGIN GENERATED RUNTIME SIGNATURES -->
### Exact TypeScript signatures

These blocks are generated from the declaration file owned by each package entry.

#### `ggaction`

```typescript
export function chart(): ChartProgram;
export function hconcat(options: CompositionOptions): ChartProgram;
export function vconcat(options: CompositionOptions): ChartProgram;
export function render(
  program: Pick<ChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
```

#### `ggaction/basic`

```typescript
export function chart(): BasicChartProgram;
export function render(
  program: Pick<BasicChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
```

#### `ggaction/svg`

```typescript
export interface SVGRenderOptions {
  readonly title?: string;
  readonly description?: string;
}

export function renderToSVG(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: SVGRenderOptions
): string;
```

#### `ggaction/png`

```typescript
export interface PNGRenderResult {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly bytes: number;
}

export function renderToPNG(
  program: Pick<ChartProgram, "graphicSpec">,
  options: { output: string; pixelRatio?: number }
): Promise<PNGRenderResult>;
```

#### `ggaction/pdf`

```typescript
export interface PDFMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: readonly string[];
}

export interface PDFRenderOptions {
  readonly output: string;
  readonly metadata?: PDFMetadata;
}

export interface PDFRenderResult {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly pages: 1;
  readonly bytes: number;
}

export function renderToPDF(
  program: Pick<ChartProgram, "graphicSpec">,
  options: PDFRenderOptions
): Promise<PDFRenderResult>;
```

<!-- END GENERATED RUNTIME SIGNATURES -->

## Rendering functions

Use [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable child replacement. Use [Rendering](../api/rendering.md) for
complete Browser Canvas, SVG, Node PNG, and vector PDF examples.

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

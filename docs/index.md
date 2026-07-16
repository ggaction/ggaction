---
layout: default
title: ggaction Documentation
---

# ggaction Documentation

Build charts as immutable, traceable action programs. Start with a complete
example, then use the API pages when you need to customize one part.
The main, extension, and PNG entry points include TypeScript declarations.

> **Development status:** `ggaction` is currently used directly from this
> repository and is not published to npm yet. The documented API version is
> `0.0.0-dev`.

## Start here

<div class="docs-entry-grid">
  <a href="./getting-started/">
    <strong>Build your first chart</strong>
    <span>Run a complete repository example and understand the action chain.</span>
  </a>
  <a href="./recipes/">
    <strong>Start from a chart type</strong>
    <span>Copy the shortest supported scatterplot, line, bar, or area flow.</span>
  </a>
  <a href="./reference/actions/">
    <strong>Find an action</strong>
    <span>Look up exact signatures, defaults, inference, and related guides.</span>
  </a>
</div>

## Choose a chart

<div class="docs-chart-gallery">
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-scatterplot.png" aria-label="Open the full-size cars scatterplot">
      <img src="./assets/images/cars-scatterplot.png" alt="Cars scatterplot" width="1280" height="800" loading="eager" fetchpriority="high">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/scatterplot/">Scatterplot</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-line-chart.png" aria-label="Open the full-size aggregate line chart">
      <img src="./assets/images/cars-line-chart.png" alt="Cars aggregate line chart" width="1440" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/line-chart/">Line chart</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-histogram.png" aria-label="Open the full-size stacked histogram">
      <img src="./assets/images/cars-histogram.png" alt="Cars stacked histogram" width="864" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/histogram/">Histogram</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/jobs-grouped-bar.png" aria-label="Open the full-size grouped bar chart">
      <img src="./assets/images/jobs-grouped-bar.png" alt="Jobs grouped bar example" width="1440" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/grouped-bar/">Bar chart</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-regression-scatterplot.png" aria-label="Open the full-size regression scatterplot">
      <img src="./assets/images/cars-regression-scatterplot.png" alt="Cars regression scatterplot with confidence bands" width="1520" height="960" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/regression-scatterplot/">Regression scatterplot</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-density-area.png" aria-label="Open the full-size density area chart">
      <img src="./assets/images/cars-density-area.png" alt="Cars density area chart" width="1440" height="1000" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/density-area/">Density area</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-error-bar.png" aria-label="Open the full-size error-bar chart">
      <img src="./assets/images/cars-error-bar.png" alt="Mean acceleration by origin with 95% confidence intervals" width="1440" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/error-bar/">Error bar</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/cars-box-plot.png" aria-label="Open the full-size box plot">
      <img src="./assets/images/cars-box-plot.png" alt="Fuel economy distribution by origin as a Tukey box plot" width="720" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./api/box-plots/">Box plot</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./assets/images/gapminder-error-band.png" aria-label="Open the full-size error-band chart">
      <img src="./assets/images/gapminder-error-band.png" alt="Mean life expectancy by cluster with 95% confidence bands" width="1520" height="960" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/error-band/">Error band</a>
  </article>
</div>

## Go deeper

Understand [immutable ChartProgram state](./concepts/chart-program.md),
[semantic and graphical state](./concepts/semantic-and-graphics.md), and
[action trace trees](./concepts/actions-and-trace.md). Extension authors can
continue with [action authoring](./extension/action-authoring.md) and the
[primitive API](./extension/primitives.md). For boundaries and failures, see
[supported features](./supported-features.md) and
[troubleshooting](./troubleshooting.md). Language models can use the concise
[documentation index](./llms.txt) or the generated
[full-text bundle](./llms-full.txt).

Source, issues, and development history are available on
[GitHub](https://github.com/hj-n/ggaction).

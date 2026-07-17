---
layout: default
title: ggaction Documentation
---

# ggaction Documentation

Build charts as immutable, traceable action programs. Start with a complete
example, then use the API pages when you need to customize one part.
The main, extension, and PNG entry points include TypeScript declarations.

> **Release status:** This documentation describes the experimental `0.0.2`
> release. APIs may change before `1.0.0`; consult the
> [changelog](https://github.com/hj-n/ggaction/blob/main/CHANGELOG.md) when
> upgrading.

## Start here

<div class="docs-entry-grid">
  <a href="./getting-started/">
    <strong>Build your first chart</strong>
    <span>Install the package, render a complete chart, and understand the action chain.</span>
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

## Core charts

Start with a complete chart whose data relationship matches the question you
want to answer.

<div class="docs-chart-gallery">
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/scatterplot/" aria-label="Build the cars scatterplot">
      <img src="./assets/images/cars-scatterplot.png" alt="Cars scatterplot" width="1280" height="800" loading="eager" fetchpriority="high">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/scatterplot/">Scatterplot</a>
    <p>Compare two quantitative fields and encode a category with color.</p>
    <span class="docs-chart-gallery__actions"><code>createPointMark</code> <code>encodeX</code> <code>encodeY</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-scatterplot.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/polar-points/" aria-label="Build the cars Polar point chart">
      <img src="./assets/images/cars-polar-scatterplot.png" alt="Cars Polar scatterplot" width="1040" height="1040" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/polar-points/">Polar points</a>
    <p>Map quantitative fields to clockwise angle and radial distance.</p>
    <span class="docs-chart-gallery__actions"><code>encodeTheta</code> <code>encodeR</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-polar-scatterplot.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/line-chart/" aria-label="Build the aggregate line chart">
      <img src="./assets/images/cars-line-chart.png" alt="Cars aggregate line chart" width="1440" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/line-chart/">Line chart</a>
    <p>Aggregate values over time and split the result into series.</p>
    <span class="docs-chart-gallery__actions"><code>createLineMark</code> <code>encodeGroup</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-line-chart.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/histogram/" aria-label="Build the stacked histogram">
      <img src="./assets/images/cars-histogram.png" alt="Cars stacked histogram" width="864" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/histogram/">Histogram</a>
    <p>Bin a quantitative field and count category partitions.</p>
    <span class="docs-chart-gallery__actions"><code>createBarMark</code> <code>encodeHistogram</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-histogram.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/grouped-bar/" aria-label="Build the grouped bar chart">
      <img src="./assets/images/jobs-grouped-bar.png" alt="Jobs grouped bar example" width="1440" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/grouped-bar/">Bar chart</a>
    <p>Aggregate ordinal categories and arrange nominal groups side by side.</p>
    <span class="docs-chart-gallery__actions"><code>createBarMark</code> <code>encodeColor</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/jobs-grouped-bar.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/density-area/" aria-label="Build the density area chart">
      <img src="./assets/images/cars-density-area.png" alt="Cars density area chart" width="1440" height="1000" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/density-area/">Density area</a>
    <p>Estimate grouped distributions and draw baseline-closed areas.</p>
    <span class="docs-chart-gallery__actions"><code>createAreaMark</code> <code>encodeDensity</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-density-area.png">View full size</a>
  </article>
</div>

## Statistical and layered charts

These examples compose ordinary marks and derived data into higher-level
statistical views.

<div class="docs-chart-gallery docs-chart-gallery--secondary">
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/regression-scatterplot/" aria-label="Build the regression scatterplot">
      <img src="./assets/images/cars-regression-scatterplot.png" alt="Cars regression scatterplot with confidence bands" width="1520" height="960" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/regression-scatterplot/">Regression scatterplot</a>
    <p>Layer observations, grouped fits, and confidence bands.</p>
    <span class="docs-chart-gallery__actions"><code>createRegression</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-regression-scatterplot.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/error-bar/" aria-label="Build the error-bar overlay">
      <img src="./assets/images/cars-error-bar.png" alt="Car observations with grouped mean confidence intervals" width="1440" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/error-bar/">Error bar</a>
    <p>Keep observations visible while summarizing group uncertainty.</p>
    <span class="docs-chart-gallery__actions"><code>createErrorBar</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-error-bar.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./api/box-plots/" aria-label="Learn how to build the box plot">
      <img src="./assets/images/cars-box-plot.png" alt="Fuel economy distribution by origin as a Tukey box plot" width="720" height="920" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./api/box-plots/">Box plot</a>
    <p>Compose quartiles, whiskers, medians, and outlier points.</p>
    <span class="docs-chart-gallery__actions"><code>createBoxPlot</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/cars-box-plot.png">View full size</a>
  </article>
  <article>
    <a class="docs-chart-gallery__image" href="./tutorials/error-band/" aria-label="Build the bounded error-band chart">
      <img src="./assets/images/gapminder-error-band.png" alt="Mean life expectancy by cluster with bounded confidence bands" width="1520" height="960" loading="lazy">
    </a>
    <a class="docs-chart-gallery__title" href="./tutorials/error-band/">Error band</a>
    <p>Show interval ribbons with explicit lower and upper boundaries.</p>
    <span class="docs-chart-gallery__actions"><code>createErrorBand</code></span>
    <a class="docs-chart-gallery__full-size" href="./assets/images/gapminder-error-band.png">View full size</a>
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

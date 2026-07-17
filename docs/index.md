---
layout: default
title: ggaction Documentation
---

# ggaction Documentation

Build charts as immutable, traceable action programs. Start with a complete
example, then use the API pages when you need to customize one part.
The main, extension, and PNG entry points include TypeScript declarations.

> **Release status:** This documentation describes the experimental `{{ site.version }}`
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

## Essential charts

Start with the most common Cartesian relationships before moving into
statistical layers or alternate coordinates.

<div class="docs-chart-gallery">
  {% assign essential_charts = site.data.chart_examples | where: "home_group", "essentials" | sort: "home_order" %}
  {% for example in essential_charts %}
    {% include chart-gallery-card.html example=example eager=forloop.first %}
  {% endfor %}
</div>

## Statistical and layered charts

Compose ordinary marks and derived data into higher-level statistical views.

<div class="docs-chart-gallery docs-chart-gallery--secondary">
  {% assign statistical_charts = site.data.chart_examples | where: "home_group", "statistical" | sort: "home_order" %}
  {% for example in statistical_charts %}
    {% include chart-gallery-card.html example=example %}
  {% endfor %}
</div>

## Coordinate extensions

Use Polar coordinates when angle and radial distance express the relationship
more directly than Cartesian x and y.

<div class="docs-chart-gallery docs-chart-gallery--secondary">
  {% assign coordinate_charts = site.data.chart_examples | where: "home_group", "coordinates" | sort: "home_order" %}
  {% for example in coordinate_charts %}
    {% include chart-gallery-card.html example=example %}
  {% endfor %}
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


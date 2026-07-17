---
layout: default
title: Tutorials
---

# Tutorials

Tutorials build complete, runnable charts and explain what each action adds.
Choose the visual relationship that matches the question you want to answer.

<div class="docs-chart-index">
  {% include chart-card.html id="scatterplot" title="Scatterplot" url="/tutorials/scatterplot/" summary="Quantitative positions, nominal color, radius, and inferred axes." actions="createPointMark · encodeX · encodeY" %}
  {% include chart-card.html id="polar" title="Polar point chart" url="/tutorials/polar-points/" summary="Map fields to clockwise angle and radial distance without changing the Canvas renderer." actions="encodeTheta · encodeR · encodePointRadius" %}
  {% include chart-card.html id="polar-line" title="Polar lines and radar" url="/tutorials/polar-lines/" summary="Connect ordered theta/radius values as open trends or closed radar paths." actions="createLineMark · encodeTheta · encodeR" %}
  {% include chart-card.html id="line" title="Aggregate line chart" url="/tutorials/line-chart/" summary="Temporal mean series with color, stroke dash, legend, and title." actions="createLineMark · encodeGroup" %}
  {% include chart-card.html id="histogram" title="Stacked histogram" url="/tutorials/histogram/" summary="Binned counts partitioned and stacked by a nominal field." actions="encodeHistogram · encodeColor" %}
  {% include chart-card.html id="bar" title="Bar chart" url="/tutorials/grouped-bar/" summary="Ordinal aggregate bars arranged side by side by nominal color." actions="encodeY · encodeColor" %}
  {% include chart-card.html id="regression" title="Regression scatterplot" url="/tutorials/regression-scatterplot/" summary="Filtered observations, variable symbols, grouped fits, and bands." actions="filterData · createRegression" %}
  {% include chart-card.html id="density" title="Density area" url="/tutorials/density-area/" summary="Grouped kernel-density data and translucent area paths." actions="encodeDensity · encodeColor" %}
  {% include chart-card.html id="error-bar" title="Error-bar overlay" url="/tutorials/error-bar/" summary="Observations with grouped mean confidence intervals and caps." actions="createErrorBar" %}
  {% include chart-card.html id="error-band" title="Bounded error band" url="/tutorials/error-band/" summary="Grouped confidence ribbons with explicit boundary paths." actions="createErrorBand" %}
  {% include chart-card.html id="selection" title="Mark selection and highlighting" url="/tutorials/mark-selection/" summary="Select, filter, and emphasize final point, bar, and line items." actions="selectMarks · highlightMarks" %}
</div>

The bar tutorial uses grouped bars as one layout of the general bar mark. The
statistical tutorials compose ordinary data, marks, encodings, and guides rather
than introducing a separate renderer path.

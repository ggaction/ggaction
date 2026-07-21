---
layout: default
title: Tutorials
---

# Tutorials

Tutorials build complete, runnable charts and explain what each action adds.
Choose the visual relationship that matches the question you want to answer.

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="../getting-started/"><strong>New to ggaction?</strong><span>Install the package and render one complete browser chart first.</span></a>
  <a href="../recipes/"><strong>Need only the shortest code?</strong><span>Switch to recipes when you do not need the step-by-step explanation.</span></a>
</div>

{% include gallery-filter.html %}

<div class="docs-chart-index">
  {% assign tutorial_charts = site.data.chart_examples | where_exp: "example", "example.tutorial_order" | sort: "tutorial_order" %}
  {% for example in tutorial_charts %}
    <div data-gallery-tasks="{{ example.tasks }}">
      {% include chart-card.html id=example.id kind="tutorial" %}
    </div>
  {% endfor %}
</div>

The bar tutorial uses grouped bars as one layout of the general bar mark. The
statistical tutorials compose ordinary data, marks, encodings, and guides rather
than introducing a separate renderer path.

---
layout: default
title: Tutorials
---

# Tutorials

Tutorials build complete, runnable charts and explain what each action adds.
Choose the visual relationship that matches the question you want to answer.

<div class="docs-chart-index">
  {% assign tutorial_charts = site.data.chart_examples | where_exp: "example", "example.tutorial_order" | sort: "tutorial_order" %}
  {% for example in tutorial_charts %}
    {% include chart-card.html id=example.id kind="tutorial" %}
  {% endfor %}
</div>

The bar tutorial uses grouped bars as one layout of the general bar mark. The
statistical tutorials compose ordinary data, marks, encodings, and guides rather
than introducing a separate renderer path.

---
layout: default
title: Chart Gallery
description: Browse complete ggaction charts by Cartesian, statistical, Polar, composition, and interaction task.
---

# Chart Gallery

This curated set highlights complete, representative charts. Every card links
to the canonical tutorial, recipe, or API page that owns the chart. Use the
filters to narrow the analytical relationship you want to express.

{% include gallery-filter.html %}

<div class="docs-chart-gallery docs-chart-gallery--catalog">
  {% assign gallery_charts = site.data.chart_examples | where: "gallery_featured", true %}
  {% for example in gallery_charts %}
    <div data-gallery-tasks="{{ example.tasks }}">
      {% include chart-gallery-card.html example=example %}
    </div>
  {% endfor %}
</div>

<p class="docs-gallery-link"><a href="./all/">Browse all supported chart examples →</a></p>

## Choose a next step

- [Learn a complete workflow](./tutorials/index.md)
- [Copy a minimal chart recipe](./recipes/index.md)
- [Find an exact action](./reference/actions.md)

---
layout: default
title: All Chart Examples
description: Browse every maintained ggaction chart example by analytical task.
---

# All Chart Examples

This catalog includes every complete chart example. Start with the
[curated gallery](../gallery.md) when you want a shorter representative set.
Small illustrations of a single option stay on the API page that owns them.

{% include gallery-filter.html %}

<div class="docs-chart-gallery docs-chart-gallery--catalog">
  {% assign gallery_charts = site.data.chart_examples | where_exp: "example", "example.figure_only != true" %}
  {% for example in gallery_charts %}
    <div data-gallery-tasks="{{ example.tasks }}">
      {% include chart-gallery-card.html example=example %}
    </div>
  {% endfor %}
</div>

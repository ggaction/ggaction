---
layout: default
title: Chart Recipes
---

# Chart Recipes

Use a recipe when you know the chart type and want the shortest supported
action flow. Each recipe separates the decisions you must provide from the
resources, defaults, and guides that ggaction can infer.

<div class="docs-chart-index">
  {% assign recipe_charts = site.data.chart_examples | where_exp: "example", "example.recipe_order" | sort: "recipe_order" %}
  {% for example in recipe_charts %}
    {% include chart-card.html id=example.id kind="recipe" %}
  {% endfor %}
</div>

Every flow begins with `createCanvas`, `createData`, and a semantic mark or
composite action. Add explicit IDs only when the current program contains more
than one compatible resource.

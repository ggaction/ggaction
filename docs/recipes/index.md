---
layout: default
title: Chart Recipes
---

# Chart Recipes

Use a recipe when you know the chart type and want the shortest supported
action flow. Each recipe separates the decisions you must provide from the
resources, defaults, and guides that ggaction can infer.

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="../tutorials/"><strong>Want the reasoning?</strong><span>Use a tutorial for an ordered workflow and explanation of each action.</span></a>
  <a href="../gallery/"><strong>Choosing a chart?</strong><span>Browse complete results before selecting a minimal recipe.</span></a>
</div>

{% include gallery-filter.html %}

<div class="docs-chart-index">
  {% assign recipe_charts = site.data.chart_examples | where_exp: "example", "example.recipe_order" | sort: "recipe_order" %}
  {% for example in recipe_charts %}
    <div data-gallery-tasks="{{ example.tasks }}">
      {% include chart-card.html id=example.id kind="recipe" %}
    </div>
  {% endfor %}
</div>

Every flow begins with `createCanvas`, `createData`, and a semantic mark or
composite action. Add explicit IDs only when the current program contains more
than one compatible resource.

Each recipe labels its primary snippet as runnable. Later snippets revise the
named `program` produced by that primary flow unless they repeat an import and
complete setup explicitly.

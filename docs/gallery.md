---
layout: default
title: Chart Gallery
description: Browse complete ggaction charts by Cartesian, statistical, Polar, composition, and interaction task.
---

# Chart Gallery

Every card links to the canonical tutorial, recipe, or API page that owns the
chart. Use the filters to narrow the relationship you want to express.

<div class="docs-gallery-filter" role="group" aria-label="Filter chart gallery">
  <button type="button" class="is-active" data-gallery-filter="all" aria-pressed="true">All</button>
  <button type="button" data-gallery-filter="essentials" aria-pressed="false">Cartesian and composition</button>
  <button type="button" data-gallery-filter="statistical" aria-pressed="false">Statistical layers</button>
  <button type="button" data-gallery-filter="coordinates" aria-pressed="false">Alternate coordinates</button>
  <button type="button" data-gallery-filter="other" aria-pressed="false">Interaction</button>
</div>

<div class="docs-chart-gallery docs-chart-gallery--catalog">
  {% for example in site.data.chart_examples %}
    <div data-gallery-group="{{ example.home_group | default: 'other' }}">
      {% include chart-gallery-card.html example=example %}
    </div>
  {% endfor %}
</div>

## Choose a next step

- [Learn a complete workflow](./tutorials/index.md)
- [Copy a minimal chart recipe](./recipes/index.md)
- [Find an exact action](./reference/actions.md)

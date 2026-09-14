---
layout: default
title: ggaction
toc: false
---

# ggaction

<p class="docs-hero-tagline">A grammar for how charts are made.</p>

Most visualization grammars describe a finished chart. **ggaction** represents
chart authoring itself as an immutable, traceable sequence of graphical actions.

Build, inspect, select, and revise charts one meaningful action at a time.

Start with a complete example, then use the API pages when you need to customize
one part. The main, basic, extension, SVG, PNG, and PDF entry points include TypeScript declarations.

<p class="docs-release-status"><strong>Experimental {{ site.version }}</strong> · APIs may change before 1.0.0. Review the <a href="https://github.com/ggaction/ggaction/blob/main/CHANGELOG.md">changelog</a> when upgrading.</p>

## Research basis

[ggaction: A Grammar of Graphical Actions](https://www.hyeonjeon.com/assets/pdf/jeon27arxiv.pdf),
by Hyeon Jeon and Jinwook Seo, describes the grammar's design. A graphical action
expresses a meaningful authoring decision, and a chart program composes those
actions in order. Larger actions delegate to smaller ones, so authors can start
with a chart and append focused refinements. The [hierarchical authoring tutorial](./tutorials/hierarchical-authoring.md)
connects that model to the current API.

The paper and this site's MCP benchmark answer different questions:

- **Paper §5 — expressiveness.** A fixed API snapshot identified as v0.0.13 maps
  97 object, operation, and intent entries using existing compatible chart/data
  and at most four calls: 86 direct, nine partial, and two unsupported mappings.
  These results are not a coverage percentage for the current development API.
- **Paper §6 — machine interpretability.** Fine-tuned small models generate chart
  programs over sequences of authoring requests. Full-program and edit-delta AST
  measures evaluate learning and generation under those study conditions.
- **Paper §7 — human interpretability.** Sixteen participants reconstructed
  128 drawings from chart code. Results show lower interpretation effort relative
  to some compared grammars, without a statistically significant completeness or
  accuracy advantage for ggaction.
- **[Local MCP benchmark](./mcp.md#measured-impact).** A separate 576-run study
  compares documentation browsing with MCP-first authoring and bounded fallback,
  measuring task success, tokens, and model-call costs for that fixed task set.

Familiar action names do not reveal every consequential default. For example,
regression model, grouping, and interval choices still deserve explanation.
See [paper and API compatibility](./version.md#paper-compatibility) before copying
paper examples into an installed release.

## Start here

Learn [how the same chart stays editable across authoring levels](./tutorials/hierarchical-authoring.md),
then [choose from every complete chart family](./api/chart-picker.md).

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
  <a href="./mcp/">
    <strong>Connect an LLM locally</strong>
    <span>Use one read-only MCP search tool without preloading the full documentation.</span>
  </a>
</div>

## Common chart types

Start with common Cartesian charts for relationships, comparisons, trends,
and distributions.

<div class="docs-chart-gallery">
  {% assign essential_charts = site.data.chart_examples | where: "home_group", "essentials" | where: "featured", true | sort: "home_order" %}
  {% for example in essential_charts %}
    {% include chart-gallery-card.html example=example eager=forloop.first %}
  {% endfor %}
</div>

## Statistics and uncertainty

Compose ordinary marks and derived data into higher-level statistical views.

<div class="docs-chart-gallery docs-chart-gallery--secondary">
  {% assign statistical_charts = site.data.chart_examples | where: "home_group", "statistical" | where: "featured", true | sort: "home_order" %}
  {% for example in statistical_charts %}
    {% include chart-gallery-card.html example=example %}
  {% endfor %}
</div>

## Alternative coordinates

Use parallel axes or angle and radial distance when Cartesian x and y are not
the clearest structure for the comparison.

<div class="docs-chart-gallery docs-chart-gallery--secondary">
  {% assign coordinate_charts = site.data.chart_examples | where: "home_group", "coordinates" | where: "featured", true | sort: "home_order" %}
  {% for example in coordinate_charts %}
    {% include chart-gallery-card.html example=example %}
  {% endfor %}
</div>

<p class="docs-gallery-link"><a href="./gallery/">Browse the curated chart gallery →</a></p>

## Go deeper

Understand [immutable ChartProgram state](./concepts/chart-program.md),
[semantic and graphical state](./concepts/semantic-and-graphics.md), and
[action trace trees](./concepts/actions-and-trace.md). Extension authors can
continue with [action authoring](./extension/action-authoring.md) and the
[primitive API](./extension/primitives.md). For boundaries and failures, see
[supported features](./supported-features.md) and
[troubleshooting](./troubleshooting.md). Language models can use the concise
[documentation index](./llms.txt), the local read-only [MCP server](./mcp.md), or the generated
[full-text bundle](./llms-full.txt).

Source, issues, and development history are available on
[GitHub](https://github.com/ggaction/ggaction).

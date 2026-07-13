---
layout: default
title: Titles
---

# Titles

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createTitle` | `createTitle({ text: "Title" })` | Top, plot-left alignment, default styles | Semantic text and concrete title graphics |

## `createTitle(options)`

Creates a chart title and an optional subtitle above the plot.

```javascript
program.createTitle({
  text: "The trend of acceleration by year",
  subtitle: "from 1970 to 1982"
});
```

| Option | Type | Default |
| --- | --- | --- |
| `text` | non-empty string | required |
| `subtitle` | non-empty string | omitted |
| `position` | `"top"` | `"top"` |
| `align` | `"left"`, `"center"`, or `"right"` | `"left"` |
| `offset` | finite number | `0` |
| `gap` | non-negative number | `8` |
| `titleStyle` | text style object | default title style |
| `subtitleStyle` | text style object | default subtitle style |

Both style objects accept `color`, `fontSize`, `fontFamily`, and `fontWeight`.
The defaults are:

```javascript
{
  titleStyle: {
    color: "#0f172a",
    fontSize: 22,
    fontFamily: "sans-serif",
    fontWeight: 600
  },
  subtitleStyle: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: "sans-serif",
    fontWeight: "normal"
  }
}
```

## Layout and stored result

Alignment uses the plot bounds rather than the full Canvas: left aligns with
the plot's left edge, center with its midpoint, and right with its right edge.
The title block is placed in the top margin. If that margin cannot contain the
configured fonts and gap, creation fails instead of overlapping the plot.

The title and subtitle strings are stored in `semanticSpec`. Alignment,
spacing, and text appearance are materialized as concrete text graphics.
Canvas size and margin changes explicitly rematerialize their positions.

The current scope supports one top-positioned chart title, one optional
single-line subtitle, and no automatic text wrapping or measurement.

## Errors and limitations

The top margin must contain the requested text block. Additional positions,
multiple subtitles, wrapping, and measurement are unsupported.

## Related

[Canvas](./canvas.md) · [Guides](./guides.md) ·
[Semantic and graphical state](../concepts/semantic-and-graphics.md)

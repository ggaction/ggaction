---
layout: default
title: Titles
---

# Titles

{% include chart-example.html id="line" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createTitle` | `createTitle({ text: "Title" })` | Top, plot-left alignment, default styles | Semantic text and concrete title graphics |
| `editTitle` | `editTitle({ position: "bottom" })` | Preserves omitted text, layout, wrapping, and style | Rematerialized title graphics |
| `removeTitle` | `removeTitle()` | Existing chart title | Title and subtitle resource removed |

## `createTitle(options)`

Creates one chart title and an optional subtitle on any Canvas edge.

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
| `position` | `"top"`, `"bottom"`, `"left"`, or `"right"` | `"top"` |
| `align` | `"left"`, `"center"`, or `"right"` | `"left"` |
| `offset` | finite number | `0` |
| `gap` | non-negative number | `8` |
| `maxWidth` | positive number | omitted; no wrapping |
| `wrap` | `"word"` or `"character"` | `"word"` when `maxWidth` is set |
| `lineHeight` | positive number | each font size × `1.2` |
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

## Position, alignment, and wrapping

Alignment uses the plot bounds rather than the full Canvas: left aligns with
the plot's left edge, center with its midpoint, and right with its right edge.
For a facet, the alignment span is the union of the translated child plot
bounds. Child margins, axis labels and titles, facet padding, and shared
legends do not pull the title away from the visual center of the plots.
For a left or right title, the same values mean the top, center, and bottom of
the plot edge. Left titles rotate counter-clockwise and right titles rotate
clockwise; top and bottom titles remain horizontal.

Set `maxWidth` to wrap text before edge rotation. Word wrapping prefers
whitespace and falls back to Unicode-safe character wrapping for an oversized
word. Character wrapping always splits on Unicode code-point boundaries. The
library uses deterministic text metrics so the same program produces the same
line breaks in browsers and Node. Renderers draw the concrete lines already in
`graphicSpec`; they do not wrap text again. Explicit newline characters are
not accepted.

The requested margin must contain the actual title block. A title must also
avoid guides reserved on the same edge. Creation fails instead of expanding
the Canvas, changing margins, or moving the title automatically.

## `editTitle(options)`

Partially edits the existing title. At least one option is required.

```javascript
const edited = program.editTitle({
  position: "bottom",
  align: "center",
  maxWidth: 280,
  titleStyle: { fontSize: 20 }
});
```

Omitted properties remain unchanged, and style objects merge only the supplied
leaves. `text` and string `subtitle` replace semantic text. Use
`subtitle: false` to remove the subtitle; a later string recreates it.
Wrapping and layout changes rebuild the concrete text lines without changing
unrelated chart state.

## `removeTitle()`

Remove the complete chart title resource, including subtitle text, concrete
graphics, and stored layout settings:

```javascript
const untitled = program.removeTitle();
```

The action accepts no options and requires an existing title.

## Stored result

The title and subtitle strings are stored in `semanticSpec`. Alignment,
spacing, wrapping configuration, and text appearance are graphical state.
Resolved line breaks, coordinates, and rotations are concrete text graphics.
Canvas size and margin changes explicitly rematerialize their positions.

## Errors and limitations

The library supports one title and one optional subtitle. `wrap` and
`lineHeight` require `maxWidth`; explicit `lineHeight` must cover every visible
font size. Missing margin space and same-edge guide collisions are errors.

## Related

[Canvas](./canvas.md) · [Guides](./guides.md) ·
[Semantic and graphical state](../concepts/semantic-and-graphics.md)

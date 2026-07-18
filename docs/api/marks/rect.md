---
layout: default
title: Rect Marks
---

# Rect Marks

{% include chart-example.html id="heatmap" %}

Rect marks represent independent two-dimensional cells. They are distinct from
bars: rects do not infer aggregation, a zero baseline, stacking, or bar width.

## `createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})`

```javascript
const program = chart()
  .createCanvas({ width: 640, height: 400, margin: 60 })
  .createData({ values: rows })
  .createRectMark()
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({ field: "country", fieldType: "nominal" })
  .encodeColor({
    field: "life_expect",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  });
```

The first omitted ID is `"rect"`, and data defaults to the current dataset.
Two discrete x/y encodings create one full-band cell for each complete observed
row. Missing category combinations are not synthesized.

Ranged rects use complete continuous endpoint pairs:

```javascript
program
  .encodeX({ field: "xStart" })
  .encodeX2({ field: "xEnd", fieldType: "quantitative" })
  .encodeY({ field: "yStart" })
  .encodeY2({ field: "yEnd", fieldType: "quantitative" });
```

Until one supported topology is complete, semantic intent is retained and the
rect collection stays empty. Missing endpoint or color values omit only their
row. `encodeColor` accepts categorical and continuous color scales.

## `editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? })`

```javascript
const outlined = program.editRectMark({
  opacity: 0.9,
  stroke: "#f8fafc",
  strokeWidth: 1.5
});
```

The target is inferred when exactly one rect is eligible. Constant `fill`
cannot be combined with a field-driven color encoding. Use `stroke: false` to
remove the outline; a simultaneous `strokeWidth` is invalid.

## Cell labels and selection

Calling `createTextMark()` after a complete rect inherits its data and x/y
positions. Labels anchor at cell centers, and an omitted text fill resolves to
light or dark text for a realized six-digit hex cell color. Other fill syntaxes
retain the normal text default, and an explicit text fill always
wins. `selectMarks`, `filterMarks`, and `highlightMarks` operate on final
observed cells at item grain.

## Related

[Position encodings](../position-encodings.md) ·
[Series and color encodings](../series-encodings.md) ·
[Text marks](./text.md)

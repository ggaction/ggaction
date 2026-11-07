// Native field-axis placement is shared by explicit marks, guides and prepared sampling.
export function parallelAxisPosition(bounds, index, count) {
  return bounds.x + bounds.width / (count - 1) * index;
}

function uniform(values) {
  return values.length > 0 && values.every(value => value === values[0]) ? values[0] : values;
}

export function resolveParallelGuideGeometry(part, axes, bounds) {
  if (part === "line") return {
    length: axes.length,
    x1: axes.map(axis => axis.x), y1: bounds.y,
    x2: axes.map(axis => axis.x), y2: bounds.y + bounds.height
  };
  if (part === "title") return {
    length: axes.length, x: axes.map(axis => axis.x),
    y: uniform(axes.map(axis => bounds.y - axis.config.title.offset)),
    text: axes.map(axis => axis.title),
    textAlign: uniform(axes.map(axis => axis.config.title.align ?? "center")), textBaseline: "middle"
  };
  const rows = axes.flatMap(axis => axis[part].values.map((value, index) => ({
    x: axis.x, y: axis[part].y[index], text: axis[part].text?.[index], config: axis.config[part]
  })));
  if (part === "ticks") return {
    length: rows.length, x1: rows.map(row => row.x - row.config.length / 2),
    y1: rows.map(row => row.y), x2: rows.map(row => row.x + row.config.length / 2),
    y2: rows.map(row => row.y)
  };
  return {
    length: rows.length, x: rows.map(row => row.x - row.config.offset),
    y: rows.map(row => row.y), text: rows.map(row => row.text),
    textAlign: uniform(rows.map(row => row.config.align ?? "right")), textBaseline: "middle"
  };
}

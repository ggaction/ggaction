// Independent numerical reference: no production mapper, layout or path imports.
export function mapReferencePosition(value, domain, range, type = "linear") {
  const transform = type === "log" ? Math.log : value => value;
  const fraction = (transform(value) - transform(domain[0])) /
    (transform(domain[1]) - transform(domain[0]));
  return range[0] + fraction * (range[1] - range[0]);
}

export function partitionReference(values, mode) {
  if (!values.every(Number.isFinite)) throw new TypeError("Finite series values required.");
  if (["stack", "fill", "center"].includes(mode) && values.some(v => v < 0)) {
    throw new RangeError("Nonnegative series values required.");
  }
  const total = values.reduce((a, b) => a + b, 0);
  let positive = mode === "center" ? -total / 2 : 0;
  let negative = 0;
  return values.map(value => {
    if (mode === "overlay" || mode === "group") return [0, value];
    if (mode === "diverging" && value < 0) {
      const start = negative;
      negative += value;
      return [start, negative];
    }
    const height = mode === "fill" ? total === 0 ? 0 : value / total : value;
    const start = positive;
    positive += height;
    return [start, positive];
  });
}

export function splitReferenceSegments(samples) {
  const result = [];
  let current = [];
  for (const sample of samples) {
    if (sample.lower == null || sample.upper == null) {
      if (current.length >= 2) result.push(current);
      current = [];
    } else {
      if (![sample.position, sample.lower, sample.upper].every(Number.isFinite)) {
        throw new TypeError("Finite area coordinates required.");
      }
      current.push(sample);
    }
  }
  if (current.length >= 2) result.push(current);
  return result;
}

export function referenceAreaCommands(samples, {
  independentDomain, measureDomain, horizontal = false, measureType = "linear",
  width, height, margin
}) {
  const independentRange = horizontal ? [height - margin, margin] : [margin, width - margin];
  const measureRange = horizontal ? [margin, width - margin] : [height - margin, margin];
  const point = (sample, bound) => {
    const independent = mapReferencePosition(sample.position, independentDomain, independentRange);
    const measure = mapReferencePosition(sample[bound], measureDomain, measureRange, measureType);
    return horizontal ? { x: measure, y: independent } : { x: independent, y: measure };
  };
  const lower = samples.map(sample => point(sample, "lower"));
  const upper = [...samples].reverse().map(sample => point(sample, "upper"));
  return [{ op: "M", ...lower[0] }, ...lower.slice(1).map(p => ({ op: "L", ...p })),
    ...upper.map(p => ({ op: "L", ...p })), { op: "Z" }];
}

export function referenceBarItems(rows, mode, { width, height, margin }) {
  const categories = [...new Set(rows.map(row => row.category))];
  const groups = [...new Set(rows.map(row => row.series))];
  const cells = categories.map(category => groups.map(series => rows
    .filter(row => row.category === category && row.series === series)
    .reduce((sum, row) => sum + row.value, 0)));
  const partitions = cells.map(values => partitionReference(values, mode));
  const domain = [0, Math.max(...partitions.flat(2))];
  const categoryWidth = (width - 2 * margin) / categories.length;
  const slotWidth = mode === "group" ? categoryWidth / groups.length : categoryWidth;
  const barWidth = slotWidth * 0.72;
  return {
    categories, groups, domain, categoryWidth, slotWidth,
    items: partitions.flatMap((partition, index) => partition.map(([lower, upper], group) => {
      const center = margin + index * categoryWidth + (mode === "group"
        ? (group + 0.5) * slotWidth : categoryWidth / 2);
      const y1 = mapReferencePosition(lower, domain, [height - margin, margin]);
      const y2 = mapReferencePosition(upper, domain, [height - margin, margin]);
      return { x: center - barWidth / 2, y: Math.min(y1, y2), width: barWidth,
        height: Math.abs(y1 - y2), fill: "#4c78a8", stroke: "white", strokeWidth: 0.5 };
    }))
  };
}

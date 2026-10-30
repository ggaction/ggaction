// Native Cartesian axis geometry shared by explicit materialization and sampling.
export function axisBaseline(bounds, channel, position) {
  if (channel === "x") {
    return position === "top" ? bounds.y : bounds.y + bounds.height;
  }
  return position === "right" ? bounds.x + bounds.width : bounds.x;
}

export function resolveAxisLineGeometry(bounds, channel, position, range) {
  const baseline = axisBaseline(bounds, channel, position);
  return channel === "x"
    ? { x1: range[0], y1: baseline, x2: range[1], y2: baseline }
    : { x1: baseline, y1: range[0], x2: baseline, y2: range[1] };
}

export function resolveAxisTickGeometry({
  bounds,
  channel,
  position,
  positions,
  length
}) {
  const baseline = axisBaseline(bounds, channel, position);
  if (channel === "x") {
    const end = position === "top" ? baseline - length : baseline + length;
    return { x1: positions, y1: baseline, x2: positions, y2: end };
  }
  const end = position === "right" ? baseline + length : baseline - length;
  return position === "right"
    ? { x1: baseline, y1: positions, x2: end, y2: positions }
    : { x1: end, y1: positions, x2: baseline, y2: positions };
}

export function resolveAxisLabelGeometry({
  bounds,
  channel,
  position,
  positions,
  offset
}) {
  const baseline = axisBaseline(bounds, channel, position);
  if (channel === "x") {
    return {
      x: positions,
      y: position === "top" ? baseline - offset : baseline + offset,
      textAlign: "center",
      textBaseline: position === "top" ? "bottom" : "top"
    };
  }
  return {
    x: position === "right" ? baseline + offset : baseline - offset,
    y: positions,
    textAlign: position === "right" ? "left" : "right",
    textBaseline: "middle"
  };
}

export function resolveAxisTitleGeometry({
  bounds,
  channel,
  position,
  along,
  offset
}) {
  const baseline = axisBaseline(bounds, channel, position);
  return channel === "x"
    ? { x: along, y: position === "top" ? baseline - offset : baseline + offset }
    : { x: position === "right" ? baseline + offset : baseline - offset, y: along };
}

// Existing multiline labels keep their native baseline-relative line roles.
export function axisLabelLineOffset(channel, baseline, line, count, lineHeight) {
  return (channel === "x" ? (baseline === "top" ? line : -line)
    : line - (count - 1) / 2) * lineHeight;
}

export function resolveAxisLineRange(resolvedScale, bounds, channel, explicitRange) {
  const range = resolvedScale?.range;
  if (explicitRange || resolvedScale?.type !== "time" || !Number.isFinite(resolvedScale.bandwidth)) return range;
  const plotRange = channel === "x" ? [bounds.x, bounds.x + bounds.width] : [bounds.y + bounds.height, bounds.y];
  return Math.sign(range[1] - range[0]) === Math.sign(plotRange[1] - plotRange[0]) ? plotRange : plotRange.reverse();
}

import { axisLabelLineOffset, resolveAxisLabelGeometry } from "../grammar/axisGeometry.js";
import { mapOrdinalPositionValues, mapContinuousScaleValues } from "../grammar/scales/index.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { resolveTextBounds } from "../core/textMetrics.js";
import { axisLabelTexts, axisLabelLines } from "./axisLabelText.js";

// Settle wrapping once. Sampling a prepared layout never rewraps text.
export function prepareAxisLabelLines(text, config, profile) {
  const expanded = config.maxWidth !== undefined || text.some(value => /[\r\n]/u.test(value));
  let count = 0;
  return cloneAndFreeze({ text, lines: expanded ? text.map(value => {
    const lines = axisLabelLines(value, config, profile);
    validateGeneratedItemLimit(count += lines.length, "Axis label line count");
    return lines;
  }) : null });
}

// This consumes the already validated native values and resolved frame. It
// retains the selected raw indices independently from displayed/wrapped text.
export function prepareAxisLabelLayout({ values, scale, config, channel, bounds, indices, profile, edgeAligned = false }) {
  const discrete = ["ordinal", "band", "point"].includes(scale.type);
  indices ??= values.map((_, index) => index);
  values = indices.map(index => values[index]);
  let positions = discrete
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
  let text = axisLabelTexts(values, scale, config);
  // Empty mapped text suppresses the label, never its raw tick or scale value.
  // Filter all aligned arrays before wrapping so group/color indices stay dense.
  if (text.includes("")) {
    const visible = text.map((value, index) => value === "" ? -1 : index)
      .filter(index => index !== -1);
    indices = visible.map(index => indices[index]);
    values = visible.map(index => values[index]);
    positions = visible.map(index => positions[index]);
    text = visible.map(index => text[index]);
  }
  const geometry = {
    values, indices,
    ...resolveAxisLabelGeometry({
      bounds,
      channel,
      position: config.position,
      positions: positions.map(value => value + (config.alongOffset ?? 0)),
      offset: config.offset
    })
  };
  return cloneAndFreeze({ geometry, prepared: prepareAxisLabelLines(text, config, profile),
    config, channel, profile, bounds, positions, range: scale.range, edgeAligned });
}

function expandPreparedLabels(resolved, prepared, config, channel) {
  const { text } = prepared;
  if (prepared.lines === null) {
    return {
      ...resolved,
      text,
      groups: text.map((_, index) => index)
    };
  }
  const lineHeight = config.lineHeight ?? config.fontSize * 1.2;
  const expanded = { text: [], x: [], y: [], groups: [] };
  for (let index = 0; index < text.length; index += 1) {
    const lines = prepared.lines[index];
    validateGeneratedItemLimit(
      expanded.text.length + lines.length,
      "Axis label line count"
    );
    const baseX = Array.isArray(resolved.x) ? resolved.x[index] : resolved.x;
    const baseY = Array.isArray(resolved.y) ? resolved.y[index] : resolved.y;
    for (let line = 0; line < lines.length; line += 1) {
      expanded.text.push(lines[line]);
      expanded.x.push(baseX);
      expanded.y.push(baseY + axisLabelLineOffset(channel, resolved.textBaseline, line, lines.length, lineHeight));
      expanded.groups.push(index);
    }
  }
  return { ...resolved, ...expanded };
}

function unionLabelBounds(records) {
  const byGroup = new Map();
  for (const { bounds, group } of records) {
    const previous = byGroup.get(group);
    byGroup.set(group, previous === undefined ? bounds : {
      left: Math.min(previous.left, bounds.left),
      right: Math.max(previous.right, bounds.right),
      top: Math.min(previous.top, bounds.top),
      bottom: Math.max(previous.bottom, bounds.bottom)
    });
  }
  return [...byGroup.values()];
}

// Positions and frame come from native scale/axis owners. The exact profile is
// supplied by preparation; no Canvas measurement or rendering occurs here.
export function resolvePreparedAxisLabelLayout({ geometry, prepared, config, channel, profile,
  bounds, positions, range, edgeAligned = false }) {
  const resolved = expandPreparedLabels(geometry, prepared, config, channel);
  if (channel === "x" && Math.abs(Math.sin(config.rotation)) > 1e-9) {
    const outward = config.position === "bottom" ? 1 : -1;
    resolved.textAlign = Math.sin(config.rotation) * outward < 0 ? "right" : "left";
    resolved.textBaseline = "middle";
  }
  const measuredBounds = () => resolved.text.map((value, index) => resolveTextBounds({
    x: Array.isArray(resolved.x) ? resolved.x[index] : resolved.x,
    y: Array.isArray(resolved.y) ? resolved.y[index] : resolved.y,
    text: value,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    textAlign: resolved.textAlign,
    textBaseline: resolved.textBaseline,
    rotation: config.rotation
  }, profile));
  let labelBounds = measuredBounds();
  if (edgeAligned || config.rotation !== 0) {
    const horizontal = channel === "x";
    const near = ["bottom", "right"].includes(config.position);
    const edge = horizontal ? bounds.y + (near ? bounds.height : 0)
      : bounds.x + (near ? bounds.width : 0);
    const boundKey = horizontal ? (near ? "top" : "bottom") : (near ? "left" : "right");
    const grouped = unionLabelBounds(labelBounds.map((bounds, index) => ({ bounds, group: resolved.groups[index] })));
    const shifts = grouped.map(item => edge + (near ? config.offset : -config.offset) - item[boundKey]);
    const axis = horizontal ? "y" : "x";
    const positions = resolved[axis];
    resolved[axis] = resolved.text.map((_, index) =>
      (Array.isArray(positions) ? positions[index] : positions) + shifts[resolved.groups[index]]);
    labelBounds = labelBounds.map((item, index) => {
      const delta = shifts[resolved.groups[index]];
      return horizontal ? { ...item, top: item.top + delta, bottom: item.bottom + delta }
        : { ...item, left: item.left + delta, right: item.right + delta };
    });
  }
  if (config.flush === true) {
    const along = channel === "x" ? "x" : "y";
    const lowKey = channel === "x" ? "left" : "top";
    const highKey = channel === "x" ? "right" : "bottom";
    const low = Math.min(...range) + (config.alongOffset ?? 0);
    const high = Math.max(...range) + (config.alongOffset ?? 0);
    const grouped = unionLabelBounds(labelBounds.map((bounds, index) => ({ bounds, group: resolved.groups[index] })));
    const shifts = grouped.map((item, index) => {
      const position = positions[index] + (config.alongOffset ?? 0);
      if (config.flushThreshold !== undefined &&
          Math.min(Math.abs(position - low), Math.abs(position - high)) > config.flushThreshold) return 0;
      if (item[highKey] - item[lowKey] > high - low + 1e-9) {
        throw new Error(`The ${channel}-axis label cannot flush inside the scale span.`);
      }
      return item[lowKey] < low ? low - item[lowKey]
        : item[highKey] > high ? high - item[highKey] : 0;
    });
    const labelPositions = resolved[along];
    resolved[along] = resolved.text.map((_, index) =>
      (Array.isArray(labelPositions) ? labelPositions[index] : labelPositions) + shifts[resolved.groups[index]]);
    labelBounds = labelBounds.map((item, index) => {
      const delta = shifts[resolved.groups[index]];
      return { ...item, [lowKey]: item[lowKey] + delta, [highKey]: item[highKey] + delta };
    });
  }
  if (config.align !== undefined) {
    resolved.textAlign = config.align;
    labelBounds = measuredBounds();
  }
  const rotatedOverlap = config.rotation !== 0;
  const collisionBounds = rotatedOverlap ? resolved.text.map((text, index) => {
    const x = Array.isArray(resolved.x) ? resolved.x[index] : resolved.x;
    const y = Array.isArray(resolved.y) ? resolved.y[index] : resolved.y;
    const cosine = Math.cos(config.rotation), sine = Math.sin(config.rotation);
    return resolveTextBounds({
      x: x * cosine + y * sine, y: -x * sine + y * cosine, text,
      fontSize: config.fontSize, fontFamily: config.fontFamily, fontWeight: config.fontWeight,
      textAlign: resolved.textAlign, textBaseline: resolved.textBaseline
    }, profile);
  }) : labelBounds;
  const groupedBounds = unionLabelBounds(collisionBounds.map((bounds, index) => ({
    bounds,
    group: resolved.groups[index]
  })));
  const orderedBounds = groupedBounds.sort((left, right) => channel === "x"
    ? left.left - right.left
    : left.top - right.top);
  const requiredBounds = labelBounds.length === 0 ? undefined
    : unionLabelBounds(labelBounds.map(bounds => ({ bounds, group: 0 })))[0];
  return { resolved, labelBounds, orderedBounds, requiredBounds, rotatedOverlap };
}

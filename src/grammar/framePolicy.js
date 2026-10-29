import { annotateError } from "../core/diagnostics.js";
import { validateGeneratedItemLimit, validateOptionObject, validateWorkLimit } from "../core/validation.js";

function identifier(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function records(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be a dense array.`);
  validateGeneratedItemLimit(value.length, label);
  for (let i = 0; i < value.length; i += 1) {
    if (!Object.hasOwn(value, i)) throw new TypeError(`${label} must be a dense array.`);
  }
  return value;
}

function policyError(frame, reason, owners) {
  return annotateError(new Error(`Cartesian frame "${frame.id}" ${reason}: ${owners.join(", ")}.`), {
    code: "invalid-value", resourceId: frame.id, candidates: owners
  });
}

function inspectFrame(frame) {
  validateOptionObject(frame, ["id", "region", "bindings", "guides"], "Cartesian frame");
  identifier(frame.id, "Frame id");
  validateOptionObject(frame.region, ["x", "y", "width", "height"], "Frame region");
  const { x, y, width, height } = frame.region;
  if (![x, y, width, height, x + width, y + height].every(Number.isFinite) || width < 0 || height < 0) {
    throw new RangeError("Frame region requires finite coordinates and nonnegative dimensions.");
  }
  const bindings = records(frame.bindings, "Frame bindings").map(binding => {
    validateOptionObject(binding, ["owner", "scale"], "Frame binding");
    return { owner: identifier(binding.owner, "Binding owner"), scale: identifier(binding.scale, "Binding scale") };
  });
  const visible = new Set();
  for (const guide of records(frame.guides, "Frame guides")) {
    validateOptionObject(guide, ["id", "scale", "visible"], "Frame guide");
    const id = identifier(guide.id, "Guide id"), scale = identifier(guide.scale, "Guide scale");
    if (typeof guide.visible !== "boolean") throw new TypeError("Guide visibility must be boolean.");
    if (guide.visible) visible.add(id);
    bindings.push({ owner: `guide:${id}`, scale });
  }
  const scales = new Set(bindings.map(binding => binding.scale));
  if (scales.size > 1) throw policyError(frame, "requires one Y scale", bindings.map(({ owner, scale }) => `${owner}=${scale}`));
  if (visible.size > 1) throw policyError(frame, "requires at most one visible Y guide", [...visible]);
  return { ...frame.region, id: frame.id, active: scales.size > 0 };
}

// Adapters supply Cartesian frames only, with scope-qualified resource identities.
// A frame is a plot region, rather than an individual mark or layer.
export function assertSingleYFrames(frames) {
  const ids = new Set();
  const regions = records(frames, "Cartesian frames").map(frame => {
    const region = inspectFrame(frame);
    if (ids.has(region.id)) throw new Error(`Duplicate Cartesian frame "${region.id}".`);
    ids.add(region.id);
    return region;
  }).filter(region => region.active && region.width > 0 && region.height > 0);
  // Sweep the direction with the larger normalized separation of frame origins.
  const separation = (axis, size) => regions.length === 0 ? 0 :
    (Math.max(...regions.map(region => region[axis])) - Math.min(...regions.map(region => region[axis]))) /
      regions.reduce((sum, region) => sum + region[size] / regions.length, 0);
  const horizontal = separation("x", "width") >= separation("y", "height");
  const axis = horizontal ? "x" : "y", size = horizontal ? "width" : "height";
  const other = horizontal ? "y" : "x", otherSize = horizontal ? "height" : "width";
  regions.sort((left, right) => left[axis] - right[axis]);
  let active = [], comparisons = 0;
  for (const region of regions) {
    active = active.filter(previous => previous[axis] + previous[size] > region[axis]);
    for (const previous of active) {
      validateWorkLimit(++comparisons, "Frame overlap comparisons");
      if (previous[other] < region[other] + region[otherSize] && region[other] < previous[other] + previous[otherSize]) {
        throw policyError(region, "overlaps an independent Cartesian frame", [previous.id, region.id]);
      }
    }
    active.push(region);
  }
}

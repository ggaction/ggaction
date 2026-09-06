import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { resolveViolinRoles } from "../violinPlots/create.js";
import {
  applyFacadeGuides,
  normalizeEncoding,
  normalizeGuides,
  resolveFacadeData,
  resolveFacadeId,
  validateFacadeOptions
} from "./shared.js";

const CREATE_OPTIONS = Object.freeze([
  "id", "data", "coordinate", "category", "value", "orientation", "side",
  "density", "summary", "points", "color", "guides"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "data", "category", "value", "orientation", "side", "density",
  "summary", "points", "color"
]);
const DENSITY_OPTIONS = Object.freeze([
  "bandwidth", "extent", "steps", "kernel", "normalization", "width", "area"
]);
const BOX_OPTIONS = Object.freeze([
  "type", "whisker", "width", "outliers", "box", "median", "outlier"
]);
const INTERVAL_OPTIONS = Object.freeze([
  "type", "center", "extent", "method", "level", "point", "errorBar"
]);
const POINTS_OPTIONS = Object.freeze([
  "type", "size", "shape", "point", "jitter", "packing"
]);
const SLOT_OFFSET_BAND = 0.22;
const POINT_SPREAD_BAND = 0.12;

function normalizeOrientation(value) {
  const orientation = value ?? "vertical";
  if (!["vertical", "horizontal"].includes(orientation)) {
    throw new Error(`Unsupported Raincloud orientation "${orientation}".`);
  }
  return orientation;
}

function normalizeSide(value) {
  const side = value ?? "before";
  if (!["before", "after"].includes(side)) {
    throw new Error(`Unsupported Raincloud side "${side}".`);
  }
  return side;
}

function normalizeDensity(value, current) {
  if (value === false) return false;
  const patch = value ?? {};
  validateOptionObject(patch, DENSITY_OPTIONS, "Raincloud density");
  return { ...(current === false ? {} : current ?? {}), ...patch };
}

function normalizeSummary(value, current) {
  if (value === false) return false;
  const patch = value ?? {};
  if (!isPlainObject(patch)) {
    throw new TypeError("Raincloud summary must be false or a plain object.");
  }
  const type = patch.type ?? (current === false ? undefined : current?.type) ?? "box";
  const keys = type === "box" ? BOX_OPTIONS : type === "interval" ? INTERVAL_OPTIONS : undefined;
  if (keys === undefined) throw new Error(`Unsupported Raincloud summary type "${type}".`);
  validateOptionObject(patch, keys, "Raincloud summary");
  const base = current !== false && current?.type === type ? current : {};
  return { ...base, ...patch, type };
}

function normalizePoints(value, current) {
  if (value === false) return false;
  const patch = value ?? {};
  if (!isPlainObject(patch)) {
    throw new TypeError("Raincloud points must be false or a plain object.");
  }
  const type = patch.type ?? (current === false ? undefined : current?.type) ?? "beeswarm";
  if (!["strip", "beeswarm"].includes(type)) {
    throw new Error(`Unsupported Raincloud points type "${type}".`);
  }
  validateOptionObject(patch, POINTS_OPTIONS, "Raincloud points");
  if (type === "strip" && Object.hasOwn(patch, "packing")) {
    throw new Error("Raincloud strip points do not accept packing.");
  }
  if (type === "beeswarm" && Object.hasOwn(patch, "jitter")) {
    throw new Error("Raincloud beeswarm points do not accept jitter.");
  }
  const base = current !== false && current?.type === type ? current : {};
  return { ...base, ...patch, type };
}

function roleScale(encoding, fallbackId, label, defaults = {}) {
  if (encoding.scale !== undefined && !isPlainObject(encoding.scale)) {
    throw new TypeError(`${label}.scale must be a plain object.`);
  }
  if (defaults.type === "band" && encoding.scale?.type !== undefined && encoding.scale.type !== "band") {
    throw new TypeError(`${label}.scale.type must be band.`);
  }
  return {
    ...encoding,
    scale: { ...defaults, ...(encoding.scale ?? {}), id: encoding.scale?.id ?? fallbackId }
  };
}

function normalizeColor(value, category, id) {
  if (value === undefined || value === false) return undefined;
  const color = normalizeEncoding(value, "Raincloud color");
  if (color.field !== category.field) {
    throw new Error("Raincloud color must encode its category field.");
  }
  if (color.scale !== undefined && !isPlainObject(color.scale)) {
    throw new TypeError("Raincloud color.scale must be a plain object.");
  }
  return {
    ...color,
    fieldType: color.fieldType ?? "nominal",
    scale: { ...(color.scale ?? {}), id: color.scale?.id ?? `${id}Color` }
  };
}

function rolePositions(category, value, orientation) {
  return orientation === "vertical"
    ? { x: category, y: value, categoryChannel: "x" }
    : { x: value, y: category, categoryChannel: "y" };
}

function densitySide(orientation, side) {
  if (orientation === "vertical") return side === "before" ? "left" : "right";
  return side === "before" ? "top" : "bottom";
}

function markRematerializer(layer) {
  return {
    point: "rematerializePointMark",
    bar: "rematerializeBarMark",
    rule: "rematerializeRuleMark"
  }[layer?.mark?.type];
}

function applySlotOffset(program, ids, categoryChannel, side, follow = []) {
  const band = (side === "before" ? 1 : -1) * SLOT_OFFSET_BAND;
  let next = program;
  for (const id of ids) {
    const layer = findLayer(next, id);
    if (layer === undefined) continue;
    next = next._withMarkConfig(id, {
      ...next.markConfigs[id],
      categorySlotOffset: { channel: categoryChannel, band }
    });
  }
  for (const id of [...ids, ...follow]) {
    const layer = findLayer(next, id);
    const operation = markRematerializer(layer);
    if (operation !== undefined) next = next[operation]({ id });
  }
  return next;
}

function boxOffsetTargets(program, id) {
  const box = program.markConfigs[id]?.boxPlot;
  const errorBar = program.markConfigs[box?.whiskerId]?.errorBar;
  return {
    offset: [id, box?.whiskerId, errorBar?.lowerCapId, errorBar?.upperCapId, box?.outlierId]
      .filter(candidate => candidate !== undefined && findLayer(program, candidate) !== undefined),
    follow: [box?.medianId].filter(candidate => findLayer(program, candidate) !== undefined)
  };
}

function intervalOffsetTargets(program, id) {
  const intervalId = `${id}Interval`;
  const errorBar = program.markConfigs[intervalId]?.errorBar;
  return [id, intervalId, errorBar?.lowerCapId, errorBar?.upperCapId]
    .filter(candidate => candidate !== undefined && findLayer(program, candidate) !== undefined);
}

function addSummary(program, config, positions) {
  if (config.summary === false) return program;
  const id = config.childIds.summary;
  const { type, ...options } = config.summary;
  let next;
  if (type === "box") {
    next = program.createBoxPlot({
      id,
      data: config.source,
      coordinate: config.coordinate,
      x: positions.x,
      y: positions.y,
      width: options.width ?? { band: 0.24 },
      ...options,
      guides: false
    });
    if (config.color !== undefined) next = next.encodeColor({ target: id, ...config.color });
    const targets = boxOffsetTargets(next, id);
    return applySlotOffset(next, targets.offset, positions.categoryChannel, config.side, targets.follow);
  }
  const { center, extent, method, level, point, errorBar } = options;
  const interval = {
    field: config.value.field,
    scale: config.value.scale,
    ...(center === undefined ? {} : { center }),
    ...(extent === undefined ? {} : { extent }),
    ...(method === undefined ? {} : { method }),
    ...(level === undefined ? {} : { level })
  };
  next = program.createIntervalPlot({
    id,
    data: config.source,
    coordinate: config.coordinate,
    x: config.orientation === "vertical" ? config.category : interval,
    y: config.orientation === "vertical" ? interval : config.category,
    ...(point === undefined ? {} : { point }),
    ...(errorBar === undefined ? {} : { errorBar }),
    guides: false
  });
  if (config.color !== undefined) next = next.encodeColor({ target: id, ...config.color });
  return applySlotOffset(
    next,
    intervalOffsetTargets(next, id),
    positions.categoryChannel,
    config.side
  );
}

function addPoints(program, config, positions) {
  if (config.points === false) return program;
  const id = config.childIds.points;
  const { type, size, shape, point } = config.points;
  const common = {
    id,
    data: config.source,
    coordinate: config.coordinate,
    x: positions.x,
    y: positions.y,
    ...(config.color === undefined ? {} : { color: config.color }),
    ...(size === undefined ? {} : { size }),
    ...(shape === undefined ? {} : { shape }),
    ...(point === undefined ? {} : { point }),
    guides: false
  };
  let next;
  if (type === "strip") {
    const jitter = Object.hasOwn(config.points, "jitter")
      ? config.points.jitter
      : { maxOffset: { band: POINT_SPREAD_BAND } };
    next = program.createStripPlot({ ...common, jitter });
  } else {
    const requested = config.points.packing;
    const packing = requested === false
      ? false
      : {
          maxOffset: { band: POINT_SPREAD_BAND },
          ...(requested ?? {})
        };
    next = program.createBeeswarmPlot({ ...common, packing });
  }
  return applySlotOffset(next, [id], positions.categoryChannel, config.side);
}

function buildRaincloud(program, config) {
  const positions = rolePositions(config.category, config.value, config.orientation);
  let next = program;
  if (config.density !== false) {
    const { area, ...density } = config.density;
    next = next.createViolinPlot({
      id: config.childIds.cloud,
      data: config.source,
      coordinate: config.coordinate,
      x: positions.x,
      y: positions.y,
      ...(config.color === undefined ? {} : { color: config.color }),
      density: { ...density, side: densitySide(config.orientation, config.side) },
      ...(area === undefined ? {} : { area }),
      guides: false
    });
  }
  next = addSummary(next, config, positions);
  next = addPoints(next, config, positions);
  const ownerId = [config.childIds.cloud, config.childIds.summary, config.childIds.points]
    .find(id => findLayer(next, id) !== undefined);
  if (ownerId === undefined) throw new Error("Raincloud requires at least one enabled component.");
  const guideTarget = [config.childIds.points, config.childIds.cloud, config.childIds.summary]
    .find(id => findLayer(next, id) !== undefined);
  next = applyFacadeGuides(next, config.guides, guideTarget, config.guides);
  const ownedChildIds = [config.childIds.cloud, config.childIds.summary, config.childIds.points]
    .filter(id => findLayer(next, id) !== undefined);
  return next._withMarkConfig(ownerId, {
    ...next.markConfigs[ownerId],
    raincloudPlot: { ...config, ownerId, ownedChildIds, materialized: true }
  })._withContext({ currentMark: ownerId, currentData: config.source });
}

function alignExistingRoleScales(program, config) {
  let next = program;
  for (const encoding of [config.category, config.value, config.color]) {
    const scale = encoding?.scale;
    if (!isPlainObject(scale) || findSemanticScale(next, scale.id) === undefined) continue;
    const patch = Object.fromEntries(Object.entries(scale).filter(
      ([property, value]) => property !== "id" && value !== undefined
    ));
    if (Object.keys(patch).length > 0) next = next.editScale({ id: scale.id, ...patch });
  }
  return next;
}

function normalizeCreate(program, args, operation) {
  const id = resolveFacadeId(program, args.id, { defaultId: "raincloudPlot", operation });
  if (Object.values(program.markConfigs).some(value => value.raincloudPlot?.id === id)) {
    throw new Error(`Raincloud plot "${id}" already exists.`);
  }
  const source = resolveFacadeData(program, args.data, operation);
  const dataset = findDataset(program, source);
  const orientation = normalizeOrientation(args.orientation);
  if (args.category === undefined || args.value === undefined) {
    throw new Error(`${operation} requires category and value.`);
  }
  const raw = orientation === "vertical"
    ? resolveViolinRoles(dataset, args.category, args.value, operation)
    : resolveViolinRoles(dataset, args.value, args.category, operation);
  if (raw.orientation !== orientation) {
    throw new Error(`${operation} category and value do not match orientation ${orientation}.`);
  }
  const category = roleScale(
    raw.category,
    `${id}Category`,
    `${operation} category`,
    { type: "band" }
  );
  const value = roleScale(raw.value, `${id}Value`, `${operation} value`);
  const density = normalizeDensity(args.density);
  const summary = normalizeSummary(args.summary);
  const points = normalizePoints(args.points);
  if ([density, summary, points].every(component => component === false)) {
    throw new Error("Raincloud requires at least one enabled component.");
  }
  return {
    id,
    source,
    ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
    category,
    value,
    orientation,
    side: normalizeSide(args.side),
    density,
    summary,
    points,
    color: normalizeColor(args.color, category, id),
    guides: normalizeGuides(args.guides, operation),
    childIds: {
      cloud: `${id}Cloud`,
      summary: `${id}Summary`,
      points: `${id}Points`
    }
  };
}

function raincloudOwner(program, requested) {
  const owners = Object.entries(program.markConfigs)
    .filter(([, value]) => value.raincloudPlot?.materialized === true)
    .map(([id]) => id);
  if (requested !== undefined) {
    const target = validateUserId(requested, "Raincloud target");
    const owner = owners.find(id => id === target || program.markConfigs[id].raincloudPlot.id === target);
    if (owner === undefined) throw new Error(`Unknown Raincloud plot "${target}".`);
    return owner;
  }
  if (owners.includes(program.context.currentMark)) return program.context.currentMark;
  if (owners.length === 1) return owners[0];
  if (owners.length === 0) throw new Error("editRaincloudPlot requires a Raincloud plot.");
  throw new Error("editRaincloudPlot target is ambiguous; provide target.");
}

export const createRaincloudPlot = action(
  { op: "createRaincloudPlot", description: "Create a half-density, summary, and raw-point distribution plot." },
  function (args = {}) {
    const operation = "createRaincloudPlot";
    validateFacadeOptions(args, CREATE_OPTIONS, operation);
    return buildRaincloud(this, normalizeCreate(this, args, operation));
  }
);

export const editRaincloudPlot = action(
  { op: "editRaincloudPlot", description: "Revise one Raincloud plot's shared source and statistical roles." },
  function (args = {}) {
    const operation = "editRaincloudPlot";
    validateFacadeOptions(args, EDIT_OPTIONS, operation);
    if (!EDIT_OPTIONS.slice(1).some(key => Object.hasOwn(args, key))) {
      throw new Error(`${operation} requires at least one Raincloud option.`);
    }
    const ownerId = raincloudOwner(this, args.target);
    const current = this.markConfigs[ownerId].raincloudPlot;
    const candidateArgs = {
      id: current.id,
      data: Object.hasOwn(args, "data") ? args.data : current.source,
      ...(current.coordinate === undefined ? {} : { coordinate: current.coordinate }),
      category: Object.hasOwn(args, "category") ? args.category : current.category,
      value: Object.hasOwn(args, "value") ? args.value : current.value,
      orientation: args.orientation ?? current.orientation,
      side: args.side ?? current.side,
      density: Object.hasOwn(args, "density")
        ? normalizeDensity(args.density, current.density)
        : current.density,
      summary: Object.hasOwn(args, "summary")
        ? normalizeSummary(args.summary, current.summary)
        : current.summary,
      points: Object.hasOwn(args, "points")
        ? normalizePoints(args.points, current.points)
        : current.points,
      color: Object.hasOwn(args, "color") ? args.color : current.color,
      guides: current.guides
    };
    const withoutCurrent = this.removeMark({ target: ownerId });
    const revised = normalizeCreate(withoutCurrent, candidateArgs, operation);
    return buildRaincloud(alignExistingRoleScales(withoutCurrent, revised), revised);
  }
);

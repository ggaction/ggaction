import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  deriveHorizon,
  validateHorizonTransform
} from "../../grammar/horizon.js";
import { resolvePalette } from "../../grammar/palettes.js";
import {
  normalizeTemporalValue,
  readNominalField,
  readQuantitativeField
} from "../../grammar/scales/index.js";
import {
  resolveColorScaleDefinition,
  resolvePositionScaleDefinition
} from "../scales/definitions.js";
import {
  findDataset,
  findLayer,
  findSemanticScale,
  hasDataset,
  resolveEligibleLayer
} from "../../selectors/index.js";
import { applyMaterializationPlan } from
  "../../materialization/dependencies.js";
import { planHorizonRematerialization } from
  "../../materialization/horizon.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";

const OPTIONS = Object.freeze([
  "target", "source", "x", "y", "groupBy", "bands", "baseline", "extent",
  "resolve", "missing", "overflow", "palette"
]);
const FIELD_OPTIONS = Object.freeze(["field", "fieldType", "scale"]);
const EDIT_OPTIONS = OPTIONS;
const EDITABLE = Object.freeze(EDIT_OPTIONS.filter(option => option !== "target"));
const SCALE_PROPERTIES = Object.freeze([
  "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "paddingInner", "paddingOuter",
  "padding", "align", "interpolate", "unknown"
]);

function findArea(program, requested) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Horizon target id");
  return resolveEligibleLayer(program, {
    target,
    label: "Horizon area",
    predicate: layer => layer.mark?.type === "area"
  });
}

function resolveSource(program, layer, requested) {
  const id = validateUserId(
    requested ?? layer.data ?? program.context.currentData,
    "Horizon source dataset id"
  );
  if (!hasDataset(program, id)) {
    throw new Error(`Unknown Horizon source dataset "${id}".`);
  }
  return findDataset(program, id);
}

function fieldOption(value, role) {
  if (typeof value === "string") return { field: value };
  if (!isPlainObject(value)) {
    throw new TypeError(`Horizon ${role} must be a field string or plain object.`);
  }
  validateOptionObject(value, FIELD_OPTIONS, `Horizon ${role}`);
  return value;
}

function inferredFieldType(rows, field, role) {
  if (role === "y") {
    const valid = rows.filter(row => Number.isFinite(row?.[field]));
    if (valid.length === 0) {
      throw new TypeError(`Horizon y field "${field}" requires a finite value.`);
    }
    return "quantitative";
  }
  if (rows.every(row => Number.isFinite(row?.[field]))) return "quantitative";
  for (const [index, row] of rows.entries()) {
    normalizeTemporalValue(row?.[field], field, index);
  }
  return "temporal";
}

function compatibleEncoding(encoding, role) {
  return encoding?.field !== undefined && (
    role === "x"
      ? ["quantitative", "temporal"].includes(encoding.fieldType)
      : encoding.fieldType === "quantitative"
  );
}

function uniqueStoredEncoding(program, dataset, role) {
  const candidates = program.semanticSpec.layers
    .filter(layer => layer.data === dataset.id)
    .map(layer => layer.encoding?.[role])
    .filter(encoding => compatibleEncoding(encoding, role));
  const unique = new Map(candidates.map(encoding => [
    JSON.stringify([
      encoding.field,
      encoding.fieldType,
      encoding.scale,
      encoding.title
    ]),
    encoding
  ]));
  if (unique.size > 1) {
    throw new Error(`Horizon ${role} inference is ambiguous; provide ${role}.`);
  }
  return [...unique.values()][0];
}

function resolveField(program, layer, dataset, requested, role) {
  const existing = compatibleEncoding(layer.encoding?.[role], role)
    ? layer.encoding[role]
    : undefined;
  if (requested === undefined) {
    const inferred = existing ?? uniqueStoredEncoding(program, dataset, role);
    if (inferred === undefined) {
      throw new Error(`encodeHorizon requires ${role} or one inferable ${role} encoding.`);
    }
    return {
      field: inferred.field,
      fieldType: inferred.fieldType,
      ...(role === "x" && inferred.scale !== undefined
        ? { scale: { id: inferred.scale } }
        : {}),
      ...(inferred.title === undefined ? {} : { title: inferred.title })
    };
  }
  const option = fieldOption(requested, role);
  if (typeof option.field !== "string" || option.field.length === 0) {
    throw new TypeError(`Horizon ${role} field must be a non-empty string.`);
  }
  const matching = existing?.field === option.field ? existing : undefined;
  if (option.scale !== undefined && !isPlainObject(option.scale)) {
    throw new TypeError(`Horizon ${role} scale must be a plain object.`);
  }
  const fieldType = option.fieldType ?? matching?.fieldType ??
    inferredFieldType(dataset.values, option.field, role);
  if (
    (role === "x" && !["quantitative", "temporal"].includes(fieldType)) ||
    (role === "y" && fieldType !== "quantitative")
  ) {
    throw new Error(
      `Horizon ${role} fieldType must be ${role === "x" ? "quantitative or temporal" : "quantitative"}.`
    );
  }
  return {
    field: option.field,
    fieldType,
    ...(option.scale !== undefined
      ? { scale: option.scale }
      : role === "x" && matching?.scale !== undefined
        ? { scale: { id: matching.scale } }
        : {}),
    ...(matching?.title === undefined ? {} : { title: matching.title })
  };
}

function resolveGroupBy(layer, dataset, requested) {
  if (requested === false) {
    throw new Error("encodeHorizon groupBy must be a field string when provided.");
  }
  const value = requested ?? layer.encoding?.group?.field;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Horizon groupBy must be a non-empty string.");
  }
  readNominalField(dataset.values, value);
  return value;
}

function outputFields(target) {
  const prefix = `${target}Horizon`;
  return {
    x: `${prefix}X`,
    lower: `${prefix}Lower`,
    upper: `${prefix}Upper`,
    group: `${prefix}Group`,
    color: `${prefix}Color`,
    sign: `${prefix}Sign`,
    band: `${prefix}Band`,
    segment: `${prefix}Segment`
  };
}

function normalizedPaletteColors(transform) {
  const domain = [];
  const range = [];
  for (const sign of ["negative", "positive"]) {
    const palette = transform.palette[sign];
    const dense = palette.count === undefined && transform.bands > 1
      ? resolvePalette(
          { ...palette, count: transform.bands * 2 },
          transform.bands * 2
        )
      : resolvePalette(palette, transform.bands);
    const colors = palette.count === undefined && transform.bands > 1
      ? Array.from({ length: transform.bands }, (_, index) =>
          index === transform.bands - 1 ? dense.at(-1) : dense[index * 2]
        )
      : dense;
    for (let band = 0; band < transform.bands; band += 1) {
      domain.push(`${sign}:${band}`);
      range.push(colors[band]);
    }
  }
  return { domain, range };
}

function foldedScaleOptions(target, requested) {
  if (requested !== undefined && !isPlainObject(requested)) {
    throw new TypeError("Horizon y scale must be a plain object.");
  }
  const options = requested ?? {};
  if (
    options.domain !== undefined &&
    (!Array.isArray(options.domain) ||
      options.domain.length !== 2 ||
      options.domain[0] !== 0 ||
      options.domain[1] !== 1)
  ) {
    throw new Error("Horizon y scale domain must be [0, 1].");
  }
  if (options.type !== undefined && options.type !== "linear") {
    throw new Error('Horizon y scale type must be "linear".');
  }
  return {
    ...options,
    id: options.id ?? `${target}HorizonAmplitude`,
    type: "linear",
    domain: [0, 1],
    nice: false,
    zero: true
  };
}

function inferredTitle(field) {
  const words = field.replaceAll("_", " ");
  return words.length === 0 ? field : words[0].toUpperCase() + words.slice(1);
}

function clearOwnedEncodings(program, layer) {
  let next = program;
  for (const channel of ["x", "y", "group"]) {
    if (layer.encoding?.[channel] === undefined) continue;
    next = next.editSemantic({
      property: `layer[${layer.id}].encoding.${channel}`,
      remove: true
    });
  }
  return next;
}

function validateUnusedEncodings(layer) {
  const conflicts = ["x2", "y2", "color", "pathOrder"].filter(
    channel => layer.encoding?.[channel] !== undefined
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Horizon area target "${layer.id}" already has unsupported ${conflicts.join(", ")} encoding.`
    );
  }
}

function applyHorizonEncoding(program, {
  layer,
  transform,
  xScale,
  yScale,
  colorScale
}) {
  let next = clearOwnedEncodings(program, layer)
    .encodeX({
      target: layer.id,
      field: transform.as.x,
      fieldType: transform.x.fieldType,
      scale: xScale
    })
    .editSemantic({
      property: `layer[${layer.id}].encoding.x.title`,
      value: layer.encoding?.x?.title ?? inferredTitle(transform.x.field)
    })
    .encodeY({
      target: layer.id,
      field: transform.as.lower,
      fieldType: "quantitative",
      scale: yScale
    })
    .encodeGroup({ target: layer.id, field: transform.as.group })
    .encodeY2({
      target: layer.id,
      field: transform.as.upper,
      fieldType: "quantitative"
    })
    .encodeColor({
      target: layer.id,
      field: transform.as.color,
      fieldType: "nominal",
      scale: colorScale
    })
    .editAreaMark({ target: layer.id, opacity: 1 });
  return next;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyScaleDefinition(program, current, definition) {
  const patch = Object.fromEntries(SCALE_PROPERTIES
    .filter(property => Object.hasOwn(definition, property))
    .map(property => [property, definition[property]]));
  const changed = Object.entries(patch).some(
    ([property, value]) => !sameValue(current[property], value)
  );
  return changed ? program.editScale({ id: current.id, ...patch }) : program;
}

function existingScale(program, id, label) {
  const scale = findSemanticScale(program, id);
  if (scale === undefined) throw new Error(`${label} scale "${id}" is missing.`);
  return scale;
}

function editedField(program, layer, source, transform, requested, role) {
  if (requested === undefined) {
    return {
      ...transform[role],
      ...(role === "x" ? { title: layer.encoding.x.title } : {})
    };
  }
  const prior = transform[role];
  return resolveField(program, {
    ...layer,
    encoding: {
      ...layer.encoding,
      [role]: {
        field: prior.field,
        fieldType: prior.fieldType,
        scale: layer.encoding[role].scale,
        ...(role === "x" && layer.encoding.x.title !== undefined
          ? { title: layer.encoding.x.title }
          : {})
      }
    }
  }, source, requested, role);
}

function editedGroupBy(source, previous, requested) {
  if (requested === undefined) return previous;
  if (requested === false) return undefined;
  if (typeof requested !== "string" || requested.length === 0) {
    throw new TypeError("Horizon groupBy must be a field string or false.");
  }
  readNominalField(source.values, requested);
  return requested;
}

function mergedPalette(previous, requested) {
  if (requested === undefined) return previous;
  if (!isPlainObject(requested)) {
    throw new TypeError("Horizon palette must be a plain object.");
  }
  return {
    positive: requested.positive ?? previous.positive,
    negative: requested.negative ?? previous.negative
  };
}

const editHorizon = action(
  {
    op: "editHorizon",
    description: "Revise one Horizon transform and rematerialize its consumers."
  },
  function (args = {}) {
    validateOptionObject(args, EDIT_OPTIONS, "editHorizon");
    if (!EDITABLE.some(option => Object.hasOwn(args, option))) {
      throw new Error("editHorizon requires at least one Horizon option.");
    }
    const layer = resolveEligibleLayer(this, {
      target: args.target,
      label: "Horizon area",
      predicate: candidate => {
        const dataset = findDataset(this, candidate.data);
        return candidate.mark?.type === "area" &&
          dataset?.transform?.length === 1 &&
          dataset.transform[0].type === "horizon";
      }
    });
    const previous = findDataset(this, layer.data);
    const prior = previous.transform[0];
    const sourceId = validateUserId(
      args.source ?? previous.source,
      "Horizon source dataset id"
    );
    const source = findDataset(this, sourceId);
    if (source === undefined) {
      throw new Error(`Unknown Horizon source dataset "${sourceId}".`);
    }
    const x = editedField(this, layer, source, prior, args.x, "x");
    const y = editedField(this, layer, source, prior, args.y, "y");
    const groupBy = editedGroupBy(source, prior.groupBy, args.groupBy);
    const candidate = validateHorizonTransform({
      type: "horizon",
      x: { field: x.field, fieldType: x.fieldType },
      y: { field: y.field, fieldType: y.fieldType },
      ...(groupBy === undefined ? {} : { groupBy }),
      bands: args.bands ?? prior.bands,
      baseline: args.baseline ?? prior.baseline,
      extent: args.extent ?? prior.extent,
      resolve: args.resolve ?? prior.resolve,
      missing: args.missing ?? prior.missing,
      overflow: args.overflow ?? prior.overflow,
      palette: mergedPalette(prior.palette, args.palette),
      as: prior.as
    });
    const preflight = deriveHorizon(source.values, candidate);
    const revision = planDerivedDataRevision(this, {
      owner: layer.id,
      role: "HorizonData",
      previous: previous.id,
      consumers: [layer.id]
    });
    let next = this
      .createHorizonData({
        id: revision.id,
        source: source.id,
        x: candidate.x,
        y: candidate.y,
        ...(groupBy === undefined ? {} : { groupBy }),
        bands: candidate.bands,
        baseline: candidate.baseline,
        extent: candidate.extent,
        resolve: candidate.resolve,
        missing: candidate.missing,
        overflow: candidate.overflow,
        palette: candidate.palette,
        as: candidate.as
      })
      .rebindLayerData(revision.rebinds[0])
      .releaseDerivedData(revision.release);

    if (layer.encoding.x.fieldType !== x.fieldType) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.fieldType`,
        value: x.fieldType
      });
    }
    if (Object.hasOwn(args, "x")) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.title`,
        value: inferredTitle(x.field)
      });
    }

    const currentX = existingScale(next, layer.encoding.x.scale, "Horizon x");
    const requestedXScale = x.scale ?? {};
    if (requestedXScale.id !== undefined && requestedXScale.id !== currentX.id) {
      throw new Error("editHorizon x scale cannot change its id.");
    }
    const xTypeChanged = prior.x.fieldType !== x.fieldType;
    const emptyXDomain = preflight.values.length === 0 &&
      requestedXScale.domain === undefined &&
      currentX.domain === "auto"
      ? source.values.map((row, index) => x.fieldType === "temporal"
          ? normalizeTemporalValue(row[x.field], x.field, index)
          : row[x.field])
      : undefined;
    const nextX = resolvePositionScaleDefinition(next, "x", x.fieldType, {
      ...requestedXScale,
      id: currentX.id,
      ...(emptyXDomain === undefined
        ? {}
        : { domain: [Math.min(...emptyXDomain), Math.max(...emptyXDomain)] }),
      ...(xTypeChanged && requestedXScale.type === undefined
        ? { type: x.fieldType === "temporal" ? "time" : "linear" }
        : {})
    });
    next = applyScaleDefinition(next, currentX, nextX);

    const currentY = existingScale(next, layer.encoding.y.scale, "Horizon y");
    const requestedYScale = y.scale ?? {};
    if (requestedYScale.id !== undefined && requestedYScale.id !== currentY.id) {
      throw new Error("editHorizon y scale cannot change its id.");
    }
    const nextY = foldedScaleOptions(layer.id, {
      ...currentY,
      ...requestedYScale,
      id: currentY.id
    });
    next = applyScaleDefinition(next, currentY, nextY);

    const colors = normalizedPaletteColors(candidate);
    const currentColor = existingScale(
      next,
      layer.encoding.color.scale,
      "Horizon color"
    );
    const nextColor = resolveColorScaleDefinition(next, {
      id: currentColor.id,
      type: "ordinal",
      domain: colors.domain,
      range: colors.range
    });
    next = applyScaleDefinition(next, currentColor, nextColor);

    if (preflight.values.length === 0) {
      return next.editGraphics({
        target: layer.id,
        property: "length",
        value: 0
      });
    }
    return applyMaterializationPlan(
      next,
      planHorizonRematerialization(next, layer.id)
    );
  }
);

const encodeHorizon = action(
  {
    op: "encodeHorizon",
    description: "Derive and encode one folded Horizon area."
  },
  function (args = {}) {
    validateOptionObject(args, OPTIONS, "encodeHorizon");
    const layer = findArea(this, args.target);
    validateUnusedEncodings(layer);
    const source = resolveSource(this, layer, args.source);
    const x = resolveField(this, layer, source, args.x, "x");
    const y = resolveField(this, layer, source, args.y, "y");
    const groupBy = resolveGroupBy(layer, source, args.groupBy);
    const as = outputFields(layer.id);
    const transform = validateHorizonTransform({
      type: "horizon",
      x: { field: x.field, fieldType: x.fieldType },
      y: { field: y.field, fieldType: y.fieldType },
      ...(groupBy === undefined ? {} : { groupBy }),
      bands: args.bands ?? 3,
      baseline: args.baseline ?? 0,
      extent: args.extent ?? "auto",
      resolve: args.resolve ?? "shared",
      missing: args.missing ?? "break",
      overflow: args.overflow ?? "clip",
      palette: args.palette ?? {},
      as
    });
    const preflight = deriveHorizon(source.values, transform);
    const id = `${layer.id}HorizonData`;
    if (hasDataset(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    const xScale = {
      ...(x.scale ?? {}),
      ...(preflight.values.length === 0 && x.scale?.domain === undefined
        ? {
            domain: source.values.map((row, index) =>
              x.fieldType === "temporal"
                ? normalizeTemporalValue(row[x.field], x.field, index)
                : row[x.field]
            )
          }
        : {})
    };
    if (Array.isArray(xScale.domain) && xScale.domain.length > 2) {
      xScale.domain = [Math.min(...xScale.domain), Math.max(...xScale.domain)];
    }
    const yScale = foldedScaleOptions(layer.id, y.scale);
    const colors = normalizedPaletteColors(transform);
    const colorScale = {
      id: `${layer.id}HorizonColor`,
      type: "ordinal",
      domain: colors.domain,
      range: colors.range
    };
    resolvePositionScaleDefinition(this, "x", x.fieldType, xScale);
    resolvePositionScaleDefinition(this, "y", "quantitative", yScale);
    resolveColorScaleDefinition(this, colorScale);
    if (x.fieldType === "quantitative") readQuantitativeField(source.values, x.field);

    let next = this
      .createHorizonData({
        id,
        source: source.id,
        x: transform.x,
        y: transform.y,
        ...(groupBy === undefined ? {} : { groupBy }),
        bands: transform.bands,
        baseline: transform.baseline,
        extent: transform.extent,
        resolve: transform.resolve,
        missing: transform.missing,
        overflow: transform.overflow,
        palette: transform.palette,
        as
      })
      .rebindLayerData({ id: layer.id, data: id });
    const stored = findDataset(next, id).transform[0];
    next = applyHorizonEncoding(next, {
      layer,
      transform: stored,
      xScale,
      yScale,
      colorScale
    });
    return next;
  }
);

export function registerHorizonEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeHorizon = encodeHorizon;
  ProgramClass.prototype.editHorizon = editHorizon;
}

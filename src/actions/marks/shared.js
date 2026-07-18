import {
  resolveOptionalUserId,
  validateUserId
} from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { resolveMarkPositionPolicy } from "../encodings/position/policies/index.js";
import { getMarkMaterializationStep } from "../../materialization/marks.js";
import {
  POLAR_POSITION_CHANNELS,
  CARTESIAN_POSITION_CHANNELS,
  POSITION_CHANNELS
} from "../../core/vocabulary.js";
import { validateOptionObject } from "../../core/validation.js";

export function validateMarkOptions(args, supported, operation) {
  validateOptionObject(args, supported, operation);
}

export function resolveMarkData(program, requested) {
  const data = Object.hasOwn(requested, "data")
    ? validateUserId(requested.data, "Dataset id")
    : program.context.currentData;

  if (data === undefined) {
    throw new Error("Mark creation requires data or a current dataset.");
  }

  const dataset = findDataset(program, data);

  if (dataset === undefined) {
    throw new Error(`Unknown dataset "${data}".`);
  }

  return { data, dataset };
}

export function resolveMarkId(program, requested, {
  defaultId,
  label,
  markType,
  operation
}) {
  const sameRoleExists = program.semanticSpec.layers.some(
    layer => layer.mark?.type === markType
  );
  const defaultUnavailable = hasLayer(program, defaultId) ||
    program.graphicSpec.objects[defaultId] !== undefined;
  return resolveOptionalUserId(requested, {
    defaultId,
    label,
    operation,
    ambiguous: sameRoleExists || defaultUnavailable
  });
}

export function assertMarkAvailable(program, id) {
  if (hasLayer(program, id)) {
    throw new Error(`Mark "${id}" already exists.`);
  }

  if (program.graphicSpec.objects[id] !== undefined) {
    throw new Error(`Graphic "${id}" already exists.`);
  }
}

const POSITION_POLICY_PROPERTIES = Object.freeze(["aggregate", "bin", "stack"]);
const POSITION_POLICY_SUBSETS = Object.freeze([
  Object.freeze(["aggregate", "bin", "stack"]),
  Object.freeze(["aggregate", "bin"]),
  Object.freeze(["aggregate", "stack"]),
  Object.freeze(["bin", "stack"]),
  Object.freeze(["aggregate"]),
  Object.freeze(["bin"]),
  Object.freeze(["stack"]),
  Object.freeze([])
]);

function inheritedPositionEncodings(encoding) {
  if (encoding?.field === undefined) return undefined;
  const base = Object.fromEntries(
    ["field", "fieldType", "scale", "title"]
      .filter(property => Object.hasOwn(encoding, property))
      .map(property => [property, encoding[property]])
  );
  const available = POSITION_POLICY_PROPERTIES.filter(property =>
    Object.hasOwn(encoding, property)
  );
  const seen = new Set();
  return POSITION_POLICY_SUBSETS.map(properties => ({
    ...base,
    ...Object.fromEntries(properties
      .filter(property => available.includes(property))
      .map(property => [property, encoding[property]]))
  })).filter(candidate => {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scaleSupportsEncoding(program, markType, channel, encoding) {
  const scale = findSemanticScale(program, encoding.scale);
  if (scale === undefined) return false;
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType);
  if (categorical) {
    if (["bar", "rect"].includes(markType)) return scale.type === "band";
    if (markType === "arc") return scale.type === "band";
    return ["ordinal", "band", "point"].includes(scale.type);
  }
  if (encoding.fieldType === "temporal") return scale.type === "time";
  return ["linear", "log", "pow", "sqrt", "symlog"].includes(scale.type);
}

export function resolveCompatibleEncodings(program, source, markType) {
  const dataset = findDataset(program, source.data);
  if (dataset === undefined) return {};
  const channels = POLAR_POSITION_CHANNELS.some(
    channel => source.encoding?.[channel] !== undefined
  )
    ? POLAR_POSITION_CHANNELS
    : CARTESIAN_POSITION_CHANNELS;
  const pending = new Map(channels.map(channel => [
    channel,
    inheritedPositionEncodings(source.encoding?.[channel])
  ]).filter(([, encodings]) => encodings !== undefined));
  const candidate = {
    id: "layered-inference",
    data: source.data,
    mark: { type: markType },
    encoding: {}
  };

  for (let pass = 0; pass < 2; pass += 1) {
    for (const [channel, encodings] of pending) {
      for (const encoding of encodings) {
        if (!scaleSupportsEncoding(program, markType, channel, encoding)) continue;
        try {
          const policy = resolveMarkPositionPolicy({
            program,
            layer: candidate,
            dataset,
            channel,
            args: encoding,
            field: encoding.field,
            fieldType: encoding.fieldType
          });
          candidate.encoding[channel] = {
            ...encoding,
            ...Object.fromEntries(
              Object.entries(policy).filter(([, value]) => value !== undefined)
            )
          };
          pending.delete(channel);
          break;
        } catch {
          // Try the next target-compatible policy subset. Another channel may
          // also make a richer subset resolvable on the next pass.
        }
      }
    }
  }
  return candidate.encoding;
}

function eligibleLayeredSource(program, layer, requestedData, markType) {
  if (layer?.data === undefined) return false;
  if (requestedData !== undefined && layer.data !== requestedData) return false;
  return Object.keys(resolveCompatibleEncodings(program, layer, markType)).length > 0;
}

export function resolveLayeredMarkInheritance(program, requested = {}, markType) {
  if (Object.hasOwn(requested, "data")) return undefined;
  const requestedData = program.context.currentData;
  const eligible = program.semanticSpec.layers.filter(layer =>
    eligibleLayeredSource(program, layer, requestedData, markType)
  );
  const current = findLayer(program, program.context.currentMark);
  const source = eligibleLayeredSource(program, current, requestedData, markType)
    ? current
    : eligible.length === 1
      ? eligible[0]
      : undefined;

  if (source === undefined && eligible.length > 1) {
    throw new Error(
      "Layered mark inference is ambiguous; specify data and encode its position explicitly."
    );
  }
  if (source === undefined) return undefined;
  if (
    markType === "bar" &&
    (
      source.encoding?.x?.bin !== undefined ||
      source.encoding?.y?.bin !== undefined ||
      (source.encoding?.x?.stack !== undefined && source.encoding.x.stack !== null) ||
      (source.encoding?.y?.stack !== undefined && source.encoding.y.stack !== null) ||
      source.encoding?.xOffset !== undefined ||
      source.encoding?.yOffset !== undefined ||
      source.encoding?.color?.layout !== undefined
    )
  ) {
    return undefined;
  }

  return {
    source: source.id,
    data: source.data,
    coordinate: source.coordinate,
    encoding: resolveCompatibleEncodings(program, source, markType)
  };
}

export function applyLayeredMarkInheritance(program, id, inherited) {
  let next = program;
  if (inherited?.coordinate !== undefined) {
    next = next.editSemantic({
      property: `layer[${id}].coordinate`,
      value: inherited.coordinate
    });
  }
  for (const channel of POSITION_CHANNELS) {
    for (const [property, value] of Object.entries(
      inherited?.encoding[channel] ?? {}
    )) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.${channel}.${property}`,
        value
      });
    }
  }
  return next;
}

export function materializeInheritedMark(program, id) {
  const layer = findLayer(program, id);
  const step = layer === undefined
    ? undefined
    : getMarkMaterializationStep(program, layer);
  return step === undefined ? program : program[step.op](step.args);
}

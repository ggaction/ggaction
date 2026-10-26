import { withGuideLayoutTransaction } from "../../../materialization/guides/layout.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys, validateOptionObject } from "../../../core/validation.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { resolveParallelAxisTarget } from "./parallel/resolve.js";
import { resolvePolarGuideResources } from "../polar/resolve.js";

const TOP_OPTIONS = Object.freeze([
  "coordinate", "x", "y", "theta", "radius"
]);
const COORDINATE_OPTIONS = Object.freeze(["id", "type"]);
const COORDINATE_API_TYPES = new Set([
  "auto", "cartesian", "polar", "parallel"
]);

function validateAxisOption(value, channel) {
  if (["x", "y"].includes(channel) && Array.isArray(value)) {
    if (value.length === 0 || value.some(entry => !isPlainObject(entry) || !Object.hasOwn(entry, "id"))) {
      throw new TypeError(`createAxes ${channel} arrays require nonempty named axis descriptors.`);
    }
    for (const entry of value) validateUserId(entry.id, "Axis id");
    return;
  }
  if (value !== undefined && value !== false && !isPlainObject(value)) {
    throw new TypeError(`createAxes ${channel} must be false or a plain object.`);
  }
}

export function validateAxesArgs(args) {
  validateOptionObject(args, TOP_OPTIONS, "createAxes");
  validateAxisOption(args.x, "x");
  validateAxisOption(args.y, "y");
  validateAxisOption(args.theta, "theta");
  validateAxisOption(args.radius, "radius");

  const coordinate = args.coordinate ?? {};
  if (!isPlainObject(coordinate)) {
    throw new TypeError("createAxes coordinate must be a plain object.");
  }

  validateKeys(coordinate, COORDINATE_OPTIONS, "createAxes.coordinate");
  const type = coordinate.type ?? "auto";

  if (!COORDINATE_API_TYPES.has(type)) {
    throw new Error(`Unknown createAxes coordinate type "${type}".`);
  }
  if (coordinate.id !== undefined) validateUserId(coordinate.id, "Coordinate id");

  return coordinate;
}

function inspectChannels(layers) {
  const cartesianLayers = layers.filter(
    layer => layer.encoding?.x !== undefined || layer.encoding?.y !== undefined
  );
  const polarLayers = layers.filter(
    layer =>
      layer.encoding?.theta !== undefined || layer.encoding?.radius !== undefined
  );
  const parallelLayers = layers.filter(
    layer => layer.encoding?.parallel !== undefined
  );
  const hasMixedLayer = layers.some(layer => {
    const hasCartesian =
      layer.encoding?.x !== undefined || layer.encoding?.y !== undefined;
    const hasPolar =
      layer.encoding?.theta !== undefined || layer.encoding?.radius !== undefined;
    return hasCartesian && hasPolar;
  });

  if (hasMixedLayer) {
    throw new Error(
      "createAxes cannot infer a coordinate from mixed Cartesian and Polar channels."
    );
  }

  return { cartesianLayers, polarLayers, parallelLayers };
}

function resolveCoordinate(program, descriptor, cartesianLayers) {
  if (cartesianLayers.length === 0) {
    throw new Error("createAxes requires an x or y encoding.");
  }

  const referencedIds = [
    ...new Set(
      cartesianLayers
        .map(layer => layer.coordinate)
        .filter(id => id !== undefined)
    )
  ];

  if (cartesianLayers.some(layer => layer.coordinate === undefined)) {
    throw new Error(
      "createAxes requires every positional layer to have a stored coordinate."
    );
  }

  if (descriptor.id === undefined && referencedIds.length > 1) {
    throw new Error(
      "createAxes found multiple coordinates; provide coordinate.id explicitly."
    );
  }

  const id = validateUserId(descriptor.id ?? referencedIds[0], "Coordinate id");
  const existing = findCoordinate(program, id);

  if (existing === undefined) {
    throw new Error(`Unknown coordinate "${id}".`);
  }

  if (
    descriptor.type !== undefined &&
    descriptor.type !== "auto" &&
    descriptor.type !== existing.type
  ) {
    throw new Error(
      `Coordinate "${id}" has type "${existing.type}", not "${descriptor.type}".`
    );
  }

  const layers = cartesianLayers.filter(
    layer => layer.coordinate === id
  );

  if (layers.length === 0) {
    throw new Error(`createAxes found no layers for coordinate "${id}".`);
  }

  if (existing.type !== "cartesian") {
    throw new Error("createAxes x/y options require a Cartesian coordinate.");
  }

  return { id, layers };
}

function resolvePolarAxisArgs(program, layers, channel, option, descriptor) {
  const selected = option === false
    ? false
    : option !== undefined || hasChannel(layers, channel);
  if (!selected) return undefined;
  const args = option ?? {};
  const kind = channel === "theta" ? "theta" : "radius";
  const resource = resolvePolarGuideResources(program, kind, {
    ...args,
    ...(descriptor.id === undefined ? {} : { coordinate: descriptor.id })
  }, "createAxes");
  return {
    ...args,
    scale: resource.scale,
    coordinate: resource.coordinate
  };
}

function hasChannel(layers, channel) {
  return layers.some(layer => layer.encoding?.[channel] !== undefined && !(layer.mark?.type === "tick" && Object.hasOwn(layer.encoding[channel], "datum")));
}

function resolveAxisArgs(layers, channel, option) {
  const selected = option === false
    ? false
    : option !== undefined || hasChannel(layers, channel);

  if (!selected) return undefined;

  const args = option ?? {};
  const encodedScaleIds = [
    ...new Set(
      layers
        .filter(layer => !(layer.mark?.type === "tick" && Object.hasOwn(layer.encoding?.[channel] ?? {}, "datum")))
        .map(layer => layer.encoding?.[channel]?.scale)
        .filter(id => id !== undefined)
    )
  ];
  let scale = args.scale;

  if (scale === undefined) {
    if (encodedScaleIds.length === 0) {
      throw new Error(`createAxes cannot infer the ${channel}-axis scale.`);
    }

    if (encodedScaleIds.length > 1) {
      throw new Error(
        `createAxes found multiple ${channel}-axis scales; provide ${channel}.scale explicitly.`
      );
    }

    [scale] = encodedScaleIds;
  }

  validateUserId(scale, `${channel}-axis scale id`);
  return { ...args, scale };
}

const createAxes = /* @__PURE__ */ action(
  {
    op: "createAxes",
    description: "Read a stored coordinate and create its applicable axes."
  },
  function (args = {}) {
    const coordinateDescriptor = validateAxesArgs(args);
    const { cartesianLayers, polarLayers, parallelLayers } = inspectChannels(
      this.semanticSpec.layers.filter(layer => !isSourceOwnedText(layer))
    );
    const requestedCoordinateType = coordinateDescriptor.id === undefined
      ? undefined
      : findCoordinate(this, coordinateDescriptor.id)?.type;
    if (coordinateDescriptor.id !== undefined) {
      if (requestedCoordinateType === undefined) {
        throw new Error(`Unknown coordinate "${coordinateDescriptor.id}".`);
      }
      if (coordinateDescriptor.type !== undefined &&
          coordinateDescriptor.type !== "auto" &&
          coordinateDescriptor.type !== requestedCoordinateType) {
        throw new Error(`Coordinate "${coordinateDescriptor.id}" has type "${requestedCoordinateType}", not "${coordinateDescriptor.type}".`);
      }
    }
    const explicitlyPolar = coordinateDescriptor.type === "polar" ||
      requestedCoordinateType === "polar" ||
      args.theta !== undefined || args.radius !== undefined;
    const explicitlyParallel = coordinateDescriptor.type === "parallel" ||
      requestedCoordinateType === "parallel";
    if (parallelLayers.length > 0 && (
      (cartesianLayers.length === 0 && polarLayers.length === 0) ||
      explicitlyParallel
    )) {
      if (coordinateDescriptor.type !== undefined &&
          !["auto", "parallel"].includes(coordinateDescriptor.type)) {
        throw new Error("createAxes coordinate type conflicts with Parallel encodings.");
      }
      if (
        args.x !== undefined || args.y !== undefined ||
        args.theta !== undefined || args.radius !== undefined
      ) {
        throw new Error(
          "createAxes channel options are not supported for Parallel axes."
        );
      }
      const candidates = coordinateDescriptor.id === undefined
        ? parallelLayers
        : parallelLayers.filter(layer =>
            layer.coordinate === coordinateDescriptor.id
          );
      if (candidates.length !== 1) {
        throw new Error(
          "createAxes requires coordinate.id when one Parallel layer cannot be inferred."
        );
      }
      return this.createParallelAxes({
        target: candidates[0].id,
        coordinate: candidates[0].coordinate
      });
    }
    if (polarLayers.length > 0 &&
        (cartesianLayers.length === 0 || explicitlyPolar)) {
      if (coordinateDescriptor.type !== undefined &&
          !["auto", "polar"].includes(coordinateDescriptor.type)) {
        throw new Error("createAxes coordinate type conflicts with Polar encodings.");
      }
      if (args.x !== undefined || args.y !== undefined) {
        throw new Error("createAxes x/y options require Cartesian encodings.");
      }
      const theta = resolvePolarAxisArgs(
        this,
        polarLayers,
        "theta",
        args.theta,
        coordinateDescriptor
      );
      const radius = resolvePolarAxisArgs(
        this,
        polarLayers,
        "radius",
        args.radius,
        coordinateDescriptor
      );
      if (theta === undefined && radius === undefined) {
        throw new Error("createAxes requires at least one selected axis.");
      }
      let polarProgram = this;
      if (theta !== undefined) {
        polarProgram = polarProgram.createThetaAxis(theta);
      }
      if (radius !== undefined) {
        polarProgram = polarProgram.createRadialAxis(radius);
      }
      return polarProgram;
    }
    if (args.theta !== undefined || args.radius !== undefined) {
      throw new Error("createAxes theta/radius options require Polar encodings.");
    }
    const coordinate = resolveCoordinate(
      this,
      coordinateDescriptor,
      cartesianLayers
    );
    const resolve = (channel, value) => Array.isArray(value)
      ? value.map(entry => resolveAxisArgs(coordinate.layers, channel, entry))
      : resolveAxisArgs(coordinate.layers, channel, value);
    const x = resolve("x", args.x);
    const y = resolve("y", args.y);

    if (x === undefined && y === undefined) {
      throw new Error("createAxes requires at least one selected axis.");
    }

    const apply = source => {
      let program = source;
      for (const [channel, option] of [["x", x], ["y", y]]) {
        if (option === undefined) continue;
        for (const entry of Array.isArray(option) ? option : [option]) {
          program = program[`create${channel.toUpperCase()}Axis`]({ ...entry, coordinate: coordinate.id });
        }
      }
      return program;
    };
    if (Array.isArray(x) || Array.isArray(y)) {
      const ids = [...(Array.isArray(x) ? x : x === undefined ? [] : [x]),
        ...(Array.isArray(y) ? y : y === undefined ? [] : [y])].map((entry, index) => entry.id ?? (index === 0 ? "x" : "y"));
      if (new Set(ids).size !== ids.length) throw new Error("createAxes requires unique axis ids across its descriptors.");
      withGuideLayoutTransaction(this, apply);
      return withGuideLayoutTransaction(this, apply);
    }
    return apply(this);
  }
);

// Aggregate existing component editors; omission/false preserves that axis.
const editAxes = /* @__PURE__ */ action(
  { op: "editAxes", description: "Edit selected existing axes in one atomic layout transaction." },
  function (args = {}) {
    const methods = { x: "editXAxis", y: "editYAxis", theta: "editThetaAxis",
      radius: "editRadialAxis", parallel: "editParallelAxis" };
    validateOptionObject(args, Object.keys(methods), "editAxes", { allowEmpty: false });
    const plan = [];
    for (const [channel, method] of Object.entries(methods)) {
      const option = args[channel];
      if (option === undefined || option === false) continue;
      const entries = Array.isArray(option) ? option : [option];
      if (entries.length === 0 || entries.some(entry => !isPlainObject(entry))) {
        throw new TypeError(`editAxes ${channel} must be a plain object or a nonempty array of edit options.`);
      }
      if (Array.isArray(option) && ["theta", "radius"].includes(channel)) {
        throw new TypeError(`editAxes ${channel} does not accept an array.`);
      }
      const targets = new Set();
      for (const entry of entries) {
        if (Array.isArray(option) && ["x", "y"].includes(channel) && entry.target === undefined) {
          throw new Error(`editAxes ${channel} arrays require an explicit axis target for every entry.`);
        }
        const key = channel === "parallel" ? `${resolveParallelAxisTarget(this, entry.target ?? this.guideConfigs.axis?.parallel?.axes?.target)}:${entry.field}` : entry.target ?? channel;
        if (targets.has(key)) throw new Error(`editAxes ${channel} contains a duplicate axis target.`);
        targets.add(key);
        plan.push({ method, args: entry });
      }
    }
    if (plan.length === 0) throw new Error("editAxes requires at least one axis change.");
    const apply = source => plan.reduce((program, step) => program[step.method](step.args), source);
    // Preflight the full immutable proposal before beginning the returned branch.
    withGuideLayoutTransaction(this, apply);
    return withGuideLayoutTransaction(this, apply);
  }
);

export function registerAxisCollectionActions(ProgramClass) {
  ProgramClass.prototype.createAxes = createAxes;
  ProgramClass.prototype.editAxes = editAxes;
}

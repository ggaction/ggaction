import { action } from "../core/action.js";
import { isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";

const TOP_OPTIONS = Object.freeze(["coordinate", "x", "y"]);
const COORDINATE_OPTIONS = Object.freeze(["id", "type"]);
const COORDINATE_API_TYPES = new Set(["auto", "cartesian", "polar"]);

function validateKeys(value, supported, label) {
  for (const key of Object.keys(value)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${label} option "${key}".`);
    }
  }
}

function validateAxisOption(value, channel) {
  if (value !== undefined && value !== false && !isPlainObject(value)) {
    throw new TypeError(`createAxes ${channel} must be false or a plain object.`);
  }
}

function validateArgs(args) {
  if (!isPlainObject(args)) {
    throw new TypeError("createAxes options must be a plain object.");
  }

  validateKeys(args, TOP_OPTIONS, "createAxes");
  validateAxisOption(args.x, "x");
  validateAxisOption(args.y, "y");

  const coordinate = args.coordinate ?? {};
  if (!isPlainObject(coordinate)) {
    throw new TypeError("createAxes coordinate must be a plain object.");
  }

  validateKeys(coordinate, COORDINATE_OPTIONS, "createAxes.coordinate");
  const type = coordinate.type ?? "auto";

  if (!COORDINATE_API_TYPES.has(type)) {
    throw new Error(`Unknown createAxes coordinate type "${type}".`);
  }

  return coordinate;
}

function inspectChannels(layers) {
  const cartesianLayers = layers.filter(
    layer => layer.encoding?.x !== undefined || layer.encoding?.y !== undefined
  );
  const hasPolar = layers.some(
    layer =>
      layer.encoding?.theta !== undefined || layer.encoding?.radius !== undefined
  );

  if (cartesianLayers.length > 0 && hasPolar) {
    throw new Error(
      "createAxes cannot infer a coordinate from mixed Cartesian and Polar channels."
    );
  }

  return { cartesianLayers, hasPolar };
}

function resolveCoordinate(program, descriptor, cartesianLayers, hasPolar) {
  if (hasPolar || descriptor.type === "polar") {
    throw new Error("createAxes does not yet support Polar axes.");
  }

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

  if (descriptor.id === undefined && referencedIds.length > 1) {
    throw new Error(
      "createAxes found multiple coordinates; provide coordinate.id explicitly."
    );
  }

  const id = validateUserId(
    descriptor.id ?? referencedIds[0] ?? "main",
    "Coordinate id"
  );
  const existing = program.semanticSpec.coordinates.find(item => item.id === id);
  const inferredType = existing?.type ?? "cartesian";
  const type = descriptor.type === undefined || descriptor.type === "auto"
    ? inferredType
    : descriptor.type;

  if (type !== "cartesian") {
    throw new Error("createAxes does not yet support Polar axes.");
  }

  if (existing !== undefined && existing.type !== type) {
    throw new Error(
      `Coordinate "${id}" already exists with type "${existing.type}".`
    );
  }

  const layers = cartesianLayers.filter(
    layer => layer.coordinate === undefined || layer.coordinate === id
  );

  if (layers.length === 0) {
    throw new Error(`createAxes found no layers for coordinate "${id}".`);
  }

  return { id, type, layers };
}

function hasChannel(layers, channel) {
  return layers.some(layer => layer.encoding?.[channel] !== undefined);
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

const createAxes = action(
  {
    op: "createAxes",
    description: "Infer a coordinate and create its Cartesian axes."
  },
  function (args = {}) {
    const coordinateDescriptor = validateArgs(args);
    const { cartesianLayers, hasPolar } = inspectChannels(
      this.semanticSpec.layers
    );
    const coordinate = resolveCoordinate(
      this,
      coordinateDescriptor,
      cartesianLayers,
      hasPolar
    );
    const x = resolveAxisArgs(coordinate.layers, "x", args.x);
    const y = resolveAxisArgs(coordinate.layers, "y", args.y);

    if (x === undefined && y === undefined) {
      throw new Error("createAxes requires at least one selected axis.");
    }

    let program = this.createCoordinate({
      id: coordinate.id,
      type: coordinate.type,
      layers: coordinate.layers.map(layer => layer.id)
    });

    if (x !== undefined) program = program.createXAxis(x);
    if (y !== undefined) program = program.createYAxis(y);

    return program;
  }
);

export function registerAxisCollectionActions(ProgramClass) {
  ProgramClass.prototype.createAxes = createAxes;
}

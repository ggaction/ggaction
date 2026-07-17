import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys, validateOptionObject } from "../../../core/validation.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { resolvePolarGuideResources } from "../polar/resolve.js";

const TOP_OPTIONS = Object.freeze([
  "coordinate", "x", "y", "theta", "radius"
]);
const COORDINATE_OPTIONS = Object.freeze(["id", "type"]);
const COORDINATE_API_TYPES = new Set(["auto", "cartesian", "polar"]);

function validateAxisOption(value, channel) {
  if (value !== undefined && value !== false && !isPlainObject(value)) {
    throw new TypeError(`createAxes ${channel} must be false or a plain object.`);
  }
}

function validateArgs(args) {
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

  return { cartesianLayers, polarLayers };
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
    throw new Error("createAxes does not yet support Polar axes.");
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
    description: "Read a semantic coordinate and create its Cartesian axes."
  },
  function (args = {}) {
    const coordinateDescriptor = validateArgs(args);
    const { cartesianLayers, polarLayers } = inspectChannels(
      this.semanticSpec.layers
    );
    const requestedCoordinateType = coordinateDescriptor.id === undefined
      ? undefined
      : findCoordinate(this, coordinateDescriptor.id)?.type;
    const explicitlyPolar = coordinateDescriptor.type === "polar" ||
      requestedCoordinateType === "polar" ||
      args.theta !== undefined || args.radius !== undefined;
    if (polarLayers.length > 0 &&
        (cartesianLayers.length === 0 || explicitlyPolar)) {
      if (coordinateDescriptor.type === "cartesian") {
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
    const coordinate = resolveCoordinate(
      this,
      coordinateDescriptor,
      cartesianLayers
    );
    const x = resolveAxisArgs(coordinate.layers, "x", args.x);
    const y = resolveAxisArgs(coordinate.layers, "y", args.y);

    if (x === undefined && y === undefined) {
      throw new Error("createAxes requires at least one selected axis.");
    }

    let program = this;

    if (x !== undefined) {
      program = program.createXAxis({ ...x, coordinate: coordinate.id });
    }
    if (y !== undefined) {
      program = program.createYAxis({ ...y, coordinate: coordinate.id });
    }

    return program;
  }
);

export function registerAxisCollectionActions(ProgramClass) {
  ProgramClass.prototype.createAxes = createAxes;
}

import { USER_ID_SOURCE } from "../../core/identifiers.js";
import {
  CARTESIAN_POSITION_CHANNELS,
  ENCODING_CHANNELS,
  SCALED_ENCODING_CHANNELS
} from "../../core/vocabulary.js";

const ENCODING_PATHS = Object.freeze([
  ...ENCODING_CHANNELS.flatMap(channel => [
    `encoding.${channel}.field`,
    `encoding.${channel}.datum`,
    `encoding.${channel}.fieldType`,
    `encoding.${channel}.title`
  ]),
  ...SCALED_ENCODING_CHANNELS.map(channel =>
    `encoding.${channel}.scale`
  ),
  "encoding.x.bin.maxBins",
  "encoding.x.bin.step",
  "encoding.x.bin.boundaries",
  "encoding.color.layout",
  "encoding.color.aggregate",
  "encoding.theta.aggregate",
  "encoding.theta.weight",
  "encoding.text.format",
  ...CARTESIAN_POSITION_CHANNELS.flatMap(channel => [
    `encoding.${channel}.aggregate`,
    `encoding.${channel}.stack`
  ])
]);

const ENTITY_PATHS = Object.freeze({
  dataset: {
    collection: "datasets",
    properties: new Set(["source", "transform", "values"])
  },
  layer: {
    collection: "layers",
    removableContainers: new Set(
      ENCODING_CHANNELS.map(channel => `encoding.${channel}`)
    ),
    properties: new Set([
      "data",
      "source",
      "coordinate",
      "transform",
      "mark.type",
      ...ENCODING_PATHS
    ])
  },
  scale: {
    collection: "scales",
    properties: new Set([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse",
      "unknown", "base", "exponent", "constant", "interpolate",
      "paddingInner", "paddingOuter", "padding", "align"
    ])
  },
  coordinate: {
    collection: "coordinates",
    properties: new Set(["type"])
  }
});

const GUIDE_PATHS = new Set([
  "axis.x.scale",
  "axis.x.coordinate",
  "axis.x.title",
  "axis.y.scale",
  "axis.y.coordinate",
  "axis.y.title",
  "axis.theta.scale",
  "axis.theta.coordinate",
  "axis.theta.title",
  "axis.radius.scale",
  "axis.radius.coordinate",
  "axis.radius.title",
  "legend.color.scale",
  "legend.color.title",
  "legend.size.scale",
  "legend.size.title",
  "legend.opacity.scale",
  "legend.opacity.title",
  "legend.series.channels",
  "legend.series.scales",
  "legend.series.title",
  "grid.horizontal.scale",
  "grid.horizontal.coordinate",
  "grid.vertical.scale",
  "grid.vertical.coordinate",
  "grid.theta.scale",
  "grid.theta.coordinate",
  "grid.radial.scale",
  "grid.radial.coordinate"
]);

const GUIDE_REMOVABLE_CONTAINERS = new Set([
  "axis.x",
  "axis.y",
  "axis.theta",
  "axis.radius",
  "grid.horizontal",
  "grid.vertical",
  "grid.theta",
  "grid.radial",
  "legend.color",
  "legend.size",
  "legend.opacity",
  "legend.series"
]);

const TITLE_PATHS = new Set(["text", "subtitle"]);

function splitPropertyPath(property) {
  return property.split(".");
}

export function parseSemanticPath(property, { allowContainer = false } = {}) {
  if (typeof property !== "string" || property.length === 0) {
    throw new TypeError("editSemantic requires a non-empty property string.");
  }

  if (allowContainer) {
    const entityMatch = property.match(
      new RegExp(`^(dataset|layer)\\[(${USER_ID_SOURCE})\\]$`)
    );
    if (entityMatch) {
      const [, kind, id] = entityMatch;
      return Object.freeze({
        kind,
        id,
        collection: ENTITY_PATHS[kind].collection,
        path: Object.freeze([])
      });
    }
  }

  const entityMatch = property.match(
    new RegExp(
      `^(${Object.keys(ENTITY_PATHS).join("|")})\\[(${USER_ID_SOURCE})\\]\\.(.+)$`
    )
  );

  if (entityMatch) {
    const [, kind, id, propertyPath] = entityMatch;
    const definition = ENTITY_PATHS[kind];

    if (
      !definition.properties.has(propertyPath) &&
      !(allowContainer && definition.removableContainers?.has(propertyPath))
    ) {
      throw new Error(`Unknown semantic property "${property}".`);
    }

    return Object.freeze({
      kind,
      id,
      collection: definition.collection,
      path: Object.freeze(splitPropertyPath(propertyPath))
    });
  }

  if (property.startsWith("guide.")) {
    const propertyPath = property.slice("guide.".length);

    if (
      !GUIDE_PATHS.has(propertyPath) &&
      !(allowContainer && GUIDE_REMOVABLE_CONTAINERS.has(propertyPath))
    ) {
      throw new Error(`Unknown semantic property "${property}".`);
    }

    return Object.freeze({
      kind: "guide",
      id: propertyPath.split(".").slice(0, 2).join("."),
      collection: "guides",
      path: Object.freeze(splitPropertyPath(propertyPath))
    });
  }

  if (property.startsWith("title.")) {
    const propertyPath = property.slice("title.".length);

    if (!TITLE_PATHS.has(propertyPath)) {
      throw new Error(`Unknown semantic property "${property}".`);
    }

    return Object.freeze({
      kind: "title",
      id: "title",
      collection: "title",
      path: Object.freeze(splitPropertyPath(propertyPath))
    });
  }

  throw new Error(`Unknown semantic property "${property}".`);
}

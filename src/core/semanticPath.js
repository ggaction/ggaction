import { USER_ID_SOURCE } from "./identifiers.js";

const ENTITY_PATHS = Object.freeze({
  dataset: {
    collection: "datasets",
    properties: new Set(["values"])
  },
  layer: {
    collection: "layers",
    properties: new Set([
      "data",
      "coordinate",
      "transform",
      "mark.type",
      "encoding.x.field",
      "encoding.x.datum",
      "encoding.x.fieldType",
      "encoding.x.scale",
      "encoding.x.bin.maxBins",
      "encoding.y.field",
      "encoding.y.datum",
      "encoding.y.fieldType",
      "encoding.y.scale",
      "encoding.y.aggregate",
      "encoding.y.stack",
      "encoding.theta.field",
      "encoding.theta.datum",
      "encoding.theta.fieldType",
      "encoding.theta.scale",
      "encoding.radius.field",
      "encoding.radius.datum",
      "encoding.radius.fieldType",
      "encoding.radius.scale",
      "encoding.color.field",
      "encoding.color.datum",
      "encoding.color.fieldType",
      "encoding.color.scale",
      "encoding.strokeDash.field",
      "encoding.strokeDash.datum",
      "encoding.strokeDash.fieldType",
      "encoding.strokeDash.scale",
      "encoding.size.field",
      "encoding.size.datum",
      "encoding.size.fieldType",
      "encoding.size.scale",
      "encoding.opacity.field",
      "encoding.opacity.datum",
      "encoding.opacity.fieldType",
      "encoding.opacity.scale"
    ])
  },
  scale: {
    collection: "scales",
    properties: new Set(["type", "domain", "range", "nice", "zero"])
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
  "grid.vertical.coordinate"
]);

const TITLE_PATHS = new Set(["text", "subtitle"]);

function splitPropertyPath(property) {
  return property.split(".");
}

export function parseSemanticPath(property) {
  if (typeof property !== "string" || property.length === 0) {
    throw new TypeError("editSemantic requires a non-empty property string.");
  }

  const entityMatch = property.match(
    new RegExp(
      `^(${Object.keys(ENTITY_PATHS).join("|")})\\[(${USER_ID_SOURCE})\\]\\.(.+)$`
    )
  );

  if (entityMatch) {
    const [, kind, id, propertyPath] = entityMatch;
    const definition = ENTITY_PATHS[kind];

    if (!definition.properties.has(propertyPath)) {
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

    if (!GUIDE_PATHS.has(propertyPath)) {
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

import assert from "node:assert/strict";

const NON_NEGATIVE_PROPERTIES = new Set([
  "width", "height", "radius", "innerRadius", "outerRadius",
  "strokeWidth", "fontSize", "lineHeight"
]);
const GRAPHIC_TYPES = new Set([
  "canvas", "collection", "circle", "rect", "line", "text", "path"
]);
const CONTAINER_TYPES = new Set(["canvas", "collection"]);
const REQUIRED_PROPERTIES = Object.freeze({
  canvas: Object.freeze(["width", "height"]),
  circle: Object.freeze(["x", "y", "radius"]),
  rect: Object.freeze(["x", "y", "width", "height"]),
  line: Object.freeze(["x1", "y1", "x2", "y2"]),
  text: Object.freeze(["x", "y", "text", "fontSize"]),
  path: Object.freeze(["commands"])
});

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function scanFiniteNumbers(value, path, issues, metrics) {
  if (typeof value === "number") {
    metrics.numberCount += 1;
    if (!Number.isFinite(value)) issues.push(`${path} is not finite.`);
    const property = path.slice(path.lastIndexOf(".") + 1);
    if (NON_NEGATIVE_PROPERTIES.has(property) && value < 0) {
      issues.push(`${path} is negative.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanFiniteNumbers(
      child,
      `${path}[${index}]`,
      issues,
      metrics
    ));
    return;
  }
  if (!plainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    scanFiniteNumbers(child, `${path}.${key}`, issues, metrics);
  }
}

function validatePathCommands(commands, path, issues) {
  if (!Array.isArray(commands) || commands.length === 0) {
    issues.push(`${path}.commands must be a non-empty array.`);
    return;
  }
  if (commands[0]?.op !== "M") {
    issues.push(`${path}.commands must start with M.`);
  }
  const coordinateNames = Object.freeze({
    M: Object.freeze(["x", "y"]),
    L: Object.freeze(["x", "y"]),
    C: Object.freeze(["x1", "y1", "x2", "y2", "x", "y"]),
    Z: Object.freeze([])
  });
  commands.forEach((command, index) => {
    const names = coordinateNames[command?.op];
    if (names === undefined) {
      issues.push(`${path}.commands[${index}] has an unknown operation.`);
      return;
    }
    for (const name of names) {
      if (!Number.isFinite(command[name])) {
        issues.push(`${path}.commands[${index}].${name} must be finite.`);
      }
    }
  });
}

function validatePrimitive(type, properties, path, issues) {
  const required = REQUIRED_PROPERTIES[type] ?? [];
  if (!plainObject(properties)) {
    if (required.length > 0) issues.push(`${path}.properties must be an object.`);
    return;
  }
  for (const property of required) {
    if (properties[property] === undefined) {
      issues.push(`${path}.properties.${property} is required.`);
    }
  }
  if (type === "text" && (
    typeof properties.text !== "string" || properties.text.length === 0
  )) {
    issues.push(`${path}.properties.text must be a non-empty string.`);
  }
  if (type === "text" && !(properties.fontSize > 0)) {
    issues.push(`${path}.properties.fontSize must be positive.`);
  }
  if (type === "canvas" && (!(properties.width > 0) || !(properties.height > 0))) {
    issues.push(`${path} canvas dimensions must be positive.`);
  }
  if (type === "path") validatePathCommands(properties.commands, path, issues);
  if (properties.opacity !== undefined && (
    !Number.isFinite(properties.opacity) ||
    properties.opacity < 0 || properties.opacity > 1
  )) {
    issues.push(`${path}.properties.opacity must be between 0 and 1.`);
  }
  if (properties.strokeDash !== undefined && (
    !Array.isArray(properties.strokeDash) ||
    properties.strokeDash.some(value => !Number.isFinite(value) || value < 0)
  )) {
    issues.push(`${path}.properties.strokeDash must contain non-negative finite values.`);
  }
}

function detectCycles(objects, roots, issues) {
  const visited = new Set();
  const active = new Set();
  const parents = new Map();

  function visit(id) {
    if (active.has(id)) {
      issues.push(`Graphic attachment cycle reaches "${id}".`);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    active.add(id);
    const object = objects[id];
    if (object !== undefined) {
      const children = object.children ?? [];
      if (new Set(children).size !== children.length) {
        issues.push(`Graphic "${id}" repeats a child id.`);
      }
      for (const child of children) {
        if (typeof child !== "string" || child.length === 0) {
          issues.push(`Graphic "${id}" has an invalid child id.`);
          continue;
        }
        if (objects[child] === undefined) {
          issues.push(`Graphic "${id}" references missing child "${child}".`);
          continue;
        }
        if (parents.has(child) && parents.get(child) !== id) {
          issues.push(
            `Graphic "${child}" has multiple parents: "${parents.get(child)}" and "${id}".`
          );
        } else {
          parents.set(child, id);
        }
        visit(child);
      }
    }
    active.delete(id);
  }

  roots.forEach(visit);
  for (const root of roots) {
    if (parents.has(root)) {
      issues.push(`Graphic root "${root}" is also attached to "${parents.get(root)}".`);
    }
  }
  for (const id of Object.keys(objects)) {
    if (!visited.has(id)) issues.push(`Graphic "${id}" is unreachable from order.`);
  }
  return { parents, visited };
}

export function inspectGraphicIntegrity(program) {
  const issues = [];
  const graphicSpec = program?.graphicSpec;
  if (!plainObject(graphicSpec) || !plainObject(graphicSpec.objects)) {
    return Object.freeze({
      issues: Object.freeze(["Program requires a graphicSpec object map."]),
      metrics: Object.freeze({ objectCount: 0, itemCount: 0, numberCount: 0 })
    });
  }
  const objects = graphicSpec.objects;
  const order = graphicSpec.order;
  if (!Array.isArray(order) || order.length === 0) {
    issues.push("Graphic order must contain at least one root id.");
  }
  const roots = Array.isArray(order) ? order : [];
  if (new Set(roots).size !== roots.length) {
    issues.push("Graphic order repeats a root id.");
  }
  for (const id of roots) {
    if (objects[id] === undefined) issues.push(`Graphic order references missing root "${id}".`);
  }

  const metrics = { objectCount: Object.keys(objects).length, itemCount: 0, numberCount: 0 };
  const itemIds = new Set();
  for (const [id, object] of Object.entries(objects)) {
    if (!plainObject(object) || !GRAPHIC_TYPES.has(object.type)) {
      issues.push(`Graphic "${id}" requires a type.`);
      continue;
    }
    if (object.children !== undefined && !Array.isArray(object.children)) {
      issues.push(`Graphic "${id}" children must be an array.`);
    }
    if (object.items !== undefined && !Array.isArray(object.items)) {
      issues.push(`Graphic "${id}" items must be an array.`);
    }
    if (!CONTAINER_TYPES.has(object.type) && object.children !== undefined) {
      issues.push(`Graphic "${id}" cannot attach children from primitive type "${object.type}".`);
    }
    if (object.items === undefined) {
      validatePrimitive(object.type, object.properties, `graphicSpec.objects.${id}`, issues);
    }
    if (Array.isArray(object.items)) {
      metrics.itemCount += object.items.length;
      for (const [index, item] of object.items.entries()) {
        if (!plainObject(item) || typeof item.id !== "string" || item.id.length === 0) {
          issues.push(`Graphic "${id}" item ${index} requires an id.`);
          continue;
        }
        if (itemIds.has(item.id) || objects[item.id] !== undefined) {
          issues.push(`Graphic item id "${item.id}" is not globally unique.`);
        }
        itemIds.add(item.id);
        const itemType = item.type ?? object.type;
        if (!GRAPHIC_TYPES.has(itemType) || CONTAINER_TYPES.has(itemType)) {
          issues.push(`Graphic "${id}" item ${index} requires a primitive type.`);
        } else {
          validatePrimitive(
            itemType,
            item.properties,
            `graphicSpec.objects.${id}.items[${index}]`,
            issues
          );
        }
      }
    }
    scanFiniteNumbers(object, `graphicSpec.objects.${id}`, issues, metrics);
  }
  detectCycles(objects, roots, issues);
  return Object.freeze({
    issues: Object.freeze(issues),
    metrics: Object.freeze(metrics)
  });
}

export function assertGraphicIntegrity(program, label = "program") {
  const report = inspectGraphicIntegrity(program);
  assert.deepEqual(report.issues, [], `${label}:\n${report.issues.join("\n")}`);
  return report.metrics;
}

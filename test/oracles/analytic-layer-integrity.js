import assert from "node:assert/strict";

const GEOMETRY_EPSILON = 1e-9;
const TWO_DIMENSIONAL_PATH_MARKS = new Set(["area", "arc", "point"]);

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finite(values) {
  return values.every(Number.isFinite);
}

function pathBounds(commands) {
  if (!Array.isArray(commands) || commands.length < 2) return undefined;
  let minimumX = Infinity;
  let maximumX = -Infinity;
  let minimumY = Infinity;
  let maximumY = -Infinity;
  let xCount = 0;
  let yCount = 0;
  for (const command of commands) {
    if (!plainObject(command)) return undefined;
    for (const [name, value] of Object.entries(command)) {
      if (/^x\d*$/u.test(name)) {
        if (!Number.isFinite(value)) return undefined;
        minimumX = Math.min(minimumX, value);
        maximumX = Math.max(maximumX, value);
        xCount += 1;
      }
      if (/^y\d*$/u.test(name)) {
        if (!Number.isFinite(value)) return undefined;
        minimumY = Math.min(minimumY, value);
        maximumY = Math.max(maximumY, value);
        yCount += 1;
      }
    }
  }
  if (xCount === 0 || yCount === 0) return undefined;
  return {
    width: maximumX - minimumX,
    height: maximumY - minimumY
  };
}

function hasNonZeroGeometry(ownerType, markType, item) {
  const type = item.type ?? ownerType;
  const properties = item.properties;
  if (!plainObject(properties)) return false;
  if (type === "circle") {
    return finite([properties.x, properties.y, properties.radius]) &&
      properties.radius > GEOMETRY_EPSILON;
  }
  if (type === "rect") {
    return finite([
      properties.x,
      properties.y,
      properties.width,
      properties.height
    ]) && properties.width > GEOMETRY_EPSILON &&
      properties.height > GEOMETRY_EPSILON;
  }
  if (type === "line") {
    return finite([
      properties.x1,
      properties.y1,
      properties.x2,
      properties.y2,
      properties.strokeWidth ?? 1
    ]) && (properties.strokeWidth ?? 1) > 0 &&
      Math.hypot(
        properties.x2 - properties.x1,
        properties.y2 - properties.y1
      ) > GEOMETRY_EPSILON;
  }
  if (type === "text") {
    return finite([properties.x, properties.y, properties.fontSize ?? 12]) &&
      (properties.fontSize ?? 12) > 0 &&
      typeof properties.text === "string" && properties.text.length > 0;
  }
  if (type === "path") {
    const bounds = pathBounds(properties.commands);
    if (bounds === undefined) return false;
    if (TWO_DIMENSIONAL_PATH_MARKS.has(markType)) {
      return bounds.width > GEOMETRY_EPSILON &&
        bounds.height > GEOMETRY_EPSILON;
    }
    return Math.hypot(bounds.width, bounds.height) > GEOMETRY_EPSILON &&
      (properties.strokeWidth === undefined || properties.strokeWidth > 0);
  }
  return false;
}

function materializedItems(owner) {
  if (Array.isArray(owner.items)) return owner.items;
  return plainObject(owner.properties) ? [owner] : [];
}

function leafPrograms(program, path, issues, active = new Set()) {
  if (!plainObject(program)) {
    issues.push(`${path} must be a program object.`);
    return [];
  }
  if (active.has(program)) {
    issues.push(`${path} repeats an active composition program.`);
    return [];
  }
  const children = plainObject(program.children)
    ? Object.entries(program.children)
    : [];
  if (children.length === 0) return [{ path, program }];
  active.add(program);
  const leaves = children.flatMap(([id, child]) =>
    leafPrograms(child, `${path}.children.${id}`, issues, active)
  );
  active.delete(program);
  return leaves;
}

export function inspectAnalyticLayerIntegrity(program) {
  const issues = [];
  const metrics = {
    leafProgramCount: 0,
    layerCount: 0,
    itemCount: 0,
    nonDegenerateItemCount: 0
  };
  const leaves = leafPrograms(program, "program", issues);
  metrics.leafProgramCount = leaves.length;
  for (const { path, program: leaf } of leaves) {
    const layers = leaf.semanticSpec?.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
      issues.push(`${path} must contain at least one semantic analytic layer.`);
      continue;
    }
    const objects = leaf.graphicSpec?.objects;
    if (!plainObject(objects)) {
      issues.push(`${path} requires a graphic object map.`);
      continue;
    }
    for (const [index, layer] of layers.entries()) {
      metrics.layerCount += 1;
      const layerPath = `${path}.semanticSpec.layers[${index}]`;
      if (typeof layer?.id !== "string" || layer.id.length === 0) {
        issues.push(`${layerPath} requires an id.`);
        continue;
      }
      const owner = objects[layer.id];
      if (!plainObject(owner)) {
        issues.push(`${layerPath} has no graphic owner "${layer.id}".`);
        continue;
      }
      const items = materializedItems(owner);
      metrics.itemCount += items.length;
      if (items.length === 0) {
        issues.push(`${layerPath} graphic owner "${layer.id}" has no materialized items.`);
        continue;
      }
      const valid = items.filter(item =>
        plainObject(item) && hasNonZeroGeometry(owner.type, layer.mark?.type, item)
      );
      metrics.nonDegenerateItemCount += valid.length;
      if (valid.length === 0) {
        issues.push(
          `${layerPath} graphic owner "${layer.id}" has no finite, non-zero geometry.`
        );
      }
    }
  }
  return Object.freeze({
    issues: Object.freeze(issues),
    metrics: Object.freeze(metrics)
  });
}

export function assertAnalyticLayerIntegrity(program, label = "program") {
  const report = inspectAnalyticLayerIntegrity(program);
  assert.deepEqual(report.issues, [], `${label}:\n${report.issues.join("\n")}`);
  return report.metrics;
}

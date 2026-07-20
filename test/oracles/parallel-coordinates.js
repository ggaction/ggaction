import { mapLinear, niceDomain, numericTicks } from "./numeric.js";

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeBounds(bounds) {
  if (
    bounds === null ||
    typeof bounds !== "object" ||
    ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
    bounds.right <= bounds.left ||
    bounds.bottom <= bounds.top
  ) {
    throw new TypeError("Parallel bounds must be finite and ordered.");
  }
  return freeze({ ...bounds });
}

function normalizeScale(scale = {}) {
  if (scale === null || typeof scale !== "object" || Array.isArray(scale)) {
    throw new TypeError("Parallel dimension scale must be an object.");
  }
  const unknown = Object.keys(scale).find(key =>
    !["domain", "nice", "zero", "reverse"].includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown parallel scale option "${unknown}".`);
  }
  for (const key of ["nice", "zero", "reverse"]) {
    if (scale[key] !== undefined && typeof scale[key] !== "boolean") {
      throw new TypeError(`Parallel scale ${key} must be boolean.`);
    }
  }
  return freeze({
    domain: scale.domain ?? "auto",
    nice: scale.nice ?? false,
    zero: scale.zero ?? false,
    reverse: scale.reverse ?? false
  });
}

function normalizeDimensions(dimensions) {
  if (!Array.isArray(dimensions) || dimensions.length < 2) {
    throw new RangeError("Parallel coordinates require at least two dimensions.");
  }
  const normalized = dimensions.map((dimension, index) => {
    const value = typeof dimension === "string" ? { field: dimension } : dimension;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`Parallel dimension ${index} must be a string or object.`);
    }
    const unknown = Object.keys(value).find(key =>
      !["field", "fieldType", "title", "scale"].includes(key)
    );
    if (unknown !== undefined) {
      throw new Error(`Unknown parallel dimension option "${unknown}".`);
    }
    const field = nonEmptyString(value.field, `Parallel dimension ${index} field`);
    const fieldType = value.fieldType ?? "quantitative";
    if (!["quantitative", "ordinal"].includes(fieldType)) {
      throw new Error(`Unsupported parallel field type "${fieldType}".`);
    }
    return freeze({
      field,
      fieldType,
      title: value.title ?? field,
      scale: normalizeScale(value.scale)
    });
  });
  const fields = normalized.map(dimension => dimension.field);
  if (new Set(fields).size !== fields.length) {
    throw new Error("Parallel dimensions must use unique fields.");
  }
  return freeze(normalized);
}

function validOrdinal(value) {
  return typeof value === "string" || Number.isFinite(value);
}

function validValue(value, fieldType) {
  return fieldType === "quantitative" ? Number.isFinite(value) : validOrdinal(value);
}

function explicitDomain(domain, fieldType) {
  if (!Array.isArray(domain)) {
    throw new TypeError("Explicit parallel scale domain must be an array.");
  }
  if (fieldType === "quantitative") {
    if (
      domain.length !== 2 ||
      !domain.every(Number.isFinite) ||
      domain[0] >= domain[1]
    ) {
      throw new TypeError("Quantitative parallel domain must contain two ordered finite values.");
    }
  } else if (domain.length === 0 || domain.some(value => !validOrdinal(value)) ||
      new Set(domain).size !== domain.length) {
    throw new TypeError("Ordinal parallel domain must contain unique comparable values.");
  }
  return [...domain];
}

function resolveDomain(rows, dimension) {
  const { field, fieldType, scale } = dimension;
  if (scale.domain !== "auto") return explicitDomain(scale.domain, fieldType);
  const values = rows.map(row => row?.[field]).filter(value =>
    validValue(value, fieldType)
  );
  if (values.length === 0) {
    throw new Error(`Cannot infer parallel domain for "${field}".`);
  }
  if (fieldType === "ordinal") return [...new Set(values)];
  let domainValues = values;
  if (scale.zero) domainValues = [...domainValues, 0];
  return scale.nice
    ? [...niceDomain(domainValues)]
    : [Math.min(...domainValues), Math.max(...domainValues)];
}

function mapOrdinal(value, domain, range) {
  const index = domain.indexOf(value);
  if (index < 0) return undefined;
  if (domain.length === 1) return (range[0] + range[1]) / 2;
  return mapLinear(index, [0, domain.length - 1], range);
}

function splitFragments(vertices) {
  const fragments = [];
  let current = [];
  for (const vertex of vertices) {
    if (vertex === undefined) {
      if (current.length > 0) fragments.push(current);
      current = [];
    } else {
      current.push(vertex);
    }
  }
  if (current.length > 0) fragments.push(current);
  return fragments;
}

function pathCommands(fragments) {
  return fragments.filter(fragment => fragment.length >= 2).flatMap(fragment =>
    fragment.map((point, index) => freeze({
      op: index === 0 ? "M" : "L",
      x: point.x,
      y: point.y
    }))
  );
}

export function calculateParallelCoordinates(rows, {
  dimensions,
  bounds,
  key,
  missing = "break"
}) {
  if (!Array.isArray(rows)) throw new TypeError("Parallel rows must be an array.");
  if (!["break", "drop-row", "error"].includes(missing)) {
    throw new Error(`Unsupported parallel missing policy "${missing}".`);
  }
  const resolvedBounds = normalizeBounds(bounds);
  const normalized = normalizeDimensions(dimensions);
  const xStep = (resolvedBounds.right - resolvedBounds.left) /
    (normalized.length - 1);
  const axes = normalized.map((dimension, index) => {
    const domain = resolveDomain(rows, dimension);
    const yRange = dimension.scale.reverse
      ? [resolvedBounds.top, resolvedBounds.bottom]
      : [resolvedBounds.bottom, resolvedBounds.top];
    return freeze({
      ...dimension,
      domain,
      x: resolvedBounds.left + xStep * index,
      yRange,
      ticks: dimension.fieldType === "quantitative"
        ? [...numericTicks(domain, 5)]
        : [...domain]
    });
  });

  const seen = new Set();
  const items = [];
  rows.forEach((row, sourceRowIndex) => {
    const itemKey = key === undefined
      ? `source:${sourceRowIndex}`
      : row?.[nonEmptyString(key, "Parallel key")];
    if (itemKey === undefined || itemKey === null || itemKey === "") {
      throw new Error(`Parallel key is missing at row ${sourceRowIndex}.`);
    }
    const keyToken = `${typeof itemKey}:${String(itemKey)}`;
    if (seen.has(keyToken)) throw new Error(`Duplicate parallel key "${itemKey}".`);
    seen.add(keyToken);

    const vertices = axes.map(axis => {
      const value = row?.[axis.field];
      if (!validValue(value, axis.fieldType)) return undefined;
      const y = axis.fieldType === "quantitative"
        ? mapLinear(value, axis.domain, axis.yRange)
        : mapOrdinal(value, axis.domain, axis.yRange);
      return y === undefined ? undefined : freeze({
        dimension: axis.field,
        value,
        x: axis.x,
        y
      });
    });
    const incomplete = vertices.some(vertex => vertex === undefined);
    if (incomplete && missing === "error") {
      throw new Error(`Parallel row ${sourceRowIndex} has a missing dimension.`);
    }
    if (incomplete && missing === "drop-row") return;
    const fragments = splitFragments(vertices);
    items.push(freeze({
      key: itemKey,
      sourceRowIndex,
      vertices,
      fragments,
      commands: pathCommands(fragments)
    }));
  });

  return freeze({ axes, bounds: resolvedBounds, items, missing });
}

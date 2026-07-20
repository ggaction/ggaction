const DIRECTIONS = Object.freeze(["ascending", "descending"]);

function validateField(field, label) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return field;
}

function groupKey(values) {
  return JSON.stringify(values);
}

export function orderPathRows(
  rows,
  { field, order = "ascending", groupBy = [] } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError("Path-order oracle requires non-empty rows.");
  }
  const orderField = validateField(field, "Path-order field");
  if (!DIRECTIONS.includes(order)) {
    throw new Error(`Unknown path-order direction "${order}".`);
  }
  if (!Array.isArray(groupBy)) {
    throw new TypeError("Path-order groupBy must be an array.");
  }
  const groupFields = groupBy.map((item, index) =>
    validateField(item, `Path-order groupBy[${index}]`)
  );
  if (new Set(groupFields).size !== groupFields.length) {
    throw new Error("Path-order groupBy fields must be unique.");
  }

  const groups = new Map();
  rows.forEach((row, sourceIndex) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`Path-order row ${sourceIndex} must be an object.`);
    }
    const value = row[orderField];
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Path-order field "${orderField}" must contain finite numbers.`
      );
    }
    const dimensions = groupFields.map(group => row[group]);
    if (dimensions.some(value => value === undefined || value === null)) {
      throw new Error("Path-order group fields cannot be missing.");
    }
    const key = groupKey(dimensions);
    const group = groups.get(key) ?? {
      key: Object.fromEntries(
        groupFields.map((group, index) => [group, dimensions[index]])
      ),
      items: []
    };
    group.items.push({ row, sourceIndex, value });
    groups.set(key, group);
  });

  const direction = order === "ascending" ? 1 : -1;
  return Object.freeze([...groups.values()].map(group => {
    const items = [...group.items].sort((left, right) =>
      direction * (left.value - right.value) ||
      left.sourceIndex - right.sourceIndex
    );
    return Object.freeze({
      key: Object.freeze({ ...group.key }),
      rows: Object.freeze(items.map(item => item.row)),
      sourceIndices: Object.freeze(items.map(item => item.sourceIndex)),
      orderValues: Object.freeze(items.map(item => item.value))
    });
  }));
}

import { requireStringValue as requireName } from "../core/validation.js";
import { annotateError } from "../core/diagnostics.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const STORAGE_TYPES = new Set([
  "number", "string", "boolean", "array", "object", "unknown", "mixed"
]);
const DECLARED_STORAGE_TYPES = new Set([
  "number", "string", "boolean", "array", "object"
]);
const FIELD_KEYS = Object.freeze([
  "name", "storageType", "nullable", "optional", "lineage"
]);
const SOURCE_FIELD_KEYS = Object.freeze([
  "name", "storageType", "nullable", "optional"
]);

function rejectUnknownKeys(value, keys, label) {
  const unknown = Object.keys(value).find(key => !keys.includes(key));
  if (unknown !== undefined) throw new Error(`Unknown ${label} property "${unknown}".`);
}


function valueStorageType(value) {
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (isPlainObject(value)) return "object";
  return "unknown";
}

function normalizeLineage(value, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object.`);
  rejectUnknownKeys(value, ["inputs", "owner", "role"], label);
  if (!Array.isArray(value.inputs)) throw new TypeError(`${label} inputs must be an array.`);
  const inputs = value.inputs.map((input, index) => {
    if (!isPlainObject(input)) throw new TypeError(`${label} input ${index} must be a plain object.`);
    rejectUnknownKeys(input, ["data", "field"], `${label} input ${index}`);
    return {
      data: requireName(input.data, `${label} input ${index} data`),
      field: requireName(input.field, `${label} input ${index} field`)
    };
  });
  return {
    inputs,
    owner: requireName(value.owner, `${label} owner`),
    role: requireName(value.role, `${label} role`)
  };
}

function normalizeField(value, index, { declared = false } = {}) {
  if (!isPlainObject(value)) throw new TypeError(`Dataset schema field ${index} must be a plain object.`);
  rejectUnknownKeys(
    value,
    declared ? SOURCE_FIELD_KEYS : FIELD_KEYS,
    `dataset schema field ${index}`
  );
  const name = requireName(value.name, `Dataset schema field ${index} name`);
  const allowed = declared ? DECLARED_STORAGE_TYPES : STORAGE_TYPES;
  if (!allowed.has(value.storageType)) {
    throw new Error(`Unsupported dataset schema storageType "${value.storageType}".`);
  }
  for (const key of ["nullable", "optional"]) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") {
      throw new TypeError(`Dataset schema field ${index} ${key} must be a boolean.`);
    }
  }
  return {
    name,
    storageType: value.storageType,
    nullable: value.nullable ?? false,
    optional: value.optional ?? false,
    ...(value.lineage === undefined
      ? {}
      : { lineage: normalizeLineage(value.lineage, `Dataset schema field ${index} lineage`) })
  };
}

export function normalizeSourceSchema(value) {
  if (!isPlainObject(value)) throw new TypeError("Dataset schema must be a plain object.");
  rejectUnknownKeys(value, ["fields"], "dataset schema");
  if (!Array.isArray(value.fields)) throw new TypeError("Dataset schema fields must be an array.");
  const fields = value.fields.map((field, index) => normalizeField(field, index, { declared: true }));
  if (new Set(fields.map(field => field.name)).size !== fields.length) {
    throw new Error("Dataset schema field names must be unique.");
  }
  return cloneAndFreeze({
    version: 1,
    completeness: "known",
    origin: "declared",
    fields
  });
}

export function validateDatasetSchema(value) {
  if (!isPlainObject(value)) throw new TypeError("Dataset schema must be a plain object.");
  rejectUnknownKeys(value, ["version", "completeness", "origin", "fields"], "dataset schema");
  if (value.version !== 1) throw new Error(`Unsupported dataset schema version "${value.version}".`);
  if (!["known", "unknown"].includes(value.completeness)) {
    throw new Error(`Unsupported dataset schema completeness "${value.completeness}".`);
  }
  if (!["declared", "inferred", "derived"].includes(value.origin)) {
    throw new Error(`Unsupported dataset schema origin "${value.origin}".`);
  }
  if (!Array.isArray(value.fields)) throw new TypeError("Dataset schema fields must be an array.");
  const fields = value.fields.map((field, index) => normalizeField(field, index));
  if (new Set(fields.map(field => field.name)).size !== fields.length) {
    throw new Error("Dataset schema field names must be unique.");
  }
  if (value.completeness === "unknown" && fields.length > 0) {
    throw new Error("Unknown dataset schema cannot contain known fields.");
  }
  return cloneAndFreeze({
    version: 1,
    completeness: value.completeness,
    origin: value.origin,
    fields
  });
}

export function inferDatasetSchema(values, { origin = "inferred" } = {}) {
  if (!Array.isArray(values)) throw new TypeError("Dataset schema inference requires row values.");
  if (values.length === 0) {
    return cloneAndFreeze({ version: 1, completeness: "unknown", origin, fields: [] });
  }
  const records = new Map();
  for (const row of values) {
    for (const name of Object.keys(row)) {
      if (!records.has(name)) records.set(name, { types: new Set(), nullable: false, present: 0 });
      const record = records.get(name);
      const value = row[name];
      if (value !== undefined) record.present += 1;
      if (value === null) record.nullable = true;
      else if (value !== undefined) record.types.add(valueStorageType(value));
    }
  }
  const fields = [...records].map(([name, record]) => ({
    name,
    storageType: record.types.size === 0
      ? "unknown"
      : record.types.size === 1 ? [...record.types][0] : "mixed",
    nullable: record.nullable,
    optional: record.present < values.length
  }));
  return cloneAndFreeze({ version: 1, completeness: "known", origin, fields });
}

export function validateRowsAgainstSchema(values, schema, label = "Dataset") {
  const normalized = validateDatasetSchema(schema);
  if (normalized.completeness !== "known") return normalized;
  const fields = new Map(normalized.fields.map(field => [field.name, field]));
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (normalized.origin === "declared") {
      const unknown = Object.keys(row).find(name => !fields.has(name));
      if (unknown !== undefined) throw new Error(`${label} row ${rowIndex} contains undeclared field "${unknown}".`);
    }
    for (const field of normalized.fields) {
      const present = Object.hasOwn(row, field.name) && row[field.name] !== undefined;
      if (!present) {
        if (!field.optional) throw new Error(`${label} row ${rowIndex} requires field "${field.name}".`);
        continue;
      }
      const value = row[field.name];
      if (value === null) {
        if (!field.nullable) throw new TypeError(`${label} field "${field.name}" cannot be null at row ${rowIndex}.`);
        continue;
      }
      if (!["unknown", "mixed"].includes(field.storageType) && valueStorageType(value) !== field.storageType) {
        throw new TypeError(`${label} field "${field.name}" must contain ${field.storageType} values; invalid row ${rowIndex}.`);
      }
    }
  }
  return normalized;
}

export function schemaField(schema, name) {
  return validateDatasetSchema(schema).fields.find(field => field.name === name);
}

export function assertFieldsAvailable(schema, fields, { data, operation } = {}) {
  const normalized = validateDatasetSchema(schema);
  const unique = [...new Set(fields.filter(field => typeof field === "string" && field.length > 0))];
  for (const field of unique) {
    if (normalized.completeness !== "known" || schemaField(normalized, field) === undefined) {
      throw annotateError(new Error(
        `Dataset "${data ?? "unknown"}" does not contain field "${field}".`
      ), {
        code: "missing-resource",
        operation,
        optionPath: "field",
        resourceId: data
      });
    }
  }
  return normalized;
}

function expressionFields(expression, output = []) {
  if (!isPlainObject(expression)) return output;
  if (typeof expression.field === "string") output.push(expression.field);
  for (const value of Object.values(expression)) {
    if (Array.isArray(value)) value.forEach(item => expressionFields(item, output));
    else if (isPlainObject(value)) expressionFields(value, output);
  }
  return output;
}

export function transformInputFields(transform) {
  const result = [];
  const add = value => {
    if (typeof value === "string" && value.length > 0) result.push(value);
    else if (Array.isArray(value)) value.forEach(add);
  };
  add(transform.field);
  add(transform.x);
  add(transform.x?.field);
  add(transform.y);
  add(transform.y?.field);
  add(transform.category);
  add(transform.group);
  add(transform.value);
  add(transform.key);
  add(transform.groupBy);
  add(transform.partitionBy);
  add(transform.fields);
  add(transform.keys);
  add(transform.weight?.field ?? transform.weight);
  add(transform.placement?.categoryField);
  add(transform.placement?.split?.field);
  add(transform.sortBy?.map(item => item.field));
  if (transform.type === "window") {
    const generated = new Set();
    for (const item of transform.operations ?? []) {
      if (typeof item.field === "string" && !generated.has(item.field)) add(item.field);
      add(item.orderBy);
      if (typeof item.as === "string") generated.add(item.as);
    }
  } else {
    add(transform.operations?.flatMap(item => [item.field, item.orderBy]));
  }
  add(transform.aggregates?.flatMap(item => [item.field, item.op?.orderBy]));
  add(expressionFields(transform.expression));
  return [...new Set(result)];
}

function inheritedField(schema, name) {
  const field = schema.fields.find(item => item.name === name);
  return field === undefined ? undefined : { ...field };
}

function generatedField(name, storageType, transform, role, inputs = []) {
  return {
    name,
    storageType,
    nullable: !["count", "valid", "missing", "rowNumber", "rank", "denseRank"].includes(role),
    optional: false,
    lineage: {
      inputs: inputs
        .filter(field => typeof field === "string" && field.length > 0)
        .map(field => ({ data: transform.__sourceId ?? "source", field })),
      owner: transform.__ownerId ?? transform.type,
      role
    }
  };
}

export function deriveTransformSchema(inputSchema, transform, values, { sourceId, ownerId } = {}) {
  const input = validateDatasetSchema(inputSchema);
  const definition = { ...transform, __sourceId: sourceId, __ownerId: ownerId };
  const retain = ["filter", "markFilter", "sort", "computed", "timeUnit", "window", "normalize", "stack", "impute", "complete"];
  let fields = retain.includes(transform.type) ? input.fields.map(field => ({ ...field })) : [];
  const push = field => {
    if (field === undefined) return;
    fields = fields.filter(item => item.name !== field.name);
    fields.push(field);
  };
  if (transform.type === "summary") {
    fields = transform.groupBy.map(name => inheritedField(input, name)).filter(Boolean);
    for (const item of transform.aggregates) {
      const op = typeof item.op === "string" ? item.op : item.op.op;
      push(generatedField(item.as, "number", definition, op, item.field ? [item.field] : []));
    }
    if (transform.members !== undefined) push(generatedField(transform.members, "array", definition, "members"));
  } else if (transform.type === "bin") {
    fields = [
      generatedField(transform.as.lower, "number", definition, "lower", [transform.field]),
      generatedField(transform.as.upper, "number", definition, "upper", [transform.field]),
      generatedField(transform.as.count, "number", definition, "count", [transform.field])
    ];
    if (transform.as.members !== undefined) push(generatedField(transform.as.members, "array", definition, "members"));
  } else if (transform.type === "bin2d") {
    fields = [
      generatedField(transform.as.x0, "number", definition, "x0", [transform.x]),
      generatedField(transform.as.x1, "number", definition, "x1", [transform.x]),
      generatedField(transform.as.y0, "number", definition, "y0", [transform.y]),
      generatedField(transform.as.y1, "number", definition, "y1", [transform.y]),
      generatedField(transform.as.count, "number", definition, "count", [transform.x, transform.y])
    ];
    if (transform.as.members !== undefined) push(generatedField(transform.as.members, "array", definition, "members"));
  } else if (transform.type === "regression") {
    fields = [inheritedField(input, transform.x), inheritedField(input, transform.y)].filter(Boolean);
    if (transform.groupBy !== undefined) fields.unshift(inheritedField(input, transform.groupBy));
    if (transform.interval !== false && transform.method !== "loess") {
      push(generatedField("__regression_ci_lower", "number", definition, "lower", [transform.x, transform.y]));
      push(generatedField("__regression_ci_upper", "number", definition, "upper", [transform.x, transform.y]));
    }
  } else if (transform.type === "density") {
    fields = [
      ...(transform.groupBy === undefined ? [] : [inheritedField(input, transform.groupBy)]),
      ...(transform.placement?.split === undefined ? [] : [inheritedField(input, transform.placement.split.field)]),
      generatedField(transform.as[0], "number", definition, "value", [transform.field]),
      generatedField(transform.as[1], "number", definition, "density", [transform.field])
    ].filter(Boolean);
    if (transform.groupBy === undefined && transform.placement !== undefined) {
      push(generatedField(transform.placement.categoryField, "string", definition, "category"));
    }
  } else if (transform.type === "interval") {
    fields = transform.groupBy.map(name => inheritedField(input, name)).filter(Boolean);
    push(generatedField(transform.as.center, "number", definition, "center", [transform.field]));
    push(generatedField(transform.as.lower, "number", definition, "lower", [transform.field]));
    push(generatedField(transform.as.upper, "number", definition, "upper", [transform.field]));
  } else if (transform.type === "ecdf") {
    fields = transform.groupBy.map(name => inheritedField(input, name)).filter(Boolean);
    push(generatedField(transform.as.value, "number", definition, "value", [transform.field]));
    push(generatedField(transform.as.cumulative, "number", definition, "cumulative", [transform.field]));
    push(generatedField(transform.as.probability, "number", definition, "probability", [transform.field]));
  } else if (transform.type === "computed") {
    push(generatedField(transform.as, "unknown", definition, "value", expressionFields(transform.expression)));
  } else if (transform.type === "timeUnit") {
    push(generatedField(transform.as, "number", definition, "value", [transform.field]));
  } else if (transform.type === "window") {
    for (const item of transform.operations) {
      push(generatedField(
        item.as,
        ["lag", "lead"].includes(item.op) ? "unknown" : "number",
        definition,
        item.op,
        item.field ? [item.field] : []
      ));
    }
  } else if (transform.type === "normalize") {
    push(generatedField(transform.as, "number", definition, "value", [transform.field]));
  } else if (transform.type === "stack") {
    for (const [role, name] of Object.entries(transform.as ?? {})) {
      push(generatedField(name, "number", definition, role, [transform.field]));
    }
  } else if (transform.type === "fold") {
    fields = input.fields.filter(field => !transform.fields.includes(field.name)).map(field => ({ ...field }));
    push(generatedField(transform.as.key, "string", definition, "key", transform.fields));
    push(generatedField(transform.as.value, "unknown", definition, "value", transform.fields));
  }
  const inferred = Array.isArray(values) && values.length > 0
    ? inferDatasetSchema(values, { origin: "derived" })
    : undefined;
  if (inferred !== undefined) {
    const actual = new Map(inferred.fields.map(field => [field.name, field]));
    fields = fields.map(planned => {
      const field = actual.get(planned.name);
      if (field === undefined) {
        return ["complete", "impute"].includes(transform.type)
          ? { ...planned, optional: true }
          : planned;
      }
      if (planned.lineage === undefined && !["complete", "impute"].includes(transform.type)) {
        return planned;
      }
      return { ...planned, storageType: field.storageType, nullable: field.nullable, optional: field.optional };
    });
    for (const field of inferred.fields) {
      if (!fields.some(planned => planned.name === field.name)) fields.push(field);
    }
  }
  return cloneAndFreeze({
    version: 1,
    completeness: input.completeness === "known" || fields.length > 0 ? "known" : "unknown",
    origin: "derived",
    fields: input.completeness === "known" || fields.length > 0 ? fields : []
  });
}

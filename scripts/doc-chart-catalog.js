const ALLOWED_KEYS = new Set([
  "actions",
  "alt",
  "caption",
  "featured",
  "gallery_featured",
  "height",
  "home_group",
  "home_order",
  "image",
  "recipe_order",
  "recipe_url",
  "summary",
  "tasks",
  "thumbnail",
  "thumbnail_height",
  "thumbnail_width",
  "title",
  "tutorial_order",
  "url",
  "width"
]);

const REQUIRED_KEYS = [
  "title",
  "image",
  "alt",
  "width",
  "height",
  "thumbnail",
  "thumbnail_width",
  "thumbnail_height",
  "caption",
  "summary",
  "actions",
  "url"
];

const REQUIRED_TEXT_KEYS = REQUIRED_KEYS.filter(key => ![
  "width",
  "height",
  "thumbnail_width",
  "thumbnail_height"
].includes(key));

const ORDER_KEYS = ["tutorial_order", "recipe_order"];

function scalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:\d+|\d*\.\d+)$/.test(value)) return Number(value);
  const quoted = value.match(/^(["'])(.*)\1$/);
  return quoted ? quoted[2] : value;
}

export function parseDocChartCatalog(source) {
  const records = [];
  let current;

  for (const [index, line] of source.split("\n").entries()) {
    const lineNumber = index + 1;
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    const start = line.match(/^- id:\s*(\S+)\s*$/);
    if (start) {
      current = { id: scalar(start[1]) };
      records.push(current);
      continue;
    }

    const property = line.match(/^ {2}([a-z_]+):\s*(.*?)\s*$/);
    if (!property || current === undefined) {
      throw new Error(`Invalid chart catalog syntax at line ${lineNumber}.`);
    }
    const [, key, rawValue] = property;
    if (Object.hasOwn(current, key)) {
      throw new Error(
        `Chart "${current.id}" repeats property "${key}" at line ${lineNumber}.`
      );
    }
    if (rawValue === "") {
      throw new Error(
        `Chart "${current.id}" has an empty property "${key}" at line ${lineNumber}.`
      );
    }
    current[key] = scalar(rawValue);
  }

  return records;
}

function requireUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate chart catalog ${label}: ${value}.`);
    seen.add(value);
  }
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

export function validateDocChartCatalog(records) {
  requireUnique(records.map(record => record.id), "id");
  requireUnique(records.map(record => record.title), "title");

  for (const record of records) {
    if (!/^[a-z][a-z0-9-]*$/.test(record.id)) {
      throw new Error(`Invalid chart catalog id: ${record.id}.`);
    }
    for (const key of Object.keys(record)) {
      if (key !== "id" && !ALLOWED_KEYS.has(key)) {
        throw new Error(`Chart "${record.id}" has unknown property "${key}".`);
      }
    }
    for (const key of REQUIRED_KEYS) {
      if (record[key] === undefined) {
        throw new Error(`Chart "${record.id}" requires property "${key}".`);
      }
    }
    for (const key of REQUIRED_TEXT_KEYS) {
      if (typeof record[key] !== "string" || record[key].trim() === "") {
        throw new Error(`Chart "${record.id}" ${key} must be non-empty text.`);
      }
    }
    for (const key of ["width", "height", "thumbnail_width", "thumbnail_height"]) {
      requirePositiveInteger(record[key], `Chart "${record.id}" ${key}`);
    }
    for (const key of ["url", "recipe_url"]) {
      if (record[key] !== undefined && !/^\/[^\s]*$/.test(record[key])) {
        throw new Error(`Chart "${record.id}" ${key} must be a site-absolute URL.`);
      }
    }
    if (!record.image.endsWith(".png") || !record.thumbnail.endsWith("-thumb.png")) {
      throw new Error(`Chart "${record.id}" requires PNG image and thumbnail paths.`);
    }
    const invalidFeatured = [record.featured, record.gallery_featured]
      .some(value => value !== undefined && value !== true);
    const invalidGroup = record.home_group !== undefined &&
      !["essentials", "statistical", "coordinates", "other"].includes(record.home_group);
    if (invalidFeatured || invalidGroup) {
      throw new Error(`Chart "${record.id}" has invalid discovery metadata.`);
    }
    if (
      typeof record.tasks !== "string" ||
      !/^[a-z-]+(?: [a-z-]+)*$/.test(record.tasks)
    ) {
      throw new Error(`Chart "${record.id}" requires space-separated task tags.`);
    }
  }

  for (const key of ORDER_KEYS) {
    requireUnique(
      records.filter(record => record[key] !== undefined).map(record => record[key]),
      key
    );
  }
  for (const group of ["essentials", "statistical", "coordinates", "other"]) {
    requireUnique(
      records
        .filter(record => record.home_group === group && record.home_order !== undefined)
        .map(record => record.home_order),
      `${group} home_order`
    );
  }

  return records;
}

export function readDocChartCatalog(source) {
  return validateDocChartCatalog(parseDocChartCatalog(source));
}

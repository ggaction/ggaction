const NUMERIC_FORMAT = /^\.(0?\d|1[0-2])(f|%|e)$/;
const TIME_DIRECTIVES = new Set(["Y", "m", "d", "b", "%"]);
const MONTH_NAMES = Object.freeze([
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]);

export function isUtcValueFormat(format) {
  if (typeof format !== "string") return false;
  let directives = 0;
  for (let index = 0; index < format.length; index += 1) {
    if (format[index] !== "%") continue;
    const directive = format[index + 1];
    if (!TIME_DIRECTIVES.has(directive)) return false;
    if (directive !== "%") directives += 1;
    index += 1;
  }
  return directives > 0;
}

export function validateValueFormat(format, label = "Label format", {
  allowDecimalsObject = false
} = {}) {
  if (format === undefined || format === "auto") return format ?? "auto";
  if (
    format !== null &&
    typeof format === "object" &&
    Number.isInteger(format.decimals) &&
    format.decimals >= 0 &&
    format.decimals <= 100 &&
    Object.keys(format).length === 1
  ) {
    if (allowDecimalsObject) return format;
  }
  if (typeof format === "string" && (
    NUMERIC_FORMAT.test(format) || isUtcValueFormat(format)
  )) {
    return format;
  }
  const numericCandidate = typeof format === "string"
    ? format.match(/^\.(\d+)(f|%|e)$/)
    : undefined;
  if (numericCandidate && Number(numericCandidate[1]) > 12) {
    throw new RangeError(`${label} numeric format supports at most 12 decimals.`);
  }
  throw new TypeError(
    `${label} must be auto${allowDecimalsObject ? ", { decimals }," : ","} or a supported format string (numeric or UTC).`
  );
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function formatUtcValue(value, format, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`${label} requires a valid date or timestamp.`);
  }
  const values = {
    Y: pad(date.getUTCFullYear(), 4),
    m: pad(date.getUTCMonth() + 1),
    d: pad(date.getUTCDate()),
    b: MONTH_NAMES[date.getUTCMonth()]
  };
  return format.replace(/%([Ymdb%])/g, (_, directive) =>
    directive === "%" ? "%" : values[directive]
  );
}

export function formatValue(value, {
  format = "auto",
  valueType,
  autoFormatter = current => String(current),
  label = "Label format",
  allowDecimalsObject = false
} = {}) {
  const resolved = validateValueFormat(format, label, {
    allowDecimalsObject
  });
  if (value === undefined || value === null) return undefined;
  if (resolved === "auto") return autoFormatter(value);
  if (["nominal", "ordinal", "discrete"].includes(valueType)) {
    throw new Error('Discrete labels require format "auto".');
  }
  const utc = isUtcValueFormat(resolved);
  if (valueType === "temporal") {
    if (!utc) throw new Error("Temporal labels require a supported UTC format string.");
    return formatUtcValue(value, resolved, label);
  }
  if (utc) {
    if (valueType === "quantitative") {
      throw new Error("Quantitative labels cannot use a UTC format string.");
    }
    return formatUtcValue(value, resolved, label);
  }
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} "${typeof resolved === "string" ? resolved : "decimals"}" requires a finite number.`);
  }
  if (typeof resolved === "object") return value.toFixed(resolved.decimals);
  const match = resolved.match(NUMERIC_FORMAT);
  const precision = Number(match[1]);
  if (match[2] === "f") return value.toFixed(precision);
  if (match[2] === "%") {
    const percentage = value * 100;
    if (!Number.isFinite(percentage)) {
      throw new RangeError(`${label} percent format overflow.`);
    }
    return `${percentage.toFixed(precision)}%`;
  }
  return value.toExponential(precision);
}

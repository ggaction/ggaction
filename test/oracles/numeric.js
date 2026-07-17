function finiteValues(values, label) {
  if (!Array.isArray(values) || values.length === 0 ||
      values.some(value => !Number.isFinite(value))) {
    throw new TypeError(`${label} requires a non-empty finite array.`);
  }
  return values;
}

export function niceStep(span, count = 5) {
  if (!Number.isFinite(span) || span < 0 || !Number.isFinite(count) || count <= 0) {
    throw new RangeError("niceStep requires a non-negative span and positive count.");
  }
  if (span === 0) return 0;
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = [1, 2, 3, 5, 10].find(candidate => candidate >= fraction);
  return factor * power;
}

export function niceDomain(values, count = 5) {
  finiteValues(values, "niceDomain");
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return Object.freeze([minimum, maximum]);
  const step = niceStep(maximum - minimum, count);
  return Object.freeze([
    Number((Math.floor(minimum / step) * step).toPrecision(12)),
    Number((Math.ceil(maximum / step) * step).toPrecision(12))
  ]);
}

export function numericTicks(domain, count = 5) {
  finiteValues(domain, "numericTicks");
  if (domain.length !== 2) throw new TypeError("numericTicks requires two endpoints.");
  if (domain[0] === domain[1]) return Object.freeze([domain[0]]);
  const step = niceStep(Math.abs(domain[1] - domain[0]), count);
  const low = Math.min(...domain);
  const high = Math.max(...domain);
  const tolerance = step * 1e-10;
  const start = Math.ceil((low - tolerance) / step) * step;
  const stop = Math.floor((high + tolerance) / step) * step;
  const values = [];
  for (let value = start; value <= stop + tolerance; value += step) {
    values.push(Number(value.toPrecision(12)));
  }
  if (domain[0] > domain[1]) values.reverse();
  return Object.freeze(values);
}

export function mapLinear(value, domain, range) {
  if (!Number.isFinite(value)) throw new TypeError("mapLinear value must be finite.");
  finiteValues(domain, "mapLinear domain");
  finiteValues(range, "mapLinear range");
  if (domain.length !== 2 || range.length !== 2) {
    throw new TypeError("mapLinear requires two domain and range endpoints.");
  }
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

export function quantile(sortedValues, probability) {
  finiteValues(sortedValues, "quantile");
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError("quantile probability must be between 0 and 1.");
  }
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const fraction = position - lower;
  return sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * fraction;
}

// Independent empirical statistics: each observation retains its multiplicity.
export function observationMean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function observationQuantile(values, probability) {
  const ordered = [...values].sort((left, right) => left - right);
  const position = (ordered.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return ordered[lower] * (upper - position || 1) +
    (upper === lower ? 0 : ordered[upper] * (position - lower));
}

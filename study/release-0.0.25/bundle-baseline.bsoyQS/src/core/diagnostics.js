const detailsByError = new WeakMap();

export function getErrorDetails(error) {
  return error !== null && (typeof error === "object" || typeof error === "function")
    ? detailsByError.get(error) : undefined;
}

// Attach metadata without modifying the thrown value or its existing class.
export function annotateError(error, details) {
  if (!(error instanceof Error)) return error;
  const previous = getErrorDetails(error);
  const merged = { ...details, ...previous };
  if (merged.candidates !== undefined) merged.candidates = Object.freeze([...merged.candidates]);
  detailsByError.set(error, Object.freeze(merged));
  return error;
}

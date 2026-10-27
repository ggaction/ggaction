let activeReplacements;

export function withLogicalDataReplacements(replacements, operation) {
  const previous = activeReplacements;
  activeReplacements = replacements;
  try {
    return operation();
  } finally {
    activeReplacements = previous;
  }
}

export function comparableDataIdentity(id) {
  if (activeReplacements === undefined) return id;
  for (const [before, after] of activeReplacements) {
    if (after === id) return before;
  }
  return id;
}

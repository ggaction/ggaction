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

// The replacement scope is open only while the staged operation runs: it is
// closed before every yield and reopened on resume, so no other host work
// ever observes it.
export function* withLogicalDataReplacementsStages(replacements, operation) {
  const iterator = operation();
  try {
    while (true) {
      const previous = activeReplacements;
      activeReplacements = replacements;
      let step;
      try { step = iterator.next(); } finally { activeReplacements = previous; }
      if (step.done) return step.value;
      yield;
    }
  } finally { iterator.return(); }
}

export function comparableDataIdentity(id) {
  if (activeReplacements === undefined) return id;
  for (const [before, after] of activeReplacements) {
    if (after === id) return before;
  }
  return id;
}

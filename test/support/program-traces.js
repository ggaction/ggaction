// Composition keeps each child authoring history at its own program root.
export function programTraceOwners(program) {
  const owners = [], pending = [program], seen = new Set();
  while (pending.length > 0) {
    const current = pending.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    owners.push(current);
    pending.push(...Object.values(current.children ?? {}));
  }
  return owners;
}

export function directProgramTrace(program) {
  return programTraceOwners(program).flatMap(owner => owner.trace?.children ?? []);
}

export function directProgramOperations(program) {
  return new Set(directProgramTrace(program).map(node => node.op));
}

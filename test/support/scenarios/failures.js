function normalizedMessage(failure) {
  const message = String(failure?.error?.message ?? "");
  const descriptorId = failure?.descriptor?.id;
  return typeof descriptorId === "string" && descriptorId.length > 0
    ? message.replaceAll(descriptorId, "<scenario>")
    : message;
}

export function failureSignature(failure) {
  if (failure?.ok !== false) return undefined;
  if (failure.kind === "timeout") return "timeout";
  return JSON.stringify([
    failure.kind,
    failure.error?.name ?? "Error",
    normalizedMessage(failure)
  ]);
}

export function sameScenarioFailure(left, right) {
  const leftSignature = failureSignature(left);
  return leftSignature !== undefined && leftSignature === failureSignature(right);
}

export async function shrinkScenarioFailure(failure, contract, runCandidate) {
  let current = failure;
  let attempts = 0;
  const acceptedFactors = [];
  let changed;
  do {
    changed = false;
    for (const [name, values] of Object.entries(contract)) {
      if (name === "dataset" || Object.is(current.descriptor.factors[name], values[0])) {
        continue;
      }
      const descriptor = {
        ...current.descriptor,
        id: `${current.descriptor.id}-shrink-${name}`,
        factors: { ...current.descriptor.factors, [name]: values[0] }
      };
      attempts += 1;
      const candidate = await runCandidate(descriptor);
      if (sameScenarioFailure(current, candidate)) {
        current = candidate;
        acceptedFactors.push(name);
        changed = true;
      }
    }
  } while (changed);

  return Object.freeze({
    ...current,
    originalDescriptor: failure.descriptor,
    descriptor: Object.freeze({
      ...current.descriptor,
      id: failure.descriptor.id,
      factors: Object.freeze({ ...current.descriptor.factors })
    }),
    shrink: Object.freeze({
      attempts,
      acceptedFactors: Object.freeze([...acceptedFactors]),
      originalFactors: failure.descriptor.factors,
      minimizedFactors: Object.freeze({ ...current.descriptor.factors })
    })
  });
}

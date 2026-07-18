export function expectedContinuousFacetUnion(domains) {
  const values = domains.flat();
  return [Math.min(...values), Math.max(...values)];
}

export function expectedStableFacetUnion(domains) {
  const output = [];
  for (const domain of domains) {
    for (const value of domain) {
      if (!output.some(candidate => Object.is(candidate, value))) output.push(value);
    }
  }
  return output;
}


// A facade ID is distinct from a materialized child ID. Only an explicit
// facade target requests an operation over the complete observation population.
export function findRaincloudParent(program, target) {
  if (target === undefined) return undefined;
  return Object.values(program.markConfigs).map(config => config.raincloudPlot)
    .find(config => config?.materialized === true && config.id === target);
}

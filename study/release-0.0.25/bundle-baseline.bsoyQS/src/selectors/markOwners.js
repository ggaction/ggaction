import { findLayer } from "./layers.js";

export function ownedChildren(program, id) {
  const config = program.markConfigs[id] ?? {};
  return [
    config.errorBar?.lowerCapId,
    config.errorBar?.upperCapId,
    config.errorBand?.lowerBoundaryId,
    config.errorBand?.upperBoundaryId,
    config.regression?.bandId,
    config.regression?.lineId,
    config.boxPlot?.whiskerId,
    config.boxPlot?.medianId,
    config.boxPlot?.outlierId,
    config.gradientPlot?.centerId,
    config.intervalPlot?.intervalId,
    config.endpointPlot?.roles?.stemId,
    config.endpointPlot?.roles?.startId,
    config.endpointPlot?.roles?.connectorId,
    ...(config.raincloudPlot?.ownedChildIds ?? [])
  ].concat(
    program.semanticSpec.layers
      .filter(layer => layer.source === id)
      .map(layer => layer.id)
  ).concat(
    program.semanticSpec.layers
      .filter(layer =>
        program.markConfigs[layer.id]?.statisticalReference?.source === id
      )
      .map(layer => layer.id)
  ).filter(child => child !== undefined && child !== id && findLayer(program, child) !== undefined);
}

export function ownership(program) {
  const ownerByChild = new Map();
  for (const layer of program.semanticSpec.layers) {
    for (const child of ownedChildren(program, layer.id)) {
      if (program.markConfigs[child]?.statisticalReference !== undefined) {
        continue;
      }
      ownerByChild.set(child, layer.id);
    }
  }
  return ownerByChild;
}


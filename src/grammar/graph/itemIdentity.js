// Graph item identity is shared by materialization and semantic interaction.
export const graphItemKey = (layer, graph, role, key) => JSON.stringify([[], layer.id, role, [graph.id, key]]);

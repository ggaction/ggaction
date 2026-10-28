// Typed tokens and adjacency are literal expectations, independent of source.
export const graphNodes = [
  { key: "A", sourceRows: [7], attributes: { label: "Alpha", group: ["red", "blue"] } },
  { key: "B", sourceRows: [1, 4] }, { key: "C" }, { key: "isolated" }
];
export const graphEdges = [
  { key: "ab", sourceKey: "A", targetKey: "B", weight: 0, sourceRows: [8] },
  { key: "bc", sourceKey: "B", targetKey: "C", weight: 2 },
  { key: "ca", sourceKey: "C", targetKey: "A", weight: -1 }
];
export const nodeTokens = [
  '["scalar",[["string","A"]]]', '["scalar",[["string","B"]]]',
  '["scalar",[["string","C"]]]', '["scalar",[["string","isolated"]]]'
];
export const edgeTokens = [
  '["scalar",[["string","ab"]]]', '["scalar",[["string","bc"]]]', '["scalar",[["string","ca"]]]'
];
export const directedAdjacency = [
  { incoming: [2], outgoing: [0], neighbors: [1, 2] },
  { incoming: [0], outgoing: [1], neighbors: [0, 2] },
  { incoming: [1], outgoing: [2], neighbors: [1, 0] },
  { incoming: [], outgoing: [], neighbors: [] }
];
export const undirectedAdjacency = [
  { incoming: [0, 2], outgoing: [0, 2], neighbors: [1, 2] },
  { incoming: [0, 1], outgoing: [0, 1], neighbors: [0, 2] },
  { incoming: [1, 2], outgoing: [1, 2], neighbors: [1, 0] },
  { incoming: [], outgoing: [], neighbors: [] }
];

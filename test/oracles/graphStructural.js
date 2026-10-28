// Literal partitions and ordered connections, independent of production code.
export const structuralKeys = ["a", "b", "c", "d", "e"];
export const structuralGroups = [[1], [1], [1], ["1"], ["1"]];
export const structuralFixtures = [
  { id: "clique", method: "group", options: { ruleId: "g" }, expected: [["a", "b", 1], ["a", "c", 1], ["b", "c", 1], ["d", "e", 1]] },
  { id: "star", method: "group", options: { ruleId: "g", mode: "star", hubs: [{ group: [1], key: "b" }, { group: ["1"], key: "e" }] }, expected: [["a", "b", 1], ["b", "c", 1], ["d", "e", 1]] },
  { id: "sequence", method: "sequence", order: [3, 1, 1, 7, 4], options: { ruleId: "s" }, expected: [["b", "c", 1], ["c", "a", 1], ["e", "d", 1]] },
  { id: "sequence-lag", method: "sequence", order: [3, 1, 1, 7, 4], options: { ruleId: "s", lag: 2, maxGap: 2 }, expected: [["b", "a", 1]] },
  { id: "sequence-zero-gap", method: "sequence", order: [3, 1, 1, 7, 4], options: { ruleId: "s", maxGap: 0 }, expected: [["b", "c", 1]] }
];

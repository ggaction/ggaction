export const routeNodes = [{ id: "A" }, { id: "B" }, { id: "C" }];
export const routeEdges = [{ id: "AC", source: "A", target: "C", amount: 8, category: "direct", alternative: "long", rank: 0 }, { id: "AB", source: "A", target: "B", amount: 3, category: "leg", alternative: "short", rank: 1 }, { id: "BC", source: "B", target: "C", amount: 5, category: "leg", alternative: "long", rank: 2 }];
export const routePositions = [{ key: "A", x: 60, y: 180 }, { key: "B", x: 160, y: 60 }, { key: "C", x: 260, y: 180 }];
export const routeCanvas = { width: 320, height: 240, margin: 0, background: "#ffffff" };
export const routeMethods = Object.freeze(["hierarchical", "force-directed", "density", "edge-path"]);
export const routeHierarchyRows = [{ id: "B", parent: null, value: 0 }, { id: "A", parent: "B", value: 1 }, { id: "C", parent: "B", value: 1 }];
export const hierarchyRoutePositions = [{ key: "A", x: -100, y: 120 }, { key: "B", x: 0, y: 0 }, { key: "C", x: 100, y: 120 }];

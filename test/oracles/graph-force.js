// Independently hand-solved two-node spring: endpoints -1/+1, rest distance 4,
// stiffness 0.1, damping 1. These values do not import production code.
export const springPositions = Object.freeze([
  [[-1, 0], [1, 0]],
  [[-1.2, 0], [1.2, 0]],
  [[-1.56, 0], [1.56, 0]],
  [[-2.008, 0], [2.008, 0]]
]);
export const repulsionPositions = [[-2, 0], [2, 0]];
export const pinnedPositions = [[-1, 0], [1.2, 0]];
export const isolatePositions = [[-11, 0], [0, 0], [11, 0]];

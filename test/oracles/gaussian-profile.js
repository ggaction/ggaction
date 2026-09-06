// A small independent Gaussian mixture oracle for explicit-bandwidth chart fixtures.
export function gaussianProfile(values, { bandwidth, extent, steps }) {
  const [start, end] = extent;
  return Array.from({ length: steps }, (_, index) => {
    const value = start + (end - start) * index / (steps - 1);
    const density = values.reduce((total, sample) => {
      const squaredDistance = ((value - sample) / bandwidth) ** 2;
      return total + Math.exp(-squaredDistance / 2) / Math.sqrt(2 * Math.PI);
    }, 0) / (values.length * bandwidth);
    return Object.freeze({ value, density });
  });
}

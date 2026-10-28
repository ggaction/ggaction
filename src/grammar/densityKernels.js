const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);

export const DENSITY_KERNEL_FUNCTIONS = Object.freeze({
  gaussian(value) {
    return Math.exp(-0.5 * value ** 2) / SQRT_TWO_PI;
  },
  epanechnikov(value) {
    return Math.abs(value) <= 1 ? 0.75 * (1 - value ** 2) : 0;
  },
  uniform(value) {
    return Math.abs(value) <= 1 ? 0.5 : 0;
  },
  triangular(value) {
    return Math.abs(value) <= 1 ? 1 - Math.abs(value) : 0;
  }
});

export const DENSITY_KERNELS = Object.freeze(Object.keys(DENSITY_KERNEL_FUNCTIONS));

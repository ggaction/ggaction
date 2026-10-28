// Independent direct 2D convolution, with no production imports or separable pass.
export function shadowReference(alpha, width, height, sigma) {
  const radius = Math.ceil(3 * sigma), outWidth = width + 2 * radius, outHeight = height + 2 * radius;
  if (sigma === 0) return [...alpha];
  let mass = 0;
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) mass += Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
  return Array.from({length: outWidth * outHeight}, (_, index) => {
    const x = index % outWidth - radius, y = Math.floor(index / outWidth) - radius;
    let sum = 0;
    for (let sy = 0; sy < height; sy++) for (let sx = 0; sx < width; sx++) {
      const dx = sx - x, dy = sy - y;
      if (Math.abs(dx) <= radius && Math.abs(dy) <= radius) sum += alpha[sy * width + sx] * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
    return Math.round(sum / mass);
  });
}

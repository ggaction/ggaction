// Executable bounded fixture lowering, independent from the straight-alpha oracle.
// The public renderer does not import this file.
const contains = (bounds, x, y) => x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height;
export function prepareBlendGroup(fixture) {
  const {width, height} = fixture.group;
  if (width !== 260 || height !== 90) throw new RangeError("The blend review group must stay within its fixed 260 by 90 budget.");
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const back = contains(fixture.back.bounds, x, y), front = contains(fixture.front.bounds, x, y);
    const ab = back ? fixture.back.alpha : 0, as = front ? fixture.front.alpha : 0;
    const alpha = as + ab - as * ab;
    for (let channel = 0; channel < 3; channel++) {
      const b = fixture.back.rgb[channel] / 255 * ab, s = fixture.front.rgb[channel] / 255 * as;
      let premultiplied;
      if (fixture.mode === "source-over") premultiplied = s + b * (1 - as);
      else if (fixture.mode === "multiply") premultiplied = s * b + s * (1 - ab) + b * (1 - as);
      else if (fixture.mode === "screen") premultiplied = s + b - s * b;
      else if (fixture.mode === "difference") premultiplied = s + b - 2 * Math.min(s * ab, b * as);
      else throw new TypeError("Unknown blend review mode.");
      rgba[(y * width + x) * 4 + channel] = alpha === 0 ? 0 : Math.round(premultiplied / alpha * 255);
    }
    // Group opacity attenuates the complete isolated result exactly once.
    rgba[(y * width + x) * 4 + 3] = Math.round(alpha * fixture.groupOpacity * 255);
  }
  return {width, height, rgba};
}

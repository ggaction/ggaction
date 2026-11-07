// Normalized sRGB transfer functions; alpha is always linear.
export function linearLight(channel) {
  return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
}
export function encodedLight(channel) {
  return channel <= .0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - .055;
}

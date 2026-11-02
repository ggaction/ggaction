import { validateGeneratedItemLimit } from "./validation.js";

// Count a validated primitive string's JSON representation without allocating
// its escapes or UTF-8 bytes. The caller owns the offset and byte-limit policy.
export function countJSONStringBytes(text, encodedOffset, maxBytes, label) {
  // Every UTF-16 unit contributes at least one byte, plus JSON's two quotes.
  validateGeneratedItemLimit(encodedOffset + text.length + 2, label, maxBytes);
  let length = 2;
  for (let index = 0; index < text.length; index++) {
    const width = jsonStringUnitWidth(text, index);
    length += width;
    if (width === 4) index++;
  }
  validateGeneratedItemLimit(encodedOffset + length, label, maxBytes);
  return length;
}

// A valid surrogate pair is the only JSON unit occupying four UTF-8 bytes.
// Return a scalar number so the counting path allocates no per-unit objects.
function jsonStringUnitWidth(text, index) {
  const unit = text.charCodeAt(index);
  if (unit === 34 || unit === 92 || unit === 8 || unit === 9 || unit === 10 || unit === 12 || unit === 13) return 2;
  if (unit < 32) return 6;
  if (unit < 128) return 1;
  if (unit < 2048) return 2;
  if (unit >= 0xd800 && unit <= 0xdbff && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) return 4;
  return unit >= 0xd800 && unit <= 0xdfff ? 6 : 3;
}

// Private writer for a validated primitive string. Each yielded atom is at
// most six bytes; native JSON owns escape spelling, never a full input copy.
export function* writeJSONStringBytes(text, encodedOffset, maxBytes, label) {
  validateGeneratedItemLimit(encodedOffset + text.length + 2, label, maxBytes);
  const encoder = new TextEncoder();
  let length = 2;
  yield Uint8Array.of(34);
  for (let index = 0; index < text.length; index++) {
    const width = jsonStringUnitWidth(text, index), end = index + (width === 4 ? 2 : 1);
    length += width;
    validateGeneratedItemLimit(encodedOffset + length, label, maxBytes);
    yield encoder.encode(JSON.stringify(text.slice(index, end)).slice(1, -1));
    index = end - 1;
  }
  yield Uint8Array.of(34);
}

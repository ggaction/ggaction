import { validateGeneratedItemLimit } from "./validation.js";

// Count a validated primitive string's JSON representation without allocating
// its escapes or UTF-8 bytes. The caller owns the offset and byte-limit policy.
export function countJSONStringBytes(text, encodedOffset, maxBytes, label) {
  // Every UTF-16 unit contributes at least one byte, plus JSON's two quotes.
  validateGeneratedItemLimit(encodedOffset + text.length + 2, label, maxBytes);
  let length = 2;
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit === 34 || unit === 92 || unit === 8 || unit === 9 || unit === 10 || unit === 12 || unit === 13) length += 2;
    else if (unit < 32) length += 6;
    else if (unit < 128) length++;
    else if (unit < 2048) length += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) {
      length += 4; index++;
    } else length += unit >= 0xd800 && unit <= 0xdfff ? 6 : 3;
  }
  validateGeneratedItemLimit(encodedOffset + length, label, maxBytes);
  return length;
}

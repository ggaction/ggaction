// Private scalar SHA-256 state. Input preparation belongs to contentDigest.js.
// No host scheduler, encoder, program authority, or persisted state lives here.
const ROUND = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
const rotate = (value, bits) => (value >>> bits) | (value << (32 - bits));

const states = new WeakSet();
const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
const byteLength = Object.getOwnPropertyDescriptor(typedArray, "byteLength").get;
const byteOffset = Object.getOwnPropertyDescriptor(typedArray, "byteOffset").get;
const bufferOf = Object.getOwnPropertyDescriptor(typedArray, "buffer").get;
const arrayBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;

export function createSha256State() {
  const state = {
    hash: new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),
    words: new Uint32Array(64), tail: new Uint8Array(64),
    totalBytes: 0, tailLength: 0, status: "active"
  };
  states.add(state);
  return state;
}

function requireState(state, active) {
  if (!states.has(state)) throw new TypeError("Invalid SHA-256 state.");
  if (active && state.status !== "active") throw new Error("SHA-256 state is no longer active.");
}

export function updateSha256(state, bytes, start = 0, end = undefined) {
  requireState(state, true);
  if (!(bytes instanceof Uint8Array)) throw new TypeError("SHA-256 update requires bytes.");
  const length = byteLength.call(bytes), buffer = bufferOf.call(bytes), offset = byteOffset.call(bytes);
  arrayBufferLength.call(buffer);
  if (end === undefined) end = length;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > length) {
    throw new RangeError("Invalid SHA-256 byte range.");
  }
  const count = end - start;
  if (!Number.isSafeInteger(state.totalBytes) || state.totalBytes < 0 || count > Number.MAX_SAFE_INTEGER - state.totalBytes) {
    throw new RangeError("SHA-256 byte length exceeds the safe integer limit.");
  }
  // Construct the view before any state mutation, including for detached inputs.
  const view = new DataView(buffer, offset, length);
  state.totalBytes += count;
  if (state.tailLength !== 0) {
    while (start < end && state.tailLength < 64) state.tail[state.tailLength++] = bytes[start++];
    if (state.tailLength === 64) {
      compress(state, new DataView(state.tail.buffer), 0);
      state.tailLength = 0;
    }
  }
  while (end - start >= 64) {
    compress(state, view, start);
    start += 64;
  }
  while (start < end) state.tail[state.tailLength++] = bytes[start++];
}

export function finishSha256(state) {
  requireState(state, true);
  if (!Number.isSafeInteger(state.totalBytes) || state.totalBytes < 0) {
    throw new RangeError("SHA-256 byte length exceeds the safe integer limit.");
  }
  const tail = state.tail, view = new DataView(tail.buffer);
  tail[state.tailLength] = 0x80;
  tail.fill(0, state.tailLength + 1);
  if (state.tailLength >= 56) {
    compress(state, view, 0);
    tail.fill(0);
  }
  view.setUint32(56, Math.floor(state.totalBytes / 0x20000000));
  view.setUint32(60, state.totalBytes * 8);
  compress(state, view, 0);
  state.status = "finished";
  return hex(state.hash);
}

function hex(hash) {
  let text = "";
  for (let i = 0; i < 8; i++) text += hash[i].toString(16).padStart(8, "0");
  return text;
}

// One-shot digest of caller-owned complete bytes. The module scratch blocks are
// reset before and zeroed after each call; no state escapes the call.
const scratch = { hash: new Uint32Array(8), words: new Uint32Array(64) }, block = new Uint8Array(64), blockView = new DataView(block.buffer);
const INITIAL = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
export function digestSha256Bytes(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("SHA-256 digest requires bytes.");
  const length = byteLength.call(bytes), buffer = bufferOf.call(bytes);
  arrayBufferLength.call(buffer);
  if (length > Number.MAX_SAFE_INTEGER / 8) throw new RangeError("SHA-256 byte length exceeds the safe integer limit.");
  const view = new DataView(buffer, byteOffset.call(bytes), length);
  scratch.hash.set(INITIAL);
  try {
    let start = 0;
    for (; length - start >= 64; start += 64) compress(scratch, view, start);
    const rest = length - start;
    for (let i = 0; i < rest; i++) block[i] = bytes[start + i];
    block[rest] = 0x80;
    block.fill(0, rest + 1);
    if (rest >= 56) { compress(scratch, blockView, 0); block.fill(0); }
    blockView.setUint32(56, Math.floor(length / 0x20000000));
    blockView.setUint32(60, length * 8);
    compress(scratch, blockView, 0);
    return hex(scratch.hash);
  } finally {
    scratch.hash.fill(0); scratch.words.fill(0); block.fill(0);
  }
}

export function clearSha256(state) {
  requireState(state, false);
  if (state.status === "cleared") return;
  state.hash.fill(0); state.words.fill(0); state.tail.fill(0);
  state.hash = null; state.words = null; state.tail = null;
  state.totalBytes = 0; state.tailLength = 0; state.status = "cleared";
}

function compress(state, view, offset) {
  const { hash, words } = state;
  for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
  for (let i = 16; i < 64; i++) {
    const x = words[i - 15], y = words[i - 2];
    words[i] = words[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + words[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10));
  }
  let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
  for (let i = 0; i < 64; i++) {
    const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + ROUND[i] + words[i]) >>> 0;
    const second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
    h=g; g=f; f=e; e=(d+first)>>>0; d=c; c=b; b=a; a=(first+second)>>>0;
  }
  hash[0] += a; hash[1] += b; hash[2] += c; hash[3] += d; hash[4] += e; hash[5] += f; hash[6] += g; hash[7] += h;
}

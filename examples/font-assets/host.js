// Application-owned host adapters; the library never fetches or measures fonts.
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
export async function loadFont({ uri, mimeType }) {
  const url = new URL(uri, import.meta.url);
  if (url.protocol === "file:") {
    const module = "node:fs/promises";
    return { bytes: new Uint8Array(await (await import(/* @vite-ignore */ module)).readFile(url)), mimeType };
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType };
}
export async function registerFont(request) {
  let dispose;
  if (typeof FontFace === "function") {
    const face = new FontFace(request.family, request.bytes, { style: request.style, weight: String(request.weight) });
    await face.load(); document.fonts.add(face);
    dispose = () => { document.fonts.delete(face); };
  } else {
    const module = "@napi-rs/canvas", { GlobalFonts } = await import(/* @vite-ignore */ module);
    const key = GlobalFonts.register(request.bytes, request.family);
    if (!key) throw new Error("The native font decoder rejected the exact fixture bytes.");
    dispose = () => { GlobalFonts.remove(key); };
  }
  return { ...identity(request), dispose };
}
export async function decodeFont(request) {
  const registered = await registerFont(request); registered.dispose(); return identity(request);
}
export async function measureFont({ asset, queries }) {
  const bytes = Uint8Array.from(atob(asset.payload.data), character => character.charCodeAt(0));
  const registered = await registerFont({ ...asset, bytes });
  try {
    let canvas;
    if (typeof document === "object") canvas = document.createElement("canvas");
    else { const module = "@napi-rs/canvas"; canvas = (await import(/* @vite-ignore */ module)).createCanvas(1, 1); }
    const context = canvas.getContext("2d");
    return { contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(query => {
        context.font = `${asset.style} ${asset.weight} ${query.fontSize}px "${asset.family}"`;
        return context.measureText(query.text).width;
      }) };
  } finally { registered.dispose(); }
}

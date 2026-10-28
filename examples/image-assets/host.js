// Application-owned decoding. The library never fetches or creates a decoder.
export async function decodeImage({ bytes, mimeType }) {
  let image;
  if (typeof globalThis.Image === "function") {
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    try { image = new Image(); image.src = url; await image.decode(); }
    finally { URL.revokeObjectURL(url); }
  } else {
    const nativeModule = "@napi-rs/canvas";
    image = await (await import(/* @vite-ignore */ nativeModule)).loadImage(bytes);
  }
  return { image, width: image.width, height: image.height, originClean: true };
}

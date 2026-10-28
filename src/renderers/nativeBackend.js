import { rendererFontFamily } from "./text.js";
import { prepareImageRendering } from "./imageRendering.js";
import { prepareFontRendering, retainPreparedFontRegistrations } from "./fontRendering.js";

export async function loadNativeBackend() {
  try {
    return await import("@napi-rs/canvas");
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes("@napi-rs/canvas")) {
      throw new Error("PNG/PDF output requires @napi-rs/canvas. Install it with: npm install ggaction @napi-rs/canvas", { cause: error });
    }
    throw error;
  }
}

export function nativeFontResolver(globalFonts) {
  const installed = new Set(globalFonts.families.map(entry => entry.family));
  const cache = new Map();
  return requested => {
    if (cache.has(requested)) return cache.get(requested);
    const resolved = rendererFontFamily(requested, installed);
    cache.set(requested, resolved);
    return resolved;
  };
}

export function prepareNativeImages(program, loadImage) {
  return prepareImageRendering(program, { decode: async ({ bytes }) => {
    const image = await loadImage(bytes);
    return { image, width: image.width, height: image.height, originClean: true };
  } });
}

const nativeFontRegistrations = new WeakMap();
export function nativeFontRegistrar(globalFonts) {
  let registrations = nativeFontRegistrations.get(globalFonts);
  if (registrations === undefined) {
    registrations = { aliases: new Map(), contents: new Map() };
    nativeFontRegistrations.set(globalFonts, registrations);
  }
  return async request => {
    let entry = registrations.aliases.get(request.family);
    if (entry === undefined) {
      const release = globalFonts.families.some(font => font.family === request.family)
        ? retainPreparedFontRegistrations(request.family) : undefined;
      const key = release === undefined ? globalFonts.register(request.bytes, request.family) : undefined;
      if (release === undefined && !key) throw new Error("The native backend could not decode the exact embedded font.");
      let content = registrations.contents.get(request.contentHash);
      if (content === undefined) {
        content = { count: 0, entries: new Map() }; registrations.contents.set(request.contentHash, content);
      }
      entry = { key, release, content }; content.entries.set(request.family, entry);
      registrations.aliases.set(request.family, entry);
    }
    entry.content.count++;
    let active = true;
    return { contentHash: request.contentHash, family: request.family, style: request.style, weight: request.weight,
      metricsProviderVersion: request.metricsProviderVersion, dispose() {
        if (!active) return; active = false;
        if (--entry.content.count === 0) {
          // The engine may share one physical face across aliases for identical
          // bytes. Keep every such alias until all library users finish drawing.
          registrations.contents.delete(request.contentHash);
          const errors = [];
          for (const [alias, registered] of entry.content.entries) {
            registrations.aliases.delete(alias);
            try {
              if (registered.release === undefined) globalFonts.remove(registered.key); else registered.release();
            } catch (error) { errors.push(error); }
          }
          if (errors.length) throw new AggregateError(errors, "Native font registrations failed to dispose.");
        }
      } };
  };
}

export function prepareNativeFonts(program, globalFonts) {
  return prepareFontRendering(program, { register: nativeFontRegistrar(globalFonts) });
}

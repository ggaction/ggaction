export function canvasFactory(context, supplied) {
  if (supplied !== undefined) return supplied;
  const canvas = context.canvas;
  if (typeof canvas?.ownerDocument?.createElement === "function") {
    return (width, height) => {
      const source = canvas.ownerDocument.createElement("canvas");
      source.width = width;
      source.height = height;
      return source;
    };
  }
  if (canvas?.constructor && canvas.constructor !== Object) {
    return (width, height) => new canvas.constructor(width, height);
  }
  throw new TypeError("Isolated glyph painting requires a compatible Canvas surface.");
}


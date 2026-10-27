// Reconstruct the documented SVG scene using its definitions, global frames and offsets.
export function sceneSVG(scene) {
  const clips = scene.nodes.map((node, index) => `<clipPath id="frame-${index}"><rect x="${node.clip[0]}" y="${node.clip[1]}" width="${node.clip[2]}" height="${node.clip[3]}"/></clipPath>`).join("");
  const nodes = scene.nodes.map((node, index) => `<g clip-path="url(#frame-${index})"><g transform="translate(${node.offset.join(" ")})">${node.svg}</g></g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}"><defs>${scene.definitions}${clips}</defs>${nodes}</svg>`;
}


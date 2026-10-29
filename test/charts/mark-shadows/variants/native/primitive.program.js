import { frame } from "./fixture.js";
export function drawShadowPrimitive(context,fixture,image,glyph) {
  context.save();context.fillStyle="white";context.fillRect(0,0,frame.width,frame.height);
  context.fillStyle="#243447";context.font="14px Arial";context.fillText(fixture.title,20,24);
  context.fillStyle="#e2e8f0";context.fillRect(20,45,220,135);
  // This sibling remains a vector primitive outside the raster effect glyph.
  context.fillStyle="#fbbf24";context.fillRect(210,75,20,35);
  context.save();
  if(fixture.clip){context.beginPath();context.rect(fixture.clip.x,fixture.clip.y,fixture.clip.width,fixture.clip.height);context.clip();}
  context.imageSmoothingEnabled=false;
  context.drawImage(image,fixture.x+glyph.x,fixture.y+glyph.y,glyph.width,glyph.height);
  context.restore();context.restore();
}
export function shadowPrimitiveSVG(fixture,dataURL,glyph) {
  const clip=fixture.clip,defs=clip?`<defs><clipPath id="clip"><rect x="${clip.x}" y="${clip.y}" width="${clip.width}" height="${clip.height}"/></clipPath></defs>`:"";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 260 200">${defs}<rect width="260" height="200" fill="white"/><text x="20" y="24" font-family="Arial" font-size="14" fill="#243447">${fixture.title}</text><rect x="20" y="45" width="220" height="135" fill="#e2e8f0"/><rect id="vector-sibling" x="210" y="75" width="20" height="35" fill="#fbbf24"/><image x="${fixture.x+glyph.x}" y="${fixture.y+glyph.y}" width="${glyph.width}" height="${glyph.height}" href="${dataURL}"${clip?' clip-path="url(#clip)"':''}/></svg>`;
}

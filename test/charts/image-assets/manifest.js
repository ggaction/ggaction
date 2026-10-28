import { fixtures, frame } from './fixture.js';
import { createImagePrimitive, drawImagePrimitive, imagePrimitiveSVG } from './primitive.program.js';
import { createImageExample } from '../../../examples/image-assets/program.js';
export { frame } from './fixture.js';
export const variants = fixtures.map(fixture => ({ chart: 'image-assets', variant: fixture.id,
  title: `Image asset · ${fixture.title}`, ...frame, fixture, primitive: () => createImagePrimitive(fixture), programEquivalence: "render",
  native: drawImagePrimitive, svg: imagePrimitiveSVG, userFacing: () => createImageExample(fixture),
  source: 'examples/image-assets/program.js',
  callChain: `program.createImageMark({ image: "logo", viewport: { x: 50, y: 60, width: 100, height: 100 }, fit: ${JSON.stringify(fixture.fit)}, align: ${JSON.stringify(fixture.align)} });` }));

export const visualVariants = variants;

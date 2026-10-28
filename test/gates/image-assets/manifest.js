import { fixtures, frame } from './fixture.js';
import { drawImagePrimitive, imagePrimitiveSVG } from './primitive.program.js';
export { frame } from './fixture.js';
export const variants = fixtures.map(fixture => ({ chart: 'image-assets', variant: fixture.id,
  title: `Image asset · ${fixture.title}`, ...frame, fixture, primitive: drawImagePrimitive, svg: imagePrimitiveSVG,
  source: 'test/gates/image-assets/primitive.program.js',
  callChain: `drawImagePrimitive(context, fixtures.find(value => value.id === ${JSON.stringify(fixture.id)}), decodedImage);` }));

export {geoTextExpressionFrame,geoTextExpressionVariants} from '../../scripts/consumers/fixtures/node/animation-geotext-expressions.mjs';
import { canvasSceneSnapshot } from '../../src/sceneSnapshot.js';
import { canvasSceneProgram } from '../../src/renderers/canvasScene.js';
import { expectedGeoTextScene } from '../oracles/geo-text-expressions.js';
export function expectedGeoTextFrame(nativeFrom,nativeTo) {
  return canvasSceneProgram(expectedGeoTextScene(canvasSceneSnapshot(nativeFrom).scene,canvasSceneSnapshot(nativeTo).scene));
}

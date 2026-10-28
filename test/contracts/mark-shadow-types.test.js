import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("shadow declarations reach all mark owners and explicit prepared renderer paths", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-mark-shadow-"));
  try {
    const file = path.join(directory, "shadow.mts");
    await writeFile(file, `
import { chart, prepareShadowRendering, render, type MarkShadow, type ShadowRenderingHost, type PreparedShadowRendering } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { prepareShadowRendering as basicPrepare } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { MarkShadow as ExtensionShadow } from ${JSON.stringify(path.join(root, "types/extension.js"))};
import { renderToSVG } from ${JSON.stringify(path.join(root, "types/svg.js"))};
import { createTransitionScene, renderTransitionScene } from ${JSON.stringify(path.join(root, "types/scene.js"))};
const p=chart(); const shadow: MarkShadow={color:'blue',offsetX:3,offsetY:2,blurRadius:4};const e:ExtensionShadow=shadow;
p.createPointMark({shadow});p.editPointMark({shadow:false});p.createBarMark({shadow});p.editBarMark({shadow});
p.createAreaMark({shadow});p.editAreaMark({shadow});p.createArcMark({shadow});p.editArcMark({shadow});
p.createRectMark({shadow});p.editRectMark({shadow});p.createTextMark({shadow});p.editTextMark({shadow});
p.createLineMark({shadow});p.editLineMark({shadow});p.createRuleMark({shadow});p.editRuleMark({shadow});p.createTickMark({shadow});p.editTickMark({shadow});
p.createMarkLabels({shadow});p.createAnnotation({text:'Label',anchor:'plot-center',shadow});
p.createECDFPlot({field:'x',labels:{shadow,outline:{color:'white',width:2}}});
p.createDotPlot({category:'c',value:'x',labels:{shadow,outline:{color:'white',width:2}}});
declare const host:ShadowRenderingHost;declare const context:CanvasRenderingContext2D;
const shadows=await prepareShadowRendering(p,host);render(p,context,{shadows});renderToSVG(p,{shadows});createTransitionScene(p,{shadows});shadows.dispose();
const scene=createTransitionScene(p,{format:'canvas'});const prepared=await basicPrepare(scene,host);renderTransitionScene(scene,context,{shadows:prepared});
// @ts-expect-error shadow color is required
p.editPointMark({shadow:{offsetX:1}});
// @ts-expect-error shadow is a closed value
p.editTextMark({shadow:{color:'blue',radius:2}});
// @ts-expect-error null is not removal
p.editRectMark({shadow:null});
// @ts-expect-error preparation handles are opaque
const forged:PreparedShadowRendering={kind:'shadow-rendering',glyphCount:0,pixelRatio:1,dispose(){}};
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

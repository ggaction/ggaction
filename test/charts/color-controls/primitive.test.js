import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { literalColors, rowGeometry } from "./fixtures.js";
for (const variant of visualVariants) {
  test(`${variant.variant} primitive contains only explicit bounded rectangles in row order`, () => {
    const program = variant.primitive();
    assert.deepEqual(program.semanticSpec.layers, []);
    assert.deepEqual(program.semanticSpec.datasets, []);
    assert.deepEqual(program.semanticSpec.coordinates, []);
    assert.deepEqual(program.semanticSpec.scales, []);
    assert.deepEqual(program.graphicSpec.order, ["canvas"]);
    assert.deepEqual(program.graphicSpec.objects["plot-main"].children, variant.regions.map(region => region.name));
    for (const region of variant.regions) {
      const row = rowGeometry[region.name];
      const items = program.graphicSpec.objects[region.name].items;
      assert.equal(items.length, 9);
      items.forEach((item, index) => {
        assert.equal(item.id, `${region.name}:${index}`);
        assert.deepEqual(item.properties, {
          x:row.x+index*row.width, y:row.y, width:row.width, height:row.height,
          fill:literalColors[region.name][index], opacity:1, stroke:"transparent",strokeWidth:0
        });
        assert.ok(item.properties.x>=0 && item.properties.x+row.width<=480);
        assert.ok(row.y>=0 && row.y+row.height<=270);
      });
    }
  });
}

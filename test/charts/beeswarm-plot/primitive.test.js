import assert from "node:assert/strict";
import test from "node:test";

import { createBeeswarmPrimitive } from "./primitive.program.js";

test("keeps measure coordinates and independently proves zero packed overlaps", () => {
  const program = createBeeswarmPrimitive();
  const items = program.graphicSpec.objects.swarm.items;
  const rows = program.semanticSpec.datasets[0].values;
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      if (rows[left].group !== rows[right].group) continue;
      const a = items[left].properties;
      const b = items[right].properties;
      const overlaps = Math.abs(a.x - b.x) < a.radius + b.radius + 1 &&
        Math.abs(a.y - b.y) < a.radius + b.radius + 1;
      assert.equal(overlaps, false, `${rows[left].id}/${rows[right].id}`);
    }
  }
  const semanticBase = program.removePointPacking({ target: "swarm" });
  assert.deepEqual(
    items.map(item => item.properties.y),
    semanticBase.graphicSpec.objects.swarm.items.map(item => item.properties.y)
  );
});

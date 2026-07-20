import assert from "node:assert/strict";
import test from "node:test";

import { createGapminderDevelopmentTrajectories } from
  "../../../examples/gapminder-development-trajectories/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadGapminder } from "../../support/data.js";
import { createDevelopmentTrajectoryPrimitives } from "./primitive.program.js";

test("matches the approved chronological trajectory primitive exactly", () => {
  const gapminder = loadGapminder();
  const primitiveProgram = createDevelopmentTrajectoryPrimitives(gapminder);
  const publicProgram = createGapminderDevelopmentTrajectories(gapminder);

  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  assert.equal(publicProgram.graphicSpec.objects.trajectories.items.length, 3);
  assert.deepEqual(
    publicProgram.graphicSpec.objects.trajectories.items.map(
      item => item.properties.commands.length
    ),
    [11, 11, 11]
  );
  const action = publicProgram.trace.children.find(
    node => node.op === "encodePathOrder"
  );
  assert.deepEqual(action.args, {
    target: "trajectories",
    field: "year",
    order: "ascending"
  });
  assert.deepEqual(
    action.children.map(child => child.op),
    ["editSemantic", "editSemantic", "editSemantic", "rematerializeLineMark"]
  );
});

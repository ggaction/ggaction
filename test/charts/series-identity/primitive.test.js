import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { parseAst } from "rollup/parseAst";
import { cases, layout } from "./fixture.js";
import { partitionRows, referenceFor, uniqueSeriesValue } from "./reference-values.js";
import { visualVariants, inputHashes } from "./manifest.js";

function inputHash() { return createHash("sha256").update(JSON.stringify({ layout, cases })).digest("hex"); }
for (const [index, variant] of cases.entries()) {
  test(`${variant.id} realizes exact source membership and independent geometry`, () => {
    const expected = referenceFor(variant);
    assert.equal(createHash("sha256").update(JSON.stringify({ layout, variant, rows: variant.rows })).digest("hex"), inputHashes[variant.id]);
    const program = visualVariants[index].primitive();
    const paths = program.graphicSpec.objects.series.items;
    assert.equal(paths.length, variant.id === "tuple-color-dash" ? 8 : 4);
    assert.deepEqual(expected.paths.flatMap(path => path.indices).sort((a, b) => a - b), variant.rows.map((_, i) => i));
    paths.forEach((item, i) => {
      assert.deepEqual(item.properties.commands, expected.paths[i].commands);
      assert.equal(item.properties.stroke, expected.paths[i].color);
      assert.equal(item.properties.strokeWidth, expected.paths[i].width);
      assert.deepEqual(item.properties.strokeDash, expected.paths[i].dash);
      assert.equal(item.properties.opacity, expected.paths[i].opacity);
      assert.equal(item.properties.commands.length, 4);
      assert.ok(item.properties.commands.every((command, j, commands) => j === 0 || command.x > commands[j - 1].x));
    });
    assert.deepEqual(program.guideConfigs.legend.series.domain, ["Europe", "Asia"]);
    assert.equal(typeof visualVariants[index].userFacing, "function");
    assert.doesNotThrow(() => parseAst(visualVariants[index].callChain));
  });
}
test("series reference is anchored in literal coordinates and source identities", () => {
  const reference = referenceFor(cases[0]);
  assert.deepEqual(reference.paths.map(path => path.key), [["France"], ["Germany"], ["Japan"], ["Korea"]]);
  assert.deepEqual(reference.paths[0].indices, [0, 1, 2, 3]);
  assert.equal(reference.paths[0].commands[0].x, 72);
  assert.equal(reference.paths[0].commands[3].x, 588);
  assert.ok(Math.abs(reference.paths[0].commands[0].y - 257.14285714285717) < 1e-10);
  assert.deepEqual(referenceFor(cases[2]).paths.map(path => path.width), [2, 4, 6, 8]);
  assert.deepEqual(referenceFor(cases[2]).paths.map(path => path.opacity), [.25, .5, .75, 1]);
  assert.match(inputHash(), /^[a-f0-9]{64}$/);
});
test("tuple oracle distinguishes delimiter and type collisions", () => {
  const values = [{ a: "x|y", b: "z" }, { a: "x", b: "y|z" }, { a: 1, b: true }, { a: "1", b: true }];
  assert.equal(partitionRows(values, ["a", "b"]).length, 4);
});
test("ambiguous raw appearance values are rejected by the target oracle", () => {
  const ambiguous = { rows: [{ weight: 1 }, { weight: 2 }], key: ["France"] };
  assert.throws(() => uniqueSeriesValue(ambiguous, "weight"), /Ambiguous weight/);
});

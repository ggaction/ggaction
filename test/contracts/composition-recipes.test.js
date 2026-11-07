import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "acorn";
import { chart } from "../../src/index.js";
const program = chart();
const files = ["marginal", "bullet", "linked-overlay"];
test("Marginal, Bullet and Combo author exclusively through public domain actions", () => {
  const forbidden = new Set(["editSemantic", "createGraphics", "editGraphics", "createMarginalPlot", "createBulletPlot", "createComboPlot"]);
  for (const name of files) {
    const path = new URL(`../../examples/${name}/program.js`, import.meta.url);
    const source = parse(readFileSync(path, "utf8"), { ecmaVersion: "latest", sourceType: "module" });
    assert.deepEqual(source.body.filter(node => node.type === "ImportDeclaration").map(node => node.source.value).sort(),
      (name === "linked-overlay" ? ["../../src/index.js"] : ["../../src/index.js", "./fixture.js"]).sort());
    const calls = [];
    function visit(node) {
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
        assert.equal(node.callee.computed, false);
        const op = node.callee.property.name; calls.push(op);
        assert.equal(forbidden.has(op), false, `${name}: ${op}`);
        assert.equal(typeof program[op], "function", `${name}: public action ${op}`);
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.filter(child => child?.type).forEach(visit);
        else if (value?.type) visit(value);
      }
    }
    visit(source); assert.ok(calls.length >= 10, name);
  }
  for (const name of ["createMarginalPlot", "createBulletPlot", "createComboPlot"]) assert.equal(program[name], undefined);
});

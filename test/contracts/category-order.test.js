import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("keeps category-order runtime, declarations, current contract, and inventory aligned", async () => {
  const [programTypes, indexTypes, contract, inventory, planned] = await Promise.all([
    readFile(new URL("types/program.d.ts", root), "utf8"),
    readFile(new URL("types/index.d.ts", root), "utf8"),
    readFile(new URL("agent_docs/contract/current/ENCODINGS.md", root), "utf8"),
    readFile(new URL("agent_docs/contract/ACTION_INDEX.json", root), "utf8").then(JSON.parse),
    readFile(
      new URL("agent_docs/contract/planned/TEMPORAL_ORDERING_DIRECTION.md", root),
      "utf8"
    )
  ]);

  assert.match(programTypes, /^export type CategoryValue = string \| number \| boolean;$/m);
  assert.match(programTypes, /^export type CategoryOrder =$/m);
  assert.match(
    programTypes,
    /^  orderCategories\(options: OrderCategoriesOptions\): ChartProgram;$/m
  );
  assert.match(
    programTypes,
    /^  removeCategoryOrder\(options: RemoveCategoryOrderOptions\): ChartProgram;$/m
  );
  for (const exported of [
    "CategoryOrder",
    "CategoryOrderSummary",
    "CategoryValue",
    "OrderCategoriesOptions",
    "RemoveCategoryOrderOptions"
  ]) {
    assert.match(indexTypes, new RegExp(`^  ${exported},$`, "m"));
  }
  assert.match(contract, /^## `orderCategories`$/m);
  assert.match(contract, /^## `removeCategoryOrder`$/m);
  assert.match(planned, /Status: Implemented in Roadmap 5 Phase 2/);

  const implemented = new Map(inventory.actions.map(action => [action.name, action]));
  assert.equal(implemented.get("orderCategories")?.status, "implemented");
  assert.equal(implemented.get("removeCategoryOrder")?.status, "implemented");
  assert.equal(
    inventory.plannedActions.some(action =>
      ["orderCategories", "removeCategoryOrder"].includes(action.name)
    ),
    false
  );
});

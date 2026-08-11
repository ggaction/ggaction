import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import { chart } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { action, ChartProgram, registerExtension } from "ggaction/extension";

class CustomProgram extends ChartProgram {}

CustomProgram.prototype.recordNote = action(
  {
    op: "recordNote",
    description: "Record a custom trace note."
  },
  function () {
    return this;
  }
);

test("exports the public action-authoring API", () => {
  assert.equal(typeof action, "function");
  assert.equal(typeof ChartProgram, "function");
  assert.equal(typeof registerExtension, "function");
});

test("supports actions on ChartProgram subclasses", () => {
  const result = new CustomProgram().recordNote({ label: "example" });

  assert.equal(result instanceof CustomProgram, true);
  assert.deepEqual(result.actionStack, []);
  assert.equal(result.trace.children[0].op, "recordNote");
  assert.deepEqual(result.trace.children[0].args, { label: "example" });
});

test("registers wrapped actions on the full chart factory", () => {
  const recordRegisteredNote = action(
    {
      op: "recordRegisteredNote",
      description: "Record one globally registered note."
    },
    function () {
      return this;
    }
  );

  registerExtension({
    name: "test-registered-note",
    actions: { recordRegisteredNote }
  });

  const result = chart().recordRegisteredNote({ label: "registered" });
  assert.equal(result instanceof ChartProgram, true);
  assert.deepEqual(result.actionStack, []);
  assert.equal(result.trace.children[0].op, "recordRegisteredNote");
  assert.deepEqual(result.trace.children[0].args, { label: "registered" });
  assert.equal(basicChart().recordRegisteredNote, undefined);
});

test("supports multiple non-conflicting registered extensions", () => {
  const startRegisteredFlow = action(
    {
      op: "startRegisteredFlow",
      description: "Start one registered extension flow."
    },
    function () {
      return this;
    }
  );
  const finishRegisteredFlow = action(
    {
      op: "finishRegisteredFlow",
      description: "Finish one registered extension flow."
    },
    function () {
      return this;
    }
  );

  registerExtension({
    name: "test-registered-flow-start",
    actions: { startRegisteredFlow }
  });
  registerExtension({
    name: "test-registered-flow-finish",
    actions: { finishRegisteredFlow }
  });

  const result = chart().startRegisteredFlow().finishRegisteredFlow();
  assert.deepEqual(
    result.trace.children.map(node => node.op),
    ["startRegisteredFlow", "finishRegisteredFlow"]
  );
});

test("rejects an invalid action batch before registering any action", () => {
  const atomicRegisteredAction = action(
    {
      op: "atomicRegisteredAction",
      description: "Prove atomic extension registration."
    },
    function () {
      return this;
    }
  );
  const createCanvas = action(
    {
      op: "createCanvas",
      description: "Attempt to collide with one built-in action."
    },
    function () {
      return this;
    }
  );

  assert.throws(
    () => registerExtension({
      name: "test-atomic-registration",
      actions: { atomicRegisteredAction, createCanvas }
    }),
    /ChartProgram action "createCanvas" is already defined/
  );
  assert.equal(chart().atomicRegisteredAction, undefined);

  registerExtension({
    name: "test-atomic-registration",
    actions: { atomicRegisteredAction }
  });
  assert.equal(typeof chart().atomicRegisteredAction, "function");
});

test("rejects duplicate extension and action names", () => {
  const duplicateRegisteredAction = action(
    {
      op: "duplicateRegisteredAction",
      description: "Register one action once."
    },
    function () {
      return this;
    }
  );
  const unusedRegisteredAction = action(
    {
      op: "unusedRegisteredAction",
      description: "Remain absent after duplicate registration."
    },
    function () {
      return this;
    }
  );

  registerExtension({
    name: "test-duplicate-registration",
    actions: { duplicateRegisteredAction }
  });
  assert.throws(
    () => registerExtension({
      name: "test-duplicate-registration",
      actions: { unusedRegisteredAction }
    }),
    /Extension "test-duplicate-registration" is already registered/
  );
  assert.equal(chart().unusedRegisteredAction, undefined);

  assert.throws(
    () => registerExtension({
      name: "test-duplicate-action",
      actions: { duplicateRegisteredAction }
    }),
    /ChartProgram action "duplicateRegisteredAction" is already defined/
  );
});

test("protects inherited, internal, and program-state names", () => {
  for (const protectedName of ["toString", "_clone", "semanticSpec"]) {
    const protectedAction = action(
      {
        op: protectedName,
        description: `Attempt to overwrite ${protectedName}.`
      },
      function () {
        return this;
      }
    );

    assert.throws(
      () => registerExtension({
        name: `test-protected-${protectedName}`,
        actions: { [protectedName]: protectedAction }
      }),
      new RegExp(`ChartProgram action "${protectedName}" is already defined`)
    );
  }
});

test("accepts only matching action wrappers and stable metadata", () => {
  const metadata = {
    op: "stableRegisteredAction",
    description: "Keep action metadata stable."
  };
  const stableRegisteredAction = action(metadata, function () {
    return this;
  });
  metadata.op = "mutatedAction";

  registerExtension({
    name: "test-stable-action-metadata",
    actions: { stableRegisteredAction }
  });
  assert.equal(chart().stableRegisteredAction().trace.children[0].op, "stableRegisteredAction");

  assert.throws(
    () => registerExtension({
      name: "test-raw-extension-action",
      actions: { rawRegisteredAction() { return this; } }
    }),
    /must be created with action\(\)/
  );

  const differentlyNamedAction = action(
    {
      op: "actualRegisteredOp",
      description: "Reject a mismatched method name."
    },
    function () {
      return this;
    }
  );
  assert.throws(
    () => registerExtension({
      name: "test-mismatched-extension-action",
      actions: { differentlyNamedAction }
    }),
    /must use the same action op/
  );
});

test("keeps non-conflicting extension registration order independent", () => {
  const chartEntry = new URL("../../../src/index.js", import.meta.url).href;
  const extensionEntry = new URL(
    "../../../src/extension.js",
    import.meta.url
  ).href;

  function runRegistrationOrder(order) {
    const source = `
      import { chart } from ${JSON.stringify(chartEntry)};
      import { action, registerExtension } from ${JSON.stringify(extensionEntry)};
      const orderedFirstAction = action(
        { op: "orderedFirstAction", description: "Register first." },
        function () { return this; }
      );
      const orderedSecondAction = action(
        { op: "orderedSecondAction", description: "Register second." },
        function () { return this; }
      );
      const definitions = {
        first: {
          name: "test-order-first",
          actions: { orderedFirstAction }
        },
        second: {
          name: "test-order-second",
          actions: { orderedSecondAction }
        }
      };
      for (const key of ${JSON.stringify(order)}) {
        registerExtension(definitions[key]);
      }
      const result = chart().orderedFirstAction().orderedSecondAction();
      process.stdout.write(JSON.stringify({
        methods: [
          typeof result.orderedFirstAction,
          typeof result.orderedSecondAction
        ],
        trace: result.trace.children.map(node => node.op)
      }));
    `;
    return execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", source],
      { encoding: "utf8" }
    );
  }

  assert.equal(
    runRegistrationOrder(["first", "second"]),
    runRegistrationOrder(["second", "first"])
  );
});

import { compileTypeScript } from "../support/typescript.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

test("conditional encoder declarations preserve each branch contract and require otherwise", () => {
  const directory = path.resolve(".artifacts/types/conditional-encoding");
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "consumer.ts");
  writeFileSync(file, `import { chart, type ComputedExpressionV2, type ConditionalEncodingOptions, type OpacityEncodingOptions } from '../../../types/index.js';
import { chart as basic } from '../../../types/basic.js';
const when: ComputedExpressionV2 = { version: 2, registry: 'standard@1', root: { type: 'literal', value: true } };
const opacity: ConditionalEncodingOptions<OpacityEncodingOptions> = { conditions: [{ when, value: { value: 0 } }], otherwise: { field: 'value' } };
const program = chart().encodeOpacity(opacity).encodeColor({ conditions: [{ when: { selection: 'chosen' }, value: { field: 'category' } }], otherwise: { value: 'red' } });
program.encodeChannels({ target: 'points', channels: { size: { conditions: [{ when, value: { value: 0 } }], otherwise: { field: 'area' } }, shape: { conditions: [{ when, value: { value: 'square' } }], otherwise: { value: 'circle' } } } });
basic().encodeColor({ conditions: [{ when, value: { value: 'red' } }], otherwise: { field: 'category' } });
program.encodeX({ conditions: [{ when, value: { datum: 0 } }], otherwise: { field: 'x' } })
  .encodeY2({ conditions: [{ when, value: { datum: 5 } }], otherwise: { field: 'end' } })
  .encodeTheta({ conditions: [{ when, value: { field: 'angle' } }], otherwise: { datum: 0 } })
  .encodeR({ conditions: [{ when, value: { field: 'distance' } }], otherwise: { datum: 0 } })
  .encodeText({ conditions: [{ when, value: { content: 'share', format: '.0%' } }], otherwise: { value: 'N/A' } })
  .encodePointRadius({ conditions: [{ when, value: { value: 0 } }], otherwise: { value: 5 } })
  .encodeRadius({ conditions: [{ when, value: { value: 1 } }], otherwise: { value: 5 } });
program.encodeChannels({ target: 'text', channels: {
  text: { conditions: [{ when, value: { field: 'label' } }], otherwise: { value: 'N/A' } },
  dx: { conditions: [{ when, value: { field: 'shift' } }], otherwise: { value: 0 } },
  dy: { conditions: [{ when, value: { value: -5 } }], otherwise: { field: 'shift' } }
} });
// @ts-expect-error Point radius accepts a numeric pixel literal, not a scaled field.
program.encodePointRadius({ conditions: [{ when, value: { field: 'size' } }], otherwise: { value: 1 } });
// @ts-expect-error Text offsets do not accept scale options.
program.encodeDx({ conditions: [{ when, value: { field: 'shift', scale: {} } }], otherwise: { value: 0 } });
// @ts-expect-error Formatting callbacks are not serializable text payloads.
program.encodeText({ conditions: [{ when, value: { field: 'x', format: (x: number) => String(x) } }], otherwise: { value: 'x' } });
// @ts-expect-error Missing required otherwise.
program.encodeOpacity({ conditions: [{ when, value: { value: 0 } }] });
// @ts-expect-error Callback predicates are unsupported.
program.encodeOpacity({ conditions: [{ when: () => true, value: { value: 0 } }], otherwise: { value: 1 } });
// @ts-expect-error Opacity branch values must follow opacity's numeric contract.
program.encodeOpacity({ conditions: [{ when, value: { value: 'red' } }], otherwise: { value: 1 } });
// @ts-expect-error A branch cannot switch its target.
program.encodeColor({ conditions: [{ when, value: { value: 'red', target: 'other' } }], otherwise: { value: 'blue' } });
// @ts-expect-error Exact input references are private persisted state.
program.encodeOpacity({ ...opacity, parameterInputs: [] });
`);
  const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

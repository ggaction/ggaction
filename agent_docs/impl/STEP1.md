# STEP 1 — Core primitives and Canvas scatterplot

## Goal

Build the smallest end-to-end slice that creates an immutable `ChartProgram`,
materializes a cars scatterplot through the three primitive actions, and renders
the concrete result with Canvas.

This step intentionally uses precomputed x, y, and color values. Scale,
encoding, guide, and higher-level domain actions belong to later steps.

## Project structure

```text
src/
  index.js
  core/        # ChartProgram, immutability, action trace, validation
  actions/     # editSemantic, createGraphics, editGraphics
  renderers/   # Canvas renderer
test/
  acceptance/  # complete cars scatterplot program
  unit/        # core, primitive, and renderer tests
  helpers/     # mock Canvas and precomputed scatterplot values
examples/      # browser Canvas example
docs/          # current public and core concepts
data/cars.json
```

Use JavaScript ESM and Node's built-in test runner. Avoid runtime dependencies
unless the implementation demonstrates a current need.

## Implementation sequence

1. **Create the project skeleton.** Set up the package, module boundaries, test
   command, and placeholder exports without implementing behavior.
2. **Write the complete test program first.** Load `cars.json`, remove rows with
   missing x or y values, precompute x/y/color arrays, build the full primitive
   chain, and define the expected semantic spec, graphic spec, trace, and Canvas
   calls. Keep this acceptance test skipped until integration is complete.
3. **Implement the immutable program and action trace.** Add canonical empty
   specs, structural copying, frozen stored values, the virtual trace root,
   `action()`, and nested action recording.
4. **Implement the primitives one at a time.** Implement and test
   `editSemantic`, then `createGraphics`, then `editGraphics`. Each operation
   returns a new program, validates its input, and records a trace node.
5. **Implement the minimal Canvas renderer.** Support concrete `canvas` and
   `circle` graphics only. The renderer reads only `graphicSpec` and applies
   width, height, background, x, y, radius, fill, opacity, and visibility.
6. **Complete the vertical slice.** Enable the acceptance test, verify 392
   rendered circles and three Origin colors, and add a browser example using
   the same primitive program.

Each numbered item is completed with relevant tests, a focused commit, and a
push before the next conceptual change begins. The three primitives should be
committed separately.

## Test program shape

```text
chart()
├─ editSemantic(dataset[cars].values)
├─ editSemantic(layer[points].mark.type = point)
├─ editSemantic(layer[points].data = cars)
├─ createGraphics(canvas)
├─ editGraphics(canvas.width)
├─ editGraphics(canvas.height)
├─ editGraphics(canvas.background)
├─ createGraphics(points, circle, length = 392)
├─ editGraphics(points.x = precomputed values)
├─ editGraphics(points.y = precomputed values)
├─ editGraphics(points.fill = precomputed values)
└─ editGraphics(points.radius = 3)

render(program, canvasContext)
```

The precomputation helpers belong to the test/example layer and are not library
APIs. `render()` is not an authoring action and does not appear in the trace.

## Documentation

- `README.md` documents the project purpose, setup, cars example, and the
  user-facing `chart()` and `render()` functions.
- `docs/CORE_CONCEPTS.md` documents `ChartProgram`, `action()`, the three
  primitives, trace behavior, immutability, and the semantic/graphic boundary.
- Internal helpers do not need individual API documentation.
- `agent_docs/INITIAL_ARCHITECTURE.md` remains a historical design reference.

Documentation is updated alongside the implementation it describes rather
than added after the code has diverged.

## Out of scope

- `createCanvas` and other domain-specific authoring actions
- Scale and encoding actions
- Axes, legends, and guides
- Automatic semantic-to-graphic compilation
- SVG or other rendering backends

## Completion criteria

- All tests pass with no skipped acceptance test.
- Every update preserves earlier `ChartProgram` instances and caller input.
- Trace order matches the primitive program and excludes large value arrays.
- `graphicSpec` contains fully concrete circle properties.
- The renderer works without reading semantic state, context, or trace.
- The browser example renders 392 circles in three colors.
- All focused commits are pushed and the worktree is clean except for explicitly
  preserved user changes.

# Renderer Instructions

Apply these instructions to Canvas rendering and output adapters.

- Renderers read only fully materialized backend-neutral `graphicSpec`; they never infer chart semantics or repair missing semantic state.
- Renderers may check whether a concrete node is drawable, but must not redefine the shared graphic-property or value contract.
- Create backend objects such as Canvas gradients ephemerally from normalized graphic values; never store them in program state.
- Keep logical `graphicSpec` dimensions independent from output density. Options such as PNG `pixelRatio` affect physical output only.
- Render concrete nodes in the explicit graphical placement order rather than action-call or object-enumeration order.
- Draw resolved text children as authored. Do not remeasure, rewrap, or infer layout topology in a renderer.
- Keep Node-only adapters and dependencies outside browser-safe entry points.
- Test Browser Canvas, browser-safe SVG, Node PNG, and Node PDF separately against the same concrete schema and representative primitive/public equivalence contracts.

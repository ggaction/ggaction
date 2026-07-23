# Browser Test Instructions

Apply these instructions to browser examples, Playwright harnesses, Canvas behavior, and built-site interaction tests.

- Verify Browser Canvas and browser-safe SVG independently against the same public chart contract. Keep Node PNG/PDF output checks in Node suites and prove their dependencies stay outside browser bundles.
- Every public browser example exposes the shared non-loading `#status` completion signal, an accessible Canvas label, logical Canvas dimensions, and no console or page errors.
- Register browser examples as independent per-chart tests so timeouts identify the owner and one growing loop does not exhaust a shared deadline.
- Route approved examples through the public example registry and shared browser harness. Remove or promote Gate-specific pages with their Gate.
- Use the shared browser harness for readiness, HTTP status, console errors, and page errors. Put example-specific state probes in the registry instead of creating a separate lifecycle.
- Keep browser setup, contexts, and teardown explicit and isolated. Accessibility tooling must run against supported explicit browser contexts.
- Treat keyboard, focus, ARIA state, responsive containment, image loading, and no-JavaScript behavior as executable interaction contracts where applicable.
- Keep PNG `pixelRatio` assertions separate from logical Canvas dimensions and verify physical output dimensions explicitly.

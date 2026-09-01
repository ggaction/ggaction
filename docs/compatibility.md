---
layout: default
title: Runtime and Browser Compatibility
---

# Runtime and Browser Compatibility

ggaction is an ESM-only package. The supported Node.js floor is 20. Continuous
integration installs and tests the packed package on Node.js 20, 22, and 24;
browser package and documentation tests run in Playwright Chromium. Other
modern ESM browsers may work, but they are not part of the current automated
compatibility claim.

## Entry points

| Import | Environment | Notes |
| --- | --- | --- |
| `ggaction` | Modern browser bundler or Node.js 20+ | Complete chart authoring and Browser Canvas rendering |
| `ggaction/basic` | Modern browser bundler | Smaller creation-focused chart surface |
| `ggaction/svg` | Browser or Node.js 20+ | DOM-free SVG string serialization |
| `ggaction/png` | Node.js 20+ | Native PNG file output; do not place in a browser bundle |
| `ggaction/pdf` | Node.js 20+ | Native single-page PDF file output; do not place in a browser bundle |
| `ggaction/extension` | Browser bundler or Node.js 20+ | Extension registration and authoring primitives |

CommonJS `require("ggaction")` is not a supported entry. Use ESM source files
or configure the consuming project for ESM.

```json
{
  "type": "module",
  "engines": { "node": ">=20" }
}
```

```javascript
import { chart, render } from "ggaction";
import { renderToSVG } from "ggaction/svg";
```

## Browser applications

Vite is the documented getting-started path and the installed browser consumer
is tested with a real Chromium page. Obtain a 2D rendering context only after
the Canvas exists in the DOM. Chart authoring itself does not require a DOM;
`render` does.

Framework components should keep caller-owned rows outside the program, build
a new immutable program when relevant inputs change, render after the host
element mounts, and disconnect `ResizeObserver` or other host listeners during
cleanup. See [Responsive charts](./responsive-charts.md) for the lifecycle.

Do not import `ggaction/png` or `ggaction/pdf` into client code. Route those
exports to a Node worker, server action, build step, or command-line process.
`ggaction/svg` is the portable choice when a browser needs scalable markup.

## Server rendering

Node can author programs and serialize SVG without a browser. PNG and PDF
write to explicit filesystem paths and create missing output directories.
Browser Canvas rendering requires a browser-provided
`CanvasRenderingContext2D`; it is not an SSR target.

Native renderer installation follows the platform support of the exact
`@napi-rs/canvas` dependency selected by npm. Qualify the packed application on
every deployment architecture instead of assuming that one local native build
represents all targets.

## Compatibility checklist

1. Confirm `node --version` is 20 or newer for Node entry points.
2. Confirm the project uses ESM and resolves package exports without a
   CommonJS compatibility transform.
3. Keep Node-only renderer imports out of browser dependency graphs.
4. Run one packed-package smoke test in each deployment runtime and one visual
   test in each browser the product promises to support.
5. Verify fonts and text bounds on every target platform because system font
   availability can change glyph metrics.

## Related

[Getting Started](./getting-started.md) · [TypeScript](./typescript.md) ·
[Rendering](./api/rendering.md) · [Fonts and text](./fonts.md)

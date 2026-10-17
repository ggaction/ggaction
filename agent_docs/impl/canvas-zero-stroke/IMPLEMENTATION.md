# Canvas zero-width stroke correction

Canvas ignores assigning `lineWidth = 0`; drawing `stroke()` afterward retains
a previous positive width. This violated the existing concrete zero-width
contract for rect, circle, path and line. Each drawer now validates normally
but skips only zero-width stroke painting. Fill, stored state, geometry,
positive-width strokes and shared atomic preflight remain unchanged.

Independent numeric tests exercise all four primitive types after a real 8px
blue stroke. Native and Chromium Canvas samples match the expected fill-only
interiors and empty outline/line samples; Chromium SVG raster produces those
same exact 8bit samples. No image was inspected by eye or VLM.

Validation: `node --test test/contracts/zero-stroke.test.js
test/browser/zero-stroke.browser.js test/unit/renderers/*.test.js` passed
(all existing renderer tests retained). The related gradient browser oracle
also compares complete strip pixels against independent fill-only rectangles.

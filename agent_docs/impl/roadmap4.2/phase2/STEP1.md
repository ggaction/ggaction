# STEP 1 — Serialize the Concrete Graphic Tree to SVG

## 진행 상태

- [x] Concrete primitive completeness와 SVG mapping 구현
- [x] Stable defs/clip/gradient identity 구현
- [x] Nested scope와 tree order 구현
- [x] Accessibility options와 XML escaping 구현
- [x] Public entry/type/package/docs/architecture 구현
- [x] Focused와 cumulative verification
- [x] Browser-rendered Canvas/SVG/PNG comparison 생성
- [ ] Remote checkpoint 기록

## Output contract

```javascript
import { renderToSVG } from "ggaction/svg";

const svg = renderToSVG(program, {
  title: "Cars regression",
  description: "Horsepower and miles per gallon with a fitted trend."
});
```

Return은 XML declaration이 없는 complete SVG document string이다. Root는 SVG namespace, logical
`width`/`height`, `viewBox="0 0 width height"`를 가진다. `title`과 `description`은 optional이며 document 첫
children의 escaped `<title>`과 `<desc>`가 된다.

## Mapping policy

- Circle → `<circle>`
- Rect → `<rect>`
- Line → `<line>`
- Text → `<text>` with Canvas alignment/baseline-equivalent attributes and authored rotation
- M/L/C/Z path → `<path d="...">`
- Collection → `<g>` scope preserving item and child order
- Nested canvas → translated clipped `<g>` with optional local background
- Linear gradient → normalized concrete coordinates in one `<linearGradient gradientUnits="userSpaceOnUse">`

Element/definition IDs are deterministic traversal counters rather than raw public graphic IDs. Text/attribute values are
escaped, numeric output is finite and stable, and backend definitions never enter `graphicSpec`.

## Visual review

대표 program은 existing public regression-scatterplot을 사용한다. Phase 2 review는 같은 fully materialized
`graphicSpec`을 Browser Canvas, inline SVG, 2x Node PNG로 렌더링하고 하나의 left-to-right comparison plate로
제시한다. Canvas와 PNG는 `pixelRatio: 2`를 사용하되 모두 같은 logical size를 유지한다. Phase 3은 동일한
plate에 Poppler-rendered PDF column을 추가한다.

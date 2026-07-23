# STEP 1 — Draw the Concrete Graphic Tree to Vector PDF

## 진행 상태

- [x] Native PDF document/page/context API 확인
- [x] Input/metadata/output preflight validation 구현
- [x] Shared concrete drawing과 PDF page lifecycle 연결
- [x] Complete in-memory document 뒤 file write와 result contract 구현
- [x] Public entry/type/package/docs/architecture 구현
- [x] Structural/text/metadata/vector verification
- [x] All-public-chart PDF contract 실행
- [x] Poppler-rendered Canvas/SVG/PNG/PDF comparison 생성
- [x] Remote checkpoint 기록 — `86bd0168`

## Output contract

```javascript
import { renderToPDF } from "ggaction/pdf";

const result = await renderToPDF(program, {
  output: "./output/chart.pdf",
  metadata: {
    title: "Cars regression",
    author: "ggaction",
    subject: "Renderer parity",
    keywords: ["cars", "regression"]
  }
});
```

Result는 `{ output, width, height, pages: 1, bytes }`다. `output`은 absolute path이며 missing directory를
생성한다. Page point width/height는 logical Canvas width/height와 숫자상 같다. `pixelRatio`와 multi-page
option은 지원하지 않는다.

## Lifecycle policy

1. Program, concrete root Canvas, closed option keys, output과 metadata를 먼저 검증한다.
2. Node-only native PDF document와 logical-size page/context를 생성한다.
3. Phase 1에서 분리한 Canvas-compatible concrete drawing seam으로 같은 `graphicSpec`을 그린다.
4. Document를 close해 complete PDF bytes를 얻은 뒤 output directory와 file을 기록한다.
5. Predictable validation/drawing failure에는 새 partial output을 남기지 않는다.

Backend document, page, context, gradients와 buffers는 renderer-local ephemeral state이며 `graphicSpec`이나
`ChartProgram`에 저장하지 않는다.

## Verification policy

- PDF byte equality는 사용하지 않는다.
- PDF parser로 page count, MediaBox와 metadata를 확인한다.
- `pdftotext` 또는 PDF parser로 chart text가 selectable/searchable한지 확인한다.
- Content stream에서 vector path/text operators를 확인하고 raster image fallback이 없음을 확인한다.
- `pdftoppm`으로 최신 PDF를 PNG로 rasterize한 뒤 Browser Canvas, inline SVG, Node PNG와 같은 logical chart를
  left-to-right 4-column plate로 비교한다.

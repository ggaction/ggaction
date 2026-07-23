# STEP 1 — Current Renderer Evidence and Phase Design

## 진행 상태

- [x] Current public entries와 environment boundary 확인
- [x] Canvas concrete primitive/paint/clip surface 확인
- [x] SVG output 전략과 browser-safety 요구 정리
- [x] PDF vector context와 existing drawing reuse 가능성 확인
- [x] Exact API/result/options와 non-goal 작성
- [x] Full Roadmap와 Gate 분할 작성
- [x] Contract/unit/package baseline 실행
- [x] Proposal package remote checkpoint `bcfe14b0` 기록

## Baseline

시작 commit은 `ae9deaf1`이며 clean, synchronized `main`에서
`codex/roadmap4-2-vector-renderers` branch를 만들었다.

| 항목 | Current |
| --- | --- |
| Default/browser renderer | `render(program, context, { pixelRatio? })` |
| Node raster entry | `ggaction/png` → `renderToPNG(program, { output, pixelRatio? })` |
| Concrete nodes | canvas, collection, circle, rect, line, text, path |
| Path commands | M, L, C, Z |
| Paint/style | solid/linear-gradient fill, stroke, width, dash, opacity |
| Structure | authored tree order, heterogeneous collections, nested canvas clipping |
| Native runtime dependency | `@napi-rs/canvas` 1.0.2 |

| Baseline command | 결과 |
| --- | --- |
| `npm run test:contracts` | 156/156 pass |
| `npm run test:unit` | 1300/1300 pass |
| `npm run test:package` | pass, packed `ggaction@0.0.6` consumer verified |

## Feasibility findings

### SVG

Native SVG canvas output은 가능하지만 Node-only dependency graph를 browser entry에 끌어온다. Roadmap 목표는
browser와 Node에서 같은 string API를 제공하는 것이므로 SVG document는 concrete `graphicSpec`을 직접
serialize한다. 이 serializer는 semantic inference나 layout engine이 아니며 current drawing contract의
backend 표현만 소유한다.

### PDF

현재 native dependency는 vector `PDFDocument`와 page context를 제공한다. Existing Canvas drawing code는
context의 root canvas dimension lifecycle을 직접 참조하기 때문에 그대로 전달할 수는 없지만, target
dimension/context ownership을 작은 internal boundary로 분리하면 concrete draw operations를 재사용할 수 있다.
새 runtime dependency는 필요하지 않다.

## Proposed public contracts

### SVG

```javascript
import { renderToSVG } from "ggaction/svg";

const svg = renderToSVG(program, {
  title: "Quarterly revenue",
  description: "Revenue by quarter"
});
```

- Return은 XML declaration이 없는 complete `<svg>...</svg>` document string이다.
- Root는 `xmlns`, logical `width`, `height`, 같은 크기의 `viewBox`를 가진다.
- `title`과 `description`은 optional string이며 각각 `<title>`, `<desc>`로 escape되어 첫 children에 기록된다.
- DOM, filesystem, native module과 Node builtin에 의존하지 않는다.

### PDF

```javascript
import { renderToPDF } from "ggaction/pdf";

const result = await renderToPDF(program, {
  output: "./output/chart.pdf",
  metadata: {
    title: "Quarterly revenue",
    author: "Example"
  }
});
```

- Missing output directory를 생성하고 absolute output path를 반환한다.
- Result는 `{ output, width, height, pages: 1, bytes }`다.
- Logical width/height와 숫자상 같은 point 크기의 page 한 장을 만든다.
- Metadata는 `title`, `author`, `subject`, `keywords: readonly string[]`만 지원한다.
- `pixelRatio`는 지원하지 않는다.

## Validation and error policy

- 두 entry 모두 program과 concrete `graphicSpec` shape를 current renderer contract와 같은 수준에서 검증한다.
- SVG title/description, PDF output/metadata가 잘못되면 output 생성 전에 `TypeError`를 낸다.
- PDF는 complete validation/drawing이 성공한 뒤 directory/file write를 수행해 predictable input failure에서
  partial file을 남기지 않는다.
- SVG string은 stable traversal, attribute ordering과 finite-number formatting으로 deterministic하다.
- PDF binary byte snapshot은 요구하지 않는다. Page size/count, vector operators, extracted text/metadata와
  Poppler-rendered appearance를 검증한다.

## Compatibility and architecture impact

- Existing default/basic/extension/png entry의 export와 behavior는 유지한다.
- `ggaction/svg`만 browser-safe dependency graph를 요구한다. `ggaction/pdf`는 Node-only다.
- `semanticSpec`, action trace, materialization flow와 persisted schema는 바뀌지 않는다.
- Package boundary와 renderer target ownership 설명은 구현 완료 시 `SECOND_ARCHITECTURE.md`에 동기화한다.
- 새 public entry이므로 runtime, strict declaration, package export, public docs와 installed-consumer evidence를
  같은 Roadmap에서 닫는다.

## Phase order rationale

1. Public output과 environment contract를 먼저 고정한다.
2. PDF가 Canvas draw code를 재사용할 최소 target seam을 만들고 existing renderer regression을 닫는다.
3. Browser-safe SVG를 독립 serializer로 구현하고 먼저 visual target을 승인한다.
4. Node PDF lifecycle과 vector output을 구현하고 Poppler evidence를 승인한다.
5. 모든 concrete capability와 distribution surface를 누적 검증하고 closeout한다.

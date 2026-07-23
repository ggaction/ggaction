# STEP 1 — Close the Renderer Consumer Matrix

## 진행 상태

- [x] Concrete node/path/paint/structure/behavior matrix 정의
- [x] Canvas/PNG/SVG/PDF executable evidence 매핑
- [x] Package runtime/type/export/installed-consumer audit
- [x] Browser dependency graph와 Node adapter isolation audit
- [x] Public docs/generated docs/architecture stale wording audit
- [x] Approved SVG/PDF artifact ownership 확인
- [x] Cumulative verification 실행
- [x] Remote checkpoint 기록 — `c2eb1b20`

## Consumer matrix policy

Matrix는 현재 backend-neutral concrete output에만 한정한다. `canvas`, `collection`, `circle`, `rect`, `line`,
`text`, `path`, `M/L/C/Z`, solid/linear-gradient fill, stroke/dash/opacity, authored order와 nested Canvas clipping을
행으로 두고 각 renderer의 focused 또는 all-public-chart executable evidence를 연결한다.

Renderer-specific output contract는 별도 행으로 유지한다.

- Canvas: logical drawing과 optional raster density
- PNG: Node file, physical dimensions와 `pixelRatio`
- SVG: deterministic complete document, viewBox와 optional title/description
- PDF: one logical-size vector page, selectable text와 optional metadata

## Distribution audit

`package.json` export, runtime named export와 declaration value export는 exact set으로 비교한다. Browser bundle
evidence는 default/basic/svg만 허용하고 Node filesystem/native dependency는 png/pdf entry 뒤에만 둔다.
Installed tarball consumer는 JavaScript와 TypeScript에서 여섯 public entry를 실제 import한다.

Public docs는 current supported output만 설명하며 SVG/PDF를 limitation으로 남기거나 Canvas/PNG만 전체 renderer로
표현한 stale wording을 제거한다. Historical roadmap/current action evidence는 당시 범위를 보존한다.

## Closeout evidence

`test/contracts/renderer-consumer-matrix.test.js`가 41개 public chart corpus에서 `canvas`, `collection`, `circle`,
`rect`, `line`, `text`, `path`, `M/L/C/Z`, authored order, nested Canvas clipping, solid/linear-gradient fill,
stroke/dash/opacity와 text의 complete inventory를 고정한다. 같은 test는 이 surface를 한 concrete matrix로
Canvas, SVG, PNG와 PDF에 실제 전달한다.

- All-public-chart SVG: 41/41
- All-public-chart PDF: 41/41, raster image fallback 없음
- Browser Canvas: 47/47 browser tests
- Canvas/PNG visual regression: 124/124 render tests, 123 approved gallery variants
- Package export/runtime/declaration: 여섯 public entry exact parity
- Installed consumer: JavaScript/TypeScript, browser full/basic/svg bundle, Node png/pdf import 통과
- Package artifact: 399 entries, 369,812 packed bytes, 1,747,323 unpacked bytes
- Unit: 1,308/1,308
- Contracts: 160/160
- Documentation: 41/41
- Coverage: 94.68% lines, 90.02% branches, 98.45% functions; 68 critical floors

Numeric `fontWeight`의 SVG-only 차이도 closeout에서 발견해 shared renderer normalization으로 닫았다. Authored
value는 유지하고 Canvas/SVG/PNG/PDF output에서 100 단위 반올림과 100–900 clamp를 동일하게 적용한다.

Approved comparison은 capability-owned path에 유지하며 `npm run artifacts:renderers`가 같은 public regression
chart로 SVG/PNG/PDF를 생성하고 PDF를 Poppler로 rasterize한 뒤 Browser Canvas와 함께 4-column screenshot을
만든다. Full render reset 뒤 명령을 다시 실행해 artifact 복원까지 검증했다.

## Remote checkpoint

- Renderer parity/distribution implementation: `43feb8ab`
- Architecture route verification correction: `c2eb1b20`
- Branch: `codex/roadmap4-2-vector-renderers`

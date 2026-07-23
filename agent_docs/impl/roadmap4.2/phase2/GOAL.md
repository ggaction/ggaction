# Roadmap 4.2 Phase 2 — Browser-safe SVG Renderer

## 목표

DOM, filesystem, Node builtin과 native module 없이 fully materialized `graphicSpec`을 deterministic complete SVG
document string으로 serialize한다. Current Canvas concrete schema 전체를 지원하고 public entry/types/docs/package
boundary를 동기화한다.

## 진행 상태

- [x] SVG root, escaping, stable number/attribute serialization 구현
- [x] Circle/rect/line/text/path와 heterogeneous collection 구현
- [x] Solid/linear-gradient fill, opacity, dash와 authored order 구현
- [x] Nested canvas translation/background/clip 구현
- [x] Optional `<title>`/`<desc>` 접근성 contract 구현
- [x] `ggaction/svg`, strict declaration, package/docs/architecture 동기화
- [x] Unit/contract/browser/package verification
- [x] 같은 public chart의 Canvas/SVG/PNG 3-column review image 생성
- [ ] R42-P2-A review package commit/push
- [ ] 사용자 explicit visual approval

## Gate R42-P2-A

### 승인 대상

- `renderToSVG(program, { title?, description? })`의 exact output contract
- Current concrete graphic schema parity와 deterministic serialization
- Browser-safe package dependency boundary
- 같은 public chart의 Canvas/SVG/PNG rendered appearance

### Required evidence

- Serializer/unit/contract/browser tests
- SVG DOM parse, accessibility nodes, authored order, clip/gradient evidence
- Packed consumer와 TypeScript contract
- Exact public call chain과 Canvas/SVG/PNG 3-column image
- Remote checkpoint

### 승인 전 차단

- PDF runtime/public entry 구현
- Roadmap closeout

## Exit

사용자가 SVG output과 visual comparison을 명시적으로 승인한다. 승인 기록 뒤 Phase 3을 열고 PDF renderer를
구현하며 같은 chart의 Canvas/SVG/PNG/PDF 4-column comparison을 생성한다.

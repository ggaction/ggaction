# Roadmap 4.2 Phase 3 — Node Vector PDF Renderer

## 목표

Node-only `ggaction/pdf` entry에서 fully materialized `graphicSpec`을 logical Canvas dimension과 숫자상 같은 point
크기의 single-page vector PDF로 기록한다. Existing concrete Canvas drawing을 재사용하고 metadata, selectable text,
vector operators와 Poppler-rendered appearance를 검증한다.

## 진행 상태

- [x] PDF document/page lifecycle과 output validation 구현
- [x] Existing Canvas-compatible concrete drawing 연결
- [x] Single-page logical point dimension과 vector output 검증
- [x] Optional title/author/subject/keywords metadata 구현
- [x] Selectable/searchable text와 vector path 검증
- [x] `ggaction/pdf`, strict declaration, package/docs/architecture 동기화
- [x] Unit/contract/package verification
- [x] 같은 public chart의 Canvas/SVG/PNG/PDF 4-column review image 생성
- [ ] R42-P3-A review package commit/push
- [ ] 사용자 explicit visual approval

## Gate R42-P3-A

### 승인 대상

- `renderToPDF(program, { output, metadata? })`의 exact file/result contract
- Current concrete graphic schema의 single-page vector output
- Selectable text, page dimensions, metadata와 Node-only package boundary
- 같은 public chart의 Canvas/SVG/PNG/PDF rendered appearance

### Required evidence

- PDF lifecycle/unit/contract/package tests
- Page count/size, vector operators, extracted text와 metadata evidence
- All registered public charts의 concrete PDF drawing evidence
- Exact public call chain과 Poppler-rasterized 4-column image
- Remote checkpoint

### 승인 전 차단

- Phase 4 parity/distribution closeout
- Roadmap 완료 선언

## Exit

사용자가 PDF output과 Canvas/SVG/PNG/PDF visual comparison을 명시적으로 승인한다. 승인 기록 뒤 Phase 4를 열어
renderer parity matrix와 distribution surface를 최종 동기화한다.

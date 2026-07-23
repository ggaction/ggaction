# Roadmap 4.2 Phase 1 — Renderer Target Boundary

## 목표

Browser Canvas adapter가 소유하던 root backing-store lifecycle과 concrete graphic drawing을 분리한다. Existing
Canvas/PNG public behavior와 draw order를 보존하면서, Node PDF page context가 같은 concrete drawing path를
사용할 수 있는 최소 internal seam을 만든다.

## 진행 상태

- [x] Root `graphicSpec`/canvas/dimension resolution owner 분리
- [x] Canvas-element 전용 context validation과 drawing-context validation 분리
- [x] Concrete tree drawing을 target-independent internal function으로 분리
- [x] Context에 `.canvas`, `clearRect`, `scale`이 없는 vector target regression 추가
- [x] Existing Canvas/PNG focused와 cumulative suite 통과
- [ ] R42-P1-A review package commit/push
- [ ] 사용자 explicit approval

## Gate R42-P1-A

### 승인 대상

- Root target resolution, Canvas backing-store setup와 concrete drawing의 책임 분리
- Existing `render`/`renderToPNG` signature, dimensions, draw calls와 error compatibility
- PDF page context가 semantic inference 없이 같은 concrete drawing operation을 사용할 수 있는 internal seam

### Required evidence

- Focused Canvas target tests와 existing Canvas/PNG unit tests
- `npm run test:unit`, `npm run test:contracts`
- Source diff와 unchanged public export/package surface
- Remote checkpoint

### 승인 전 차단

- SVG runtime와 public entry 구현
- PDF runtime와 public entry 구현
- Package export, declaration와 current public docs 변경

## Exit

사용자가 R42-P1-A를 명시적으로 승인한다. 승인 기록 뒤 Phase 2를 열고 browser-safe SVG serializer와 visual
review package를 구현한다.

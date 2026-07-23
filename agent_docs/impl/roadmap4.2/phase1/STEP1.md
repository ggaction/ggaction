# STEP 1 — Separate Canvas Adapter and Concrete Drawing

## 진행 상태

- [x] Current root lifecycle과 draw traversal의 exact call order 고정
- [x] Root target resolution helper 구현
- [x] Canvas-independent concrete drawing helper 구현
- [x] Public Canvas adapter를 helper 위에 재구성
- [x] PDF-like context fixture로 no-canvas/no-density boundary 검증
- [x] Focused/cumulative validation
- [ ] Remote checkpoint 기록

## 변경 경계

현재 `render`는 한 함수 안에서 다음 세 책임을 소유한다.

1. Program/`graphicSpec`과 root canvas dimension 검증
2. Browser/Node Canvas backing-store resize, CSS logical size, density scale와 clear
3. Root background, tree traversal, nested clip과 concrete primitive drawing

Phase 1은 1과 3을 renderer-internal reusable owner로 분리하고 2를 public Canvas adapter에 남긴다.
Internal drawing helper는 backend object를 program에 저장하지 않으며 `graphicSpec` 외 state를 받지 않는다.

## Compatibility target

- `render(program, context, { pixelRatio })` signature와 errors 유지
- Canvas physical width/height와 optional CSS logical width/height 유지
- Root `save → scale → clear → background/tree → restore` lifecycle 유지
- Nested canvas와 collection save/restore balance, authored tree order 유지
- `renderToPNG` result와 bytes deterministic behavior 유지
- Default/basic/png package graph와 public declaration 변경 없음

## 구현 결과

- `requireProgramGraphicSpec`가 program에서 concrete state 하나만 선택한다.
- `resolveGraphicRenderTarget`가 exactly one root canvas와 logical dimensions를 검증한다.
- `drawResolvedGraphicSpec`가 resolved target과 Canvas 2D-compatible drawing context만 사용한다.
- Public `render`는 backing-store resize, CSS size, density scale와 clear를 계속 소유한다.
- `.canvas`, `clearRect`, `scale`을 제거한 mock vector context가 root background와 primitive를 authored order로
  그린다.

## Verification

| Command | 결과 |
| --- | --- |
| Focused Canvas target | 14/14 pass |
| Other Canvas/PNG focused | 19/19 pass |
| `npm run test:unit` | 1301/1301 pass |
| `npm run test:contracts` | 156/156 pass |
| Public package/export diff | none |

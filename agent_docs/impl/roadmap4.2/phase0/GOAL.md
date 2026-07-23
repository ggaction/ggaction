# Roadmap 4.2 Phase 0 — Vector Renderer Contract Gate

## 목표

SVG와 PDF runtime 구현 전에 public entry, signature, environment boundary, dimensions, text, accessibility,
metadata, parity와 검증 정책을 하나의 승인 가능한 package로 확정한다.

## 진행 상태

- [x] Current Canvas/PNG public entry와 concrete renderer surface 확인
- [x] SVG/PDF backend feasibility 확인
- [x] Browser-safe와 Node-only dependency boundary 분리
- [x] Exact proposed signatures와 result 작성
- [x] Phase dependency와 모든 Approval Gate 작성
- [x] Contract/unit/package baseline 실행
- [x] R42-P0-A review package commit/push — `bcfe14b0`
- [x] 사용자 explicit approval — 2026-07-23

## Gate R42-P0-A

### 승인 대상

- `ggaction/svg`의 browser-safe `renderToSVG` string contract
- `ggaction/pdf`의 Node-only `renderToPDF` single-page vector file contract
- Logical dimension, text/accessibility/metadata와 error policy
- Full current concrete `graphicSpec` parity 목표
- Phase 1~4 순서와 Gate evidence boundary

Exact 목록은 [`../PROPOSALS.json`](../PROPOSALS.json), self-contained review package는
[`GATE_A.md`](./GATE_A.md)가 소유한다.

### Required evidence

- Current baseline: `npm run test:contracts`, `npm run test:unit`, `npm run test:package`
- Current Canvas/PNG public signature와 package entry 비교
- Native PDF vector/context feasibility와 SVG implementation boundary
- Compatibility, non-goal, architecture/package impact
- Remote checkpoint

### 승인 전 차단

- Renderer source와 internal drawing boundary 변경
- `package.json` export와 public declaration 추가
- Current public rendering docs 변경
- Phase 1 이후 implementation

## Exit

사용자가 exact proposal을 명시적으로 승인했다. 승인 응답과 Gate checkpoint를 기록하고 Phase 1을
in-progress로 열었다.

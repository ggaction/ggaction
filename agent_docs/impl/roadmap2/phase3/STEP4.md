# Roadmap 2 — Phase 3 Step 4: Stack and Color Layout Primitives

## 목표

Normalized fill, overlay와 diverging의 final partition, scale domain, concrete rect와 rendering order를 public
implementation 전에 독립 primitive로 고정한다.

## 진행 상태

- [x] `normalized-stack` histogram independent reference
- [x] `overlay-layout` jobs bar independent reference
- [x] `diverging-layout` signed jobs independent reference
- [x] Partition order와 missing/zero policy
- [x] `[0, 1]` normalized domain과 signed diverging domain
- [x] Overlay deterministic drawing order와 no-auto-opacity target
- [x] Axes/grid/legend geometry와 drawing order
- [x] Expanded target chain metadata
- [x] Browser와 2× primitive PNG 생성
- [ ] Gate B 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [x] STEP status, conceptual commit와 push

## Primitive 원칙

- Normalization과 positive/negative accumulation은 production stack helper와 독립적으로 계산한다.
- Zero-total partition과 missing category cell에는 placeholder rect를 만들지 않는다.
- Diverging fixture의 signed field와 temporal fixture 같은 test-owned input derivation은 manifest가 한 번만
  소유하며 library transform으로 가장하지 않는다.
- Primitive는 future `layout: "fill" | "overlay" | "diverging"` action을 호출하지 않는다.

## 완료 조건

세 layout primitive의 numeric partition, domain, ordering과 visual target이 승인된다.

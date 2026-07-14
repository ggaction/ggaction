# Roadmap 2 — Phase 2 Step 1: Canonical Baseline and Phase Contract

## 목표

Existing cars line-chart primitive/public pair를 재감사하고 모든 Phase 2 variant가 공유할 canonical baseline과
executable chart contract를 고정한다.

## 진행 상태

- [ ] Existing semantic, graphic, order와 Canvas-call diff audit
- [ ] Valid row filter, series order, aggregate grain과 guide policy 고정
- [ ] Baseline primitive/public exact equivalence
- [ ] `baseline` metadata와 expanded target chain 확인
- [ ] Roadmap 2 gallery pair 재생성
- [ ] Browser와 high-resolution PNG 확인
- [ ] Gate 0 사용자 baseline confirmation
- [ ] Phase 2 chart/variant contract link와 status 갱신
- [ ] Conceptual commit와 push

## 작업 범위

Baseline은 current public result를 무조건 정답으로 가정하지 않는다. Raw primitive와 public output의 path,
series order, dash/color, axes, legend, title과 rendering order를 비교한 뒤 하나의 승인된 visual을 선택한다.
이 STEP에서는 curve, edit, reassignment 또는 aggregate vocabulary를 구현하지 않는다.

## 완료 조건

Baseline pair의 complete `graphicSpec`, order와 Canvas spy calls가 같고 gallery가
`Ready for equivalence review` 상태가 된다.

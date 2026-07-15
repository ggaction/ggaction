# Roadmap 2 — Phase 3 Step 1: Canonical Baselines and Phase Contract

## 목표

Existing cars histogram과 jobs grouped-bar primitive/public pair를 재감사하고 모든 Phase 3 variant가
공유할 두 canonical baseline과 executable reference contract를 고정한다.

## 진행 상태

- [ ] Existing histogram semantic/graphic/order/Canvas-call diff audit
- [ ] Existing grouped-bar semantic/graphic/order/Canvas-call diff audit
- [ ] Valid-row, group order, aggregate/bin grain과 missing-cell policy 고정
- [ ] 두 baseline primitive/public exact equivalence
- [ ] `baseline` metadata와 expanded target chain 확인
- [ ] Roadmap 2 gallery pair 재생성
- [ ] Browser와 high-resolution PNG 확인
- [ ] Gate 0 사용자 baseline confirmation
- [ ] Chart contract와 Phase status 갱신
- [ ] Conceptual commit와 push

## 작업 내용

- Current public defaults와 older primitive의 bin boundaries, stack order, band geometry, guide/title theme와
  drawing order를 비교한다.
- 차이가 있으면 public result를 자동 정답으로 삼지 않고 하나의 canonical visual을 선택해 primitive를
  독립 reference calculation으로 교정한다.
- Histogram은 finite Displacement와 Origin order, concrete bins/counts를 고정한다.
- Grouped bar는 `year × sex` mean grain, outer/inner domain order와 missing combination omission을 고정한다.
- Baseline artifact는 이후 STEP의 shared fixture/manifest가 한 번만 소유하도록 정리한다.

## 범위 경계

이 STEP에서는 새 bin mode, layout, width, padding, reassignment 또는 orientation을 구현하지 않는다.

## 완료 조건

두 baseline pair의 complete state와 Canvas calls가 같고 gallery에서 Gate 0 검토가 가능하다.

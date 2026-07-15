# Roadmap 2 — Phase 4 Step 2: Appearance Primitives

## 목표

Public implementation 전에 area outline/edit와 regression component edit의 final concrete appearance를 raw
primitive로 고정한다.

## 진행 상태

- [x] Density `area-outline-edit` primitive
- [x] Regression `component-edit` primitive
- [x] Fill → stroke path drawing order 확인
- [x] Semantic binding 불변과 concrete appearance 검증
- [x] Expanded target call-chain metadata
- [x] Roadmap 2 gallery와 2× primitive PNG 생성
- [ ] Gate A 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [x] STEP status, conceptual commit와 push

## Gate A 대상

- Density: opacity `0.35`, stroke `#334155`, stroke width `1.5`
- Regression band: fill `#475569`, opacity `0.12`, stroke `#111827`, stroke width `1.5`
- Regression line: stroke width `5`

Primitive는 future edit action을 호출하지 않고 low-level graphical operations로 final target만 표현한다.

## 완료 조건

두 primitive의 outline layering과 component emphasis가 승인되고 exact target chain이 artifact에 저장된다.

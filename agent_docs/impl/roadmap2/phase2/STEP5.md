# Roadmap 2 — Phase 2 Step 5: Dash and Series Reassignment Primitives

## 목표

Named/constant dash와 group/dash reassignment의 final concrete target을 raw primitive programs로 고정한다.

## 진행 상태

- [ ] `named-dash-vocabulary` primitive
- [ ] `constant-dash` primitive
- [ ] `group-reassignment` primitive
- [ ] `dash-reassignment` primitive
- [ ] Concrete series partition, order와 dash pattern fixtures
- [ ] Legend component cleanup/preservation target state
- [ ] Expanded target chain metadata
- [ ] Browser와 2× primitive PNG 생성
- [ ] Gate B 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [ ] STEP 상태, conceptual commit와 push

## 분리 원칙

Group reassignment는 scale-free group-only line에서, dash reassignment는 dash-owned series에서 검증한다.
Coupled fields를 one-at-a-time 호출로 불일치 상태에 두는 API chain은 목표로 만들지 않는다.

## 완료 조건

네 primitive의 series cardinality, order, concrete patterns와 legend state가 승인된다.

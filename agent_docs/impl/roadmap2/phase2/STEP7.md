# Roadmap 2 — Phase 2 Step 7: Aggregate Primitives

## 목표

Scalar와 parameterized aggregate 구현 전에 median, dispersion, quantile과 ordered selection의 exact numeric
result와 concrete chart target을 독립 primitive로 만든다.

## 진행 상태

- [ ] Shared valid-row와 `Year × series` grain fixture
- [ ] `aggregate-median` independent reference values와 primitive
- [ ] `aggregate-dispersion` independent reference values와 primitive
- [ ] `aggregate-quantile` independent reference values와 primitive
- [ ] `aggregate-ordered` independent reference values와 primitive
- [ ] Inferred title, domain, ticks와 missing-group policy
- [ ] Expanded target chain metadata
- [ ] Browser와 2× primitive PNG 생성
- [ ] Gate C 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [ ] STEP 상태, conceptual commit와 push

## 검증 원칙

Reference calculation은 production aggregate helper나 materializer를 import하지 않는다. Numeric fixture가
먼저 맞아야 primitive PNG를 aggregate evidence로 사용할 수 있다.

## 완료 조건

네 primitive의 numeric grain과 visual target이 승인되고 STEP8/9의 public implementation oracle이 된다.

# Roadmap 2 — Phase 2 Step 7: Aggregate Primitives

## 목표

Scalar와 parameterized aggregate 구현 전에 median, dispersion, quantile과 ordered selection의 exact numeric
result와 concrete chart target을 독립 primitive로 만든다.

## 진행 상태

- [x] Shared valid-row와 `Year × series` grain fixture
- [x] `aggregate-median` independent reference values와 primitive
- [x] `aggregate-dispersion` independent reference values와 primitive
- [x] `aggregate-quantile` independent reference values와 primitive
- [x] `aggregate-ordered` independent reference values와 primitive
- [x] Inferred title, domain, ticks와 missing-group policy
- [x] Expanded target chain metadata
- [x] Browser와 2× primitive PNG 생성
- [ ] Gate C 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [x] STEP 상태, conceptual commit와 push

## 검증 원칙

Reference calculation은 production aggregate helper나 materializer를 import하지 않는다. Numeric fixture가
먼저 맞아야 primitive PNG를 aggregate evidence로 사용할 수 있다.

## 완료 조건

네 primitive의 numeric grain과 visual target이 승인되고 STEP8/9의 public implementation oracle이 된다.

## 현재 결과

- Cars 406개 valid row를 `Year × Origin`의 36개 group으로 나눠 production aggregate helper와
  독립적으로 median, sample stdev, 0.75 quantile, Horsepower ascending first를 계산했다.
- No-valid-sample group과 sample stdev의 `n < 2` group은 값을 합성하지 않고 생략한다.
- 네 primitive는 aggregate semantic, concrete path, y domain/ticks/grid와 parameter-aware inferred
  title을 함께 저장한다.
- 2× PNG와 desktop/mobile Roadmap gallery는 통과했으며 user-facing output은 Gate C 승인 전이라
  의도적으로 생성하지 않았다.

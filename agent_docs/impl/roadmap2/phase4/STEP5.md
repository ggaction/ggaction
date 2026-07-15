# Roadmap 2 — Phase 4 Step 5: Density Vocabulary and Editing

## 목표

네 density kernels, 두 normalization modes와 immutable `editDensity`를 구현한다.

## 진행 상태

- [x] Shared kernel/normalization validation grammar
- [x] `createDensityData`와 `encodeDensity` forwarding/provenance
- [x] `editDensity` deterministic revision ID
- [x] Explicit consumer rebind와 orphan release
- [x] Complete materialization plan
- [x] Formula/default/boundary/invalid coverage
- [x] Atomic failure와 earlier-program immutability
- [x] Primitive/public equivalence와 user-facing PNG
- [x] Types, docs, contracts, commit와 push

## 구현 결과

- Kernel은 `gaussian | epanechnikov | uniform | triangular`, normalization은 `unit | count`를 지원한다.
- `editDensity`는 새 revision dataset을 만들고 target layer를 명시적으로 rebind한 뒤, 참조가 사라진 이전
  derived dataset만 제거한다.
- Target mark를 먼저, 같은 x/y scale을 소비하는 mark를 뒤이어 재구체화한다. Scale에 연결된 guide는 기존
  scale rematerialization dependency를 통해 함께 갱신된다.
- 3개 승인 variant는 primitive/public semantic·graphic·Canvas state와 PNG pixel이 일치한다.

## 검증

- `npm test`: 677 passed
- `npm run test:render`: 205 passed, 41 gallery variants
- `npm run test:coverage`: line 95.00%, branch 90.85%, functions 98.39%

## 완료 조건

Density changes never mutate a source/old derived dataset and every affected consumer is current after the action.

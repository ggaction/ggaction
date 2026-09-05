# Roadmap 6 Phase 0 Step 1 — Baseline and decisions

## 진행 상태

- [ ] A Gate의 정확한 결정·호환성·검증 범위 확정
- [ ] A Gate 증거 commit/push와 명시적 사용자 승인 기록
- [ ] R6-P0-W1 감사와 source identity 고정
- [ ] R6-P0-W2 계층과 traceability 작성
- [ ] R6-P0-W3 변경 결정과 migration 고정
- [ ] R6-P0-W4 검증과 납품 순서 작성

위 체크는 미래 실행용이다. 계획 문서를 만든 사실을 구현 완료나 Gate 승인으로 표시하지 않는다.

## 순서

1. [GOAL.md](GOAL.md)의 범위를 기준 source에서 다시 확인한다. 변한 근거는 별도 delta로 기록한다.
2. [GATES.md](GATES.md)의 A review package를 구체화하고 승인 상태를 확인한다.
3. 이번 단계는 계획·근거·검증 기준만 작성한다. Phase 1 source 교정은 다음 단계다.

## 실행 기록에 남길 것

- 기준/결과 commit과 remote ref, 실제 실행 명령과 exit/result.
- 변경한 public call의 before/after 및 의미·appearance 차이.
- Trace의 의미 있는 child owner와 이전 program 불변성.
- 필요한 경우 artifact manifest, input hash, 이미지와 exact target public call chain.
- 해결·유지·보류한 finding ID와 다음 단계에 남긴 dependency.

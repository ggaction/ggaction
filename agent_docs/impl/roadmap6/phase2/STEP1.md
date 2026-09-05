# Roadmap 6 Phase 2 Step 1 — Shared authoring semantics

## 진행 상태

- [x] A Gate의 정확한 결정·호환성·검증 범위 검토안 작성 — [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md)
- [x] 현재 동작 43건·관련 기존 테스트 100건 확인 — [VALIDATION.md](VALIDATION.md)
- [x] A Gate 증거 commit/push 및 review ref 기록 — `e06b57db5624a5b0d66cea425cff4aa5f5f4caad`
- [x] A Gate의 명시적 사용자 승인 기록 — 2026-09-05 “ㄱㄱ”
- [x] R6-P2-W1 Complete facade와 guide 확보 — 기능·회귀·installed package 통과, [결과](RESULTS.md#w1--facade-guide-reuse)
- [x] R6-P2-W2 Series와 appearance 분리 — 기능·시각 검증 완료, Basic package 크기 통합 대기, [결과](RESULTS.md#w2--explicit-series-identity-and-line-appearance)
- [ ] R6-P2-W3 Style mode와 shorthand 정합성 — Line width/opacity 부분 구현·검증
- [ ] R6-P2-W4 Inference·JSON opt-out·분석 defaults
- [x] R6-P2-W5 유효한 incomplete intent 보존 — [결과](RESULTS.md#w5--bar-incomplete-authoring)
- [x] 모든 시각 variant의 primitive target 작성·표시 — [6개 검토안](VISUAL_REVIEW.md)
- [x] V의 명시적 사용자 승인 — “승인한다”, 6개 target, [승인 기록](GATES.md#r6-p2-v--visual-target)
- [x] B의 full bundle 예산 결정과 installed package 재검증 — “조정한다”, full 235,000 bytes, [결과](RESULTS.md#b--browser-bundle-budget-acceptance)
- [ ] 승인된 variant의 public 구현과 같은 실행의 primitive/public render 비교
- [ ] 누적 검증·migration·문서·원장 동기화
- [ ] X Gate의 증거 commit/push와 명시적 사용자 승인 기록

체크한 항목의 실제 검증은 [결과](RESULTS.md)에 기록한다. A/B/V 승인을 기록했고 W1/W5를 검증했다. X 승인과 미실행 결과를 완료로 표시하지 않는다.

## 순서

1. [GOAL.md](GOAL.md)의 범위를 기준 source에서 다시 확인한다. 변한 근거는 별도 delta로 기록한다.
2. [GATES.md](GATES.md)의 A review package를 구체화하고 승인 상태를 확인한다.
3. 공유 owner 변경은 dependent facade보다 먼저 완료한다. W1/W5의 기존 출력 보존 교정 중 Bar의
   completion policy인 W5를 먼저 검증한 뒤 W1 facade guide 확보를 연결한다. 새 시각 target의 V 경계는 유지한다.
4. 시각 변화가 있으면 해당 variant의 primitive target을 먼저 작성하고 V 승인 뒤 public flow를 구현한다.
5. 하나의 coherent conceptual change를 검증해 commit/push한 뒤 다음 변경으로 이동한다. 한 W가 크면 공개 계약과 owner 경계로 나눈다.
6. Source→unit/type→contract/trace→render→consumer 순서로 해당 변경에 필요한 검증을 확장한다.
7. 실패는 원인·입력·남은 작업으로 기록하며 통과 사례만 추려 Gate를 완료하지 않는다.
8. 승인 범위의 결과를 X package로 닫고 사용자 승인을 받은 뒤 dependent phase로 이동한다.

## 실행 기록에 남길 것

- 기준/결과 commit과 remote ref, 실제 실행 명령과 exit/result.
- 변경한 public call의 before/after 및 의미·appearance 차이.
- Trace의 의미 있는 child owner와 이전 program 불변성.
- 필요한 경우 artifact manifest, input hash, 이미지와 exact target public call chain.
- 해결·유지·보류한 finding ID와 다음 단계에 남긴 dependency.

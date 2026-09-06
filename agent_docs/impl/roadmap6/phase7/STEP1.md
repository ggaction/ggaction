# Roadmap 6 Phase 7 Step 1 — Polar and one dimensional charts

## 진행 상태

- [x] A Gate의 정확한 결정·호환성·검증 범위 확정 — [계약](CONTRACT.md)
- [x] 전체 실행 사용자 승인과 기준 ref 기록
- [x] R6-P7-W1 Polar Scatter와 Line facade
- [x] R6-P7-W2 Radar long-form과 explicit fold
- [x] R6-P7-W3 Rug와 Strip placement
- [x] 모든 시각 variant의 primitive target 작성·표시·V 승인
- [x] 승인된 variant의 public 구현과 같은 실행의 primitive/public render 비교
- [x] 누적 검증·migration·문서·원장 동기화 — [X 결과](REVIEW.md)
- [x] X Gate의 증거 commit/push와 전체 실행 사용자 승인 적용

위 체크는 미래 실행용이다. 계획 문서를 만든 사실을 구현 완료나 Gate 승인으로 표시하지 않는다.

## 순서

1. [GOAL.md](GOAL.md)의 범위를 기준 source에서 다시 확인한다. 변한 근거는 별도 delta로 기록한다.
2. [GATES.md](GATES.md)의 A review package를 구체화하고 승인 상태를 확인한다.
3. 작업 묶음을 위 순서로 진행한다. 공유 owner 변경은 dependent facade보다 먼저 완료한다.
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

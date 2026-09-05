# Roadmap 6 Phase 4 Step 1 — Baselines layouts and quantitative meaning

## 진행 상태

- [x] Phase 3 X 사용자 승인과 완료 기록 확인
- [x] Current baseline·owner·existing defaults·실패 경계 재현 — 49 cases / 199 immutable checks / 기존 200 tests

- [x] A Gate 검토안의 정확한 결정·호환성·검증 범위 작성 — P4-C01–C09 / 새 4 actions / 20 V targets
- [x] A Gate 증거 commit/push — `f229fa003d5de81f7131d4c23811b834bd36d50e`
- [x] A Gate의 명시적 사용자 승인 기록 — layoutSeries 이름 변경 포함
- [x] 승인된 신규 direct 4개와 기존 capability 5개 Planned 등록
- [x] Primitive target용 비시각 semantic leaves와 closed vocabulary 검증
- [ ] R6-P4-W1 Area baseline/range와 facade
- [ ] R6-P4-W2 Color와 독립한 layout assignment
- [ ] R6-P4-W3 Rose와 Radial bar
- [ ] R6-P4-W4 Theta와 legend domain order
- [ ] R6-P4-W5 Diverging midpoint와 scale/legend transition
- [ ] 모든 시각 variant의 primitive target 작성·표시·V 승인
- [ ] 승인된 variant의 public 구현과 같은 실행의 primitive/public render 비교
- [ ] 누적 검증·migration·문서·원장 동기화
- [ ] X Gate의 증거 commit/push와 명시적 사용자 승인 기록

A 준비만 완료했고 production 구현 체크는 미완료다. 계획 문서를 만든 사실을 구현 완료나 Gate 승인으로 표시하지 않는다.

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

## A 준비 결과

[계약 검토](CONTRACT_REVIEW.md), [실제 관측](baseline-results.json), [검증 계획](VALIDATION.md)을 작성했다.
Phase 3 승인 runtime을 그대로 조사했다. Production source/types/card/API는 바꾸지 않았다.

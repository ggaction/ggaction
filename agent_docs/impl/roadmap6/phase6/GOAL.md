# Roadmap 6 Phase 6 — Data statistics and composite lifecycle

## 상태와 목표

상태: in-progress. 전체 실행 승인을 적용했고 W1–W4를 구현·검증했다.

일반 사용자가 재사용 가능한 derived data를 만들고 안전하게 source·통계·composite 역할을 교체하도록 한다.

## 선행 조건

- [Phase 4](../phase4/GOAL.md)의 R6-P4-X 승인과 필요한 결과.
- [Phase 5](../phase5/GOAL.md)의 R6-P5-X 승인과 새 label·theme consumer 계약.

## 구체적인 작업 묶음

### R6-P6-W1 — Dataset lifecycle와 안전한 bind

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D12, F16.
- 작업: Definition-only와 materializing transform을 구분한다. create/edit-owner/snapshot 관계와 Bin2D legacy reauthor를 정리하고 public bindMarkData의 full preflight를 만든다.
- 완료 조건: Immutable 이전 program 유지. Field/type/grain/coordinate/scale/guide/selection incompatibility에 atomic failure, compatible revision은 orphan cleanup.
- 결과: [W1 결과](RESULTS_W1_DATA_BINDING.md). Independent mark의 public binding과 snapshot/owner 경계를
  구현했다. Owned revision cleanup은 각 W2/W4/W5 owner의 실제 revision과 함께 계속 검증한다.

### R6-P6-W2 — Summary·bin·fold·computed·stack data

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: F15.
- 작업: Group+multi-aggregate summary, reusable 1D bin bounds/count/member, selected-field fold를 먼저 만든다. 제한된 serializable arithmetic와 Phase4 stack grammar의 data projection을 후속 소단위로 작성한다.
- 완료 조건: 명시적 input/output grain, alias collision/missing/type error, concrete values+provenance. Window/Histogram/stack 수학 복제 없음. Callback/eval transform language 없음.
- 결과: [Summary](RESULTS_W2_SUMMARY.md), [bin](RESULTS_W2_BIN.md), [fold](RESULTS_W2_FOLD.md),
  [computed](RESULTS_W2_COMPUTED.md), [stack](RESULTS_W2_STACK.md)을 구현하고 public contract/types/docs,
  generated cards와 installed-package consumer까지 검증했다.

### R6-P6-W3 — 공통 interval method·level

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D11.
- 작업: Normal approximation과 Student-t를 method로 구분한다. ciLower/Upper와 Interval/Regression 어휘·계산 owner·provenance를 정리하되 기존 결과를 migration 없이 바꾸지 않는다.
- 완료 조건: [1,2,3]의 두 기존 upper를 각각 재현. n0/n1/constant/grouped/missing과 method·level 오류를 독립 oracle로 검사.
- 결과: [W3 결과](RESULTS_W3_CONFIDENCE.md). 공통 `normal`/`student-t` 계산 owner와 `level`
  provenance를 Aggregate, Interval, ErrorBar, ErrorBand, Regression에 연결하고 기존 기본 수치를 보존했다.

### R6-P6-W4 — Filter replace·compose·remove·empty

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D15, F16.
- 작업: Final-item filter의 기준 source와 active recipe를 저장한다. 반복 ID collision을 없애고 명시적 해제와 domain 유지 empty view를 제공한다.
- 완료 조건: 같은 filter 반복 idempotent, replace/compose 서로 다른 기대 결과. Empty item cleanup과 이전 program 보존, 독립 통계 layer 비의도 변경 없음.
- 결과: [W4 결과](RESULTS_W4_FILTER.md). Canonical source와 ordered recipe, deterministic revision,
  replace·compose·remove, domain-preserving empty view를 구현하고 전체 mark family replay와 package를 검증했다.

### R6-P6-W5 — Violin·interval·composite role revision

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D16, F16.
- 작업: Violin의 source/category/value/split/orientation, ErrorBar/Band의 source/position/interval roles를 atomic owner edit로 제공한다. Box/Gradient/Regression의 vocabulary와 비교한다.
- 완료 조건: 생성→source 교체→방향 전환→style edit가 한 owner identity를 유지. Scale/guide/labels downstream이 수렴하고 부적합 변경은 전부 실패.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P6-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.

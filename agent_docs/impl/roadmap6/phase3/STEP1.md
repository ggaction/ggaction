# Roadmap 6 Phase 3 Step 1 — First complete chart facades

## 진행 상태

- [x] Phase 2 X 사용자 승인 기록과 기준 commit 고정
- [x] 실제 lower 소유권·defaults·guide·coordinate·style 조사
- [x] 52건 baseline probe와 176건 관련 기존 tests 확인
- [x] A 계약 제안·호환성·consumer matrix·9개 V target 계획 작성
- [x] A package 최종 검증·commit/push·exact remote ref 기록
- [x] A 명시적 사용자 승인 기록
- [x] 승인된 새 계약의 Planned 등록과 비시각 준비
- [x] 9개 primitive targets 작성·수치 검증·렌더링
- [x] V 검토 문서·정확한 호출·이미지와 source 증거 작성
- [x] V package 원격 ref 고정
- [x] V 명시적 사용자 승인
- [ ] R6-P3-W1 Pie/Donut public flow와 lower lifecycle
- [ ] R6-P3-W2 Density public flow와 lower lifecycle
- [ ] R6-P3-W3 Horizon public flow와 lower lifecycle
- [ ] Same-run public/primitive parity·누적 검증·문서·원장 동기화
- [ ] X package commit/push와 명시적 사용자 승인 기록

A 승인과 primitive 작성·검증을 완료했다. V를 승인받았으며 새 API 구현·X 승인은 아직 남아 있다.
[계약 검토](CONTRACT_REVIEW.md), [시각 검토](VISUAL_REVIEW.md), [Gate](GATES.md), [검증](VALIDATION.md)가 현재 evidence를 소유한다.

## 실행 순서와 경계

1. A package의 P3-C01–C07을 사용자에게 제시한다. 승인 전 신규 public API나 primitive target을 만들지 않는다.
2. A 승인 내용을 먼저 기록한다. 승인된 scope를 Planned에 등록하고 source/type/guide policy의 비시각 준비를 수행한다.
3. 각 chart 계약의 9개 targets를 single manifest와 independently authored primitive로 만든다.
   새로운 공개 flow가 없는 상태임을 표시하고 실제 이미지와 exact public target call로 V를 요청한다.
4. V 승인된 범위만 Pie → Density → Horizon 순으로 구현한다. 기존 helper·statistical owner를 재사용한다.
   매 conceptual change는 관련 source/types/Current/cards/docs/tests를 검증해 commit/push한다.
5. Source/semantic/trace → strict runtime/type errors → lifecycle/guide/selection → render parity → installed consumer
   순서로 acceptance를 닫는다. 새 failure를 숨기거나 상한을 자동 변경하지 않는다.
6. Cumulative suite와 실제 package·coverage/docs·realistic 결과를 기록하고 stable capability owners로 evidence를 이동한다.
7. X package를 원격 ref로 고정하고 승인받는다. 승인 전 Phase 3 completed로 표시하지 않는다.

## 발견하여 교정한 제안

- Pie final-share cache는 불필요하다. 기존 theta encoding과 sector derivation·concrete paths를 사용한다.
- Density group/color는 일반 Area와 달리 같은 retained group field만 지원한다. 원본 metadata color variant를 제거했다.
- Horizon은 기존 coordinate child로 explicit 좌표 선택이 가능하다. encodeHorizon 옵션을 추가하지 않는다.
- Horizon explicit lower folded y/legend는 허용되므로 신규 H0에서 별도 의미 검증이 필요하다.
- Horizon explicit opacity는 encoding 뒤 editAreaMark로 적용해야 한다. Lower default를 바꾸지 않는다.
- Donut 독립 alias는 P3-C02에서 미추가를 제안한다. Hole/padding 의미와 visual target은 W1에 포함한다.

## 실행 기록

- Approval baseline: `9625e71c374868756652fb8dff8153dc61500c6e`.
- Source/types는 Phase 2 검증본과 동일. A baseline script·문서만 작성했다.
- 상세 current observations: [baseline-results.json](baseline-results.json).
- A 승인 기준 HEAD는 `0f3531ae9c242190df9457b1ed4289491963ba77`이며 사용자 답은 “승인한다”다.
- 승인된 세 계약은 Planned에 등록했다. 9개 primitive의 normal 19건·PNG 9건이 통과했고 public flow는 V 승인 뒤 구현한다.
- Density grid는 현행 y축 기준임을 명시했다. Horizon V fixture는 band가 구분되도록 2점에서 7점으로 구체화했고 기존 baseline은 보존했다.
- V package `1f7debaab66856597deaf8a039648ce23b123e41`를 원격 branch에 push했다. 2026-09-05 사용자가 V를 승인했다. 신규 public flow 구현을 시작한다.

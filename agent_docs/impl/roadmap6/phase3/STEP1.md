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
- [x] R6-P3-W1 Pie/Donut public flow와 lower lifecycle
- [x] R6-P3-W2 Density public flow와 lower lifecycle
- [x] R6-P3-W3 Horizon public flow와 lower lifecycle
- [x] Same-run public/primitive parity·누적 검증 결과·문서·원장 동기화
- [x] 조건부 B 용량 검토안과 같은 tarball 측정 evidence 준비
- [x] B 명시적 사용자 승인 기록 (Full 237,000 bytes)
- [ ] 승인 상한 적용과 같은 tarball package 전체 exit 0 확인
- [ ] X package commit/push와 명시적 사용자 승인 기록

A/V 승인 뒤 세 public flow·lower lifecycle·시각 동등성·문서와 누적 기능 검증을 완료했다.
Full 923-byte 상한 초과의 [B 결정](BUNDLE_REVIEW.md)과 package 통과·전체 X 승인을 남긴다. [구현 결과](RESULTS.md)를 따른다.
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

- W1 구현: Current 175 / Planned 2. Pie 48/48, contracts 260/260, PNG 3/3와 SVG/PDF 3/3, example browser 1/1, installed package exit 0. Source docs 47/47, built 124 pages, desktop/320/390/768px browser 검사 통과. Full gzip 234,970 / Basic 124,897 / SVG 6,418 bytes.

- W2 구현: Current 176 / Planned 1. Focused 86/86, PNG·SVG/PDF 각 3/3, browser 1/1, 새 realistic 30/30. Package는 Full 235,428 > 235,000으로 실패하며 상한은 유지한다. 기능 구현과 package 완료를 구분한다.
- W2 누적 normal 2,537/2,537과 docs browser 전체 검사가 통과했다. Package 상한 초과는 통합 미해결 항목으로 유지한다.

- W3 구현: Current 177 / Planned 0. Signed/temporal/baseline-style, shared x title regression, strict guide/color boundaries, 실제 데이터 45건을 검증했다. 누적 coverage는 normal 2,585건을 포함하며 lines 95.09% / branches 91.31% / functions 98.76%, critical floors 72개 통과다. Installed Full 235,923 > 235,000으로 package 전체는 실패한다.
- 통합: 9개 public/primitive와 기존 승인 V pixel이 일치한다. Realistic 전체 210/212의 두 inventory 실패를 교정한 뒤 관련 모듈 13/13이 통과했다. Runtime source `80999264`, test 교정 `39b082d6`; package bytes는 같다. 정확한 범위는 [최종 통합 검증](RESULTS.md#최종-통합-검증)을 따른다.

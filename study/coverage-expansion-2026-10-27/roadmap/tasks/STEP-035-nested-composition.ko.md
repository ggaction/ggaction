# STEP-035 Nested facet와 shared guide 정렬

## 진행 상태

- [x] 계약과 선행 단계 확인
- [x] 독립 실패 시험 작성
- [x] 중첩 반응형 합성과 AT21 소비자 연결
- [x] 해당 범위 명령 실행 및 evidence 저장
- [x] 해당 범위 Current·문서·설치·renderer 인계
- [ ] AT20의 single-Y admission 합산 및 카드 전체 종료

상태: 중첩 반응형 합성 및 AT21 검증 완료, AT20 합산 대기. 작업 묶음 WP-07.
선행 STEP034와 Calendar source union을 반영한 source `fbc2bd66f`를 검증했다.
정확한 결과는 [구현 검증 기록](../../../../agent_docs/impl/roadmap9/phase7/theme/NESTED_COMPLETION.md)과
[evidence](../../../../agent_docs/impl/roadmap9/phase7/theme/nested-public-evidence/summary.json)에 있다.
AT20의 원안 closureTask는 이 카드이며, 현재 STEP050 담당자가 구현 중인 single-Y admission을
합친 최종 검증까지 전체 종료로 표시하지 않는다.

## 먼저 읽을 것

- [공통 실행 규칙](../START_HERE.ko.md)와 [결정표](../DECISIONS.ko.md).
- [계약 geometry-design](../contracts/geometry-design.ko.md).
- [계약 core](../contracts/core.ko.md).

## 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/theme/defaults.js`
- `src/actions/theme/index.js`
- `src/materialization/layout.js`
- `src/materialization/composition.js`
- `src/materialization/facets.js`
- `src/materialization/compositionSnapshot.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/layout/responsivePolicy.js` — Declared responsive fallback and bounded layout solve.
- `src/theme/provenance.js` — Resolved property origin; reuse existing theme actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

## 구현 순서

1. occupied topology와 full child bounds를 합성한다.
2. ragged rows/header/footer/legend/title 충돌을 검사한다.
3. resize/font-load/revise 후 ancestor snapshots를 갱신한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

## 통과해야 하는 결과

3행 long-label fixture plot/header/footer 정렬. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

## 실패와 금지

mark-only bounds·child root Canvas만 resize 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

## 인수 시험 연결

- **AT-20** 입력: unit/layer/facet/concat/repeat와 허용 scale/guide scope. 기대: frame별 Y 하나; 분리된 facet 독립 scale 허용, bounds와 responsive 정렬.
- **AT-21** 입력: nested facet·3행 full-bounds·긴label·resize 합성 fixture. 기대: 공통 header/plot/footer 정렬과 text metrics 정확; corpus source ID 재현 의무 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

## 시험 파일과 명령

실제 capability owner는 다음과 같다. 기존 composition·font·source 회귀도 함께 검증했다.

- `test/unit/actions/composition/nested-responsive-layout.test.js`
- `test/unit/actions/composition/facet-resource-projection.test.js`
- `test/unit/materialization/facet-scale-context.test.js`
- `test/charts/nested-responsive/`
- `test/browser/nested-responsive.browser.js`

~~~sh
node scripts/run-tests.js unit capability:nested-composition
node scripts/run-tests.js render capability:nested-composition
node scripts/run-tests.js browser browser/nested-responsive.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

## 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.

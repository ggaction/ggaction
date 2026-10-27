# STEP-070 현재 frame와 모든 deferred 통합 의무 종료

## 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-18. 선행 단계 STEP-069. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

## 먼저 읽을 것

- [공통 실행 규칙](../START_HERE.ko.md)와 [결정표](../DECISIONS.ko.md).
- [계약 qualification-delivery](../contracts/qualification-delivery.ko.md).
- [계약 interaction](../contracts/interaction.ko.md).
- [계약 animation](../contracts/animation.ko.md).
- [계약 geo](../contracts/geo.ko.md).
- [계약 edge-bundling](../contracts/edge-bundling.ko.md).
- [계약 hierarchy-partition](../contracts/hierarchy-partition.ko.md).

## 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/accessibility.js`
- `src/persistence.js`
- `src/renderers/png.js`
- `src/renderers/pdf.js`
- `src/renderers/svg.js`
- `test/support/browser.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/browser/native-integration.browser.js` — Real-input cross-feature qualification.
- `scripts/consumers/fixtures/native-resources.ts` — Fresh installed-package typed restore/edit fixture.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

## 구현 순서

1. partitionfocus→morph→revise 시나리오를실행한다.
2. 4bundle→overlapselect→drag→interrupt→geo clip을실행한다.
3. session+animation+hit+LOD+undo/restore를교차검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

## 통과해야 하는 결과

AT34/65/80/81/82의후행 의무0; 현재frame선택정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

## 실패와 금지

커널단위pass를전체capability완료로집계 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

## 인수 시험 연결

- **AT-34** 입력: animation frame hit와 overlapping enter/exit/crossfade. 기대: 현재 보이는 geometry 선택, semantic key 중복 이벤트 없음.
- **AT-65** 입력: partition focus/filter/breadcrumb/keyboard/coordinate morph. 기대: 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion.
- **AT-80** 입력: bundle 겹침/선택/unbundle/tooltip/keyboard. 기대: candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility.
- **AT-81** 입력: bundle animate/interrupt/seek/revise/geo date line. 기대: endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0.
- **AT-82** 입력: bundling sizeclass/abort/worker/cache/export. 기대: stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

## 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/cross-feature-integration.test.js`
- `test/contracts/cross-feature-integration.test.js`
- `test/browser/cross-feature-integration.browser.js`

~~~sh
node scripts/run-tests.js unit unit/cross-feature-integration.test.js
node scripts/run-tests.js contracts contracts/cross-feature-integration.test.js
node scripts/run-tests.js browser browser/cross-feature-integration.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

## 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.

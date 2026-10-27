# STEP-075 실패와 성공 표본 독립 검토

## 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-20. 선행 단계 STEP-074. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

## 먼저 읽을 것

- [공통 실행 규칙](../START_HERE.ko.md)와 [결정표](../DECISIONS.ko.md).
- [계약 qualification-delivery](../contracts/qualification-delivery.ko.md).

## 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `scripts/run-tests.js`
- `scripts/coverage-policy.js`
- `test/capabilities.json`
- `.github/workflows/ci.yml`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/contracts/native-capability-completion.test.js` — Durable capability matrix validator without roadmap imports.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

## 구현 순서

1. 모든failed diff를stats/font/layout/input/time별로분류한다.
2. 각domain성공표본과4bundle알고리즘차이를직접검토한다.
3. scope/contract변경없이snapshot만갱신한경우를차단한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

## 통과해야 하는 결과

숫자·geometry·입력·시간·asset근거로판정. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

## 실패와 금지

대량golden교체·독립oracle가production복제 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

## 인수 시험 연결

- **AT-60** 입력: 모든 실패 diff 독립검토와 성공 stratified sample review. 기대: 통계/폰트/레이아웃/입력원인별판정, baseline대량재생성으로실패덮음없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

## 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm test
npm run test:realistic
npm run test:coverage
npm run test:browser
npm run test:render
npm run test:package
npm run test:platform
npm run package:check
npm run docs:verify
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

## 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

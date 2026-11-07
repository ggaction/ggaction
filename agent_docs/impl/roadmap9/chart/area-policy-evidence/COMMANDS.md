# Area 최종 정책 사전검증 증거

기준은 `862a1220e` 합산 후보이다. 기존 승인 `../../AUTHORIZATION.json`의 `remainingApproval`을 재사용한다. 새 공개 API·저장 형식·시각 목표를 추가하지 않는다. 동일한 stack/fill/center/wiggle 정책을 공유하는 Area 생성은 최종 정책으로 검산하고, 실제 위치 작성 전 기존 `layer.layout.mode`를 wrapped `editSemantic`으로 한 번 기록한다. 공개 `layoutSeries`의 완성된 위치 요구는 유지한다.

## 완료한 검사

- `node --experimental-test-coverage --test-coverage-include='src/actions/charts/area.js' --test-coverage-include='src/actions/encodings/seriesLayout.js' --test test/unit/actions/charts/area-facade-policy.test.js test/unit/actions/charts/area-facade.test.js test/unit/actions/encodings/series-layout.test.js test/unit/actions/encodings/bar-authoring-order.test.js test/unit/wiggle-area.test.js test/unit/single-y-aggregate-admission.test.js test/unit/actions/conditional-area-position.test.js test/unit/actions/conditional-bar-position.test.js test/unit/actions/conditional-text.test.js test/charts/area-layout/public.test.js test/charts/streamgraph/public.test.js`: 112/112. 기존 critical floors 유지·통과.
- `node --test test/browser/streamgraph.browser.js test/charts/streamgraph/renderer.render.js test/charts/area-layout/vector.render.js`: 13/13.
- `node scripts/run-tests.js realistic contracts/realistic-stream-baselines.test.js`: 실제 5개 데이터 × 3개 배치 15/15.
- `node --test --test-name-pattern='executes documented tutorials/area-layout.md' test/docs/executable-programs.test.js`: 2/2.
- `node --test --test-name-pattern='action-card hierarchy' test/contracts/compact-action-cards.test.js`: 1/1.
- `npm run contracts:relations`, `npm run contracts:cards`, `npm run docs:search`, `npm run docs:llms`: canonical 생성 성공. 합산 후보의 기존 stale 파생물도 함께 재생성했다.
- stream-baselines 설치 fixture의 3개 case ID와 manifest 일치, source import 없음 확인. 실제 설치 실행 성공으로 계산하지 않는다.

## 보존한 실패와 합산 의무

최초 same-policy 생성 실패와 중간 테스트/추출 실패는 gzip 로그로 보존한다. `boundaries.log.gz`의 35/36 중 실패는 합산 후보의 realistic 파일 수 57 대 기존 54이다. `fixture.log.gz`는 합산 interaction case 순서 불일치다. root가 두 metadata의 최종 합산 검증을 맡는다.

`node scripts/package-artifact.js --pack`은 기존 합산 한도 1065에 실제 1106 entries로 실패했다. Area의 추가 runtime 파일은 0개다. 전체 weighted/gesture/Table 합산 source를 동결한 뒤 root가 실측 한도를 갱신하고 동일 최종 archive로 Node20/22/24 설치 소비자를 실행하기로 분담했다. 이 기록은 해당 설치 성공이나 STEP074 완료를 주장하지 않는다. 기존 Table exact tar 검증은 원 checkpoint에 그대로 보존한다.

`inputs.json`은 이 source 검사의 정확한 runtime·fixture 입력 해시다. 새 fixture에는 동일 Y policy 두 Area의 geometry/domain, restore, source revise 동등성 검사가 들어 있다.

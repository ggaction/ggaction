# Table 공개 수직 검증 재현

`summary.json`의 source revision과 `source-inputs.json`이 실행 입력을 소유한다.
원안의 남은 전체 승인은 `../../AUTHORIZATION.json`의 `remainingApproval`을 적용했다.
STEP050 최신 합산 및 STEP074/077 전체 인수는 이 증거의 완료 분모가 아니다.

```sh
node --experimental-test-coverage --test-coverage-include='src/grammar/cells.js' --test-coverage-include='src/grammar/table*.js' --test-coverage-include='src/actions/charts/table.js' --test-coverage-include='src/actions/marks/table/index.js' --test-coverage-include='src/materialization/table/*.js' --test-coverage-include='src/materialization/selection/policies/table.js' --test test/unit/grammar/table-cells.test.js test/unit/grammar/table-data.test.js test/unit/materialization/table-content.test.js test/unit/table-plot.test.js test/unit/table-consumers.test.js test/charts/table/public.test.js
node scripts/run-tests.js realistic contracts/realistic-table-plots.test.js
node --test test/browser/table.browser.js test/charts/table/renderer.render.js
node --test test/charts/table/public.test.js test/contracts/table-types.test.js
node --test test/contracts/source-boundaries.test.js test/contracts/test-discovery.test.js test/contracts/action-catalog.test.js test/contracts/chart-vertical-slices.test.js test/contracts/package-boundaries.test.js
node --test test/unit/core/identity-comparison.test.js
node --test test/contracts/nested-scale-role-contract.test.js test/contracts/generated-lifecycle-scenarios.test.js test/contracts/generated-scenario-feature-coverage.test.js
node --test --test-name-pattern='derives a bounded public option inventory' test/contracts/generated-scenario-feature-coverage.test.js
node --test --test-name-pattern='bounded typed|every compact snippet' test/contracts/compact-action-cards.test.js
npm run docs:generate
npm run test:docs
npm run docs:build
npm run test:docs:built
node scripts/package-artifact.js --pack
```

최종 tar를 변경하지 않고 Node20/22/24에서
`TABLE_PACKAGE_SPEC=<absolute tar path> node .artifacts/qualify-table-package.mjs`를 실행했다.
정확 Node 버전은 각 receipt가 정본이다. 실행 helper는 같은 이름의 `.gz`에 보존했다.
Repository root `.artifacts/`에 복원해 사용하며 모든 설치 소비자는 공개 package만 import한다.
3개 runtime 사례, strict Full/Basic 타입, 두 문서 프로그램, optional peers,
다섯 entry bundle을 검사했다. Node20/24의 독립 pack 크기 측정과 같은 Node22 tar의
실행 증거를 구분한다. 중간 tar의 결과는 최종 tar의 통과로 대체하지 않았다.

Built docs browser는 `table-focused-built.mjs.gz`를 복원해 사용한다. 공통 탐색·접근성,
Table API/tutorial의320/390/768px containment를 검사한다. Jekyll은 Ruby3.2/Homebrew
gems와 Node22를 PATH 앞에 둔 `bundle exec jekyll`이다. 배포·publish·PR은 수행하지 않았다.

## 최초 실패와 재사용 경계

- 전체 생성 계약의 오래된 action/option/scale 분모는 실제 runtime/declaration inventory로 갱신했다.
  Renderer features를 제외한 ledger는42,701이며 기본 ledger42,705와 구분한다.
- 기존 OHLC/Waterfall/Trail6개 summary override가 bounded20개 계약을 넘었다.
  정본 action reference에서 같은 설명을 생성하도록 중복 정의만 제거했다.
- Table action sample의 columns 숫자 예시는 실제 배열/정렬 patch로 고쳐 strict snippet 검사했다.
- 독립 할당된 Table collection 이름 비교는 canonical typed cell key의 digest와 정확히 일치할 때만
  allocation-independent 이름으로 비교한다. 타입·clip·draw order 차이는 계속 검출한다.
- 실제 자료의 stable sort 동률은 명시 sourceRowIndex를 두 번째 key로 사용한다. 원행·값은 보존하며
  sparkline은12개 실제 observation의 명시 nested cohort다. 금융 역할로 재분류하지 않았다.
- 네 backend의 효과 baseline 작성 중 잘못 전달한 editGraphics 인수를 수정했다.
  최초 실패와 수정 후 결과를 각각 보존했다. renderer pixel 허용치를 늘리지 않았다.
- 문서의 immutable source 링크는 source commit 이후 재생성해 검증한다. runtime이 바뀌지 않은
  이전 owning50/50, shared72/72, realistic16/16,4backend4/4 증거는 해당 입력 해시와 함께 재사용한다.

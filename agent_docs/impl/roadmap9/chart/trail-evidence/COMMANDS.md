# Trail qualification 재현

저장된 source revision은 summary.json이 소유한다. Node22.23.1에서 다음 owner를 실행했다.
최초 실패 로그는 삭제하지 않았고 테스트-only 분모 수리와 source 변경을 구분했다.

```sh
node --experimental-test-coverage --test-coverage-include='src/grammar/trail*.js' --test-coverage-include='src/actions/charts/trail.js' --test-coverage-include='src/actions/marks/trail/index.js' --test-coverage-include='src/materialization/trail/plot.js' --test-coverage-include='src/materialization/selection/policies/trail.js' --test test/unit/grammar/trail.test.js test/unit/grammar/trail-curve.test.js test/unit/grammar/trail-series.test.js test/unit/grammar/trail-plot.test.js test/unit/trail-plot.test.js test/charts/trail/public.test.js
node scripts/run-tests.js realistic contracts/realistic-trail-plots.test.js
node --test test/charts/trail/png.render.js test/charts/trail/renderer.render.js test/contracts/trail-types.test.js
node --test test/browser/trail.browser.js
node --test test/contracts/source-boundaries.test.js test/contracts/package-boundaries.test.js test/contracts/test-discovery.test.js test/contracts/chart-vertical-slices.test.js test/contracts/action-catalog.test.js test/contracts/action-hierarchy-discovery.test.js
node --test test/contracts/nested-scale-role-contract.test.js test/contracts/generated-lifecycle-scenarios.test.js test/contracts/generated-scenario-feature-coverage.test.js
node --test --test-name-pattern='derives a bounded public option inventory' test/contracts/generated-scenario-feature-coverage.test.js
npm run contracts:catalog
npm run docs:generate
npm run docs:preflight
npm run test:docs
npm run docs:provenance
npm run docs:machine
npm run docs:llms
node --test test/docs/documentation-coverage.test.js test/docs/documentation.test.js
npm run docs:build
npm run test:docs:built
node scripts/package-artifact.js --pack
```

Built-site focused browser와 installed focused helper의 정확 실행 소스는 각각
`trail-focused-built.mjs.gz`, `qualify-trail-package.mjs.gz`에 보존했다.
Repository root의 `.artifacts/`에 원 basename으로 복원한 뒤 Node로 실행한다. 모든 library import는
canonical test/package-consumer owner를 사용하며 설치 consumer에는 source implementation을 복사하지 않는다.
같은 tar를 바꾸지 않고 Node22→20→24 순서로 `node .artifacts/qualify-trail-package.mjs`를 실행했다.
Node20/24의 archive 자체 크기 재측정과 동일 Node22 tar의 실행 증거는 서로 구분된다.

Jekyll 환경 PATH는 Ruby3.2/Homebrew gems와 Node22를 먼저 두었으며 `bundle exec jekyll`을 사용했다.
로컬 빌드·push만 수행했고 PR/배포/publish는 수행하지 않았다.

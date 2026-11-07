# 실행 명령

작업트리 `/Users/hyeonjeon/.codex/worktrees/roadmap9-data/ggactionnewbrand`에서 실행했다.

```sh
node --test test/unit/animation/*.test.js test/contracts/animation-types.test.js
node --experimental-test-coverage \
  --test-coverage-include=src/animation/planner.js \
  --test-coverage-include=src/animation/sample.js \
  --test-coverage-include=src/animation/frameEndpoint.js \
  --test-coverage-include=src/animation/frameProvenance.js \
  --test-coverage-include=src/animation/concrete.js \
  --test-coverage-include=src/animation/guideTracks.js \
  --test-coverage-include=src/grammar/animation/guideState.js \
  --test-coverage-include=src/materialization/animation/guides.js \
  --test test/unit/animation/*.test.js
node scripts/run-tests.js realistic test/contracts/realistic-guide-transitions.test.js
node --test test/charts/cross-feature-integration/variants/animation/guides.render.js
node --test test/browser/animation-guides.browser.js
node --test test/contracts/source-boundaries.test.js test/contracts/test-discovery.test.js \
  test/unit/support/test-sharding.test.js test/contracts/documentation-truth.test.js \
  test/contracts/animation-types.test.js test/unit/interaction-animation.test.js
node --test test/unit/animation/guide-transition.test.js \
  test/contracts/documentation-truth.test.js test/contracts/package-artifact.test.js
node scripts/package-artifact.js --pack
node .artifacts/qualify-guide-public.mjs .artifacts/guide-public-archive-path.json .artifacts/guide-public-installed-22.json
node scripts/run-tests.js docs
node --test test/docs/action-reference.test.js test/docs/documentation.test.js
```

설치는 고정 archive에서 Node20.20.2 / 22.23.1 / 24.22.1을 각각 PATH 선두에 둬 실행했다.
새 한도 검사는 원 archive의 여섯 entry 측정을 재사용했고, README-only 최종 archive는
모든 tar member의 SHA256를 비교했다. 최초 실패 로그를 성공 로그로 덮어쓰지 않았다.
소스 coverage와 현실 데이터 corpus는 별도로 실행했으며 critical floor는 canonical
`assertCriticalCoverage`를 사용했다. 전체 release sweep이나 STEP077 완료 검사는 아니다.

문서 source pin과 built 검증은 다음 순서로 실행했다.

```sh
node scripts/doc-provenance.js
node scripts/generate-doc-action-reference.js
node scripts/generate-doc-search-index.js
node scripts/generate-llm-docs.js
node --test test/docs/action-reference.test.js test/docs/documentation.test.js
bundle exec jekyll build --source docs --destination _site --baseurl /ggaction
node scripts/check-built-docs.js _site
node scripts/test-built-docs.js _site
```

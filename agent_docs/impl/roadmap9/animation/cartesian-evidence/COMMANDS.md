# 재현 명령

Repository root에서 실행한다. Node20/22/24는 해당 실행파일 디렉터리를 PATH 맨 앞에 둔다.
고정 archive를 한 번 만든 뒤 세 Node 모두 동일 경로를 소비하며 npm 재포장하지 않는다.

```sh
node --test --experimental-test-coverage \
  '--test-coverage-include=src/animation/*.js' \
  '--test-coverage-include=src/grammar/animation/*.js' \
  '--test-coverage-include=src/materialization/animation/*.js' \
  test/unit/animation/*.test.js
node scripts/run-tests.js realistic test/contracts/realistic-stream-baselines.test.js
node --test test/browser/animation-cartesian.browser.js \
  test/charts/cross-feature-integration/variants/animation/cartesian.render.js
node --test test/contracts/source-boundaries.test.js \
  test/contracts/package-artifact.test.js test/contracts/test-discovery.test.js \
  test/unit/actions/charts/bar-histogram-facades.test.js \
  test/unit/actions/charts/binned-bar-aggregate.test.js \
  test/unit/grammar/bars/bar-geometry.test.js
npm run test:docs
node --test test/docs/action-reference.test.js test/docs/documentation.test.js
node scripts/package-artifact.js --pack
cp agent_docs/impl/roadmap9/animation/cartesian-evidence/qualify-package.mjs.txt \
  .artifacts/qualify-cartesian-package.mjs
ANIMATION_PACKAGE_SPEC=/absolute/path/to/ggaction-2179358c355a2786344f5292bbc701bee209319dc2fd7134f2a0b4ad1b29656f.tgz \
  node .artifacts/qualify-cartesian-package.mjs
npm run docs:provenance
npm run docs:machine
npm run docs:llms
node --test test/docs/documentation-coverage.test.js
node --test --test-name-pattern="Basic Cartesian" test/unit/animation/cartesian-projection.test.js
npm run docs:build
node scripts/check-built-docs.js _site
node scripts/test-built-docs.js _site
```

Critical floors는 `scripts/coverage-policy.js`의 assertCriticalCoverage를 animation/, grammar/animation/,
materialization/animation/29개 소유 파일에 적용한다. 전체 source coverage로 집계하지 않는다.
Realistic runner 인자는 그 runner의 공개 CLI를 따르며 해당 파일만 선택한다.

문서 build는 Ruby3.2 + Jekyll을 사용했다. 설치 시 optional peer는 canvas1.0.9/SDK1.32.1이었다.
처음 잘못된 상대 staging 경로를 사용한 보조 repack은 실패했고, 후속 canonical createPackageArtifact의
outputDirectory에는 path.resolve로 만든 절대 경로를 사용했다.

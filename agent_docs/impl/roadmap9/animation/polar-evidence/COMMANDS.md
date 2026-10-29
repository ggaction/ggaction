# 재현 명령

Repository root에서 실행한다. Node20/22/24 실행파일 디렉터리를 PATH 맨 앞에 둔다.
고정 archive를 한 번 만든 뒤 모든 Node가 동일 경로를 소비한다.

```sh
node --experimental-test-coverage \
  '--test-coverage-include=src/animation/*.js' \
  '--test-coverage-include=src/grammar/animation/*.js' \
  '--test-coverage-include=src/materialization/animation/*.js' \
  --test test/unit/animation/*.test.js
node scripts/run-tests.js realistic test/contracts/realistic-polar-transitions.test.js
node --test test/browser/animation-polar.browser.js \
  test/charts/cross-feature-integration/variants/animation/polar.render.js
node --test test/contracts/source-boundaries.test.js \
  test/contracts/package-artifact.test.js test/contracts/test-discovery.test.js
npm run test:docs
node --test test/docs/action-reference.test.js test/docs/documentation.test.js \
  test/docs/documentation-coverage.test.js test/docs/architecture-paths.test.js \
  test/contracts/test-discovery.test.js
node scripts/package-artifact.js --pack
cp agent_docs/impl/roadmap9/animation/polar-evidence/qualify-package.mjs.txt \
  .artifacts/qualify-polar-package.mjs
ANIMATION_PACKAGE_SPEC=/absolute/path/to/ggaction-0c32e2530889c607f993f1d06da9b9b87475b0287962ceee54c146c441ae63f3.tgz \
  node .artifacts/qualify-polar-package.mjs
npm run docs:provenance
npm run docs:machine
npm run docs:llms
node --test test/docs/documentation-coverage.test.js
npm run docs:build
node scripts/check-built-docs.js _site
node scripts/test-built-docs.js _site
```

32개 animation/grammar/animation/materialization/animation owner의 coverage는 기존
`scripts/coverage-policy.js`의 `assertCriticalCoverage`로95/90/100을 적용한다.
전체 source coverage 또는 전수 installed sweep으로 집계하지 않는다. 첫 bundle 실측은
`ANIMATION_MEASURE_BUNDLES=1`로 수행한 후 같은 receipt에 최종 상한을 assertion했다.

상한 갱신 전 pack 실측은 canonical `scripts/package-artifact.js`를 `.artifacts/`에 임시 복사한 뒤
상대 import/root 경로만 동일 repository로 정정하고 private `runPack`을 export하여 실행했다.
최종 artifact는 수정 없는 canonical `createPackageArtifact`로 생성했다. Source pin 후 재포장은
절대 outputDirectory를 사용했고 설치 archive와 SHA256 동일성을 검사했다.

문서 build는 Ruby3.2/Jekyll, Node22.23.1을 사용했다. Optional peers는 canvas1.0.9/SDK1.32.1이다.

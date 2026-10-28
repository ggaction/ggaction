# Private graph 계산 통합

`codex/roadmap9-integration`의 image/paint/conditional 기반 `e3381dae`에 graph metrics·neighbors·MST·own-options `b1544b7c`를 통합했다. `core/immutable.js`와 그 회귀 test는 이미 image 통합에서 동일 bytes로 들어 있어 중복 patch가 없다. main과 공개 API·저장 schema·renderer는 변경하지 않는다.

Architecture와 critical coverage 충돌은 두 책임을 모두 보존했다. Graph의 여섯 계산 owner는 기존 image/font/conditional/paint owner와 별개 private pure kernel이다. 생성 문서는 canonical generator로 재생성한다. 실제 크기는 728 entries, unpacked 4,995,960 bytes, packed Node22 1,079,765 / Node20·24 1,081,878 bytes다. 한도는 728 / 1,082,000 / 4,996,000이다.

Node20·22·24 핵심 43/43과 graph 6파일 각각 line/branch/function 100/100/100%를 확인했다. Source/package/discovery 경계33/33, package artifact7/7, critical coverage policy7/7, docs166/166을 확인한다. 전역 coverage나 realistic sweep, 새로운 설치 consumer 검증을 주장하지 않는다. 이전 public import graph에는 변경이 없으며 이번 package 검증은 추가 private 파일과 명시 export 경계를 확인한다.

```sh
node --experimental-test-coverage '--test-coverage-include=src/grammar/graph/*.js' --test test/unit/grammar/graph/*.test.js test/unit/immutable-calculation-reuse.test.js
npx --yes --package=node@20 -- node scripts/run-tests.js unit unit/grammar/graph unit/immutable-calculation-reuse.test.js
npx --yes --package=node@24 -- node scripts/run-tests.js unit unit/grammar/graph unit/immutable-calculation-reuse.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js
node scripts/run-tests.js unit unit/support/coverage-policy.test.js
npm run docs:generate
node scripts/run-tests.js docs
node scripts/package-artifact.js --check
npx --yes --package=node@20 -- node scripts/package-artifact.js --check
npx --yes --package=node@24 -- node scripts/package-artifact.js --check
```

[정확한 revision·입력·원 로그·패키지](integration-evidence/manifest.json)를 보존한다. 다음 hierarchy/observed graph/fixed-circular 통합은 별도 checkpoint이며 H public API 승인 경계와 STEP029–031 이후의 domain/resource/consumer 통합 의무는 그대로다.

# 검증 재현

Source commit은 qualification.json에 고정했다. 모든 명령은 checkout root에서 Node22.23.1로 실행했다.
Node20.20.2/24.22.1은 해당 bin directory를 PATH 앞에 붙여 npm child도 같은 runtime을 사용했다.

```sh
node --test test/unit/grammar/selection-set.test.js test/unit/actions/selection/logical-item-selection.test.js
node --test --experimental-test-coverage --test-coverage-include=src/actions/selection/actions.js test/unit/actions/selection/*.test.js test/unit/actions/marks/rect-mark.test.js test/unit/actions/marks/polygon-point-shapes.test.js test/unit/actions/theme.test.js test/unit/actions/conditional-encoding.test.js test/unit/actions/data/row-identity.test.js
GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=/path/to/pinned/tidytuesday node --max-old-space-size=512 --test --test-concurrency=2 test/realistic/realistic-logical-selection.test.js
npm run docs:generate
node scripts/run-tests.js docs
npm run docs:preflight
npm run docs:build
npm run test:docs:built
npm run package:check
```

설치·page-specific browser helper는 압축한 정확한 실행 소스를 보존했다. `.artifacts/selection-items-consumer-check.mjs`와
`.artifacts/selection-items-doc-browser.mjs`로 복원하면 상대 import가 원래 checkout scripts를 가리킨다.
설치 helper의 `.artifacts/selection-items-fixed.json`은 canonical createPackageArtifact 결과다. 동일 tar를 세 runtime에서 반복 사용했다.
실행 2개와 strict 타입은 세 runtime에서 모두 통과했다. 처음 20/24 process의 exit1은 끝의 bundle cap assertion만 실패했으며
bundle-final.json은 동일 측정 12개를 최종 limit에 다시 assert한 결과다. Runtime 통과와 전체 process의 초기 실패를 구분한다.

문서 browser는 수정한 한 페이지의 네 폭만 검사했다. 전체 docs UI는 직전 121acb6c6의 전수 evidence를 재사용하며
이번에 source coverage 전체 또는 설치 전체 sweep을 실행한 것으로 확대하지 않는다.

# 현재 graph 드래그 검증

Source: `4e26d4cb41c6b634e4351a6538b4814f22bbb40b`. 로그의 최초 실패는 삭제하지 않았다.
`summary.json`은 원본 실패와 수정 후 owning 검사를 구분한다. 전체 unit/coverage가 모두 성공했다고 주장하지 않는다.

```sh
node --test test/unit/animation/graph-drag.test.js test/unit/animation/graph-presentation.test.js test/unit/interaction-animation.test.js
node --test test/contracts/source-boundaries.test.js test/contracts/interaction-types.test.js test/contracts/test-discovery.test.js test/unit/support/test-sharding.test.js
GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=<prepared-cache> node scripts/run-tests.js realistic contracts/realistic-graph-drag.test.js
node --test --test-name-pattern='current routed graph drag' test/browser/interaction-animation.browser.js
node --test --test-name-pattern='canonical asset resolver|canonical preview asset rendering' test/browser/interaction-session.browser.js
node scripts/run-tests.js docs
```

설치 runner는 `qualify-graph-drag.mjs.gz`를 repository `.artifacts/qualify-graph-drag.mjs`로 풀어 실행한다.
동일 archive를 `ANIMATION_PACKAGE_SPEC`에 명시하고 각 Node의 bin을 PATH 앞에 둔다. Node22에는
`SESSION_FRAME_BROWSER=1`을 추가한다. 이 fixture는 public package만 import하고 저장소 src를 소비하지 않는다.
정확 archive는 summary의 SHA256 및 `archive-files.json.gz`의 전체 파일 해시로 식별한다.
Node22 마지막 재pack은 설치 archive와 byte-identical인지 따로 확인하며 새 설치 증거로 혼동하지 않는다.

문서는 Ruby3.2/Bundler가 resolve되는 PATH에서 docs:preflight → docs:build → test:docs:built → test:docs:browser를 실행한다.
Coverage 수치는 원635개의9owners와 별도129개native-layout owner에서 얻었다. 기존 일반 grammar/hit/animation floor는 낮추지 않았다.

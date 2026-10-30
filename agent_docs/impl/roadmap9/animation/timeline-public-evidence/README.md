# 공개 keyframe·marker 검증

기존 남은 범위 승인을 재사용한 native timeline 연결이다. 정확한 공개 계약은 Current ANIMATION, source/archive/성공 종료 수치는 qualification.json이 소유한다. 전체 STEP077 완료를 뜻하지 않는다.

## 재현

Repository root에서 Node20/22/24 각각 다음 source 검사를 실행한다.

```sh
node scripts/run-tests.js unit unit/animation/ unit/interaction-animation.test.js
node scripts/run-tests.js contracts contracts/animation-types.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js contracts/source-boundaries.test.js contracts/input-boundaries.test.js contracts/test-discovery.test.js
node scripts/run-tests.js render charts/cross-feature-integration/variants/animation/timeline.render.js
node scripts/run-tests.js browser browser/animation-timeline.browser.js
```

실제 자료는 정본 cache를 read-only로 `GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT`에 지정하고 canonical realistic runner로 guide/polar/geographic/graph-drag/animation-timeline 다섯 파일을 선택한다. 새 timeline5개는 기존 원단위·원행 cohort를 유지하며 공개 decision의 opaque ownerKey를 사용한다. 점/축의 다른 시각을 viewport 산식으로 독립 검산한다.

`pack.mjs <absolute-output-directory>`는 canonical staging으로 새 archive를 만든다. 결과 JSON을 `installed.mjs <artifact-json> <report-json>`에 전달하면 source-free consumer에서31개 공개 runtime 사례, strict declarations, 실제 문서 예제, optional peers와6browser entry를 실행한다. 같은 archive를3Node에 재사용한다. 최초 설치 명령은 runtime/types/doc 통과 뒤 옛 bundle 상한에서 실패했다. `reassert-bundles.mjs <artifact-json> <node20-report> <node22-report> <node24-report> <output-json>`는 그18개 실제 측정과 새 최소 한도를 대조하며 원본 실패를 성공으로 다시 쓰지 않는다.

## 증거 해석

`audit-*.mjs`는 독립 검토의 실행 재현이다. 최초 실패 로그와 수정 뒤 같은 입력의 결과를 같이 보존했다. `timeline-public-*.gz`는 source/coverage/package/render/browser/docs의 실제 로그다. 마지막44개 inherited getter 회귀와5개 opaque-selector source witness는 정상 suite에 편입했다. Source hash/정확 archive가 다른 과거 기록은 이 후보의 결과로 합산하지 않는다. 최종 AT60·전체 matrix·release/publish는 이 checkpoint의 범위가 아니다.

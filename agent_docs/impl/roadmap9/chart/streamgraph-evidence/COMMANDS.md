# Moving Area baseline 재현

Source는 summary.json의 고정 commit이다. 승인 근거는 ../../AUTHORIZATION.json의 remainingApproval이다. 새로운 API나 renderer primitive 없이 기존 Area placement만 확장했다. STEP050 및 전체 STEP054/074 완료를 의미하지 않는다.

```sh
sh .artifacts/streamgraph-critical-command.sh
node scripts/run-tests.js realistic contracts/realistic-stream-baselines.test.js
node scripts/run-tests.js render chart:streamgraph
node scripts/run-tests.js browser browser/streamgraph.browser.js
node --test test/contracts/source-boundaries.test.js test/contracts/package-boundaries.test.js test/contracts/package-artifact.test.js test/contracts/chart-vertical-slices.test.js test/contracts/area-endpoint-types.test.js
node --test test/contracts/generated-scenario-feature-coverage.test.js
node --test test/unit/core/vocabulary.test.js test/unit/actions/primitives/series-policy-state.test.js test/unit/actions/primitives/semantic-value-validation.test.js
npm run docs:generate
npm run test:docs
npm run docs:build
npm run test:docs:built
node .artifacts/streamgraph-focused-built.mjs _site
node scripts/package-artifact.js --pack
node .artifacts/qualify-streamgraph-package.mjs
```

critical command와 installed/built helper의 실행 소스는 같은 이름의 gzip으로 보존한다. Repository root의 `.artifacts/`에 원래 basename으로 복원한다. 설치 helper는 canonical preparePackageConsumer를 사용하며 implementation source를 설치 소비자에 복사하지 않는다. 같은 archive를 그대로 두고 PATH의 Node22→20→24로 순차 실행했다. Node20/24 package dry-run의 크기와 같은 Node22 tar 소비의 hash는 별도 증거다.

Jekyll은 기존 Ruby3.2/Homebrew gems와 Node22 PATH, `bundle exec jekyll`로 빌드했다. built browser helper는 공통 site controls와 변경된 Area layout/series color 두 페이지의 320/390/768px 배치를 확인한다. 최초 로그의 출력 라벨만 이전 Trail에서 남았고 실제 실행 selector는 두 변경 페이지다. 수정된 helper의 실행 내용은 selector가 동일하다.

## 소비자 경계

| 계약 | 실제 증거 |
|---|---|
| 값·group·missing·zero·overflow | independent literal/weighted minimum/thickness/shared boundary kernel |
| immutable state·first layout child | invalid mode/topology/domain rejection, old serialized program equality |
| raw/density materialization·domain | shared bounds, explicit domain guard, temporal x, symlog |
| revise/layout switch/Canvas/scales | stable keys, revised values, actual changed paths |
| selection/highlight/hit | Area series grain, selected identity and actual hit |
| nested/facet | scoped layout switch and source grouping |
| persistence/scene/offline | editable and graphic codecs, fresh process with network disabled, Canvas scene |
| static outputs | same primitive/public Canvas calls, SVG, decoded PNG and PDF pixels; real browser DPR1/2 |
| public/package/docs | Full only, Basic/bar rejection, strict declarations, 3 Node source-free consumers, displayed example |

새 기본 도형이 없으므로 renderer schema/asset codec/renderer fetch 연결은 적용 대상이 아니다. 실제 5개 source table의 한 관측값씩을 사용한 15개 recipe는 stack/center/wiggle 수치 의미를 확인한다. 다중 series 최소화는 별도 독립 literal로 검증하며 실제 데이터에 가상 series를 합성하지 않았다. 전체 현실 corpus와 전체 source coverage를 반복 실행하지 않았으며 STEP074의 누적 검증 의무는 유지한다.

최초 실패 로그를 보존한다: ULP 엄격 동등 비교, primitive wrapper의 불필요한 Canvas save/restore와 잘못된 path items 입력, browser selector, 기존 native vocabulary/discovery 분모, 문서 링크·치수·코드 등록·source pin이다. 범위를 줄이거나 renderer 차이 허용치를 확대하지 않았다.

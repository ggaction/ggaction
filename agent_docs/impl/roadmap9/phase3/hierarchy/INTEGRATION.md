# Hierarchy와 공통 graph model 통합

`codex/roadmap9-integration`의 graph metric checkpoint `596cb008`에 hierarchy/observed graph/fixed-circular `5757e83e`를 별도 단계로 통합했다. main은 변경하지 않는다. H public API와 graph resource/action/renderer 연결은 승인 전까지 구현하지 않는다.

Runtime 충돌은 없었다. 기존 image/paint/conditional/graph critical families를 보존하고 hierarchy family를 더했다. 같은 `grammar/graph/` prefix는 중복 없이 하나의95/90/100 floor로 metrics·topology·layout을 함께 검사한다. 공통 immutable patch는 이미 동일하게 존재했다. `numeric.js`의 compensated 선택 인자는 명시 hierarchy 계산에만 적용되며, 기본 호출의 기존 유한 누적 의미를 유지한다.

## 교차 검증

`test/unit/grammar/graph/metric-layout.test.js`는 raw typed key(number/string/tuple/date)로 이웃 및 MST를 계산하고, 반환된 opaque key를 다시 인코딩하지 않은 채 공통 graph model과 fixed/circular layout에 전달한다. Source provenance는 test가 명시하며 production adapter를 추가하지 않는다. Edge weight1/2/7, stable identity, adjacency, input-order fixed 좌표와 literal circle 좌표를 검증한다.

Node20·22·24에서 핵심134/134, 기존 window·normalize·arc·quadratic 계산을 포함한 default numeric 회귀29/29가 통과했다. Graph9파일 각각100/100/100%, hierarchy7파일 line/function100%, branch는 partition94.44/treemap97.53/나머지100%로 모든 family floor를 통과했다. 독립 fixture는 hierarchy19, observed graph2, graph layout3개다.

기존 tree/treemap primitive5개의 source/trace/PNG를 재현했다. Primitive 계약7/7과 render5/5이며 새로운 시각 target이나 승인으로 취급하지 않는다. 원 approval/public design 기록을 그대로 보존한다.

## 패키지와 재실행

738 entries, unpacked5,053,657bytes, packed Node22 1,094,753 / Node20·24 1,097,419bytes를 측정했다. 최소1,000byte 올림으로 caps738/1,098,000/5,054,000을 적용했다. Source/package/discovery33/33, package/discovery 재검증23/23, critical coverage 정책7/7, docs166/166이 통과했다. 같은 Node20 artifact에서 설치 Node199/199 및 qualification7/7을 확인했다. Full/Basic/SVG gzip534,736/312,639/8,166bytes로 기존 한도를 유지한다.

```sh
node --experimental-test-coverage '--test-coverage-include=src/grammar/graph/*.js' '--test-coverage-include=src/grammar/hierarchy/*.js' --test test/unit/grammar/hierarchy-*.test.js test/unit/grammar/graph-*.test.js test/unit/grammar/graph/*.test.js test/unit/grammar/numeric-sums.test.js test/unit/immutable-calculation-reuse.test.js
npx --yes --package=node@20 -- node --test test/unit/grammar/hierarchy-*.test.js test/unit/grammar/graph-*.test.js test/unit/grammar/graph/*.test.js test/unit/grammar/numeric-sums.test.js test/unit/immutable-calculation-reuse.test.js
npx --yes --package=node@24 -- node --test test/unit/grammar/hierarchy-*.test.js test/unit/grammar/graph-*.test.js test/unit/grammar/graph/*.test.js test/unit/grammar/numeric-sums.test.js test/unit/immutable-calculation-reuse.test.js
node scripts/check-hierarchy-fixtures.js
node scripts/check-graph-fixtures.js
node scripts/check-graph-layout-fixtures.js
node scripts/run-tests.js gates gates/tree-layouts gates/treemap-layouts
node scripts/run-tests.js render gates/tree-layouts gates/treemap-layouts
node scripts/check-hierarchy-primitives.js
npm run docs:generate
node scripts/run-tests.js docs
node scripts/package-artifact.js --check
node scripts/package-consumer.js /absolute/path/to/ggaction-0.0.26.tgz
```

정확한 source revision·hash·원 로그·독립 expected/actual와 package 정보는 [manifest](integration-evidence/manifest.json)에 고정한다. 전체 coverage/realistic·H public consumer·STEP021–031 및 Roadmap77 완료를 주장하지 않는다. Force/component packing과 domain resource·revision·codec·inspection·selection/renderer 통합은 여전히 후행 의무다.

최종 source는 `dfa492dabf18a779271466a952c0ce04fde0f14e`이며, 그 revision으로 numeric/primitive receipt와 docs166/166을 다시 고정했다. 이후 변경은 생성 문서와 검증 기록뿐이므로 위 설치 검증의 정확한 tarball을 재사용한다.

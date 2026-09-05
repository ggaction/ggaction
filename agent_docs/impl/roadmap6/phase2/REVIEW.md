# R6-P2-X — Shared authoring semantics 결과 검토

상태: **ready-for-review, 미승인**. 사용자가 승인한 A/B/V 범위의 W1–W5 구현과 여섯 public 시각 흐름을
검증했다. 이 문서는 Phase 2 결과의 승인 대상이며 Phase 3 구현은 아직 시작하지 않았다.

## 검증한 코드

- Source commit: [`3a4ca3b59cd604cd2456b2d196e3edd73d24e303`](https://github.com/ggaction/ggaction/commit/3a4ca3b59cd604cd2456b2d196e3edd73d24e303); source tree: `9d3bd5e26b67634851e6009faac4b8c7c9e15002`.
- Remote branch: `origin/codex/roadmap6-hierarchical-actions`. 정확한 검토 package ref는 [GATES.md](GATES.md)에 기록한다.
- A 승인: `e06b57db5624a5b0d66cea425cff4aa5f5f4caad`의 계약에 대한 “ㄱㄱ”.
- B 승인: `ca820fa941f4359e814ee6f65a01e574512f5c08`의 full 235,000-byte 제안에 대한 “조정한다”.
- V 승인: 같은 review package의 여섯 target에 대한 “승인한다”. 승인 기록을 먼저 저장하고 구현했다.
- [승인 계약](CONTRACT_REVIEW.md), [작업별 결과와 초기 실패 기록](RESULTS.md), [진행 상태](STEP1.md),
  [전체 항목 원장](../TRACEABILITY.md)이 범위·검증·남은 작업을 연결한다.

## 완성한 계층과 의미

| 범위 | 사용자가 얻는 결과 | 책임을 가진 하위 계층 |
| --- | --- | --- |
| W1 — Guide 재사용 | Facade를 겹쳐도 호환 축·grid·legend를 재사용하고 빠진 부분만 만든다. 명시적 충돌은 오류다. | 공통 guide 확보 → 기존 component actions → concrete graphics |
| W2 — Series identity | 나라별 선을 만들면서 대륙별 색을 사용할 수 있다. 여러 field의 tuple도 하나의 group identity다. | `encodeGroup` → path partition → appearance의 final-series 값 검증 |
| W3 — Style | Line field/constant width·opacity, Scatter radius, Rule create/edit, ErrorBand fill 해제와 field 충돌이 일관된 규칙을 따른다. | 기존 scalar/field encoder와 각 resource editor |
| W4 — 명시적 inference | Temporal raw 숫자의 year/timestamp 의미를 지정하고 grouping inference를 JSON의 false로 해제할 수 있다. | temporal field reader → scale/geometry/guide/selection; 기존 analytic group owner |
| W5 — 미완성 Bar 작성 | Width와 measure를 category보다 먼저 지정해도 유효한 intent가 유지되고 완성 시 같은 차트가 된다. | Bar position/width policy → 기존 encoding child → materialization |

상위 액션이 별도의 계산 결과나 컴파일 상태를 만들지 않는다. `semanticSpec`은 의미, `graphicSpec`은
완성된 출력이며 renderer는 graphics만 읽는다. 변경한 state와 입력 배열은 기존 program과 분리된다.
서로 다른 작성 순서는 최종 의미·geometry로 비교하고 실제 child trace는 별도로 검사한다.

## 실제 public 호출과 시각 결과

실행 가능한 전체 코드는 [series program](../../../../examples/series-identity/program.js)과
[temporal program](../../../../examples/temporal-input/program.js)에 있다. 각각의 data.js와 manifest가
정확한 데이터·variant·치수·표시 호출을 소유하며, 표시한 호출은 실제 top-level trace와 일치한다.

| Variant | 검증한 의미 |
| --- | --- |
| country-color | 나라 4개 = 4 paths, 대륙 2개 = 2 colors |
| tuple-color-dash | 나라 × 시나리오 = 8 paths, observed/projection을 실선/점선으로 표현 |
| series-appearance | 같은 4 paths에 width 2/4/6/8, opacity .25/.5/.75/1 적용 |
| timestamp | 원본 1000/2000 → domain [1000,2000], 1초 차이 |
| year | 같은 원본 → UTC 1000/2000년 1월 1일, 1000년 차이 |
| auto | 기존 네 자리 숫자의 연도 해석 유지, year와 같은 domain |

[시각 검토](VISUAL_REVIEW.md), [쌍별 hash·source·ink 증거](public-visual-results.json),
[나란히 비교하는 화면](../../../../.artifacts/roadmap6-authoring/visual-review.html)을 제공한다.
여섯 쌍 모두 같은 실행의 **exact graphicSpec, draw order, Canvas 호출, decoded pixels**가 일치한다.
Plot 영역의 ink와 원본 rows, normalized domain, grouping cardinality는 별도 oracle로 검사했다.
현재 stable slice는 `test/charts/series-identity/`, `test/charts/temporal-input/`이며 Gate 실행 경로는 제거했다.

## 호환성과 의도적으로 유지한 한계

- 기존 implicit color/dash grouping, numeric nominal color, Bar mean, scale 기본값은 유지한다.
  Explicit group 안에서 appearance 값이 둘 이상이면 임의로 첫 값을 고르지 않고 오류로 거부한다.
- Line field appearance를 scalar editor로 덮어쓰지 않는다. `encodeStrokeWidth({ value })` 또는
  `encodeOpacity({ value })`로 assignment를 교체하면 해당 field·own legend를 정리하고 다른 scale consumer는 유지한다.
- ErrorBand는 color 제거 뒤 constant fill을 지정하고 `editErrorBand({ fill:false })`로 override를 해제한다.
  Field color와 constant fill을 동시에 활성화하는 양방향 호출은 오류다. Rule의 잘못된 여러 style은 적용 전에 거부한다.
- `temporalUnit`은 기존 temporal channel만 지원한다. 같은 binding에 생략하면 저장 단위를 보존하고,
  다른 field나 datum으로 전환하면 이전 단위를 제거한다. Domain/ticks는 항상 normalized timestamps다.
  Area의 미지원 temporal range나 새로운 temporal 채널을 타입만으로 열지 않았다.
- Regression create의 생략은 기존 inference, 명시적 undefined는 기존 JS opt-out, false는 JSON opt-out이다.
  Density/Horizon도 각자의 기존 omission 의미를 유지한다. Editor는 omission 보존·false 해제·string 교체·undefined 오류다.
- Facade guide는 자신의 coordinate/layer에 한정된다. Cartesian의 Polar guide, Line의 swatch shorthand,
  Box owned legend, Histogram/Violin gradient legend처럼 runtime이 지원하지 않는 선언을 제거했다.
  다른 layer의 guide는 기존 lower action으로 작성한다. 기존 fixture의 foreign legend 증거도 실제 owned guide로 교체했다.
- Basic은 기존 public 범위를 유지한다. 이번 작업의 Rule editor나 일반 opacity action을 Basic에 추가하지 않았다.
  `createCanvas()`의 생략된 margin 기본값과 radius alias의 실제 child 등록은 수정했다.

## 실행한 검증

환경: Node 22.23.1, npm 10.9.8, macOS arm64. Temp/cache/browser는 이 repository의 `.artifacts/repository-study/` 아래를 사용했다.

| 검증 | 실제 결과 |
| --- | --- |
| `npm test` | 2,432/2,432, 실패·skip 0 |
| `npm run test:contracts` | 260/260 |
| `npm run test:realistic` | 167/167, 실패·skip 0 |
| `npm run test:coverage` | lines 95.03%, branches 91.15%, functions 98.75%; critical floors 72/72 |
| 대표 9개 chart slice render | 22/22, 같은 실행의 primitive/public parity |
| 두 public example의 실제 Chromium 실행 | 2/2 |
| `npm run test:package` | exit 0: installed Node/Basic/MCP, strict TS positive/negative, tutorials, renderers, private exports, Vite |
| Current/catalog/cards/generated 문서 검사 | normal/contracts에 포함; active Planned 0 |

Cartesian 720개와 statistical 460개 차트에 새 옵션과 owned guide를 적용해 실제 root trace·graphics·SVG를 검사했다.
Assigned option/literal coverage의 5회·3개 dataset 기준을 낮추지 않았다. Statistical 과거 audit snapshot은
이 checkout에 없어 그 snapshot의 미충족 ID 집합과의 선택적 비교는 실행되지 않았다. 현재 코드의 시나리오 생성,
root evidence, variant 차이, coverage capacity/diversity, 기존 scale surface 검사는 모두 실행했다.

로그는 `.artifacts/roadmap6-authoring/phase2-final-{all,contracts,realistic,coverage,render,browser,package}.log`다.
로그·HTML·PNG는 gitignored이며 재현 source와 수치 증거는 repository에 포함한다. 과거 W2/W3의 Basic
크기 실패 기록은 보존했으며 최종 package 결과와 구별한다.

| 엔트리 | 최종 gzip bytes | 승인 상한 | 남은 bytes |
| --- | ---: | ---: | ---: |
| ggaction | 234,258 | 235,000 | 742 |
| ggaction/basic | 124,897 | 125,000 | 103 |
| ggaction/svg | 6,418 | 25,000 | 18,582 |

Basic 크기 문제는 미사용 full-only action factory 제거와 shared reader 정리로 해결했다. Full/Basic의
여유가 작으므로 후속 변경은 같은 installed-bundle gate를 계속 통과해야 한다. 상한을 더 올리지 않았다.
검증 tarball SHA-256은 `f7c6f0e0f18140b237970a965148ba326034779c693991635e134aadfa1c8108`다.
이 artifact는 로컬 설치 검증용이며 registry publish를 실행한 기록은 아니다.

## 재현 명령

위 source commit으로 checkout하고 아래 경로를 준비한다. Playwright Chromium 설치도 이 repository 안에 둔다. 전체 검증과 시각 package 생성은 다음과 같다.

```sh
mkdir -p .artifacts/repository-study/tmp .artifacts/repository-study/npm-cache
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"
npm ci
npx playwright install chromium
npm test
npm run test:contracts
npm run test:realistic
npm run test:coverage
npm run test:package
node scripts/run-tests.js render \
  chart:series-identity chart:temporal-input chart:gapminder-horizon \
  chart:time-unit-data chart:cars-temporal-bar-line chart:mark-selection-lines \
  chart:gapminder-error-band chart:cars-error-bar chart:cars-parallel-coordinates
node --test --test-name-pattern='renders (series-identity|temporal-input)' \
  test/browser/public-examples.browser.js
node agent_docs/impl/roadmap6/phase2/render-review.mjs
```

시각 생성기는 executable source가 commit된 상태만 허용하며 생성 당시 commit, source tree, input/source/call/PNG/pixel hash를 기록한다.
PNG의 native text 차이는 환경에 영향을 받으므로 frozen 타 환경 PNG가 아니라 같은 실행의 두 결과를 비교한다.

## 처분과 다음 경계

- Phase 2 범위의 B01, D02, D05, D06, D09, D10은 구현·검증했다. Direct catalog 174개는 모두 Current이며
  Phase 2의 active Planned entry는 없다. Source schema API는 승인된 범위에서 제외된 상태다.
- D04의 deferred metadata/guide 부분은 완료했지만 Phase 11 전수 metadata audit는 남는다.
- D14의 incomplete Bar 부분은 완료했지만 Phase 4의 Polar/category ordering은 남는다.
- D03의 여러 grouped Bar가 scale을 공유할 때의 grain/layout 전환, D08의 interval/edge legend 확장,
  D20의 전체 discovery schema는 각각 지정된 후속 owner에 남는다. 이 Phase에서 항목 전체를 닫지 않는다.
- F01–F19의 새 chart/authoring action군과 Phase 3 이후 구현은 아직 별도 Gate를 따른다. F20은 계속 제외한다.
- X 승인 후 Phase 3의 계약 검토 package를 준비한다. 후속 API·시각 target을 자동 승인하지 않는다.

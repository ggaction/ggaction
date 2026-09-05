# Phase 2 구현 결과

Phase 전체의 A/B/V는 승인되었다. X는 아직 승인되지 않았다. 아래 W별 초기 실행 기록을 보존하며,
가장 최근 source의 누적 검증과 package 상태는 마지막 통합 검증 기록을 따른다.

## W5 — Bar incomplete authoring

- 기준 commit: `48d6876c` (A 승인·Planned 등록). B01의 남은 lower measure-first와 D14의 Bar 순서 제약을 교정했다.
- 위치 없는 ordinary Bar에 width를 지정하면 기존 barWidth config만 저장한다. Measure를 먼저 지정하면
  유효한 field/type/scale과 명시적 집계/stack만 저장하며, 생략한 aggregate/stack을 위장하지 않는다.
- 반대 위치가 완성될 때 같은 Bar policy가 pending measure를 해석하고 기존 wrapped encodeX/Y를 호출한다.
  Category pair는 mean/null, 같은 field의 histogram pair는 count/zero다. 명시적 집계·stack·scale은 보존한다.
  별도 pending flag나 compiler queue는 없다. Scale zero의 자동 선택도 role이 정해질 때 수행한다.
- Missing field와 잘못된 값/width는 미완성 상태에서도 즉시 거부한다. Width가 저장된 Bar를 histogram으로
  완성하는 것은 거부한다. 완성된 histogram의 기존 atomic field 재할당은 유지한다.
- Box는 기존 전용 width owner와 pending range 검사를 보존한다. `createBoxPlot({ width })`로 미완성 Box의
  폭을 지정하며 lower encodeBarWidth는 range 완성 후에 사용한다. Box에 mean aggregate를 삽입하지 않는다.
- 여섯 순서 × 두 방향 × 세 category type × band/pixel 두 mode = 72개 조합의 최종 semantic 의미,
  graphicSpec, resolved scales, mark config가 기존 category-first lower chain과 같다. Resize도 동일하다.
  별도로 explicit aggregate/stack/zero 18개 조합, histogram 6개 조합, invalid input·trace 불변성,
  grouped width 및 remove/recover를 검증한다.
- 기존 의미 보존 교정이므로 W5의 V는 N/A다. 기존 horizontal grouped Bar와 temporal Bar/Line의
  primitive/public PNG 2/2가 같은 실행의 decoded pixel parity를 통과했다. V1/V2의 승인을 대신하지 않는다.
- Current ENCODINGS, 공개 position/appearance/reference, action cards·검색·LLM artifacts를 동기화했다.
  Planned의 incomplete-bar-authoring entry는 제거했고 새 public signature는 없다.
- 검증: 최종 `npm test` 2,341/2,341, focused Bar 121/121, Box 관련 35/35, contracts 259/259,
  installed package exit 0. Representative render 2/2. 실제 실행은 모두 exit 0이다.
- 실행 로그: `.artifacts/roadmap6-authoring/bar-{all,regression-test,box-test,contracts,package,render}.log`.
- 처분: B01 구현·검증 완료. D14는 이 부분만 완료하며 Phase 4 W4의 Polar/category ordering을 남긴다.
  Phase 2 전체의 X 승인·완료는 아직 요청하지 않는다.

## W1 — Facade guide reuse

- 기준 commit: `c6bc6dcd` (W5 완료). Scatter/Line/Bar/Histogram/Heatmap/Parallel/Violin 및 deferred
  Box/Gradient의 위치 완성에서 공통 guide 확보를 연결했다. Omission과 `{}`는 owner의 호환 guide를
  재사용하고 빠진 component만 기존 wrapped child로 생성한다. `false`는 기존 guide를 삭제하지 않는다.
- Scale ID와 coordinate ID, axis의 각 component, grid config, legend의 family/channel/domain/order 및
  symbol recipe를 검사한다. 자동 기본값은 기존 title·배치·style을 덮어쓰지 않는다. 명시적 충돌은
  구체적 오류로 거부하고 이전 program과 trace는 변하지 않는다. Low-level create의 strictness는 유지한다.
- Guide 추론은 새 facade의 소유 layer에 한정한다. 부분 축의 위치와 ticks/labels mode를 보존하고,
  legacy coordinate는 유일하게 결정될 때만 저장한다. 동일 histogram 경계를 공유하는 소비자는
  공통 ticks를 사용할 수 있으며 서로 다른 경계는 여전히 거부한다.
- Box/Gradient의 deferred geometry·guide 완료 조건을 Current와 action card의 summary, prerequisite,
  call pattern에 명시했다. Generated catalog/reference/search/LLM artifacts도 동기화했다.
- 기존 lower guide-false chain 및 부분 component 명시 chain과 최종 semanticSpec, graphicSpec,
  resolved scales, guide configs를 비교했다. 대표 기존 차트 19개 variant의 같은 실행 primitive/public
  decoded pixels가 일치했다. 따라서 이 교정의 V는 N/A이며 새 V1/V2를 승인한 것은 아니다.
- 범위의 한계: 서로 다른 Parallel dimension scale과 Gradient density legend owner는 공유 불가다.
  Grouped Bar 둘이 동일 y를 공유할 때 두 번째 Bar가 color 전에 position을 작성하여 생기는 기존
  layout-policy 충돌은 `guides:false`에서도 발생한다. W1 guide 재사용으로 이를 해결했다고 하지 않는다.
  이 grain/layout owner는 D03의 Phase 4 작업에 남긴다. Derived facade의 기존 source 추론도 유지한다.
- W1 checkpoint 검증: 전체 tests **2,371/2,371**, guide owners 집중 **291/291**, cards/catalog/navigation
  **22/22**, 대표 PNG **19/19**. 당시 installed package는 full gzip **231,731 > 230,000**으로 **exit 1**이었다.
  Basic **124,174 / 125,000**, SVG **6,418 / 25,000**. [예산 결정안](BUNDLE_REVIEW.md)을 분리했다.
- 이 checkpoint의 처분: [B 승인·적용 뒤 installed package 검증](#b--browser-bundle-budget-acceptance)이 **exit 0**으로
  통과하여 W1과 D05를 implemented-verified로 기록했다. D04의 Box/Gradient metadata 교정도 반영했지만
  Phase 11 전수 metadata 검사는 남아 있다. 새 public series/appearance/temporal flow는 아직 구현하지 않았다.

## V1 / V2 — Primitive review package

- Runtime 기준: `4355af45` (W1 checkpoint); runtime source tree `f85fa1f71e28364c5d6b6998dcb9410334935219`.
- Series identity 세 variant와 temporal input 세 variant의 실행 source·독립 references·단일 manifests·
  input hashes·normal/render tests를 `test/gates/`에 준비했다. 현재 활성 review slice로만 등록했다.
- Normal focused **10/10**, renderer **6/6**, 최종 전체 `npm test` **2,381/2,381** (exit 0).
  [hash·plot ink 결과](visual-results.json)와 [이미지·호출 검토](VISUAL_REVIEW.md)를 생성하고 실제 이미지를 확인했다.
- 이 checkpoint에서 V는 ready-for-review였다. Primitive/reference만 실행했고 새 public grouping/opacity/
  temporalUnit의 성공이나 실패를 검증했다고 하지 않는다. Public semantic/trace/pixel parity는 다음 작업이다.
- 이 review package 시점에는 B도 ready-for-review였고 full 231,731 > 230,000으로 package 검증이 실패했다.
  이후 B의 별도 승인과 적용 결과는 아래와 같다. 전체 Phase의 X 완료를 요청하지 않는다.

## B — Browser bundle budget acceptance

- 기준 commit: `06d12042ee239ca2a84f4625b7956fb79e457a76`. 사용자 “조정한다”에 따라 R6-P2-B를
  먼저 approved로 기록한 뒤 full gzip 상한을 **230,000 → 235,000 bytes**로 변경했다.
  검토 package는 `ca820fa941f4359e814ee6f65a01e574512f5c08`이며 원격 branch에 push된 상태였다.
- Canonical numeric owner `scripts/browser-bundle-size.js`와 Current architecture의 상한 표를 동기화했다.
  README의 Basic 125,000 상한은 그대로 유효하다. Runtime source tree는
  `f85fa1f71e28364c5d6b6998dcb9410334935219`로 동일하며 public API·dependency·생성 문서 변경은 없다.
- 실제 실행: `npm run test:package` **exit 0**. Packed `ggaction@0.0.12`를 새 consumer에 설치하여
  Node/extension, PNG/PDF/SVG, strict TypeScript, Basic runtime/types, tutorial consumers, private exports,
  local MCP와 세 production Vite bundle을 검증했다.
- 검증한 tarball SHA-256: `200ce1f8d7e8c406e1489a665b9347bad81558c049a5a55b44ff1673c17ab745`.

| 엔트리 | Gzip 실측 | 적용 상한 | 여유 |
| --- | ---: | ---: | ---: |
| ggaction | 231,731 | 235,000 | 3,269 |
| ggaction/basic | 124,174 | 125,000 | 826 |
| ggaction/svg | 6,418 | 25,000 | 18,582 |

- 관련 계약: `node --test test/contracts/documentation-truth.test.js test/contracts/agent-docs-navigation.test.js`
  **10/10, exit 0**. 실행 상한·architecture·README 숫자 일치와 내부 문서 연결을 검사했다.
- 로그: `.artifacts/roadmap6-authoring/bundle-approved-{package,contracts}.log`.
  Runtime·test source가 그대로이므로 기존 전체 **2,381/2,381**과 기존 PNG **19/19**, V PNG **6/6**을
  이 숫자 변경 때문에 다시 실행하지 않았다. 이 수치는 앞선 실행 결과이며 이번 재검증 결과와 구분한다.
- W1 package 대기를 해제했다. D05는 구현·검증 완료, D04는 Phase 11 metadata audit가 남아 부분 완료다.
  이 B 검증 당시 V는 ready-for-review였다. 이후 V 승인과 W2 진행은 아래 기록이 소유한다.


## W2 — Explicit series identity and Line appearance

- 승인 기준은 `1005c816`의 R6-P2-V 기록이다. 새 public 프로그램과 3개 primitive pair는
  `examples/series-identity/` 및 `test/charts/series-identity/`에 있다. 단일 group·tuple을 저장하고
  색/점선/두께/opacity는 그 partition 안에서 유일한 raw 값으로 검증한다. Appearance를 identity key에 넣지 않는다.
- 단일 배열은 scalar field state로 정규화하고 tuple 재할당 때 alternate field/fields를 제거한다.
  Explicit group이 없는 기존 color/dash 추론, source group order, temporal aggregate/bin math,
  Polar·ordinary Area, density split과 Horizon/Regression의 owned group을 보존했다.
- W3 중 같은 series 검증을 사용하는 Line width/opacity constant·field 교체를 함께 구현했다.
  Scalar editor의 무효한 field 덮어쓰기를 거부하고 constant assignment는 해당 field/own legend만 제거한다.
  Shared scale의 남은 consumer와 highlight replay를 보존하며 incomplete assignment도 완료 시 수렴한다.
- Line opacity legend는 기존 sampled circle recipe를 재사용한다. Default opacity를 불필요하게 graphic에
  추가하지 않아 기존 primitive의 exact state를 보존한다. Parallel은 기존 row identity로 appearance를 읽는다.
- 추가 발견: temporal aggregate Line의 ordinal color scale이 y aggregate 값을 도메인으로 읽었다.
  Aggregate position consumer를 x/y로 한정해 ordinal appearance를 올바른 field reader로 보냈다.
  StrokeWidth channel selector의 빠진 TS union도 runtime와 맞췄다.
- Current·type·canonical reference·MCP action card·공개 tutorial을 갱신했다. Group 카드가 불완전한
  `{ fieldType }` 예제를 만들지 않도록 scalar/tuple 두 call pattern과 runnable sample을 등록했다.
- 검증: 최종 전체 normal suite **2,405/2,405**, exit 0; Horizon/Regression owner 경계까지 identity
  focused **12/12**; Line appearance **9/9**; 실제 browser **1/1**; 대표 render **16/16**.
  Render에는 승인된 series **3/3**의 graphicSpec·draw order·Canvas call·같은 실행 decoded pixel 비교가 포함된다.
- Installed package는 Node·MCP·strict TS·tutorial consumer와 Vite bundle 생성을 통과한 뒤 **Basic 크기에서 실패**했다.
  기능 통과를 package 전체 통과로 표시하지 않는다. 이 checkpoint의 gzip은 full **232,951**, Basic **125,223**, SVG **6,418** bytes다.
  Basic 상한 **125,000**을 **223 bytes** 넘는다. 기존 상한은 변경하지 않았으며 남은 W3/W4 통합 후
  package 크기 문제를 해소해야 X를 완성할 수 있다.
- 로그: `.artifacts/roadmap6-authoring/series-{all,identity,appearance,owner,public,browser,render,package}.log`.
- 이 checkpoint에서 W2 runtime과 3개 public 시각 흐름은 구현되었다. D02는 package 통합 검증을 남겼다. D06은 Line 부분만
  구현되었으며 Rule/Scatter/Point/ErrorBand는 다음 작업이다. D10의 JSON opt-out은 W4에 남는다.


## W3 — Style assignment and facade forwarding

- Rule creation and the new `editRuleMark` preflight all scalar styles before invoking existing stroke → width →
  dash → opacity children. Explicit/current/unique Rule targeting, field conflicts, pending style and immutable
  failure preserve lower-owner behavior. ErrorBar body/cap styling remains with its composite editor.
- Point scalar opacity now rejects active field opacity. ErrorBand constant fill and color reject one another;
  explicit color removal clears its legend, and edit-only `fill:false` clears a constant override. Statistics,
  boundaries and highlight replay preserve the restored field/theme result. Creation still rejects false fill.
- Scatter `point.radius` supports zero and conflicts with size. Default and Basic delegate to encodePointRadius →
  encodeRadius. Basic publicly types only the preferred alias; no Rule/general opacity/radius-removal expansion.
- Installed-consumer testing found another Basic default bug: `createCanvas()` passed omitted margin into the
  validator. Basic now applies the shared default only on omission; explicit undefined/null remain invalid.
  Default/partial/zero-margin cases exactly match full-entry graphics and Canvas config.
- Current owners, public type exports, canonical reference, tutorials and generated metadata/cards are synchronized.
  Direct action count is **174**. Rule/appearance are removed from the active Planned inventory.
- W3 checkpoint full normal suite: **2,413/2,413, exit 0**. Representative Scatter/Rule/ErrorBand PNG parity:
  **20/20, exit 0**, including same-run primitive/public decoded pixels. Rule and assignment lifecycle tests
  additionally compare exact graphic state, draw order and Canvas calls and reject partial invalid edits.
- Installed package Node, Basic, MCP, strict TypeScript and tutorial checks pass before the bundle guard fails:
  **Basic 125,347 > 125,000 bytes, exit 1**. The limit remains unchanged; package-wide success is pending.
  W4 and final size integration must complete before X. Logs: `.artifacts/roadmap6-authoring/style-{all,render,package,docs}.log`.

## W4 — Explicit temporal input and JSON opt-out

- `TemporalInputUnit = "auto" | "year" | "timestamp"`를 기존 temporal binding에 추가했다.
  `year`는 0–9999 정수 또는 네 자리 숫자 문자열을 UTC 1월 1일로 해석한다. `timestamp`는 Date 범위의
  유한한 millisecond 숫자만 받는다. `auto`와 생략은 기존 숫자 연도·날짜 문자열 해석을 유지한다.
  Unix seconds를 추론하지 않는다. Scale domain·tick values는 이미 정규화된 timestamp다.
- 같은 field/datum의 단위 생략은 저장 값을 유지한다. Field 교체, field↔datum, non-temporal 전환은
  이전 단위를 제거하며 명시적 `auto`는 저장한다. Layer가 상속하는 위치도 단위를 함께 보존한다.
  Raw rows는 바꾸지 않고 channel selector는 정규화된 시간, field selector는 원본 값을 읽는다.
- X/Y, Rule datum과 X2/Y2, 지원되는 Rect/Rule range, Theta, color, facade 위치, ErrorBand/ErrorBar의
  독립 위치, Horizon X와 TimeUnit의 기존 consumer를 연결했다. 새 temporal 채널은 만들지 않았다.
  Horizon/TimeUnit의 출력은 timestamp이며 Horizon은 파생 위치를 `timestamp`로 바인딩해 이중 해석을 막는다.
  Shared scale·canvas edit·selection·highlight·interval cap/boundary 재생성에도 같은 단위가 적용된다.
- `createRegression`, `encodeDensity`, `encodeHorizon`에 JSON으로 보존되는 `groupBy:false`를 제공한다.
  Regression 생략은 기존 Point color/shape 추론, 명시적 undefined는 기존 opt-out이다. Density 생략/undefined는
  ungrouped, Horizon 생략/undefined는 기존 group 추론을 유지한다. Editor 생략은 보존, false는 해제,
  string은 교체, 명시적 undefined는 오류다. 문자열 `"auto"`는 실제 field 이름이다.
  Data-only Regression/Density API에는 false sentinel을 추가하지 않았다.
- Numeric nominal color, Bar mean, 기존 Line aggregate, analytic owner의 grouping 기본값을 보존했다.
  Group은 appearance와 독립적이지만 한 final series 안의 모호한 appearance는 계속 오류다.
- 승인된 temporal 세 쌍을 `examples/temporal-input/`과 `test/charts/temporal-input/`으로 옮겼다.
  Raw 1000/2000의 timestamp/year/auto domain, 라벨, 원본 보존을 독립 ISO oracle와 비교한다.
  Series 세 쌍과 함께 stable capability registry에 등록했으며 완료된 Gate 디렉토리를 실행 의존성으로 남기지 않는다.
- 통합 검사에서 horizontal grouped temporal Bar가 ordinal mapper를 사용하던 오류와 reversed temporal
  category의 group offset 방향 오류를 발견해 수정했다. 세 단위 × reverse 두 값에서 가로·세로 geometry의
  transpose 관계를 검증하고 기존 non-reversed arithmetic과 대표 PNG 결과를 보존했다.
- Current·types·public docs·canonical reference·174개 direct action cards를 동기화했다.
  Active Planned 목록에서 마지막 temporal 항목을 제거했다. Source schema API는 이번 범위가 아니다.

## Integration — Verified consumers and compatibility

- W1의 owned-guide 계약에 맞게 facade declaration을 교정했다. Cartesian facade는 Cartesian guide,
  Line/Parallel은 line symbol 또는 explicit layers, Histogram/Violin은 categorical legend를 사용한다.
  Box의 owned legend는 지원하지 않는다. 다른 layer의 guide는 기존 lower guide action으로 작성한다.
  Heatmap의 interval legend 같은 미지원 owner 조합은 Phase 5의 D08 범위에 남는다.
- 실제 시나리오에서 foreign layer의 범례를 facade 옵션으로 전달하던 fixture를 고쳤다. Owned scale과
  domain을 기준으로 guide를 만들고 새 temporal 옵션도 root action trace와 실제 결과로 검증한다.
  Cartesian **720개**, statistical **460개**의 차트를 만들며 option/literal별 **5회·3개 dataset** 최소값을 유지했다.
  Inventory는 **168개 일반 public action, 4,481개 option path, 6,321개 coverage requirement**다.
  Direct catalog의 174에는 별도 extension action 6개가 포함된다.
- Basic에 등록하지 않는 full-only appearance action factory 세 곳의 순수 생성 표시를 바로잡아 미사용
  코드가 제거되게 했다. Shared temporal reader도 하나로 모았다. Basic public 기능과 **125,000-byte**
  상한은 유지했다. W2/W3 checkpoint에서 실패한 package 크기를 이번 통합에서 해소했다.
- 최종 normal suite **2,432/2,432**, contracts **260/260**, realistic suite **167/167**, 대표 PNG **22/22**,
  실제 browser **2/2**, installed package **exit 0**.
  Package는 Node/Basic/MCP, strict positive/negative TypeScript, tutorials, renderer entry, private export,
  production Vite bundle을 검사했다. TypeScript는 facade별 미지원 guide 조합도 거부한다.
- 검증 tarball SHA-256: `f7c6f0e0f18140b237970a965148ba326034779c693991635e134aadfa1c8108`.

| 엔트리 | 최종 gzip bytes | 승인된 상한 | 여유 |
| --- | ---: | ---: | ---: |
| ggaction | 234,258 | 235,000 | 742 |
| ggaction/basic | 124,897 | 125,000 | 103 |
| ggaction/svg | 6,418 | 25,000 | 18,582 |

- Coverage는 **95.03% lines / 91.15% branches / 98.75% functions**, critical floor **72개 모두 통과**다.
  Browser는 두 stable public example의 Canvas 크기·접근 가능한 이름·실제 상태·실행 오류를 검사했다.
- 최종 실행 로그: `.artifacts/roadmap6-authoring/phase2-final-{all,contracts,realistic,render,browser,package,coverage}.log`.
  모든 명령이 exit 0이며 source commit에 연결한 시각 증거와 X 검토 package를 준비한다. X는 미승인이다.

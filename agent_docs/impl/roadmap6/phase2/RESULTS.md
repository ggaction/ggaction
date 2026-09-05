# Phase 2 구현 결과

Phase 전체는 구현 중이며 V/X는 아직 승인되지 않았다. 아래 결과는 A 승인 범위의 검증된 개별 변경이다.

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
- 검증: 최종 전체 tests **2,371/2,371**, guide owners 집중 **291/291**, cards/catalog/navigation **22/22**,
  대표 PNG **19/19**. 최종 installed package는 full gzip **231,731 > 230,000**으로 **exit 1**이다.
  Basic **124,174 / 125,000**, SVG **6,418 / 25,000**. [예산 결정안](BUNDLE_REVIEW.md)을 분리했다.
- 처분: W1 기능 구현·회귀 검증은 끝났지만 package ceiling이 미해결이므로 W1 전체 완료 표시는 보류한다.
  D05도 전체 verified로 닫지 않는다. D04의 Box/Gradient metadata 교정은 반영했으며 Phase 11 전수
  metadata 검사를 대신하지 않는다. 새 public series/appearance/temporal flow는 아직 구현하지 않았다.

## V1 / V2 — Primitive review package

- Runtime 기준: `4355af45` (W1 checkpoint); runtime source tree `f85fa1f71e28364c5d6b6998dcb9410334935219`.
- Series identity 세 variant와 temporal input 세 variant의 실행 source·독립 references·단일 manifests·
  input hashes·normal/render tests를 `test/gates/`에 준비했다. 현재 활성 review slice로만 등록했다.
- Normal focused **10/10**, renderer **6/6**, 최종 전체 `npm test` **2,381/2,381** (exit 0).
  [hash·plot ink 결과](visual-results.json)와 [이미지·호출 검토](VISUAL_REVIEW.md)를 생성하고 실제 이미지를 확인했다.
- V는 ready-for-review이며 승인되지 않았다. Primitive/reference만 실행했고 새 public grouping/opacity/
  temporalUnit의 성공이나 실패를 검증했다고 하지 않는다. Public semantic/trace/pixel parity는 다음 작업이다.
- B도 ready-for-review이며 현행 ceiling은 유지했다. W1 package의 full 231,731 > 230,000 실패는 그대로다.
  전체 Phase의 X 완료를 요청하지 않는다.

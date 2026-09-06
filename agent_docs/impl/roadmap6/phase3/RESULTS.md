# Phase 3 구현 결과

A/V/B를 승인받아 세 public flow와 누적 기능 검증을 완료했다. 승인된 Full 상한 237,000 bytes를 적용하고
같은 tarball의 package와 실제 browser 검증이 통과했다. [X 결과 검토](REVIEW.md)는 2026-09-05 사용자 “승인한다”로 approved이며 Phase 3을 완료했다.
아래 W1–W3와 B 이전 통합은 당시 checkpoint이며 현재 package 판정은 마지막 B 적용 결과 절이 소유한다.

## W1 — Pie and Donut

- 기준 commit: `d4dd5a58` (V 승인 기록). `createPiePlot`을 full-only Aggregate create-only로 구현했다.
  필수 category와 count/explicit sum, 기본 category color, legend-only guide를 기존 Arc/theta owner로 조합한다.
  Donut은 `arc.innerRadius`이며 별도 alias나 partition cache·새 mark·renderer branch는 없다.
- Numeric category shorthand는 nominal이다. Zero-weight sector는 생략하고 color domain은 유지한다.
  Value-only/count+value, 잘못된 scale/appearance/guide와 ambiguous coordinate는 caller와 이전 program/trace를 보존하며 거부한다.
  Optional undefined는 생략으로 처리한다. Scale domain/range의 명시적 undefined가 lower validation에 전달되던 경계를 수정했다.
- Count/weighted/donut 세 public 예제를 `examples/pie-plot/`에 두고 승인된 primitive와 독립 sector oracle를
  `test/charts/pie-plot/`으로 이전했다. 하위 arc/theta 편집·Canvas resize의 semantic/graphic/Canvas parity와
  final sector selection membership을 확인했다. Browser registry와 공유 harness, tutorial·생성 이미지가 같은 public program을 쓴다.
- Current/declarations/index/cards/discovery/reference/LLM 문서를 동기화했다. Current 175 / Planned 2다.
  Pie/Donut 검색은 새 facade의 유효한 category count 호출을 반환한다. Raw Arc 요청은 기존 lower owner를 유지한다.
  Built-docs의 오래된 고정 action 수를 canonical inventory 비교로 바꾸고, mark-selection 이미지 검사를 해당 예제로 한정했다.
- 검증: 누적 normal **2,493/2,493**, Pie normal **48/48**, contracts **260/260**, PNG **3/3**, SVG/PDF vector parity **3/3**,
  실제 example browser **1/1**, 최신 installed package **exit 0**. Same-run decoded PNG와 PDF streams, SVG 문자열이 각각 primitive/public과 일치한다.
- 문서: source **47/47**, Jekyll build 통과, built **124 pages**의 links/assets 통과. 전체 docs browser의 desktop search·접근성·keyboard·no-JS와 320/390/768px containment가 통과했다.
  System Ruby 대신 설치된 Ruby 3.3.12를 사용했다. Locked gems를 repository-local artifact에 설치하고
  같은 Gemfile.lock의 로컬 사본에 host platform만 추가했다. Tracked Gemfile/lock 변경은 없다.

| 엔트리 | gzip bytes | 유지한 상한 |
| --- | ---: | ---: |
| Full | 234,970 | 235,000 |
| Basic | 124,897 | 125,000 |
| SVG | 6,418 | 25,000 |

Full 여유는 30 bytes다. 나머지 facades를 추가한 뒤 실제 installed bundle을 다시 측정한다.
상한 증가를 승인받거나 적용하지 않았다. Phase 전체 coverage/realistic 결과는 아직 아니다. Installed tarball SHA-256은 `971a123d15126dcdae456355faffa6f36899c3d728bdd92885674af711a5a164`다.

로그: `.artifacts/roadmap6-authoring/pie-{focused,contracts,render,browser,package,bundle,docs-verify,docs-built,docs-browser}.log`.

## W2 — Baseline density

- 기준 commit: `955b1acf` (Pie/Donut checkpoint). Full-only `createDensityPlot`이 기존 Area와 encodeDensity,
  optional explicit group color, owned guides를 조합한다. KDE 계산·derived fields·zero baseline·기본 grid는 바꾸지 않는다.
- GroupBy와 color를 별도 선택한다. Color는 retained group field와 같아야 하며 overlay만 지원한다.
  Optional undefined는 생략, 잘못된 역할·statistics·scale·appearance·guide는 atomic error다.
  Pie/Density의 categorical color와 guide 검증을 공유해 기존 의미를 보존하면서 중복을 줄였다.
- Three variants의 semantic/graphic/Canvas parity와 PNG·SVG·PDF를 확인했다. 통계·scale·appearance·Canvas
  revision, explicit coordinate, 다른 mark의 역할 비상속, singleton, invalid-row filtering, custom outputs,
  네 kernel과 두 normalization을 검증했다. Source-field revision 뒤 selection highlight를 유지한다.
  Group 해제 시 group-owned color와 legend를 제거하는 기존 lower lifecycle을 그대로 사용한다.
- Current 176 / Planned 1. 새 declarations·types consumer·reference/cards/search/LLM와 같은 public example을
  사용하는 browser/tutorial/image를 연결했다. MCP의 density-axis 요청은 H0가 소유하는 기본 축을 중복 생성하지 않는다.
- 검증: Pie regression 포함 focused **86/86** (Density 50), PNG **3/3**, SVG/PDF **3/3**, actual example browser **1/1**.
  자동차·국가·영화의 세 pinned datasets에서 두 facades 각 다섯 변형, 총 **30/30** realistic cases를 검증했다.
  Graphic/analytic/SVG integrity, source immutability, sector/profile counts와 density revision을 확인했다.
- Installed package의 Node·MCP·strict TypeScript·tutorial consumer는 통과했지만 **전체 package 검증은 exit 1**이다.
  Full gzip **235,428 > 235,000**으로 **428 bytes 초과**한다. 독립 installed measurement의 Basic은 **124,897 / 125,000**이다.
  상한은 그대로이며 package 전체 통과나 Phase 완료로 표시하지 않는다. 승인된 Horizon을 포함한 통합에서 해결한다.
- Source docs 47/47, Jekyll build와 built 124-page links/assets 검사는 통과했다. Desktop/keyboard/접근성/no-JS와 320/390/768px 전체 browser 검사가 통과했다. 최종 누적 normal은 **2,537/2,537**, fail/skip 0이다.

로그: `.artifacts/roadmap6-authoring/density-{focused,render,docs-contracts,browser,realistic,all,package,bundle,docs-verify}.log`.

## W3 — Horizon

- 기준 commit: `6b0fa4eb` (Density checkpoint). Full-only `createHorizonPlot`은 explicit x/y,
  기존 signed-band 계산·palette·missing/overflow policy를 사용한다. Coordinate는 기존 child로 연결하고,
  explicit opacity는 encodeHorizon 뒤 editAreaMark로 적용한다. H0는 original x guide만 확보한다.
- 같은 x scale을 공유하는 두 번째 Horizon이 기존 x축을 재생성할 때 derived field title 때문에 실패하는
  lower 버그를 수정했다. Original x title을 encodeX 전에 저장한다. 계산·최종 semantic·그래픽·defaults를 바꾸지 않고
  기존 lower trace의 title child 순서만 교정했으며 두 Horizon의 guide 재사용 회귀 검사를 추가했다.
- Signed/temporal/baseline-style의 public/primitive를 stable slice로 이관했다. Explicit coordinate/opacity,
  all-baseline empty collection, missing/overflow, derived selection, lower band/style/scale/resize를 검증했다.
  Palette null은 defaults로 숨기지 않고 거부한다. Nonempty area series의 기존 최소 두 점 계약을 유지한다.
- Discovery는 Horizon을 새 H0 한 번으로 작성하고 bands와 x/y 요청을 전달한다. Pie Cartesian guide,
  Horizon folded y/internal legend, Density의 보존되지 않은 raw color 조합을 unresolved로 설명한다.
  Exact lower actions는 남는다. Plain grid 동의어를 추가하고 Pie의 자동 categorical legend를 인식한다.
- Current **177 / Planned 0**, nested scale vocabulary **68 paths / 280 literal witnesses**. Runtime, declarations,
  strict installed type consumer, cards/reference/search/LLM, same public example/browser/tutorial/image를 맞췄다.
- 검증: canonical PNG **3/3**, SVG/PDF **3/3**, actual browser **1/1**. 세 facade × 세 pinned datasets × 다섯 변형
  **45/45**와 resolver/graphic hierarchy를 합친 focused **69/69**가 통과했다. Horizon folds는 독립 수치 oracle로
  group/sign/band별 모든 x와 amplitude, row/path count, resolved extents를 확인한다.
  영화 데이터의 연도별 singleton 실패도 immutable하게 검증하고, 성공 사례는 caller가 두 release period를 명시한다.
- 최초 누적 normal의 두 실패는 누락된 public graphic inventory와 인식되지 않던 grid 동의어였다.
  수정 뒤 normal **2,585건**을 포함한 coverage가 통과했다: **95.09% lines / 91.31% branches / 98.76% functions**,
  **72 critical floors**. Source docs **47/47**, Jekyll build, **124 pages** links/assets, desktop search·keyboard·Axe·no-JS와
  전체 **320/390/768px** containment 검사가 통과했다.
- Installed Node/MCP/strict TypeScript/tutorial consumer는 통과했지만 Full gzip **235,923 / 235,000**, **923 bytes 초과**로
  전체 package 검증은 **exit 1**이다. 상한은 올리지 않았다. Same-commit 세 entry의 측정과 전체 realistic suite,
  아홉 public 시각 결과를 다음 통합 evidence로 기록한다. Phase X는 승인 전이다.

로그: `.artifacts/roadmap6-authoring/horizon-{focused,render,integration-focused,browser,package,docs-built,docs-browser}.log`,
`phase3-coverage.log`. 공개 시각 evidence는 `render-public-review.mjs`, 같은 tarball 소비자·크기 evidence는
`verify-package.mjs`로 commit 후 생성한다. 기존 A/V snapshot을 덮어쓰지 않는다.

## Generated scenario acceptance

확장 realistic suite에서 두 inventory 실패를 발견했다. User-facing action 수와 recursive option 수가
세 신규 facade 이전 값으로 고정되어 있었고, generated smoke registry에는 새 H0의 direct-root 호출도 없었다.
공개 등록을 제외하거나 기준을 낮추지 않고 세 complete chart recipe를 추가했다. Count/sum·donut,
Density 두 방향과 explicit group/color, temporal Horizon bands/baseline, 각각의 lower edit를 생성한다.

- 실제 171개 user-facing action 전부가 generated scenario의 top-level trace에 존재한다.
- Recursive inventory는 4,879 option paths(필수 4,202 / 제외 677), scale 68 paths / 280 literal values,
  ledger 6,850 requirements로 동기화했다. Array redaction과 unsupported-path 검사는 그대로다.
- `generated-lifecycle-scenarios`, `generated-scenario-feature-coverage`, `generated-scenarios`의 **13/13**이
  통과했다. Deterministic deep pair coverage와 전체 offline smoke의 graphic/analytic/SVG integrity를 포함한다.
- 변경은 test generator와 acceptance expectations에 한정된다. Runtime/type/knowledge/package bytes와
  80999264의 시각 증거는 그대로다. 전체 corpus sweep 결과는 이어지는 통합 기록에 남긴다.

로그: `.artifacts/roadmap6-authoring/phase3-generated-regression.log`.

## 최종 통합 검증

이 절은 B 승인 전 측정·기능 통합 기록이다. 당시 package 실패와 원래 ceilings를 보존한다.
승인 후 현재 package 판정은 아래 B 적용 결과와 REVIEW를 따른다.

Runtime·declarations·knowledge 구현 commit은
[`80999264535b312d82ca3f58928b4428bf749ac5`](https://github.com/ggaction/ggaction/commit/80999264535b312d82ca3f58928b4428bf749ac5),
generated scenario 교정 commit은
[`39b082d643412c5190c3ca51f180d10c2c7efa72`](https://github.com/ggaction/ggaction/commit/39b082d643412c5190c3ca51f180d10c2c7efa72)다.
두 commit 사이 src/types/knowledge/scripts/package.json/package-lock.json의 diff는 없다.
Runtime tree `6d5a80e311cabdc67dff5da739dcce3346e3841d`, types tree `38cbb7b6d7feaa5b044a56189ea874b8bde5d581`이다.

| 검증 | 실제 결과와 범위 |
| --- | --- |
| Normal + coverage | 2,585건 통과, lines 95.09% / branches 91.31% / functions 98.76%, critical floors 72개 통과 |
| 확장 realistic 전체 실행 | 212건 중 210 통과 / 2 실패, exit 1. 두 실패는 아래 generated inventory 검사이며 runtime 실패가 아니다 |
| 교정 후 영향받은 realistic 모듈 재검증 | 3개 모듈 13/13 통과. 전체 212건을 다시 실행한 결과로 표시하지 않는다 |
| 새 complete chart realistic | 위 전체 실행에 포함된 세 facade × 세 pinned datasets × 다섯 변형 45/45 통과 |
| Public/primitive 시각 동등성 | 9/9: semanticSpec·graphicSpec·draw order·Canvas calls·decoded PNG·SVG·decoded PDF streams 일치 |
| 승인된 V 보존 | 9/9 pixel hash 일치. Source hashes 90개와 PNG hashes 18개 재확인 |
| 비교 화면 | Desktop 1440px / mobile 390px, 18개 이미지 로드·9개 정확한 호출·overflow/page error 없음 |
| 문서와 실제 예제 | Source docs 47/47, Jekyll build와 124페이지 links/assets, 전체 docs browser desktop·320/390/768px 통과. 세 신규 example browser 각각 1/1 |
| Installed package | Node/MCP/strict TypeScript/tutorial 통과. Full 235,923 > 235,000으로 전체 exit 1; Basic 124,897 / SVG 6,418 통과 |
| 현재 공개 범위 | Current 177 / Planned 0. Full-only 3개, Basic 표면 유지, F20 제외, X 미승인 |

확장 realistic 실행에서 실패한 정확한 검사 이름은 다음 둘이다.

- `calls every user-facing action directly from a generated scenario root`
- `derives a bounded public option inventory without runtime prototype paths`

앞 절의 교정 뒤 `generated-lifecycle-scenarios.test.js`, `generated-scenario-feature-coverage.test.js`,
`generated-scenarios.test.js` 전체를 재실행했다. Direct-root smoke, recursive option inventory와 deep pair
coverage가 모두 통과했다. 변경은 offline recipe registry와 기대값에 한정되며 50개 실제 데이터셋에 쓰는
`REALISTIC_SCENARIO_RECIPES`와 runtime은 그대로다. 이미 통과한 나머지 210개를 이유 없이 다시 실행하지 않았다.
따라서 기록은 **전체 실행 210/212 + 교정 후 관련 모듈 13/13**이며, 새 전체 실행 212/212라고 주장하지 않는다.

시각 evidence는 [public-visual-results.json](public-visual-results.json), 같은 tarball의 소비자·세 entry 측정은
[package-results.json](package-results.json)에 source ref와 hash를 포함한다. 기존 A/V snapshot은 보존했다.
Stable tests와 manifests는 `test/charts/{pie-plot,density-plot,horizon-plot}/`에 있고 승인 전 review subtree는 제거했다.
전체 package 실패를 해결하기 전 X를 준비 완료나 Phase 완료로 기록하지 않는다.

최종 로그: `.artifacts/roadmap6-authoring/phase3-{coverage,realistic,generated-regression,package,review-ui,evidence-audit,docs-final}.log`.

검토 기록을 정리한 뒤 navigation/documentation-truth **10/10**, 변경 Markdown 10개에서 local links **262개**,
원장 47 findings / 46 work packages / 12 phases와 F20 제외를 확인했다. Source hashes 90개·PNG hashes 18개를
다시 확인했고 package source와 기존 bundle limits가 변경되지 않았다. 로그는 `phase3-final-navigation.log`,
`phase3-final-record-check.json`이다. 마지막 원격 review commit 고정은 문서 ref만 바꾼다.

## B 승인 상한 적용 결과

2026-09-05 사용자가 Full 상한 235,000 → 237,000 bytes 조정 질문에 “승인한다”라고 답했다.
승인 기준 HEAD `d2b1f7bf05d11357b9b9b6ed5520f442ef3d07f4`, review package `c7ff0309d19729251b569e61498d52ca714f80bc`다.
승인 기록을 먼저 push한 뒤 `81225436461eec0e0298a29f98ca42cc569e6201`에서 canonical guard와 architecture 표 두 줄을 바꿨다.

검토했던 `ggaction-0.0.12.tgz`를 다시 pack하지 않고 동일 SHA-256으로 재사용했다.
전체 Node/MCP/strict TypeScript/tutorial/renderer/Vite 소비자는 **exit 0**, 같은 package의 실제 Chromium 소비자는 **1/1**,
승인 상한을 적용한 contracts는 **263/263** 통과했다. Full/Basic/SVG gzip bytes는 기존과 같은 **235,923 / 124,897 / 6,418**이다.
새 상한 **237,000 / 125,000 / 25,000**에서 모두 통과한다. [기계 판독 결과](package-approved-results.json)에 기록했다.
이전 실패 snapshot `package-results.json`은 보존하며 현재 package 전체 실패로 표기하지 않는다.

최초 consumer CLI 호출에서 상대 tarball 경로를 전달해 임시 설치 디렉터리 기준으로 파일을 찾지 못했다.
절대 경로로 다시 실행해 통과했으며 package 내용이나 설치 검사를 바꾸지 않았다.
원격 재현에는 `node scripts/package-consumer.js "$PWD/.artifacts/release/ggaction-0.0.12.tgz"`를 사용한다.

최종 chart 계약에서 Horizon의 옛 미구현 표기·제거된 Gate 경로와 세 예제의 proposal 변수명을 현재 실행 형태로 맞췄다.
과거 A/V snapshot은 그대로다. Runtime/types/knowledge·bundle bytes가 같으므로 이미 통과한 normal·coverage·realistic·렌더링은
이 두 줄의 상한 변경 때문에 반복하지 않았다. 전체 Phase 3 결과와 한계는 [X 검토](REVIEW.md)를 따른다.

로그: `.artifacts/roadmap6-authoring/phase3-approved-{package,package-browser,contracts}.log`.

X 기록 정리 후 navigation/documentation-truth **10/10**, 세 chart 문서의 실제 lower/public calls **3/3** semantic·graphic parity,
Markdown 14개 local links **306개**를 확인했다. Source hashes 90개·PNG hashes 18개와 동일 tarball SHA-256,
Current 177 / Planned 0·F20 제외를 재확인했다. `phase3-exit-{navigation.log,document-calls.json,integrity.json}`에 기록했다.

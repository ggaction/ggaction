# R6-P4-X — Baseline·series layout·측정 반지름·색상 의미 통합 결과

상태: **completed**. [전체 실행 승인](../APPROVAL.md)에 따라 W1–W5 구현과 고정 source의 최종 통합 검증을 완료했다. [기계 판독 결과](integration-results.json)를 함께 보존한다. 후속 Phase 5를 진행하며 실제 0.0.13 릴리즈는 전체 로드맵 완료 후에 수행한다.

## 검증 기준

- 최종 runtime: [`7d5982aaa472c234182de917251ff973ff913f1c`](https://github.com/ggaction/ggaction/commit/7d5982aaa472c234182de917251ff973ff913f1c), source tree `1e5a95d028132ffaaf6464b95760ea916b85e155`, types tree `2028a79cd493f64f3a739414e20491b5dd783f7a`.
- 추가 Area composition 검사: [`42531150`](https://github.com/ggaction/ggaction/commit/42531150). Runtime/types 변경 없음.
- 원격 branch: `origin/codex/roadmap6-hierarchical-actions`.
- 실행 이력과 초기 실패 원인·수정·재검증: [INTEGRATION.md](INTEGRATION.md). 각 W의 최초 결과를 이번 누적 결과로 덮어쓰지 않는다.

## 완료된 사용자 기능

| 작업 | 결과와 하위 소유권 | 근거 |
| --- | --- | --- |
| W1 Area | Simple baseline 0, explicit nonzero/log baseline, horizontal, crossing ribbon, missing break. `createAreaPlot`이 mark/endpoint/layout/guide 액션을 조합한다 | [W1/W2](RESULTS_V1.md), [공개 실행 예제](../../../../examples/area-layout/program.js) |
| W2 series layout | `layoutSeries`가 color와 독립적으로 group/overlay/stack/fill/diverging/center를 mark별 지원 범위에서 관리. Offset·정규화·scale·guide를 함께 갱신 | [series 검사](../../../../test/unit/actions/encodings/series-layout.test.js) |
| W3 측정 반지름 | `createRosePlot`은 hole 제외 면적, `createRadialBarPlot`은 hole부터의 길이를 측정. 두 facade 모두 같은 Arc→theta→encodeR→color→guide owner 사용 | [W3](RESULTS_W3.md), [공개 실행 예제](../../../../examples/radial-sectors/program.js) |
| W4 category/legend order | Theta의 explicit/aggregate category order, reset과 linked legend 순서. Category→color 대응과 vertex/stack/drawing order를 구분 | [W4](RESULTS_W4.md), [order 타입 검사](../../../../test/contracts/category-legend-order-types.test.js) |
| W5 midpoint/전환 | 비대칭 domain의 semantic midpoint와 값 위치에 맞는 gradient. Sequential↔discretized 전환은 모든 shared mark와 compatible legend를 함께 검증 | [W5](RESULTS_W5.md), [midpoint](RESULTS_MIDPOINT.md), [전환 실행 예제](../../../../examples/color-transitions/program.js) |

새 direct 4개는 모두 Current다. Full-only H0는 `createAreaPlot`, `createRosePlot`, `createRadialBarPlot`; `layoutSeries`는 Full/Basic이며 Basic의 지원 mark는 Bar다. `encodeLayout` alias는 없다. Current direct **181**, Planned direct **0**, Planned capabilities **0**. Canonical source는 [ACTION_INDEX.json](../../../contract/ACTION_INDEX.json)과 [Current 계약](../../../contract/current/)이다.

## 의미·소비자 최종 대조

| 셀 | 지원 결과 또는 명시적 경계 |
| --- | --- |
| H0→H2→H3 | 세 facade가 실제 lower wrapped owner를 호출한다. 하위 style·scale·Canvas 편집 후 같은 concrete 결과와 이전 program 불변성을 검사한다 |
| Area 입력·grain | Cartesian x/y, quantitative/temporal independent role, datum/field endpoint와 final series. Aligned unique grid만 누적하고 누락된 행을 만들지 않는다 |
| Radial 입력·grain | Polar Arc, categorical theta, category count 또는 explicit quantitative sum. Positive final category마다 sector 하나와 source membership 보존 |
| Style·layout | Constant/field appearance와 group identity 분리. Area의 group, Bar의 center, 두 field ribbon 누적 등 미지원 조합은 atomic error |
| Scale·guides | Baseline·stack extent·radial mapping·midpoint가 mark/guide에 함께 반영. Shared incompatible consumer 하나도 전체 편집 실패. Point glyph radius와 radial position을 혼동하지 않는다 |
| Selection·highlight | Area final series, Bar final cell, Arc final category를 사용한다. Layout/mapping/filter/order/Canvas 변경에 source identity와 baseline appearance가 갱신된다 |
| Labels | 기존 source-owned Bar/Arc의 집계값·anchor·도메인 보존을 검증했다. Area는 현재 source-owned text의 eligible mark가 아니며 독립 text 작성은 별도 경로다. Explicit source/content/share API는 Phase 5 |
| Data revision | 기존 encoding reassignment와 지원 filter/derived owner를 사용한다. Generic editData/bind와 반복 filter recipe lifecycle은 Phase 6 범위로 남는다 |
| Facet | Cartesian stacked Area의 tuple group·baseline과 독립 domain `[0,6]`/`[0,12]`을 검증했다. Arc facet은 현재 unsupported이며 immutable error 검사. 이 제한을 숨긴 지원 선언은 없다 |
| Concat | Area baseline/ribbon과 measured radial의 child snapshot·scale mapping·domain을 보존하고 gap/columns 변경을 검증했다 |
| Empty/error | Area zero-total fill의 유한한 domain, missing break topology를 검사. Measured radial all-zero, negative, overflow, incompatible theta/padding/inner-radius는 명시적 오류 |
| Theme/fitting | 아직 program-level theme/fitting owner가 없으므로 새 기능을 주장하지 않는다. Phase 5 W4/W5에 남는다 |
| Renderer | Backend-neutral graphic만 소비. 승인한 20개 target의 primitive/public 의미·concrete geometry·Canvas·same-run decoded pixels·SVG/PDF 비교는 stable chart owner로 이전 |
| Type/package | 역할별 strict positive/negative 타입, Full/Basic/export 경계, 같은 tarball의 Node/Chromium 소비 검증. Facade에 맞지 않는 legend order.channel 타입을 제거 |
| Discovery/docs | 새 complete chart intent는 facade로, mark intent는 lower mark로 라우팅. 175개 사용자 액션 direct-root 실행과 실제 옵션/literal projection 검사. Current/cards/reference/search/machine/LLM 및 built docs 동기화 |

20개 target은 Area/layout 11, radial 5, midpoint 2, color transition 2다. 추가 theta/legend 시각 pair는 W4 증거에 있다. Stable gallery는 168 variants, active review는 0이다. 이 숫자는 제외된 제안 F20과 관계없다.

## 통합 중 발견한 오류

공통 raw field가 aggregate measure를 가리던 라벨 오류 [#80](https://github.com/ggaction/ggaction/issues/80), source-owned text가 Bar scale domain에 참여하던 오류 [#81](https://github.com/ggaction/ggaction/issues/81)를 수정하고 닫았다. 같은 값의 sum/count/mean, singleton count, fill domain, radial filter/highlight와 resize를 검사했다.

문서 검색 동점에서 chart recipe 대신 action 참조가 먼저 나오는 문제, lockfile의 실행 플랫폼 누락, facade legend order 타입 과다 허용, 새 옵션의 시나리오 증거 누락도 수정했다. 초기 실패와 수정 뒤 통과 수치는 [통합 이력](INTEGRATION.md)에 구분되어 있다.

## 검증 결과

| 검사 | 현재 확인된 결과 |
| --- | --- |
| Normal | **2,756/2,756**, fail/skip/cancel 0 |
| Source coverage | lines 95.16%, branches 91.70%, functions 98.79%; critical floors 74개 통과 |
| Renderer | 205/205 |
| Browser | 63/63 |
| Built docs | source 검사는 normal에 포함. Jekyll build, 125 pages links/assets, desktop search/keyboard/Axe/no-JS, 전체 320/390/768px 통과 |
| Realistic | 마지막 runtime 고정 실행 **242/242**, fail/skip/cancel 0 |
| Package | 설치된 Node/extension/renderers/strict types/tutorials/MCP/bundle 통과. 같은 파일의 Chromium 1/1 |

[패키지 증거](package-labels-results.json)의 SHA-256은 `4eaa9a4a34cecc7b4bb40529324b70d03dfdb9f1a22aa697f86f8a362ca1abcf`다. Entries 443, packed 496,519, unpacked 2,369,885 bytes. Full/Basic/SVG gzip **247,052/136,936/6,437**, 승인 한도 **249,000/138,000/25,000**. 이 tarball은 개발 검증용 0.0.12이며 0.0.13 registry release가 아니다.

재현 명령: `npm test`, `npm run test:coverage`, `node scripts/run-tests.js render`, `npm run test:browser`, `npm run test:realistic`, `npm run docs:build`, `npm run test:docs:built`, `npm run test:docs:browser`. Package는 `createPackageArtifact`로 한 번 생성하고 `testPackageConsumer({packageSpec: artifact.file})`와 `GGACTION_PACKAGE_SPEC=<same-file> node --test test/browser/package-consumer.browser.js`에 같은 파일을 전달한다. 실행 환경은 [통합 기록](INTEGRATION.md)의 repo-local 캐시와 locked Ruby/Bundler를 사용한다.

## Finding 처분과 후속 범위

D01/F04(측정 반지름), D03(독립 layout), F05(Area), D18(midpoint/전환), D14의 Phase 2 incomplete width와 Phase 4 theta/legend order를 함께 implemented-verified로 기록했다. D14의 앞선 width 결과는 [Phase 2 W5](../phase2/RESULTS.md#w5--bar-incomplete-authoring)로 추적한다.

Phase 5–11과 실제 0.0.13 릴리즈는 아직 남아 있다. F20은 제외 상태다. Phase 5의 [52개 사전 조사](../phase5/BASELINE.md)는 완료했지만 새 guide/label/theme API를 구현했다고 표시하지 않는다.

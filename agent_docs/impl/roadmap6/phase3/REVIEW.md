# R6-P3-X — Complete chart facades 결과 검토

상태: **ready-for-review**. 승인된 A/V/B 범위의 Pie/Donut·Density·Horizon 구현과 소비자 검증을 완료했다.
Full bundle 상한 237,000 bytes를 적용하고 검토 당시와 같은 tarball의 package 검증을 exit 0으로 확인했다.
이 문서는 Phase 3 결과와 후속 범위의 검토안이다. X 사용자 승인은 아직 없으며 Phase는 in-progress다.

## 검증한 코드와 승인 범위

- Runtime 구현: [`80999264535b312d82ca3f58928b4428bf749ac5`](https://github.com/ggaction/ggaction/commit/80999264535b312d82ca3f58928b4428bf749ac5).
- Generated scenario 교정: [`39b082d643412c5190c3ca51f180d10c2c7efa72`](https://github.com/ggaction/ggaction/commit/39b082d643412c5190c3ca51f180d10c2c7efa72).
- 승인 상한 적용: [`81225436461eec0e0298a29f98ca42cc569e6201`](https://github.com/ggaction/ggaction/commit/81225436461eec0e0298a29f98ca42cc569e6201).
  변경은 canonical Full ceiling과 architecture 표의 두 줄이다. Runtime·types·knowledge·package 내용은 그대로다.
- Runtime tree `6d5a80e311cabdc67dff5da739dcce3346e3841d`, types tree `38cbb7b6d7feaa5b044a56189ea874b8bde5d581`.
- A는 P3-C01–C07, V는 9개 primitive targets와 정확한 public 호출을 승인했다.
  B는 2026-09-05 “승인한다”로 Full 235,000 → 237,000 bytes만 승인했다.
  B 승인 기준은 `d2b1f7bf05d11357b9b9b6ed5520f442ef3d07f4`, 제안 package는 `c7ff0309d19729251b569e61498d52ca714f80bc`다.
- Review package commit은 이 결과 package를 검증·push한 뒤 [GATES.md](GATES.md)에 고정한다.
  A/V/B 승인과 X의 경계는 해당 Gate 문서가 소유한다.

## 완성한 액션과 계층

| 액션 | 사용자가 얻는 결과 | 실제 하위 호출과 의미 |
| --- | --- | --- |
| `createPiePlot` | Category count 또는 explicit weighted sum의 Pie. `arc.innerRadius`로 Donut 작성 | Arc → theta → 선택한 category color → legend. Count/sum과 sector membership은 기존 theta owner가 소유한다 |
| `createDensityPlot` | Baseline KDE와 area, 두 orientation, 명시적 group/color | Area → KDE → optional retained-group color → axes/grid/legend. Grouping만으로 color를 자동 추론하지 않는다 |
| `createHorizonPlot` | Signed amplitude를 band로 접은 area와 original x guide | Area → optional coordinate → Horizon encoding → explicit opacity → x axis/grid. Folded y를 원본 amplitude 축으로 설명하지 않는다 |

세 액션은 Full-only Aggregate create-only다. 아래층 `editArcMark`, `encodeTheta`, `editDensity`,
`editHorizon`, `editAreaMark`, `editScale`, Canvas resize와 지원되는 selection/highlight를 계속 사용할 수 있다.
H0가 별도의 데이터 계산·차트 cache·renderer branch·semantic compiler를 만들지 않는다.
`semanticSpec`은 의미, `graphicSpec`은 concrete output, trace는 실제 wrapped child 조합을 보존한다.

현재 canonical 계약은 [COMPLETE_CHARTS.md](../../../contract/current/COMPLETE_CHARTS.md)다.
설명·rationale·전체 lower/public chain은 [Pie/Donut](../chart/pie-donut.md),
[Density](../chart/density.md), [Horizon](../chart/horizon.md)에 있다.

## 실행 가능한 호출과 시각 결과

실제 데이터와 전체 public 프로그램은 아래 세 예제에 있다. 같은 source를 docs/tutorial/browser에서도 사용한다.

- [Pie/Donut program](../../../../examples/pie-plot/program.js)
- [Density program](../../../../examples/density-plot/program.js)
- [Horizon program](../../../../examples/horizon-plot/program.js)

[비교 화면](../../../../.artifacts/roadmap6-authoring/phase3-public-review.html)은 각 variant의 정확한 public 호출과
primitive/public 두 이미지를 나란히 보여준다. [9개 결과 개요](../../../../.artifacts/roadmap6-authoring/phase3-public-overview.png),
[source·trace·semantic·render hash](public-visual-results.json)를 함께 제공한다.
화면의 9개 호출은 실제 top-level trace와 일치한다.

| Variant | 독립적으로 확인한 의미 |
| --- | --- |
| Pie count | A:B = 2:1, 240°/120°, category legend만 생성 |
| Pie weighted | A:B = 5:5, 180°씩. Count와 weighted sum의 의미를 분리 |
| Donut | 같은 합계·partition, innerRadius .55와 padAngle 2 |
| Density vertical | x=value / y=density, 기존 Gaussian samples와 baseline |
| Density grouped | Explicit group/color, 두 profile과 각 group의 표본 수·정규화 |
| Density horizontal | x=density / y=value, 현행 y 기준 grid 의미 유지 |
| Horizon signed | 3 bands × 2 signs, 6 paths / 24 derived rows, folded [0,1] |
| Horizon temporal | Timestamp x domain [1000,2000], 원본 단위와 derived timestamp 보존 |
| Horizon baseline-style | Baseline 2, bands 2→3 revision, 최종 opacity .6와 6 paths |

9쌍 모두 같은 실행에서 exact semanticSpec·graphicSpec·draw order·Canvas calls·decoded pixels·SVG·decoded PDF streams가 일치한다.
원래 승인된 V의 9개 pixel hash도 그대로다. 숫자 oracle와 plot-region ink를 별도로 확인했다.
Stable owner는 `test/charts/{pie-plot,density-plot,horizon-plot}/`이며 기존 review subtree는 제거했다.
과거 A/V script는 당시 commit에서만 재현하는 승인 기록이며 stable tests가 이를 import하지 않는다.

## 발견하여 수정한 오류와 유지한 경계

- 같은 x scale을 공유하는 두 번째 Horizon이 derived field title 때문에 기존 축과 충돌했다.
  `encodeX` 전에 original x title을 저장하도록 lower child 순서를 수정하고 guide 재사용 회귀 검사를 추가했다.
- Optional undefined를 omission으로 정규화했다. Palette null, 잘못된 역할·scale·appearance·guide는
  이전 program과 caller 입력을 보존한 채 거부한다. Error 조건을 default로 숨기지 않는다.
- Discovery가 새 complete chart를 조합하면서 잘못된 축·legend를 추가하거나 불가능한 color를 약속하던 경계를 교정했다.
  Pie Cartesian guide, Horizon folded y/internal legend, Density retained group과 다른 color는 unresolved로 설명한다.
  Plain grid 요청과 Pie의 자동 category legend를 인식하며 기존 exact lower 요청은 유지한다.
- 세 신규 액션을 generated smoke의 direct-root recipe에 추가했다. 전체 user-facing 171개가 top-level trace에 나타난다.
  Recursive option inventory와 literal coverage를 새 계약에 맞추고 기존 coverage 기준을 유지했다.
- 마지막 기록 점검에서 Horizon의 옛 미구현 표기와 제거된 Gate 경로를 stable owner로 맞췄다.

Donut alias, 신규 theta order·labels, Density orientation edit와 raw metadata join, Horizon 전용 amplitude guide·small multiples,
generic data binding과 composition은 이번 범위에 추가하지 않았다. Horizon의 all-baseline empty는 허용하지만
nonempty area series의 기존 최소 두 점 계약은 유지한다. Lower folded y/legend의 명시적 작성 경로도 유지한다.

## 실행한 검증

환경: Node 22.23.1 / npm 10.9.8 / macOS arm64. Temp/cache/browser는 repository 안의 `.artifacts/repository-study/`를 썼다.

| 검증 | 실제 결과 |
| --- | --- |
| Normal + coverage | 2,585건 통과. Lines 95.09% / branches 91.31% / functions 98.76%, critical floors 72개 통과 |
| 승인 상한 적용 후 contracts | 263/263, failure/skip 0. Package boundary·Current·declarations·catalog·documentation truth 포함 |
| 확장 realistic 전체 실행 | 210/212. 두 실패는 generated action/option inventory이며 아래 교정 재검증으로 해결 |
| 교정 후 관련 realistic 모듈 | 세 모듈 13/13 통과. 전체 212건을 새로 다시 실행했다고 표기하지 않음 |
| 새 facades의 실제 데이터 사례 | 전체 realistic 실행에 포함된 45/45: 세 facade × 세 pinned datasets × 다섯 변형 |
| Render | 9개 public/primitive PNG·SVG·PDF 동등성, V pixel 보존 |
| Public example browser | 세 예제 각각 1/1 통과 |
| 문서 | Source 47/47, build와 124페이지 links/assets, desktop/search/keyboard/Axe/no-JS 및 320/390/768px 전체 browser 통과 |
| 같은 tarball 설치 검증 | Exit 0. Node/Basic/extension/renderers/MCP/strict TS positive·negative/tutorials/Vite 모두 통과 |
| 같은 tarball 실제 Chromium 소비자 | 1/1 통과. Full/Basic/SVG import·render와 기존 guide/selection lifecycle 확인 |
| 최종 기록과 호출 | Navigation/documentation-truth 10/10, chart 문서의 lower/public 호출 3쌍 동등성, Markdown 14개 local links 306개 확인 |

Realistic 전체 실행에서 실패한 검사 이름과 test-only 교정의 범위는
[최종 통합 기록](RESULTS.md#최종-통합-검증)에 남겼다. 50개 실제 데이터셋의 `REALISTIC_SCENARIO_RECIPES`와
runtime은 교정으로 바뀌지 않았다. 이미 통과한 normal·coverage·시각 검사는 숫자 상한과 내부 문서 변경만으로 반복하지 않았다.
최종 source hashes 90개·PNG hashes 18개, Current 177 / Planned 0, 47 findings / 46 work packages / 12 phases와 F20 제외도 확인했다.
로그는 `.artifacts/roadmap6-authoring/phase3-approved-{package,package-browser,contracts}.log`,
`phase3-exit-navigation.log`, `phase3-exit-document-calls.json`, `phase3-exit-integrity.json`이다.

## 승인된 bundle과 같은 artifact 재검증

| 엔트리 | 실제 gzip bytes | 승인 상한 | 남은 bytes |
| --- | ---: | ---: | ---: |
| Full | 235,923 | 237,000 | 1,077 |
| Basic | 124,897 | 125,000 | 103 |
| SVG | 6,418 | 25,000 | 18,582 |

검토 당시 압축파일을 다시 pack하지 않고 그대로 재사용했다. Tarball은 `ggaction-0.0.12.tgz`,
SHA-256 `436bc7ba0475f78ddeb5040193b61c15325869240a4f05c5c03cf7663d301314`다.
Packed 481,057 / unpacked 2,300,288 bytes, 436 entries. 압축·minifier·측정 fixture와 bundle bytes는 변하지 않았다.
Basic 여유가 103 bytes이므로 후속 변경도 현재 guard를 통과해야 한다.

이전 235,000-byte 상한의 실패 evidence는 [package-results.json](package-results.json)에 보존했다.
승인 후 통과한 별도 evidence는 [package-approved-results.json](package-approved-results.json)이다.
이 artifact는 로컬 설치 검증용이며 registry publish나 release 승인을 뜻하지 않는다.

## 재현 명령

상한 적용 commit 또는 이 review package를 checkout한다. Lockfile로 의존성을 설치하고, Playwright Chromium과
docs용 locked gems는 repository-local 환경에 준비한다. 이전에 검증한 tarball이 있으면 아래 같은 artifact 검증을 사용한다.

```sh
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"
shasum -a 256 .artifacts/release/ggaction-0.0.12.tgz
node scripts/package-consumer.js "$PWD/.artifacts/release/ggaction-0.0.12.tgz"
GGACTION_PACKAGE_SPEC="$PWD/.artifacts/release/ggaction-0.0.12.tgz" node --test test/browser/package-consumer.browser.js
npm run test:contracts
```

Tarball이 없는 원격 checkout은 `npm run package:pack`으로 생성하고 위 SHA-256을 먼저 비교한다.
해시가 다르면 같은 artifact라고 표시하지 않는다. 현재 source의 일반 consumer 검증은 `npm run test:package`로도 가능하다.
시각 재현은 `node agent_docs/impl/roadmap6/phase3/render-public-review.mjs`이며 기존 V snapshot을 덮어쓰지 않는다.
전체 검증 명령과 이전 실행 범위는 [VALIDATION.md](VALIDATION.md)를 따른다.

## 처분과 다음 경계

- F01/F06/F07의 세 액션은 모두 Current다. 전체 Current 177, Planned 0이며 F20은 계속 제외한다.
  구현 결과는 [원장](../PROPOSALS.json), [추적 문서](../TRACEABILITY.md), [진행 상태](STEP1.md)와 연결했다.
- 기존 guide·encoding·statistical owner를 조합하는 이번 범위를 완료했으며 새 mark family나 저장 schema를 추가하지 않았다.
- X 승인 효과는 Phase 3 결과·명시한 한계·후속 범위의 수용과 다음 계약 Gate 준비다.
  다음 단계의 구체 API·시각 target은 해당 계약과 시각 검토를 따른다.
- PR 생성·배포·publish는 이 검토의 승인 범위가 아니다. X 사용자 승인 전 Phase 3 completed로 기록하지 않는다.

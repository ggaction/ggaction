# Human documentation / README audit

검토 기준: ggaction `main`, `202b7afd4146a691c136964c4cc53f9c37444513`, package `0.0.22`, 2026-10-23. 아래 `path:line`은 모두 `ggaction/` 기준이다. 저장소 파일은 수정하지 않았다. 독립 재현 코드는 [human-probes.mjs](./human-probes.mjs), 결과는 [human-probe-results.json](./human-probe-results.json)에 있다.

## 판단 요약

문서가 부족하거나 오래된 내용뿐인 저장소는 아니다. 설치부터 결과까지 이어지는 Vite 안내, 17개 tutorial과 27개 recipe, 현재 계약에서 생성한 참조, 예제 프로그램과 그림의 연결, 실행/빌드/브라우저 검증 기반이 이미 있다. 문제는 기능 추가 후 **관련 설명과 발견 경로가 같은 속도로 갱신되지 않는 점**, **주요 예제를 통과한 뒤 나오는 후속 예제의 실행 문맥이 느슨한 점**, **읽기/쓰기 양쪽에서 내부 분류와 생성 구조가 많이 노출되는 점**이다.

P2는 이용자가 실패하거나 잘못된 계약/작성 경로를 선택할 수 있는 문제, P3는 국소 정확성·이해 비용 문제로 사용한다. 설계 기회는 검증된 버그와 별도 구분한다. 재현 실패는 library 기능 결함이 아니라 해당 문서 또는 문맥 계약의 결함이다.

## 확인된 문제

### H01 — README의 릴리스 명령이 현재 버전에서 실패함 [P2 / outdated / 재현]

- 근거: `README.md:252`는 현재 버전을 `0.0.22`로 표시하지만 `README.md:273`은 `npm run release:prepare -- 0.0.16 --dry-run`을 그대로 실행하도록 안내한다.
- 실제 보호 동작: `scripts/prepare-release.js:26–30`은 현재보다 낮은 버전을 거부한다.
- 재현: 안내 명령 exit 1, `Release preparation cannot downgrade the package.` dry-run이므로 변경 없음.
- 영향: README의 유지관리자 진입 경로가 첫 실행부터 실패한다. 문서가 현재 릴리스 준비 절차와 동기화되지 않았다는 직접 신호다.
- 개선: 특정 과거 번호 대신 `<next-version>` 문법과 버전 선택 조건을 안내한다. 실제 실행 예를 원하면 release generator가 현재 버전 기준으로 생성하거나 테스트한다. 공개 사용자 README에서는 릴리스 세부 단계를 CONTRIBUTING 또는 maintainer guide로 옮기는 편이 읽기 부담도 줄인다.

### H02 — 브라우저 호환성 설명이 실제 CI 및 다른 문서와 충돌함 [P2 / outdated / source verified]

- 근거: `docs/compatibility.md:8–12`는 Chromium만 현재 자동 호환성 주장에 포함되고 다른 브라우저는 포함되지 않는다고 한다.
- 대조: `docs/api/rendering.md:104–117`은 Chromium/Firefox/WebKit의 대표 장면 검사 범위를 정확하게 설명한다. `.github/workflows/ci.yml:227–247`와 `.github/workflows/release.yml:466–505`에는 Firefox/WebKit 검사가 있다.
- 영향: 이용자가 지원 범위를 과소평가하며, agent는 검색된 페이지에 따라 서로 다른 답을 생성한다.
- 개선: 환경 매트릭스의 한 canonical source를 두고 compatibility/rendering/getting-started에서 공통 사용한다. 문서 사이트 UI 검사는 Chromium, 설치된 renderer 대표 장면 검사는 세 브라우저라는 범위 차이를 보존한다. 모든 브라우저 버전에 대한 지원 보장으로 확대하면 안 된다.

### H03 — line recipe의 후속 레이어 예제가 Canvas 없이 시작함 [P2 / execution failure]

- 근거: `docs/recipes/line-chart.md:58–68`은 `const layered = chart().createData(...).createBarMark(...).encodeX(...)...`로 새 프로그램을 만들지만 `createCanvas()`가 없다.
- 재현: 문서의 date/value 필드를 갖는 2개 유효 행으로 `Graphical layout requires Canvas dimensions and margin.` 발생.
- 영향: 기본 recipe는 성공해도 그대로 다음 레이어 예제를 따라가면 실패한다.
- 개선: 새 분기라면 Canvas를 넣고 완결된 대안을 선언한다. 기존 프로그램의 continuation이라면 실제 변수와 선행 상태를 명시한다. 다른 API 페이지의 동일 계열 결함은 별도 correctness audit와 합쳐 관리할 것.

### H04 — heatmap recipe의 label continuation이 두 대안 중 어느 상태를 쓰는지 불명확함 [P2 / ambiguous context + reproduced failure]

- 근거: `docs/recipes/heatmap.md:14–28`과 `:35–46`은 서로 다른 데이터 형태로 동일한 `program` 이름을 선언한다. 두 번째는 weight/economy 원자료를 binning한다. 이후 `:70–77`은 조건 없이 `program...encodeText({ field: "value" })`를 제안한다.
- 재현: 바로 앞의 binned program을 사용하면 `Unknown text field "value".`가 발생한다. pre-gridded 분기의 value 필드에는 맞는 코드다.
- 영향: 사용자가 binned 흐름을 선택했을 때 label 추가에서 막힌다. 독자가 두 code block을 연속 붙이면 const/import 중복 문제도 별도로 생긴다.
- 개선: `pregriddedProgram`, `binnedProgram`처럼 대안을 구별하고 label 예제의 대상과 source field를 명시한다. 가능하면 두 분기에 각각 지원되는 label 예제를 둔다. 단순히 generic fragment 표시를 추가하는 것으로는 필요한 데이터 grain 차이를 설명하지 못한다.

### H05 — 공개 runtime 참조 생성기가 새 package entry 세 개를 누락함 [P2 / coverage gap]

- 근거: `scripts/generate-doc-signatures.js:112–130`은 runtime 참조 입력을 7개로 고정한다. `docs/reference/runtime.md`에는 `ggaction`, basic, svg, png, pdf, diagnostics, persistence만 있다.
- 현재 `package.json`의 module export는 11개다. extension은 별도 문서 경로가 있지만 inspection/accessibility/scene은 exact runtime reference에 없다. `docs/reference/types.md`는 program action 및 관련 option 타입을 생성하므로 세 entry의 별도 함수·return contract를 보충하지 못한다.
- 실제 결손: `describeAction`, `inspectProgram`, `exportAccessibleData`, `createSVGScene`, `createCanvasScene` 등의 완전한 함수/반환 타입 참조가 공개 exact-reference 경로에서 빠진다. 기능 자체와 설명 페이지가 없는 것은 아니다.
- 연관 drift: `docs/getting-started.md:118–129` 표는 scene을 누락하고, `docs/compatibility.md:16–23` 표는 diagnostics/persistence/accessibility/inspection/scene을 누락한다. `README.md:211–224`는 이 entry들을 포함한다.
- 개선: 공개 export manifest에서 entry/environment/declaration/guide/reference route를 도출하고, 모든 공개 entry에 참조 소유자가 있는지 검사한다. runtime 참조에는 전체 함수 시그니처뿐 아니라 이름 있는 반환 타입으로 이동할 수 있는 링크도 제공한다. extension은 의도된 별도 소유자라는 예외를 명시한다.

### H06 — source refresh 지침 일부가 `reviseData` 도입 전의 수동 재구축 패턴에 머묾 [P2 / outdated guidance]

- 현재 안내: `docs/data-updates.md:8–43`은 `reviseData`가 새 snapshot을 만들고 derived transforms, marks, scales, guides 등을 재계산한다고 설명한다.
- 충돌하는 후반 설명: 같은 페이지 `:120–126`은 source가 바뀌면 source와 derived datasets를 다시 생성하라고 일반적으로 안내한다. `docs/recipes/repair-missing-observations.md:45–48,67`은 replacement 생성 → derive 전체 재작성 → mark rebind를 안내하며 `reviseData`를 연결하지 않는다.
- 재현: complete → impute → movingMean → line workflow에 `before.reviseData({ source: "raw", id: "replacement", values: [...] })`를 적용하면 기존 `[2,3,5]`가 `[4,5,7]`로 재계산되고 원본 snapshot은 그대로 남는다.
- 구분: 수동 recipe는 실행 가능하며 `reviseData`도 원본 row를 직접 수정하지 않는다. 따라서 “immutability 설명이 틀렸다”가 아니라, 현재 목적에 맞는 더 직접적인 public action이 소개되지 않고 일부 문장이 과도하게 일반화된 문제다.
- 개선: 동일 schema의 source refresh에는 reviseData, schema/구조 변화에는 rebuild, transform 설정 변화에는 focused editor, 독립 mark의 새 data 연결에는 bindMarkData라는 의사결정 표를 하나의 owner에 둔다. repair recipe가 0.0.15 호환 흐름을 의도한다면 버전 이유를 밝히고 최신 경로를 병기한다.

### H07 — recipe index의 explicit ID 규칙이 API 실제 계약과 충돌함 [P2 / misleading general rule]

- 근거: `docs/recipes/index.md:28–30`은 호환 resource가 여러 개일 때만 explicit ID를 추가하라고 한다.
- 대조: `docs/concepts/authoring-conventions.md:26–39`는 omission이 action마다 다르며 일부 액션은 단 하나의 resource에서도 ID를 요구한다고 명시한다. 같은 recipe 집합의 `repair-missing-observations.md:33–38`은 첫 complete/impute/window에도 explicit id가 있고, `edit-selected-labels.md:39–44`는 필수 label target을 사용한다. `docs/data-updates.md:14–16`의 reviseData는 source와 fresh id 둘 다 필수다.
- 영향: starter 친화적 문장으로 인해 명시 selector를 불필요한 장식으로 이해하거나 agent가 삭제할 수 있다.
- 개선: “기본 생성 facade에서는 고유한 현재 resource를 추론할 수 있다. 필수 ID와 후속 편집용 stable ID는 해당 계약을 따른다”로 범위를 좁히고 authoring conventions로 연결한다.

### H08 — box plot recipe가 quartile 계산법을 모호하게 명명함 [P3 / terminology precision]

- 근거: `docs/recipes/box-plot.md:36`은 “Tukey quartiles”라고 한다.
- 현재 구현/계약: `src/grammar/boxPlot.js:159–177`, `src/grammar/numeric.js:152–156`, `agent_docs/contract/current/COMPOSITE_MARKS.md:64–68`은 `(n−1)×p` 선형 보간 사분위수와 별도의 Tukey 1.5×IQR fence를 사용한다.
- 재현: `[1,2,3,4]`에서 q1=1.75, median=2.5, q3=3.25. “Tukey quartiles”가 Tukey hinges를 뜻한다고 읽으면 다른 값이 예상될 수 있다.
- 개선: “linearly interpolated quartiles with Tukey 1.5×IQR fences; whiskers end at observed in-fence values”로 두 정책을 분리한다. public API reference에도 정확한 수치 예제를 둔다.

### H09 — calendar bucket 예제의 discovery metadata가 핵심 액션 대신 scatter 생성으로 연결됨 [P2 / findability]

- 근거: `docs/_data/chart_examples.yml:984–998`의 `time-unit-data`는 제목/설명 모두 calendar buckets인데 대표 actions는 createScatterPlot/encodePointRadius/createTitle이고 destination도 createScatterPlot reference다.
- 대조: `examples/time-unit-data/program.js:71–79`에서 두 패널 차이를 실제로 만드는 핵심은 `createTimeUnitData({ field: "date", unit: "month", as: "month" })`다.
- 영향: calendar bucketing을 배우려고 결과를 선택한 사람이 scatter reference로 가며, 검색·갤러리·자동 추출된 관련 액션의 주제성이 약해진다. URL이 유효하므로 링크 검사만으로 잡히지 않는다.
- 개선: destination을 time-unit guide/reference로 바꾸고 representative action에 createTimeUnitData를 넣는다. 이 사례를 시작으로 chart catalog의 title/task/actions/destination 의미 일치 여부를 점검한다. 무조건 trace에서 첫 세 action을 골라 대표 액션으로 삼으면 같은 문제가 반복된다.

### H10 — recovery 예제가 렌더링 실패에도 현재 상태를 교체함 [P2 / integration semantics]

- 근거: `docs/errors-and-recovery.md:50–73`의 “Recover without losing the previous chart” 예제는 `current = candidate` 후 `render(current, context)`를 같은 try/catch에 넣고 모든 실패에 `ok:false`를 반환한다.
- 재현: 성공한 revise와 throw하는 renderer stub을 넣으면 `ok:false`이지만 current는 revision 2다. 이전 revision은 current에 남아 있지 않다.
- 영향: action 실패와 renderer 실패를 동일한 복구 상태처럼 이해하게 한다. 실제로 library의 action immutability가 깨지는 문제는 아니다.
- 개선: authoring 성공과 rendering 성공을 구분해 반환하고 이전/candidate 상태 보존을 예제에 명시한다. rendered 성공 후 상태를 commit하는 패턴을 택하더라도 Canvas가 일부 그려진 뒤 실패하는 상황까지 원자적으로 복구된다고 주장하면 안 된다. 출력의 원자성까지 필요하면 별도 surface에서 render 후 교체하는 host 패턴을 설명한다.

### H11 — scatter tutorial에 이전 버전 코드의 문맥이 남아 있음 [P3 / outdated local prose]

- 근거: `docs/tutorials/scatterplot.md:75–77`은 “omit the earlier constant encodeRadius”라고 하지만 앞 complete program `:24–57`에는 encodeRadius가 없다. 현재 앞부분은 createScatterPlot facade다.
- 영향: “어느 코드를 삭제하라는가”라는 불필요한 탐색과 초기 radius/field size 충돌에 대한 혼동을 유발한다.
- 개선: 실제 current program을 출발점으로 설명하거나 “만약 earlier variant에서 encodeRadius를 명시했다면”이라는 조건부 규칙으로 바꾼다. radius와 size의 실제 incompatibility 자체를 제거할 필요는 없다.

## 읽기 경험 개선 기회 — 버그 판정과 분리

### O01 — README의 첫 성공을 앞당기기

`README.md:16–54`의 첫 코드가 cars 외부 데이터 fragment이고, 설치 Quick start는 `:94` 이후다. MCP 소개와 576-run benchmark 설명이 설치보다 먼저 나온다. fragment 표시는 명확하므로 실행 가능성을 속이는 버그는 아니다. 다만 사람에게는 첫 완결 결과까지의 거리가 길다. 제안 순서: 한 문단 가치/결과 → 최소 설치와 완결 chart → immutable edit 한 번 → 지원 범위/출력 → LLM 연결 → 기여/개발. MCP를 찾는 agent를 위해 상단 짧은 바로가기는 유지한다. 벤치마크 주장은 범위를 보존하고 별도 평가 문서로 이동할 수 있다.

### O02 — tutorial과 recipe의 분업을 강화하되 중복이라는 이유로 합치지 않기

현재 tutorial 17개, recipe 27개이며 동일 slug는 8개다: scatterplot, line-chart, histogram, regression-scatterplot, density-area, horizon, error-bar, error-band. 동일 주제의 두 문서 존재 자체는 정당하다. scatter tutorial 168줄은 complete code 뒤 semantic/graphic 설명과 variants를 제공하며, recipe 48줄은 최소 flow와 input/inference를 정리한다. line tutorial 159줄과 recipe 80줄은 curve edit 설명이 겹치고 recipe에 layered extension까지 들어가 분업이 약해진다.

Tutorial은 실제로 한 단계씩 추가/수정하며 전후 상태와 실패 이유를 보여 주고, recipe는 한 task·명시 input shape·한 실행 프로그램·expected output으로 유지한다. 공통 exact defaults는 normative API로 연결한다. 전체 프로그램을 먼저 보여주는 형식은 빠른 복사에는 좋지만 모든 tutorial이 그 형식이면 “왜 이 순서인가”를 학습하기 어렵다. 모든 recipe가 차트 유형일 필요는 없으며 8개 편집 workflow recipe는 사용 목적에 잘 맞는다.

### O03 — 초보자 경로에서 내부 분류를 뒤로 미루기

`docs/api/chart-picker.md:14–20`은 첫 chart 표 이전에 H0–H4/API layer/package entry의 세 분류를 설명하고 표 한 행에 최대 10여 개 lower-level action을 나열한다. 분류가 잘못된 것은 아니다. 첫 선택 단계에는 “질문/데이터 형태/결과/최소 호출/다음 문서”가 더 직접적이다. 역할 태그와 decomposition은 고급 펼침 영역이나 agent metadata에서 유지한다. `docs/_data/pages.yml:10–21`에서 MCP와 LLM authoring이 Tutorials보다 먼저인 구성도 사람이 따라갈 순서와 agent routing을 별도 진입점으로 두면 부담이 줄어든다.

### O04 — 초보자 rendering 경로와 고급 text/scene 계약을 분리하기

`docs/api/rendering.md`는 538줄이며 출력 요약표가 92줄, 첫 기본 program이 123줄에서 시작한다. 앞 19–90줄은 measured text profile의 고급 authoring 계약이다. 후반에는 접근성 데이터와 transition scene까지 있다. 네 출력의 최소 사용법을 먼저 놓고 measured text는 fonts/text-layout, scene은 dedicated transition-scene guide로 분리하면 고급 계약의 소유자도 명확해진다. 단순 페이지 쪼개기보다 출력 선택→실행→제약→고급 제어 순서를 먼저 잡는다.

### O05 — generic snippet callout을 실제 문맥으로 바꾸기

공개 Markdown 150개 중 65개 페이지에 공통 문구 “Contextual fragment. Use an ES module with the imports, data, and prepared resource state described in this section.”가 총 328회 있다. 라벨 자체는 필요하지만 “이 절의 setup을 찾아라”가 반복되어도 정확한 program/field/resource 조건은 전달되지 않는다. `docs/api/rendering.md:33–38`은 본문이 complete browser example이라고 하고 바로 아래 자동 callout은 contextual fragment라고 부른다.

각 snippet에 stable ID, mode(complete/continuation/alternative/expected-error), base snippet ID, 환경, input fixture, expected observable을 기록한 뒤 사람에게는 짧은 실제 prerequisite를 렌더링한다. action signature 의사코드와 실행 JavaScript도 다른 라벨/언어로 구분한다. 모든 후속 code block을 의미 있게 검증해야 하며 “페이지마다 대표 block 하나 실행”과 구별해야 한다. 현재 `scripts/doc-snippets.js:34–56`는 파일별 선택된 block 한 개를 반환한다.

### O06 — inspection 문서를 하나의 완결 왕복 예제로 시작하기

`docs/inspection.md:15–82`는 import, schema, preflight, compare, inspect 예제가 있지만 program/before/after와 sales/points/category의 실물 설정 및 결과 구조가 없다. 이들은 숙련자용 fragment로는 가능하지만 새로운 사용자와 agent가 안전하게 응용할 출발점이 약하다. 실제 두 행→차트→static preflight→실행→diff→결과 count를 한 흐름으로 보여 주고 expected JSON을 축약해 제시한다. `supported`와 execution success 차이는 현재 `:51–53`에 잘 설명되어 있으므로 유지한다.

### O07 — 기여자에게 “무엇을 고치면 어디를 편집하는가” 표 제공

`docs/README.md:26–69`는 설치, 전체 pipeline, verification, provenance를 이미 충실하게 설명한다. `CONTRIBUTING.md:44–58,71–78`도 docs:verify와 동기화를 요구한다. 따라서 “개발 안내가 없다”는 평가는 틀리다. 다만 일반 문장 수정, action behavior 수정, exact signature, new chart/example, gallery order, navigation, snippet fixture, LLM chunk의 **편집 원본→생성물→최소 검사**를 연결하는 표는 이 두 진입 문서에 없다.

예: signature는 types/program.d.ts→docs:signatures, action prose는 docs/_sources/action-reference.md→docs:reference, 차트 카드/route는 docs/_data/chart_examples.yml, 페이지 계층은 docs/_data/pages.yml, workflow는 canonical examples→docs:workflows, runnable snippet contract는 docs/_data/snippet_programs.json. 실제 owning scripts를 확인한 작업별 표와 한 개의 patch 예제를 제공하면 human/agent 모두 generated output을 잘못 고치는 일을 줄일 수 있다. AGENTS의 “generated file 직접 수정 금지”만으로는 올바른 원본을 찾는 비용이 없어지지 않는다.

## 오해하면 안 되는 점 / 유지해야 할 장점

- `docs/version.md:13,26,38`의 v0.0.13은 명시된 migration comparison baseline이다. 단순히 오래된 버전 문자열이 있다는 이유로 outdated 오류로 세면 안 된다.
- 0.0.15 이상을 요구하는 8개 workflow recipe에서 사용한 public method들은 `git show v0.0.15:types/program.d.ts`에 실제 존재했다. 이 audit는 그 minimum-version 문구를 무조건 틀리다고 판정하지 않았다. 모든 nested option의 당시 실행 호환성까지 검사한 것은 아니다.
- `Available by v0.0.22`는 최초 도입 버전 주장과 다르다. 정확한 최초 버전이 없다는 한계는 있지만 거짓 availability라고 보면 안 된다.
- Getting Started는 실제 Vite project, HTML, inline rows, render까지 제공한다. `basic`과 Full 전환 경계, optional peers도 명시한다.
- Concepts는 semantic/graphic 분리, no implicit compiler, immutable state, trace 요약, generated ID 불안정성을 구체적으로 설명한다. foundation을 다시 만드는 것보다 newcomer 경로와 link를 다듬는 편이 낫다.
- Data policies는 input/output grain, missing/weight semantics, confidence와 density 단위 차이를 잘 비교한다. 이 표를 다른 통계 설명의 기준으로 유지할 가치가 있다.
- exact contracts, example source pinning, provenance fingerprint, image generation, installed-package consumer 검사가 이미 존재한다. 개선은 이 기반 위에서 semantic coverage와 patch routing을 강화하는 방향이다.

## 검토 범위와 한계

직접 읽고 비교한 주요 범위: root/docs AGENTS, README, CONTRIBUTING, docs/README, landing/getting-started, navigation/page/chart manifests, concepts 4개, supported-features, compatibility/version/versioning/performance/responsive/data-updates/inspection/errors/troubleshooting, tutorial/recipe indexes, 전체 recipe 27개 전문, scatter/line tutorial 전문과 나머지 tutorial의 구조·설명 중심 표본, chart picker, basic charts, box plots, rendering, reference runtime/signature generator, 실행 snippet registry/harness. 전체 공개 Markdown의 파일 수·callout 반복 수와 tutorial/recipe 집합을 계산했다.

코드 대조는 release guard, box statistics, source revision workflow, public package exports, runtime reference generator, selected tutorial/recipe 실행, chart example metadata에 집중했다. 이 분담에서는 live 사이트의 모든 화면이나 전체 API 옵션을 독립적으로 재검증하지 않았다. 사이트 UI/검색 및 광범위한 API snippet correctness는 병렬 audit에서 다룬다.

재현 명령:

```bash
cd /Users/hj/Desktop/ggaction_chongjeonglee
node study/docs-audit/human-probes.mjs
```

재현기는 실패가 예상되는 문서 예제와 성공하는 대안의 결과를 함께 기록한다. “스크립트 exit 0”은 모든 문서 예제가 성공했다는 뜻이 아니다. 개별 JSON의 ok/error/result를 보아야 한다.

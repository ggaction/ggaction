# ggaction 문서 상세 점검 결과

[종합 보고서](REPORT.ko.md) · [개선 계획](ROADMAP.ko.md) · [편집 원본 지도](AUTHORING_MAP.ko.md)

기준은 `v0.0.22`, commit `202b7afd4146a691c136964c4cc53f9c37444513`이다. P1은 사용 차단·반복적 검증 공백, P2는 정확성·탐색·기여에 유의미한 문제, P3는 국소 표현·배치 개선이다. 아래 24개 항목과 뒤의 8개 설계 개선안은 중복을 합쳐 분류했다.

## 실행 예제와 복구

<a id="f01"></a>
### F01 공개 예제 7개가 Canvas 생성 누락으로 실패한다

**P1 · 재현된 실행 오류.** 아래 예제들은 외부 setup의 continuation이 아니라 직접 `chart()`로 빈 프로그램을 시작한다. 적절한 import와 데이터가 있어도 `Graphical layout requires Canvas dimensions and margin.`이 발생한다. `.createCanvas()`만 추가하면 7개 모두 통과한다.

| 원문 위치 | 의도 |
| --- | --- |
| [bar.md:29](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/bar.md:29) | histogram bar mark |
| [line-area.md:23](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/line-area.md:23) | temporal aggregate line |
| [line-area.md:125](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/line-area.md:125) | bar 위 aggregate line |
| [line-area.md:207](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/line-area.md:207) | polar/radar line |
| [line-area.md:234](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/line-area.md:234) | interval area |
| [point.md:35](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/point.md:35) | scatter point mark |
| [line-chart recipe:62](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/line-chart.md:62) | layered line |

**개선:** fresh chain에는 Canvas를 포함하고, continuation이면 실제 base program을 선언한다. **완료 기준:** 7개 문서 원문을 그대로 추출해 실행하고 관련 graphics를 검사한다. [재현 코드와 before/after 결과](correctness-evidence.json). 이 7개는 확인된 수이며 전체 문서 오류의 상한이 아니다.

<a id="f02"></a>
### F02 heatmap의 label 예제가 어느 분기를 이어받는지 불명확하다

**P2 · 조건 누락과 조건부 실패.** [heatmap recipe:14](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/heatmap.md:14)와 [35행](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/heatmap.md:35)은 pre-gridded 입력과 raw-row binning이라는 대안을 모두 `program`으로 선언한다. [70행](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/heatmap.md:70)의 `encodeText({ field: "value" })`는 첫 분기에는 맞지만 두 번째 분기에는 `Unknown text field "value".`를 낸다.

**개선:** `pregriddedProgram`과 `binnedProgram`으로 구분하고 label의 data grain·field를 지정한다. **완료 기준:** 각 대안에서 바로 뒤 label 단계를 실행한다. 첫 분기도 실패한다고 일반화하지 않는다. [실행 결과](human-probe-results.json).

<a id="f03"></a>
### F03 복구 예제가 렌더링 실패 전에 current를 교체한다

**P2 · host 상태 복구 계약의 공백.** [errors-and-recovery.md:50](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/errors-and-recovery.md:50)는 이전 차트를 잃지 않는다고 설명하면서 `current = candidate` 후 같은 try 블록에서 render한다. 정상 Canvas context에서도 width 40000인 후보를 만들면 action은 성공하고 렌더러가 32767 제한으로 실패하지만 current는 이미 바뀐다.

**개선:** authoring 성공과 rendering 성공을 구분하고 이전·후보 상태를 보존한다. 출력까지 원자적으로 바꿔야 하면 별도 surface에 render 후 교체한다. **완료 기준:** action 실패와 renderer 실패에서 반환 상태와 현재 program이 명확하다. 단순히 대입 순서를 바꾸었다고 부분적으로 그려진 Canvas까지 복구된다고 설명하지 않는다. 라이브러리 불변성이 깨진 문제가 아니다. [재현](evidence/recovery-probe.json).

<a id="f04"></a>
### F04 margin 문제의 복구 예제가 새 Canvas를 전제한다

**P2 · 선행 상태 누락.** [troubleshooting.md:11](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/troubleshooting.md:11)는 legend margin 문제 아래 `program.createCanvas(...)`를 제시한다. 이미 Canvas가 있는 차트에 적용하면 `createCanvas requires a program without a canvas.`가 난다. 초기 생성에 사용하는 경우에는 유효하다.

**개선:** 초기 margin 설정과 기존 program의 `editCanvas`를 분리하고 반환 program을 이어서 사용한다. 원래 legend 생성이 실패했다면 margin을 수정한 분기에서 다시 호출하는 단계도 명시한다. **완료 기준:** 두 선행 상태를 구별한 복구 예제가 실행된다. action-only fragment의 반환값 생략 자체를 모든 페이지의 버그로 간주하지 않는다. [재현](evidence/recovery-probe.json).

## 현재 동작과 다른 설명

<a id="f05"></a>
### F05 createTimeUnitData의 as 필수 여부가 같은 페이지에서 모순된다

**P2 · 확정된 계약 모순.** [time-units.md:18](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/data/time-units.md:18)은 생략 시 `${field}_${unit}`를 사용한다고 하고, [57행](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/data/time-units.md:57)의 표는 required라고 한다. 타입과 [timeUnit.js:125](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/src/grammar/timeUnit.js:125)는 optional/default를 구현한다. 생략한 호출도 실행된다.

**개선:** required/type 표는 타입에서 생성하고 default와 collision 조건을 하나의 owner에서 설명한다. **완료 기준:** 생략·명시·이름 충돌 사례가 문서·타입·실행에서 일치한다. [재현 결과](correctness-evidence.json).

<a id="f06"></a>
### F06 축약 signature와 일부 기본값 및 통계 설명이 정확한 계약처럼 보인다

**P2 · 확인된 설명 불일치.** 단순 object-heading 비교로도 **15개** 제목에서 실제 옵션이 빠졌다. 뒤 본문에 옵션이 있는 경우도 있어 기능 미지원으로 집계하지 않는다. [전체 목록](correctness-evidence.json)의 `abbreviatedSignatures`를 참고한다.

| 위치 | 문제 | 현재 동작 |
| --- | --- | --- |
| [statistical-transforms.md:10](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/data/statistical-transforms.md:10) | `robustIterations`가 signature/옵션 표에 없음 | regression guide와 타입은 지원 |
| [mark-style.md:164](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/appearance/mark-style.md:164) | `encodeBarWidth` 제목에 interval 없음 | interval branch가 있음 |
| [point.md:64](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/point.md:64) | edit 제목에 missing/clip 없음 | 구현에서 허용 |
| [bar.md:21](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/bar.md:21) | create 제목에 orientation/clip 없음 | orientation은 같은 페이지 앞 문단에도 안내 |
| [point.md:24](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/marks/point.md:24) | strokeWidth default를 항상 0으로 표시 | stroke를 주면 1 |
| [statistical-transforms.md:42](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/data/statistical-transforms.md:42), [regression.md:72](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/regression.md:72) | interval 값 표에서 false 누락 | 본문과 구현은 false 허용 |
| [statistical-transforms.md:50](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/data/statistical-transforms.md:50) | LOESS 이웃 수를 ceil로만 설명 | `max(2, ceil(span * groupSize))` |

**개선:** 정확한 signature와 사람이 읽는 common pattern을 구분한다. default·inference·통계 branch는 실행 가능한 계약 사례로 검증한다. **완료 기준:** 모든 축약 제목에 그 성격이 드러나고, 표의 선택성·허용 값·조건부 기본값이 current type/runtime와 일치한다.

<a id="f07"></a>
### F07 브라우저 자동 검증 범위가 오래된 설명에 머문다

**P2 · outdated 설명.** [compatibility.md:8](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/compatibility.md:8)은 Chromium 외 브라우저를 automated claim 밖으로 둔다. [rendering.md:104](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/api/rendering.md:104)와 [ci.yml:223](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/.github/workflows/ci.yml:223)은 Firefox/WebKit 검증을 명시한다.

**개선:** docs UI 검사와 라이브러리 renderer compatibility를 구분한 canonical matrix를 만든다. **완료 기준:** Node/OS/engine/검증 종류/제한을 한 데이터에서 안내하며 CI matrix 변경 시 불일치가 검출된다. 대표 장면 통과를 모든 폰트·버전·기능의 완전 지원으로 확대하지 않는다.

<a id="f08"></a>
### F08 source refresh 안내 일부가 reviseData 이전 패턴에 머문다

**P2 · outdated 사용 경로.** [data-updates.md:8](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/data-updates.md:8)은 `reviseData`와 파생 결과 재계산을 안내하지만 [120행](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/data-updates.md:120)은 source와 derived를 재생성하라고 일반적으로 안내한다. [repair-missing-observations.md:45](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/repair-missing-observations.md:45)도 수동 replacement→derive→rebind만 제시한다.

complete→impute→movingMean→line 흐름에 reviseData를 적용하면 `[2,3,5]`가 `[4,5,7]`로 재계산되고 이전 source는 보존된다. 수동 방식도 유효하므로 실행 오류가 아니라 현재의 직접적인 action을 놓치는 문제다.

**개선:** 동일 schema의 source refresh, schema 변경, transform 설정 변경, 독립 mark rebind를 구분하는 의사결정 표를 data-updates에 둔다. **완료 기준:** 관련 recipe가 그 표를 연결하고 양쪽 경로의 선행조건을 설명한다. [재현](human-probe-results.json).

<a id="f09"></a>
### F09 explicit ID에 대한 보편 규칙이 action별 계약을 덮는다

**P2 · 잘못 일반화한 안내.** [recipes/index.md:28](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/index.md:28)은 호환 resource가 여러 개일 때만 explicit ID를 추가하라고 한다. [authoring-conventions.md:26](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/concepts/authoring-conventions.md:26)은 resource가 하나여도 일부 action에는 ID가 필수라고 정확하게 설명한다. reviseData의 source/fresh id 등이 해당한다.

**개선:** 편리한 inference가 가능한 facade의 일반 패턴과 필수 selector/안정적인 편집 ID를 구분한다. **완료 기준:** recipe 축약 규칙을 따라도 필수 ID가 제거되지 않으며 agent가 exact signature를 우선한다.

<a id="f10"></a>
### F10 box plot의 quartile 용어가 계산법을 모호하게 설명한다

**P3 · 통계 용어의 정밀성.** [box-plot recipe:36](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/recipes/box-plot.md:36)은 “Tukey quartiles”라고 한다. 구현은 `(n−1)×p` 선형 보간 quantile과 별도의 Tukey 1.5×IQR fence를 사용한다. `[1,2,3,4]`의 q1/median/q3는 1.75/2.5/3.25다.

**개선:** quartile estimator와 fence/whisker 규칙을 따로 명시한다. **완료 기준:** 작은 수치 예제로 설명과 구현이 대응한다. box plot 계산 자체가 잘못되었다는 판정은 아니다. [재현](human-probe-results.json).

<a id="f11"></a>
### F11 scatter tutorial이 존재하지 않는 앞 코드를 가리킨다

**P3 · outdated 문맥.** [scatterplot tutorial:75](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/tutorials/scatterplot.md:75)은 “earlier constant encodeRadius”를 생략하라고 하지만 앞 complete program에는 해당 호출이 없다.

**개선:** 현재 facade 프로그램을 기준으로 설명하거나 radius를 직접 지정한 variant에만 적용되는 조건으로 바꾼다. **완료 기준:** 제거·교체 지시가 실제 코드와 연결되고 radius/size의 유효한 제약은 보존한다.

<a id="f12"></a>
### F12 README 릴리스 준비 명령의 버전이 오래되어 실패한다

**P2 · outdated 실행 명령.** [README.md:273](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/README.md:273)의 `release:prepare -- 0.0.16 --dry-run`은 현재 0.0.22에서 `Release preparation cannot downgrade the package.`로 거부된다. [prepare-release.js:29](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/prepare-release.js:29)의 정상적인 보호 동작이다.

**개선:** 사용자가 결정할 next version을 명시한 placeholder를 쓰거나 예시 버전의 적합성을 생성·검사한다. **완료 기준:** 현재 버전보다 낮은 고정 버전을 제시하지 않으며 검증은 dry-run으로 한다. [실행 결과](human-probe-results.json).

## Agent 계약과 공개 surface

<a id="f13"></a>
### F13 공개 declaration이 필요한 상대 dependency를 제공하지 않는다

**P2 · 배포 artifact의 완결성 오류.** [docs/types/program.d.ts:1](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/types/program.d.ts:1)은 `./extension.js`를 import하지만 공개 docs/types에는 program.d.ts만 있다. [machine generator:7](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/generate-doc-machine-artifacts.js:7)도 하나만 복사한다. docs 파일을 `tsc --noEmit --module NodeNext --moduleResolution NodeNext`로 검사하면 TS2307이다.

**개선:** public declaration의 import closure를 배포하거나 독립 소비용 bundle을 만든다. **완료 기준:** 실제 배포 파일만 새 디렉터리에 넣고 `skipLibCheck` 없이 컴파일한다. 현재 [compact-action-cards.test.js:220](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/contracts/compact-action-cards.test.js:220)의 skipLibCheck는 이 경로를 놓친다. **npm 설치 패키지 타입의 실패는 아니다.** [증거](agent-probe-results.json).

<a id="f14"></a>
### F14 exact runtime reference가 전체 package entry를 포괄하지 않는다

**P2 · 참조 coverage 공백.** [generate-doc-signatures.js:113](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/generate-doc-signatures.js:113)은 공개 11개 module entry 중 7개만 runtime reference에 넣는다. extension/accessibility/inspection/scene이 제외된다. extension은 별도 authoring 문서가 있지만 나머지 세 entry의 exact 함수·반환 타입 연결이 특히 약하다. [getting-started 표:118](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/getting-started.md:118)은 scene을, compatibility 표는 더 많은 최신 entry를 빠뜨린다.

**개선:** `package.json.exports`를 전체 surface 목록으로 삼고 entry마다 하나의 normative route, declaration, 환경, 최소 예제를 지정한다. **완료 기준:** 11/11 entry가 exact reference와 관련 타입으로 연결되며 새 export에 owner가 없으면 검사에서 실패한다. 모든 기능이 미문서화되었다는 뜻은 아니다.

<a id="f15"></a>
### F15 action card가 조건부 사전조건을 항상 필요한 것으로 표현한다

**P2 · 재현된 metadata 의미 오류.** [action-card-source.js:208](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/action-card-source.js:208)의 family heuristic 때문에 `editTitle`은 scale/encoding context를, `encodeColor`는 field를 요구한다고 나온다. 그러나 dataset/scale 없이 title을 수정할 수 있고, field가 없는 `[{}]` 데이터에도 상수 color 인코딩이 성공한다.

**개선:** 항상 필요한 조건과 field/constant 등 branch별 조건을 분리한다. **완료 기준:** title-only Canvas와 constant/field encoding 같은 실제 호출을 witness로 삼아 카드의 필요조건이 과도하지 않은지 검사한다. generator 출력끼리 동일한지만 비교해서는 부족하다. [probe](agent-probe-results.json).

<a id="f16"></a>
### F16 allowsEmpty의 의미가 불명확하고 유효한 빈 결과와 어긋난다

**P2 · 모호한 계약과 상충하는 metadata.** filterData/filterMarks 카드의 `allowsEmpty`는 false지만 문서·테스트·실행은 빈 결과를 허용한다. [schema:150](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/knowledge/action-card.schema.json:150)는 empty input/output/incomplete geometry 중 무엇을 뜻하는지 정의하지 않고, [metadata:120](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/action-card-metadata.js:120)는 고정 whitelist로 값을 만든다.

**개선:** 의미를 먼저 고정하고 필요하면 input/output/geometry 정책을 구분한다. **완료 기준:** 빈 source, 빈 filtered output, 자동 domain 부재, 아직 위치가 없는 mark를 별도 사례로 검증한다. 이 boolean 때문에 현재 resolver가 빈 filter를 실제로 거절한다고 확인한 것은 아니다. [probe](agent-probe-results.json).

<a id="f17"></a>
### F17 LLM 공통 규칙이 zero-argument action과 맞지 않는다

**P3 · 과도한 보편 규칙.** [llms.txt:60](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/llms.txt:60)의 “Every action accepts one option object”는 `removeTextMetrics()`, `removeTheme()`, `removeTitle()`의 공개 타입과 다르다.

**개선:** action은 새 program을 반환하며 인수는 해당 signature에 따라 0개 또는 하나의 option object라는 규칙으로 바꾼다. **완료 기준:** no-argument action에 기계적으로 `{}`를 붙이지 않는 예제·검사를 둔다.

<a id="f18"></a>
### F18 현재 architecture의 요약 지도에 신규 entry가 빠져 있다

**P2 · outdated 요약과 역사 혼재.** [SECOND_ARCHITECTURE.md:148](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/agent_docs/SECOND_ARCHITECTURE.md:148)의 tree는 persistence/accessibility/inspection/diagnostics/scene을 빠뜨리지만 같은 문서 후반에는 설명한다. JS↔type 지도도 일부 최신 entry를 누락한다. 문서는 2,834줄/214,217 bytes이며 과거 bundle budget/checkpoint가 현재 구조 설명에 반복해서 섞여 있다.

**개선:** 현재 소유권·상태·흐름·경계를 요약하고 과거 측정·변경 증거는 날짜/commit이 있는 역사 기록으로 분리한다. export/type 지도는 실제 manifest와 대응 검사한다. **완료 기준:** 모든 공개 entry를 현재 지도에서 찾을 수 있고 이전 budget이 현재 제한으로 읽히지 않는다. history 보존 자체는 문제로 보지 않는다.

<a id="f19"></a>
### F19 bounded MCP 흐름에 긴 입력과 실행 후 오류의 복구 설명이 부족하다

**P2 · 입력 계약·작업 흐름의 누락.** [adapter.js:37](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/src/mcp/adapter.js:37)는 query를 500자로 제한하지만 [mcp.md:94](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/mcp.md:94)와 LLM bootstrap은 complete exact request를 요구하며 그 제한을 안내하지 않는다. resolved packet 실행 후 숫자/레이아웃 오류가 날 때에도 latest unresolved URI에 한정한 fallback 정책을 어떻게 적용할지 분명하지 않다.

**개선:** 길이 초과를 명시하고 요구를 보존한 분할 질의 규칙, 실제 error code→정확한 action/type/guide의 복구 경로를 제시한다. 기존 MCP read-only/비실행 경계는 유지한다. **완료 기준:** 500자 초과, 정상 packet 뒤 validation 오류, layout 오류를 포함한 end-to-end 예제가 요구 누락 없이 종료한다. 프로토콜 변경 여부는 별도 설계 선택이며 보고서에서 미리 구현한 것으로 간주하지 않는다.

## 탐색과 유지보수

<a id="f20"></a>
### F20 calendar bucket 예제의 목적지가 scatter 생성으로 연결된다

**P2 · 확인된 discovery metadata 불일치.** [chart_examples.yml:984](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/_data/chart_examples.yml:984)의 time-unit-data는 제목과 설명이 calendar buckets이지만 대표 action과 destination은 scatter 위주다. 실제 핵심은 [program.js:71](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/examples/time-unit-data/program.js:71)의 createTimeUnitData다.

**개선:** 대표 action과 목적지를 time-unit guide/reference에 맞추고 title/task/actions/destination의 의미를 함께 검토한다. **완료 기준:** calendar bucketing을 찾는 사용자가 time-unit 동작 설명에 도달한다. URL 존재 검사만으로는 충분하지 않다.

<a id="f21"></a>
### F21 페이지별 대표 블록 검증이 뒤쪽 예제 오류를 놓친다

**P1 · 재현된 검증 체계의 공백.** [doc-snippets.js:45](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/doc-snippets.js:45)는 registry의 페이지마다 선택 블록 하나를 반환한다. [generate-doc-snippet-contracts.js:26](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/generate-doc-snippet-contracts.js:26)는 일치하지 않는 블록을 기본 fragment/non-executable로 기록한다. 기존 실행 suite 47개와 source suite 125개가 모두 통과하면서 F01의 7개는 실패했다.

공개 원문에는 JS 블록 675개, TS 블록 974개가 있다. registry 선택은 46블록이고 API/advanced/extension inventory 332개 중 executable 표시는 2개다. 별도 focused/package/browser 테스트도 있으므로 이 비율을 전체 테스트 커버리지로 부르지 않는다. 65페이지에 328회 반복되는 generic “Contextual fragment” 안내도 실제 setup/field/resource를 구체적으로 지정하지는 않는다.

**개선:** stable block ID별로 complete/continuation/alternative/expected-error/type-only를 선언하고 base setup, fixture, 예상 결과를 연결한다. **완료 기준:** 모든 공개 JS 블록에 실행 계약 또는 명시적 예외가 있고, 원문 중간 블록을 깨뜨리면 검사에서 실패한다. [상세 근거](correctness-review.md).

<a id="f22"></a>
### F22 검색이 action 이름보다 과제 표현에서 약하다

**P2 · 실제 검색 결과의 문제.** 새 브라우저 probe에서 `change colors`, `change the colors`, `how do I change the axis label`은 0건이다. `update data`는 Annotation Recipe와 Canvas가 Data Updates보다 앞서고, `export svg`는 Rendering guide를 결과에 넣지 않는다. `createScatterPlot` 정확 검색은 올바르게 작동한다.

[docs-search.js:119](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/assets/js/docs-search.js:119)의 literal/all-token 매칭과 동점의 알파벳 순서가 원인 후보다. **개선:** stopword·단복수 정규화, canonical task alias, 주제 owner 가중치와 query regression set을 추가한다. **완료 기준:** 사전 지정한 과제 질의의 첫 세 결과 안에 적합한 guide/API가 있고 정확 action 검색·keyboard·failure recovery를 유지한다. 26개 탐색 질의는 정식 benchmark 성공률로 제시하지 않는다. [실제 결과](evidence/site-probe.json).

<a id="f23"></a>
### F23 desktop의 접힌 navigation group이 정적 제목처럼 보인다

**P2 · 화면에서 확인된 discoverability 문제.** [navigation.scss:138](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/_sass/docs/_navigation.scss:138)는 native summary marker를 숨기고, plus/minus와 pointer affordance는 [mobile 규칙:85](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/docs/_sass/docs/_responsive.scss:85)에만 있다. desktop은 active group만 펼쳐져 다른 다섯 group이 일반 소제목처럼 보인다.

**개선:** 모든 화면에서 접힘 표시·hover/focus·클릭 영역을 일관되게 제공한다. **완료 기준:** 첫 방문자가 section을 펼칠 수 있음을 시각적으로 인지하며 keyboard 동작을 유지한다. 자동 접근성 실패나 조작 불가능을 주장하는 항목은 아니다. [desktop 화면](evidence/home-desktop.png).

<a id="f24"></a>
### F24 편집 목적과 authoritative source를 연결하는 지도가 부족하다

**P2 · 기여·유지보수 경로의 공백.** docs/README와 CONTRIBUTING은 설치 및 전체 검증을 잘 안내한다. 다만 “문장/옵션/예제/갤러리/agent 카드 수정 시 어느 원본을 고치는가”가 한 곳에 연결되어 있지 않다. 사이트의 page-specific edit/source/report route도 없다.

특히 [generate-llm-docs.js:197](/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/scripts/generate-llm-docs.js:197)는 생성 출력인 llms.txt의 marker 앞부분을 다시 원본으로 읽는다. 일부는 수기·일부는 생성이라는 ownership이 외부 contributor에게 불명확하다.

**개선:** 기존 page manifest에 source owner/edit metadata를 보강하고 curated LLM index source를 출력과 분리한다. 생성 페이지의 edit 링크는 출력이 아니라 원본으로 향해야 한다. **완료 기준:** 처음 보는 contributor가 문장·예제·옵션·카드 변경을 올바른 원본에서 수행하고 좁은 검사와 전체 검사를 구분한다. [현재 경로 정리](AUTHORING_MAP.ko.md).

## 추가 설계 개선안

아래는 현재 실패로 판정한 항목과 별개다. 정확성을 먼저 확보한 뒤 읽기·쓰기 비용을 줄이는 데 사용한다.

| ID | 제안 | 근거와 구체적인 방향 |
| --- | --- | --- |
| D01 | README의 첫 완결 실행을 앞당긴다 | 첫 코드는 외부 cars를 요구하는 명시적 fragment이고 install 앞에 MCP benchmark가 있다. 가치·설치·실행·불변 편집·기능/LLM 링크 순서를 검토한다. fragment 표시를 누락했다는 주장은 아니다. |
| D02 | tutorial과 recipe의 역할을 강화한다 | tutorial 17개/recipe 27개 중 동일 slug 8쌍. 중복이라는 이유로 합치지 않는다. tutorial은 순서·결정·전후 변화, recipe는 한 과제·입력·한 프로그램·결과에 집중한다. H0–H4는 첫 chart picker에서 후순위로 둔다. |
| D03 | 출력·inspection의 첫 사용 경로를 완결한다 | rendering은 538줄이며 고급 text metrics가 출력 표보다 앞선다. 출력 선택과 최소 예제를 먼저 두고 text/scene을 연결한다. inspection에는 실제 before/after program과 예상 결과를 포함한 왕복 예제를 둔다. |
| D04 | MCP 없는 agent의 선택적 plain-text 경로를 제공한다 | full bundle 1,914,002 bytes, actions collection 901,353 bytes. 기존 manifest로 page/action별 chunk를 생성하고 named option type의 dependency로 연결한다. MCP는 이미 action별 resource가 있으므로 없다고 서술하지 않는다. |
| D05 | 설치된 extension authoring guide의 진입점을 만든다 | `knowledge/extension-authoring.md`는 package에 있지만 public docs/README에 경로 안내가 없다. extension page와 LLM routing에서 설치 버전의 guide를 찾게 한다. |
| D06 | 계약 identity를 모든 agent artifact에 연결한다 | full/manifest의 contractId는 강점이다. packageVersion만 같은 서로 다른 branch를 혼용하지 않도록 cards/packet/resources도 같은 identity를 참조하게 한다. 현재 실제 혼용 오류를 발견한 것은 아니다. |
| D07 | MCP benchmark의 시점·범위를 주장 바로 옆에 표시한다 | 576-run 수치는 기록과 맞지만 2026-08-10의 고정 실험이다. caption에 정확한 모델/commit·24 tasks·조건 범위를 명시하고 현재버전의 재실험처럼 보이지 않게 한다. |
| D08 | 사람 화면의 반복 provenance를 줄인다 | 매 페이지 앞 status/action-count/hash, 매 검색 결과 kind/status/hash가 반복된다. 버전/개발 경고는 유지하고 fingerprint는 details·machine metadata에서 바로 찾게 한다. [mobile 화면](evidence/search-mobile.png). |

## 잘못된 결론을 피하기 위한 경계

- generated artifact가 현재 원본과 일치한다는 사실과 그 원본 설명이 맞다는 사실은 다르다.
- current release의 링크·타입·metadata를 유지하는 기반은 이미 있다. 전면 재작성이나 새 문서 플랫폼이 필수라는 증거는 없다.
- historical baseline, 최소 지원 버전, 과거 측정 자체는 오류가 아니다. 적용 범위와 current truth가 혼동되는 지점만 수정한다.
- cards의 불필요한 조건을 실행 probe로 확인했지만 그것이 실제 모든 agent의 실패율을 얼마만큼 높이는지는 측정하지 않았다.
- 이 보고서의 probe는 문서 오류와 개선 경계를 확인한다. 소스 변경이나 새로운 릴리스는 포함하지 않는다.

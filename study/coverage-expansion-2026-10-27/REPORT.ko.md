# ggaction 자체 설계를 위한 기능 확장·구현 명세

> **더 상세한 실행 문서:** [77개 카드로 구성한 구현 로드맵](ROADMAP.ko.html)과 [agent용 원문](ROADMAP.ko.md)을 추가했다. 현재 보고서는 조사·설계 근거이고, 작업 순서·세부 계약·종료 조건은 새 로드맵을 따른다.

**기준일: 2026-10-27 · 대상 ggaction: 0.0.26 · 상태: 조사 및 설계 보고서. 아래의 신규 API와 작업 패키지는 아직 구현되지 않았다.**

> **최신 결정 — 자체 설계 우선.** Flint 정합성·백엔드 연결 및 chart-llm/기타 외부 차트 번역은 이번 목표에서 제외한다. 두 저장소는 참고 자료이며 API·기본값·이벤트·디자인·시험·릴리스 조건을 결정하지 않는다. 아래 native 기능 범위는 유지한다. 상세 원칙은 10–11장과 POL-09/10이다.


> **사용자 범위 개정 — 2026-10-27.** Icicle/Sunburst 공통 partition, 규칙 기반 graph inference, hierarchical·force-directed·KDE·edge-path bundling을 필수로 추가한다. Funnel은 의미와 모양을 유지하고 Pyramid로 이름만 바꾼다. KPI/Gauge는 제외한다. Marginal/Bullet/Combo는 기존 액션 조합으로 표현하며 전용 API를 추가하지 않는다. 한 Cartesian frame에는 Y scale 하나·표시 Y축 최대 하나만 허용한다. 상세 계약은 **부록 F**, 기계 판독 정책은 [scope-policy.json](evidence/scope-policy.json), 원본별 대응은 [target-chart-mapping.json](evidence/target-chart-mapping.json)이다. 이 정책이 기존 전수 호환 목표보다 우선한다.

> **최신 범위 조정:** UpSet과 집합 시각화는 후속 과제로 이관했다. 전용 데이터 자원·액션·인터랙션·시험도 현재 목표와 완료 기준에서 제외한다. 일반 선택·연결된 차트·graph inference는 유지한다.

## 0. 결론과 이 보고서를 읽는 방법

목표는 가능하지만, 차트 생성 액션 몇 개를 추가하는 일로 끝나지 않는다. ggaction은 이미 데이터 변환, 통계, 마크, 축·범례, 극좌표, 패싯·레이어, 정적 출력, 프로그램 직렬화에 상당한 기반을 가지고 있다. 반면 **실제 사용자 입력을 처리하는 인터랙션 런타임, 데이터 갱신에도 유지되는 항목 식별자, 시간에 따라 장면을 재생하는 애니메이션 런타임, 지리 투영과 복합 지오메트리, 일부 특수 차트의 의미 있는 레이아웃**이 목표를 막는 공통 기반이다. 이 기반을 먼저 만들고 기존 액션 위에 짧은 도메인 액션을 조합해야 한다.

이번 목표는 ggaction 자체의 데이터·기하·레이아웃·조합·상태·인터랙션·애니메이션·geo를 일관된 공개 액션으로 완성하는 것이다. 외부 제품의 동작과 API를 복제하거나 외부 chart spec을 번역하지 않는다. 외부 조사에서 발견한 유용한 기능은 독립적인 native 계약으로 채택하며, 정확성은 수학·geometry·상태·시간축 oracle과 자체 fixture로 검증한다.

이 보고서의 가장 중요한 조사 결과는 다음과 같다.

| 확인 사항 | 이번 조사에서 확인한 상태 | 구현에 미치는 영향 |
|---|---|---|
| ggaction 액션 | 총 298개: user-facing 291, advanced 4, primitive 3 | 액션 수를 외부 기능 호환율로 사용하지 않는다. 실제 옵션과 동작을 대응시킨다. |
| Flint 차트 | README의 52와 달리 실제 레지스트리의 이름 51개, Donut/Doughnut 별칭 통합 시 50유형 | 외부 참고 census로만 유지한다. 51/154 및 이전49/150은 구현·릴리스 분모가 아니다. |
| Flint 디자인·인터랙션 | 테마 14개, 프리셋 23개, 의미 타입 44개, 갱신 연산 7개 | 과거 조사 결과다. 외부 테마·프리셋·op의 수와 이름을 구현 의무로 상속하지 않는다. |
| chart-llm 범위 | 추적 JSON 25,024개, 구조상 차트 후보 24,957개, 후보의 정규화 JSON 고유값 24,276개 | 1,981개 대표 원본만 보고 저장소 전체를 지원한다고 선언할 수 없다. 후보는 스키마 검증을 마친 유효 차트 수가 아니다. |
| 중첩 차트 | 별도 container에 차트 30개 추가. 루트와 합쳐 24,987회 출현, JSON 고유값 24,306개 | 파일 수·차트 출현 수·고유 스펙 수를 구분한다. 중첩 30개는 schema-valid 28 / invalid 2다. |
| 대표 원본 | `docs/data/chart`의 1,981개, 모두 JSON 기준 고유 | 과거 번역 조사 집합이다. 이번 계획의 번역·충실도 합격 분모로 사용하지 않는다. |
| 선언 스키마 검사 | 전체 후보 중 valid 2,870 / invalid 610 / 스키마 미선언 21,476 / schema URL 부재 1. 대표 원본은 valid 1,417 / invalid 564 | 스키마 오류를 이유로 원본을 분모에서 빼지 않는다. 스키마 통과도 원본 엔진의 실행·행동 검증과 별개다. |
| 기존 번역 | 1,387가족, 10,174프로그램, 런타임 기준 0.0.24 | 짧고 추적 가능한 작성 방식의 참고 자료이며, 현재 버전에서 원본 충실도를 보장하는 증거는 아니다. |
| 원본 대조 | 932개 바이트 동일 + 115개 JSON 동등 + 340개 구조 차이 + 594개 번역 부재 = 1,981개 | 구조 차이의 원인을 각각 판정하고 빠진 원본도 모두 포함한다. |
| 선언 제거 | 구조가 달라진 번역 원본 중 selection 선언 제거 143개, 조건부 인코딩 제거 92개, binding 관련 선언 제거 63개 | 수치는 서로 중복된다. 정적 조건과 scale/legend/input binding을 포함하므로 전부 DOM 행동 손실로 단정하지 않는다. 구체적인 hover·pan/zoom 삭제는 사례별로 확인했다. |
| 현재 지오메트리 | path는 한 subpath만 지원하며 구멍·MultiPolygon에 필요한 다중 subpath/fill rule이 없다 | 지도 추가 전에 그래픽 계약·렌더러·hit test를 같이 확장해야 한다. |
| 현재 scene identity | `reviseData` 후 사용자 id가 있는 같은 항목도 scene key가 모두 바뀌는 재현 사례 확인 | 애니메이션과 선택 유지 전에 항목 정체성과 lineage 계약을 보강한다. |

이 문서의 전반부는 **현재 소스와 실행으로 확인한 사실**, 후반부는 **목표를 달성하기 위한 설계 제안과 시험 명세**다. `제안`으로 표시한 API를 현재 ggaction에 바로 호출하면 안 된다. 현재 API의 정확한 옵션·소스 위치는 [전체 액션 인벤토리](evidence/ggaction-inventory.json)와 [타입 계약 원문](evidence/ggaction-type-contracts.json)에 있다.

구현자는 현재 상태 조사 → Flint 및 코퍼스 차이 → 공통 상태·식별자 설계 → 기능별 명세 → 작업 패키지 → 완료 게이트 순서로 읽으면 된다. 개별 작업은 뒤의 `WP-xx`, 검증은 `AT-xx` ID를 사용한다. 활성 작업만 최종 목표의 일부이며 철회된 외부 통합·번역 작업은 별도 기록한다. 선후관계는 범위 축소나 영구 연기를 뜻하지 않는다.

## 1. 조사 범위, 고정된 소스, 증거의 강도

### 1.1 소스 스냅샷

| 저장소 | 조사 커밋 | 용도 |
|---|---|---|
| [ggaction/ggaction](https://github.com/ggaction/ggaction/tree/40ec7edead7fc84de05aad31888dd0f7d264a512) | `40ec7edead7fc84de05aad31888dd0f7d264a512` | 현재 0.0.26 구현·계약·테스트·문서 |
| [microsoft/flint-chart](https://github.com/microsoft/flint-chart/tree/a794557384adcc3293a77043f6b9aff1c33d152c) | `a794557384adcc3293a77043f6b9aff1c33d152c` | 백엔드 계약, 차트 템플릿, 디자인, 인터랙션 |
| [hyungkwonko/chart-llm](https://github.com/hyungkwonko/chart-llm/tree/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24) | `6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24` | 모든 추적 JSON의 분류와 대표 원본 |
| [ggaction/chart-datasets](https://github.com/ggaction/chart-datasets/tree/58791ace7212cacb98c2b64e3f92280722ab638e) | `58791ace7212cacb98c2b64e3f92280722ab638e` | 기존 번역·프로그램·저장 원본의 비교 |

저장소 이름과 링크가 같아도 이후 푸시로 내용은 달라질 수 있다. 이 보고서의 수치는 위 커밋에 대한 값이다. 재조사할 때는 새 커밋의 전체 인벤토리 차이를 먼저 만들고 요구사항·시험을 추가한다. 기존 성공 기록을 새 HEAD의 성공으로 재사용하지 않는다.

### 1.2 무엇을 전수 조사했고 무엇을 실행했는가

ggaction은 공개 액션 카탈로그 298개, 공개 런타임 entry point 11개와 타입 선언, 관련 상태·materialization·renderer·persistence 코드를 조사했다. 파일 전체 열거와 정의 검색은 모든 소스 줄의 수작업 정독을 뜻하지 않는다. 핵심 현재 동작과 부재는 19개 집중 프로브로 확인했다. 외부 저장소는 레지스트리·템플릿·옵션·타입·원본 파일을 기계적으로 전수 수집했고, 대표 경로를 소스 및 실행으로 깊게 확인했다.

Flint의 자체 generator는 956개 fixture를 만들었다. 이번 실행 프로브는 각 51개 이름의 첫 fixture에 대해 등록된 154개 차트/백엔드 조합을 컴파일한 것으로, 153개 성공과 Excel Waterfall의 명시적 미지원 오류 1개가 나왔다. **956개 전체 렌더링 검증이나 153개 시각적 충실도 합격이 아니다.**

기존 번역은 모든 10,174개 프로그램의 구문·액션 작성 형태와 저장 산출물 무결성을 조사했다. 현재 0.0.26에서 실행한 대표 6가족 46단계의 결과는 별도 증거에 기록했다. 프로그램 재실행과 기존 SVG 일치는 **변형되기 전 chart-llm 원본과의 의미·픽셀·행동 일치와 다르다.** 전체 차트 후보에는 선언된 공식 JSON Schema의 구조·타입 검사도 수행했다(Ajv `validateFormats:false`; format 의미 검사는 제외). 미선언·legacy·오탈자·실험 속성이 있어 스키마 판정과 해당 dialect 엔진의 실행 판정을 따로 기록해야 한다. [스키마 검사 증거](evidence/corpus-schema-summary.json)

본 조사는 새 기능을 구현하거나 모든 외부 차트를 완전 검증하지 않았다. 기존 0.0.26 릴리스 기록의 테스트 6,281개, line 95.79% / branch 93.35% / function 98.72%는 현재 기반의 회귀 관리 수준을 보여 준다. 이번 조사에서 그 전체 suite를 다시 돌린 수치가 아니며 외부 호환율의 분모로 사용하지 않는다. [기존 릴리스 기록 사본](evidence/baseline-release-0.0.26-closeout.json)

### 1.3 결과 상태의 공통 어휘

| 상태 | 필요한 증거 | 이 상태만으로 주장할 수 없는 것 |
|---|---|---|
| `inventoried` | 고정 source hash, feature pointer, 요구사항 ID | 문법 유효성, 실행 가능성 |
| `source-valid` | 해당 dialect 스키마 및 원본 엔진의 로딩·데이터 검증 | ggaction 번역 가능성 |
| `native-executable` | 공개 액션만으로 실행, 저장·복원 성공 | 원본과의 디자인·행동 동등성 |
| `semantic-qualified` | 데이터, 통계, domain, scale, grouping, lineage oracle 통과 | 배치·폰트·색·상호작용 일치 |
| `visual-qualified` | 모든 필수 viewport의 geometry·guide·text·pixel 검증 | 이벤트·애니메이션 일치 |
| `behavior-qualified` | 입력 시퀀스, 상태, 이벤트, export, 접근성 검증 | 아직 실행하지 않은 variant·시간축의 충실도 |
| `fully-qualified` | 그 사례에 적용되는 위 조건, 시간축, 회귀·패키지 검증 전부 통과 | 다른 사례나 미래 커밋의 지원 |
| `source-blocked` | 원본 오류/외부 데이터 부재 등의 재현 근거와 원본 보존 | 지원 완료. 해결할 때까지 미완료로 남는다. |

이 상태들은 새 검증 시스템의 **제안 계약**이다. 이번 보고서의 인벤토리 상태를 `fully-qualified`로 승격시키지 않았다. 정적 차트처럼 행동 요구가 없는 경우도, 요구 없음의 판정 근거를 기록해야 한다.

### 1.4 '모두'와 '간단한 액션의 조합'의 정의

Flint 및 chart-llm의 파일·옵션·원본 수치는 과거 전수 조사 증거로 보존한다. 이를 실행하거나 모든 원본과 일치시키는 일은 이번 완료 조건이 아니다. 원본 데이터·라이선스·dialect 문제를 해결하는 번역 프로젝트도 분리한다.

여기서 '모두'는 [native capability 원장](evidence/native-capability-requirements.json)의 GGA-01–10과 사용자 요구 USR-01–22에 포함된 모든 기능·옵션·조합을 뜻한다. 이전에 채택한 partition, graph inference, 네 bundling, 디자인·데이터·geo·인터랙션·애니메이션 범위는 유지한다. 수치·입력·기하·저장·접근성·성능까지 검증하고, 특정 외부 registry에 없다는 이유로 기능을 제외하지 않는다.

간단한 액션은 데이터 준비 → 통계/배치 → 마크 → 인코딩 → 가이드 → 행동이라는 의미 있는 단계로 작성된다. 예를 들어 Sankey는 `createFlowData → createFlowLayout → createFlowLinks + createFlowNodes` 같은 재사용 가능한 제안 액션으로 작성한다. 차트마다 수백 개 좌표를 주입하거나 원본 SVG를 한 path/image로 붙여 넣는 방법은 정상 native chart 작성 방식으로 인정하지 않는다. 일반 native chart recipe에서 `editSemantic`, `createGraphics`, `editGraphics`, private state 접근, 외부 차트 엔진으로 우회 렌더링하는 것도 완료 증거가 될 수 없다. 내부 materializer가 concrete primitive를 생성하는 것은 기존 아키텍처의 정상 동작이다.

액션 수를 무조건 일정 숫자 이하로 제한하면 복잡한 차트에서 가독성과 재사용성이 나빠진다. 대신 **독립적인 시각/행동 의사결정당 하나의 의미 있는 액션**, 프로그램 내 좌표 계산·row별 그래픽 loop 없음, 공개 API만 사용, action trace로 설명 가능함을 기본 평가 기준으로 삼는다. 기존 번역의 짧은 작성 형태는 유지하되 원본 의미를 삭제해 짧게 만들지 않는다.


### 1.5 개정 범위와 상태를 읽는 방법

`scopeDisposition`은 검증 성공 여부와 별도다. `required`, `required-via-composition`, `renamed`, `scoped-conditional`, `excluded-by-user`, `prohibited-by-user`, `reference-only`를 사용한다. 외부 참고 행은 required=false이며 active 시험·릴리스 의무가 없다. 조건부 항목은 구체 fixture의 frame/scale 의미를 해석한 뒤 판정한다. `scope-review-required`는 미완료이며 제외 사유가 아니다. `re-expressed`는 사용자에게 제안할 수 있는 별도 표현으로 source-equivalent가 아니다.

[코퍼스 정책 검사](evidence/corpus-scope-screening-summary.json)는 원본 24,957개와 중첩 30개를 유지하며 independent Y 선언을 구조별로 분류한다. 정적 screening은 실제 scale resolution/원본 실행 검증을 대신하지 않는다. 이 screening은 과거 조사 기록이며 이번 목표의 실행·종결 조건이 아니다. native fixture의 정책 위반 여부는 별도 검사한다. [원본 보존 hash](evidence/pre-revision-source-hashes.json)로 이번 개정이 기존 소스 census를 바꾸지 않았는지 검사한다.


## 2. 현재 ggaction: 전체 기능과 구현 경계

분석 기준은 ggaction `0.0.26`, commit `40ec7edead7fc84de05aad31888dd0f7d264a512`이다. 이 문서에서 “현재 지원”은 해당 commit의 실제 등록된 action, validator, materializer, renderer, persistence 계약을 뜻한다. “제안”은 아직 구현되지 않은 요구사항이다. 공개 타입에 이름이 있다는 이유만으로 임의 조합, 다른 도구와의 픽셀 일치, 브라우저 이벤트 처리를 지원한다고 판정하지 않았다.

현재 ggaction은 상당히 넓은 **정적 차트 작성·편집·조합 엔진**이다. 다수의 통계 차트, 재사용 가능한 semantic action, immutable history, concrete graphics, Canvas/SVG/PNG/PDF 출력, inspection, editable persistence, animation용 scene 추출까지 갖췄다. 따라서 목표를 위해 엔진을 처음부터 다시 만들 필요는 없다. 그러나 현재 패키지를 그대로 Flint의 렌더링 백엔드로 꽂거나 모든 chart-llm 사례를 완전하게 번역할 수 있다고 말할 근거는 없다. 특히 **event runtime, 명시적인 안정적 item identity, animation player/transition planner, geographic geometry/projection, compound path, 전체 source-expression 의미 보존, source별 layout fidelity**는 별도 작업이다.

### 2.1 조사 범위와 증거의 의미

기계 인벤토리는 `src`의 JavaScript **628개 파일, 94,053줄**, 공개 declaration **12개 파일, 6,757줄**을 열거하고 공개 함수 정의와 등록 지점을 찾았다. 이것은 모든 줄을 수동으로 검토했다는 뜻이 아니다. 수동 심층 검토는 architecture/AGENTS, public entry point, action registry/card/contract, ChartProgram/action wrapper, materialization plan, vocabulary/coordinate/scale/transform validators, path/concrete graphics, renderer path/scene, selection/inspection, persistence, revision, theme/text, 현행 release 증거에 집중했다.

독립 실행 가능한 focused probe **19개**를 수행했다. 정상 사용 7개, 의도된 rejection 11개, 지정된 runtime method 이름 부재 관찰 1개가 기대와 일치했다. probe는 작은 대표 입력의 계약 확인이지 전체 차트 fidelity·브라우저 interaction·성능·테스트 suite 결과가 아니다. 브라우저의 실제 드래그·zoom·animation frame 검증을 수행했다고 주장하지 않는다.

증거 파일:

| 파일 | 내용 | 읽는 방법 |
|---|---|---|
| `evidence/ggaction-inventory.json` | 298개 action의 catalog 정보, 옵션, signature, wrapper 관계, prerequisites, lifecycle, 실제 default/basic method 등록, implementation/contract/type line permalink; public export 전수 | 모든 action의 존재와 소유자 추적의 기준 |
| `evidence/ggaction-actions.csv` | 이름·domain·lifecycle·entry point·옵션·source URL 압축표 | 작업 분해/스프레드시트 비교용 |
| `evidence/ggaction-type-contracts.json` | nested 타입를 포함한 공개 declaration 원문 전체 | 카드의 축약된 TypeScript 문자열을 확대할 때 사용 |
| `evidence/ggaction-source-anchors.json` | 핵심 architecture/validation/scene/persistence source permalink | 이 문서의 결론을 원 구현과 대조 |
| `evidence/ggaction-probes.json` | 정상/실패 입력, 오류, inspection/scene/persistence 관찰 | 지원과 불지원의 실제 경계 |
| `scripts/ggaction-inventory.mjs` | 읽기 전용 인벤토리 재생성 | checkout commit이 바뀌면 재실행 |
| `scripts/ggaction-probes.mjs` | 19개 작은 검증 재실행 | full suite와 분리하여 회귀 확인 |

현재 ACTION_INDEX는 **298개 모두 implemented**, planned action/capability 배열은 비어 있다. 이것은 *그 catalog가 열거한 작업이 구현되었다*는 뜻이다. Flint/chart-llm 전체 요구사항을 catalog가 포함했다는 뜻이 아니다. 이 구분을 다음 coverage dashboard와 capability registry에서도 유지해야 한다.

### 2.2 현재 architecture: 무엇을 확장해야 하고 무엇을 보존해야 하는가

`ChartProgram`은 action마다 새 immutable program을 반환한다. constructor는 semanticSpec, graphicSpec, resolvedScales, materializationConfigs, children, compositionSpec, context, trace, actionStack을 소유하고 freeze한다. 일부 내부 `_clone`/`_with…` 메서드는 구현 도구이며 외부 변환기가 직접 의존할 안정적 계약이 아니다. [ChartProgram 구현][G01]

| 상태 | 현재 역할 | 확장 시 지켜야 할 경계 |
|---|---|---|
| `semanticSpec` | dataset, mark/layer, encoding, scale, coordinate, guide의 의미 | field/selection/projection 등 의미 있는 개념이 여기 또는 명시적 semantic resource에 존재해야 함 |
| `graphicSpec` | 실제 좌표·색·크기·path·text line이 계산된 backend-neutral graphics | renderer가 source chart dialect나 통계/scale 추론을 다시 하면 안 됨 |
| `resolvedScales` | 실제 mapping에 필요한 확정된 scale 정보 | public 역변환·domain interaction이 필요하면 검증된 별도 API로 노출 |
| `materializationConfigs` | semantic state만으로 복구되지 않는 replay 가능한 작성 의도 | theme, guide placement, selection/highlight 등과 새 animation/interaction의 영속 의도를 명시적으로 분리 |
| `children`/`compositionSpec` | composition 하위 program과 배치 | child path, owner ID, shared scale, clip, guide scope를 유지 |
| `trace`/`actionStack` | 상위 action과 그 action이 호출한 하위 작업의 provenance | 매 animation frame을 history action 수천 개로 기록하지 말 것 |
| `context` | action 실행의 현재 resource/일시적 materialization context | 외부 DOM listener·timer·worker handle 저장소로 사용하지 말 것 |

핵심 특징은 **자동 semantic→graphic 컴파일러가 아니라 명시적 action orchestration**이라는 점이다. `createScatterPlot`은 point mark 생성, X/Y encoding, color/stroke/size/shape encoding, guide 생성을 호출한다. 상위 차트가 primitive 좌표를 한 번 찍어 내는 shortcut이 아니라 의미가 보존되는 하위 action의 조합이다. 이 패턴을 새 차트·Flint adapter에도 유지해야 한다. [scatter facade][G02]

materialization plan의 순서는 `scales → marks → guides → layout → highlights`다. 같은 step을 deduplicate하고 등록된 operation을 순서대로 실행한다. 새로운 resource는 이 의존 순서에 들어가야 한다. 예를 들어 projection 변화는 geographic mark geometry를 바꾸고 그 결과 clip/hit-test bounds/labels/scene을 바꾼다. projection만 저장하고 기존 graphicSpec을 재사용하는 것은 완결된 edit가 아니다. [planner][G03]

공개 확장은 `ggaction/extension`의 `action`, `ChartProgram`, `registerExtension`으로 가능하다. extension action은 wrapper metadata의 op와 이름이 같아야 하고, builtin 또는 기존 method를 덮어쓸 수 없으며, 등록된 extension이어야 trace persistence가 허용된다. 이것은 domain action을 조합할 수 있는 확장점이다. 새로운 semantic grammar나 renderer primitive를 무제한 주입하는 plugin ABI는 아니다. core validator가 새 geometry를 모르면 extension wrapper를 등록해도 통과하지 않는다. [extension registry][G04]

### 2.3 공개 surface의 실제 크기

298개 중 user-facing 291개, advanced 4개, primitive 3개다. default ChartProgram에는 **298개가 모두 실제 method**로 존재했고 basic에는 **71개**가 존재했다. catalog domain은 기능 분류이지 bundle 경계와 항상 일치하지 않는다. 예를 들어 일부 통계 데이터 생성은 `core`, 일부 chart constructor는 `statistics`에 들어 있다. “chart domain 28개”를 “전체 가능한 차트가 28개”로 해석하면 안 된다.

| Domain | 개수 | 주요 역할 |
|---|---:|---|
| core | 47 | canvas/theme/text metric/data lifecycle/coordinate/scale/일부 derived transform |
| statistics | 45 | summary/bin/lookup/fold/computed/interval/ECDF 및 통계 차트 |
| marks | 35 | primitive mark의 semantic 작성, label, annotation, jitter/packing, overlay |
| encodings | 39 | position/appearance/group/path/parallel/radial 및 distribution encoding |
| axes | 55 | Cartesian/polar/parallel axis의 생성·수정·제거 및 구성 요소 |
| grid | 11 | Cartesian/theta/radial grid |
| legend_and_title | 13 | legend block/layout/labels/title/symbols/border와 chart title |
| mark-selection | 7 | select/filter/highlight의 저장된 작성 상태 |
| primitives | 3 | editSemantic/createGraphics/editGraphics |
| composition | 15 | facet/grid/repeat/layer/adjacent/child/layout/shared scale |
| charts | 28 | scatter/line/area/bar/polar/radar/endpoint/raincloud 등의 facade |

공개 entry point는 11개다. 실제 import 결과:

| Entry point | Runtime export |
|---|---|
| `ggaction` | `chart`, `render`, `hconcat`, `vconcat` |
| `ggaction/basic` | `chart`, `render` |
| `ggaction/extension` | `ChartProgram`, `action`, `registerExtension` |
| `ggaction/png` | `renderToPNG`, `renderToPNGBuffer` |
| `ggaction/pdf` | `renderToPDF`, `renderToPDFBuffer` |
| `ggaction/svg` | `renderToSVG` |
| `ggaction/diagnostics` | `getErrorDetails` |
| `ggaction/persistence` | `serializeProgram`, `deserializeProgram`, `serializeGraphic`, `deserializeGraphic` |
| `ggaction/accessibility` | `exportAccessibleData` |
| `ggaction/inspection` | `comparePrograms`, `describeAction`, `getDatasetSchema`, `getMarkItems`, `getPlotComposition`, `inspectProgram` |
| `ggaction/scene` | `createTransitionScene`, `renderTransitionScene` |

각 action의 전체 목록은 문서 끝 부록과 JSON에 있다. JSON은 함수별 타입·옵션·contract heading·implementation line까지 보존하므로 구현자는 해당 action의 정확한 계약으로 이동할 수 있다. `options` 타입 문자열 중 `…`는 카드 generator의 TypeScript 표시 축약이다. 이를 “나머지 옵션도 자유롭게 허용”으로 읽지 말고 companion declaration 원문을 확인해야 한다.

### 2.4 현재 차트 표현력과 구체적인 제약

#### 2.4.1 Mark와 coordinate는 별도 축이다

semantic mark는 **9종**이다: `point`, `line`, `bar`, `area`, `arc`, `rule`, `tick`, `text`, `rect`. concrete drawable은 **5종**이다: `circle`, `rect`, `line`, `text`, `path`; `collection`과 `canvas`는 구조를 만든다. 통계 차트는 이 mark들의 의미 있는 조합이다. 예를 들어 error bar/box/raincloud를 하나의 새 renderer type으로 추가하지 않아도 현행 component ownership 위에서 구현할 수 있다. [vocabulary][G05] [graphic schema][G06]

coordinate validator는 정확히 **`cartesian`, `polar`, `parallel`** 세 종류를 허용한다. `geographic`과 `mercator`는 실행 시 `Unknown coordinate type`으로 거절된다. latitude/longitude 필드를 일반 x/y에 넣으면 점을 그릴 수 있어도 spherical projection·antimeridian·map clipping을 보존하는 geo 지원은 아니다. [coordinate validator][G07]

position channel은 mark/coordinate 조합별로 다르다. X/Y는 Cartesian point/line/bar/area/rule/tick/text/rect에서 사용하지만 X2/Y2는 모든 mark의 자유로운 두 번째 좌표가 아니다. X/Y offset 또한 bar/point/rule 중심의 계약을 가진다. theta/radius는 polar point/line/arc에 적용된다. arc의 theta는 quantitative/ordinal/nominal이며 temporal은 허용 목록에 없다. radius는 quantitative다. parallel dimension은 quantitative/ordinal, 최소 2개이며 missing은 break/drop-row/error다. frontend가 field type 선택지를 통일해서 보여주면 실제 action rejection과 충돌할 수 있다. [position compatibility][G08] [parallel validator][G09]

#### 2.4.2 이미 갖춘 mark·chart family

| Family | 현재 구현 메커니즘 | 변환 시 확인할 의미 |
|---|---|---|
| scatter/bubble/dot | point + x/y + size/shape/color/stroke/opacity, createScatterPlot/createDotPlot | size는 면적/반지름 계약을 구분; encodePointRadius와 encodeSize를 임의 대체 금지 |
| line/step/smooth | line + group/pathOrder + curve interpolation | series membership, order, missing break/connect, curve 알고리즘 차이 |
| bar/stacked/grouped/normalized/diverging | bar + position/aggregate/color layout/offset/width | source의 baseline, stack order, negative values, group spacing |
| ranged rect/heatmap | rect와 x/y/x2/y2, bin2d/aggregate | categorical cell과 numeric bin의 경계·empty cell 정책 |
| area/stacked area/horizon | area+range/series layout, density/horizon helpers | boundary interpolation, normalization, clipping, source units |
| pie/rose/radial bar | arc + theta/radius, createPiePlot/createRosePlot/createRadialBarPlot | angle가 share인지 category인지, radius가 linear인지 area-preserving인지 |
| polar scatter/line/radar | theta/radius point/line와 radar semantic facade | Cartesian line을 회전한 것과 다름; closed path/order/frame |
| parallel coordinates | dimension별 scale+polyline+parallel guide | ordinal dimension, missing break/drop, dimension identity |
| distributions | histogram/density/ECDF/violin/gradient/box/raincloud | estimator, bandwidth, weighted statistics, quantiles, group grain |
| uncertainty/regression | interval/errorBar/errorBand/regression line/band | confidence method와 level, mean/median, prediction vs confidence |
| endpoint charts | lollipop/dumbbell/dot+component editing | endpoint aggregation와 stem/rule/point ownership |
| annotations/labels/text | text mark, mark labels, annotation, layoutLabels | selected item grain, data-space anchor와 logical-pixel offset의 구분 |

curve interpolation은 `linear`, `step`, `step-before`, `step-after`, `basis`, `cardinal`, `monotone`, `monotone-steffen`, `natural`의 9종이다. cardinal tension은 cardinal에서만, 0–1 범위로 허용된다. source가 단지 “monotone”이라고 부르는 경우 ggaction의 동일 문자열을 선택하기 전에 실제 interpolation 의미를 비교해야 한다. 문자열 이름의 일치는 path 일치의 증명이 아니다. [curve grammar][G10]

point glyph는 14종(`circle`, `square`, `diamond`, 네 방향 triangle, `plus`, `cross`, `star`, `hexagon`, `wye`, `wedge`, `arrow`)과 제한된 custom polygon을 지원한다. custom polygon은 3–1024 vertices, finite coordinate magnitude 한계, 양의 area, normalization 등의 계약을 따른다. 이것은 작은 point symbol에 대한 지원이다. 임의 지형 polygon/holes/GeoJSON geometry의 계약으로 확장 해석할 수 없다. [point shapes][G11] [point polygon][G12]

series color layout은 `stack`, `fill`, `center`, `group`, `overlay`, `diverging`; 별도 stack transform mode는 `zero`, `normalize`, `center`다. 같은 단어라도 owner와 단위가 다르다. `stack/fill/center` series layout은 negative value를 거절하고 diverging이 음수/양수를 별도로 쌓는다. zero segment를 생략하는 동작 또한 소스별 empty/zero mark의 tooltip·selection 수와 차이를 만들 수 있으므로 표기만 맞추지 말고 cell oracle을 비교해야 한다. [series layout][G13]

#### 2.4.3 Scale: 넓지만 모든 channel의 모든 조합은 아니다

global scale type 집합은 13종이다: `linear`, `log`, `pow`, `sqrt`, `symlog`, `time`, `band`, `point`, `ordinal`, `sequential`, `quantize`, `quantile`, `threshold`. 하지만 role별 허용 범위가 있다. quantitative position은 linear/log/pow/sqrt/symlog, temporal position은 time, band/point는 각 전용 role, continuous color는 sequential/log/pow/sqrt/symlog, discretized color는 quantize/quantile/threshold다. size는 linear/log/sqrt/pow 및 quantize/quantile/threshold/ordinal이며 symlog를 포함하지 않는다. [scale types][G14] [size scale][G15]

옵션 또한 type별로 제한된다. midpoint는 sequential, base는 log, exponent는 pow, constant는 symlog, paddingInner/Outer는 band, padding은 point, align은 band/point다. zero는 log/time에 공통 적용하는 boolean이 아니다. frontend의 generic “scale options” dictionary를 그대로 보내지 말고 channel/scale role에 맞추어 validate해야 한다.

색상은 named palette 68개와 continuous color interpolation, whitePoint/gamma/midpoint 및 ordinal/discretized mapping을 지원한다. 이것은 source tool 전체 color engine과 동일하다는 증거가 아니다. source palette version, color space, out-of-domain/unknown, interpolation of transparency, midpoint와 reverse 조합까지 fixture로 고정해야 한다. payload에 임의 palette 이름을 실어 보내고 fallback하면 목표의 “완벽한 번역”을 위반한다.

현재 public export에 scale inversion API는 없다. backend integration에서 brush/zoom/nearest에 필요하므로 private `resolvedScales`를 각 frontend가 해석하도록 만들면 중복 구현과 의미 drift가 생긴다. **제안:** `getScaleTransform` 또는 동등한 공개 read-only 계약으로 forward/invert/domain/band extent와 clamping/ambiguity 정보를 제공한다. discrete scale은 numeric inverse와 다르게 interval→domain value 집합/nearest category 정책을 명시해야 한다.

#### 2.4.4 데이터와 통계: 원본 입력, 파생 의미, row provenance

`createData`는 dense array of plain row objects와 optional schema를 받는다. URL fetch, CSV reader, asynchronous data source는 이 action의 옵션이 아니다. `url`을 추가한 실제 probe는 unknown option으로 거절됐다. URL·file·SQL·Arrow/typed-column loading은 host/adapter의 resource layer에서 명시적으로 처리한 뒤 검증된 rows와 provenance를 넘기는 구조가 필요하다. [createData][G16]

현재 derived transform registry는 26종이다: bin, bin2d, computed, complete, boxOutlier, boxSummary, density, ecdf, filter, flatten, lookup, fold, gradientProfile, horizon, interval, impute, markFilter, normalize, regression, regressionStatistics, sort, summary, stack, statisticalReference, timeUnit, window. `createDerivedData`는 한 단계 transform tuple을 받으며 변환 사슬은 여러 named dataset으로 구성한다. generic 임의 함수 pipeline이 아니다. [transform policies][G17]

| 구역 | 현재 의미 있는 지원 | 중요한 제한/추가 검사 |
|---|---|---|
| aggregate | count/sum/mean/median/min/max/distinct/valid/missing/variance/varianceP/stdev/stdevP/stderr/q1/q3/ciLower/ciUpper; parameterized quantile/first/last/CI | numeric stability, field type, null, sample/population, order, CI method 구분 |
| summary | groupBy, 복수 aggregate, members, weighted variants | 최대 64 output aggregate, 출력 row 한계, field 충돌 검증 |
| bin/bin2d | domain/bin boundary 기반 aggregation | source auto-bin algorithm과 extent rounding을 동일하다고 가정하지 말 것 |
| density/ECDF | named derived dataset과 distribution facade | bandwidth/kernel/grid/normalization/weight를 source와 비교 |
| regression | linear/polynomial/loess/exp | method별 옵션 제한, loess confidence interval 불허, exp는 interval false 조건 |
| interval | mean+stderr/stdev/ci, median+iqr | median↔iqr 조합 강제, CI method/level 별도 검증 |
| window | rowNumber/rank/denseRank/cumulativeSum/lag/lead/movingMean/movingSum | SQL/Vega의 모든 window operation이 아님; duration unit millisecond/second/minute/hour/day |
| calendar | timeUnit year/quarter/month/day/hour/minute/second/week/weekday, IANA zone, week options | timeUnit bucketing과 computed datePart의 표현력이 다름 |
| lookup/fold/flatten | 구조적 field 변환과 lookup | source join의 duplicate key/null/default/one-to-many 의미 비교 필요 |
| normalize/complete/impute/filter/sort | 닫힌 structured transform | arbitrary expression/code, streaming incremental graph와 구분 |

computed AST는 `field`, `constant`, `op` 중 하나를 갖는 plain node이며 eval을 호출하지 않는다. binary add/subtract/multiply/divide, eq/neq/lt/lte/gt/gte, negate/absolute/log/sqrt/floor, not/isNull, and/or, coalesce/concat, if, toNumber, parseTime, getPath, replaceLiteral, datePart 등이 구현돼 있다. 단, **datePart는 year만**, getPath는 literal field root와 1–8개 nonreserved key, constant는 scalar finite 값, depth 16, node 128, work 10,000,000 한계다. `sin`과 `datePart month` 실제 probe는 거절됐다. timeUnit month를 지원한다고 computed month extraction까지 지원한다고 선언하면 안 된다. [computed grammar][G18]

추가 expression 기능은 parser→source AST→source-neutral typed AST→bounded evaluator로 내려야 한다. 사소한 미지원 연산을 외부 JS precompute로 모두 숨기면 trace/field provenance/editability가 사라지고 매 translator가 통계를 다시 구현한다. 그렇다고 원본 임의 expression 문자열을 `eval`로 실행하는 것도 재현성·검증·소유자 구조를 무너뜨린다. source에서 실제 사용된 operator/arity/null/date semantics의 inventory를 생성하고 닫힌 AST에 부족한 최소 연산 집합을 추가하는 것이 맞다.

#### 2.4.5 수정은 가능하지만 streaming runtime은 아니다

`reviseData({source,id,values,schema?})`는 구현돼 있다. 새 원본 dataset ID를 생성하고 dependent graph를 다시 바인딩·materialize하며 과거 source를 보존한다. 따라서 “데이터 수정 기능이 없다”는 판단은 틀리다. 반면 append/upsert subscription, backpressure, stream chunk, worker cancellation, bounded history 정책은 공개 runtime 계약이 아니다. concat parent는 explicit child를 revise한 뒤 replaceCompositionChild를 사용해야 하며, 함수는 dependent materialization이 성공하는지 사전 실행하고 다시 실행해 반환한다. continuous streaming에 그대로 사용하면 비용을 측정해야 한다. [reviseData][G19]

실제 probe에서 데이터 3행 중 한 행의 y만 수정하고 user `id` 값은 그대로 둔 채 `d → d-v2`로 revise했다. point 개수는 그대로 3개였지만 before/after scene의 point key **공통 집합이 0개**였다. 이 사실은 scene가 잘못됐다는 뜻보다 현재 identity가 **사용자가 지정한 entity key와 revision lineage를 표현하는 public 계약이 아니라는 뜻**이다. 차트값 변경을 부드러운 morph로 이어야 하는 backend에는 stable entity key, composite group key, transform lineage, revision scope가 필요하다.

#### 2.4.6 Guide, typography, design

guide surface는 작지 않다. X/Y/theta/radial/parallel axes, line/tick/label/title의 개별 작성, horizontal/vertical/theta/radial grid, named axis targets, 복수 legend block과 layout, label/title/symbol/border, chart title, guide removal을 지원한다. labels에는 format, font, rotation, maxWidth, wrapping, lineHeight, overlap, labelMap, offset, colorMap, align 등 owner별 옵션이 있다. 이 옵션들은 모든 text owner가 공유하는 무제한 CSS 객체가 아니다.

`applyTheme`은 light/dark 또는 정해진 token 집합의 custom theme을 적용한다. token은 background/mark/text/strongText/mutedText/axis/axisTitle/grid/border/statistical colors/highlight/fontFamily/axis text family와 size 등을 포함한다. CSS custom properties/Fluent token/theme provider를 그대로 소비하는 runtime이 아니다. Flint의 design token을 native token 및 explicit style override에 매핑하고 원본 theme identity/version은 adapter metadata로 유지해야 한다.

text는 concrete fontFamily/fontSize/fontWeight/fontStyle/alignment/baseline/rotation, resolved lines를 가진다. `applyTextMetrics`로 측정된 width profile을 반영하고 typography/materialization을 다시 계산할 수 있다. renderer는 계산된 text line을 다시 layout하는 곳이 아니다. browser/Node font가 다르면 줄바꿈, guide overflow, facet packed bounds가 달라질 수 있다. 실제 release Linux에서는 Hangul fallback font 없음으로 source test 1개가 skip됐다. 이것은 해당 폰트/출력 경로의 보장이 비어 있다는 신호로 관리해야 한다. [text metrics action][G20]

현재 value format은 `auto`, 제한된 decimal/fixed/percent/exponential/grouped formatting, `%Y/%m/%d/%b/%a/%H/%M/%S/%L/%%` UTC directive 중심이다. D3-format 전체 grammar, locale-aware currency/compact/ordinal/calendar text 전체와 동일한 계약이 아니다. 사용자 도구의 locale와 timezone이 숫자/날짜 label에 관여하면 별도 source-neutral `format` specification과 host-independent formatter oracle이 필요하다. [value format][G21]

작은 layout probe도 실제 제약을 보여준다. `400×260, margin:35` canvas에 default scatter guide를 붙이면 x-axis title/label overlap 때문에 action이 실패했다. 같은 dataset을 `600×420, margin:80`에서 만들면 성공했다. 이를 단순히 “그리기 실패 버그”로 부를 수는 없다. 현재 layout validation이 명시적인 bounded authoring 계약이기 때문이다. 그러나 responsive backend가 되려면 viewport에 대한 fit, preferred/minimum plot size, text metric availability, overflow/fallback을 누가 결정하는지 계약해야 한다. 무조건 margin을 키우는 translator는 원본 layout fidelity를 보장하지 못한다.

#### 2.4.7 Composition과 ownership

unit의 여러 layer, `createLayerPlot`, follow/snapshot overlay, adjacent plot, hconcat/vconcat, facet/facetGrid, repeatCharts, child insert/remove/replace/reorder, composition layout edit, shared scale edit가 이미 있다. plot-composition registry는 29개 constructor를 역할별로 이해한다. statistics domain constructor도 여기에 포함되므로 chart domain의 28개와 수가 다르다. [composition registry][G22]

`createLayerPlot`은 새 layer의 native constructor를 실행해 의미를 유지한다. `createOverlay`는 원본 mark의 visible item endpoint를 따르는 별도 기능이다. 현재 overlay source는 Cartesian bar/point/line/area, complete X/Y, independent mark를 요구한다. categorical density silhouette와 또 다른 overlay를 원본으로 삼는 경우는 제한된다. basis=visibleItems, mode=follow 등은 실제 contract이므로 임의 composed chart의 universal linking API로 해석하면 안 된다. [overlay grammar][G23]

facet scale은 shared/independent, X/Y/offset/theta/r/color/stroke/size/shape/opacity/strokeDash/parallelDimensions 등의 owner별 resolution을 갖는다. topLane도 stacked/shared로 구분한다. field partition과 guide placement는 의미적으로 지원하지만 arbitrary dashboard auto-layout, independently packed wrapped facet geometry, shared footer axis의 모든 원본 배치가 자동 일치한다는 뜻은 아니다. release closeout은 issue #258의 **external original-chart geometry/source-family fidelity qualification이 남아 있음**을 명시했다. 현재 issue의 전체 현황·target fixture는 상위 보고서의 GitHub/source 비교를 따른다.

backend contract의 target은 문자열 mark ID만으로 부족하다. 최소 `{childPath, ownerId}`가 필요하고, series/item ID와 composition child ID를 섞지 않아야 한다. 현재 inspection ResourceRef와 scoped action target은 좋은 출발점이다. source를 flatten한 canvas pixel snapshot으로 바꾸면 child edit, legend collect, facet header, row highlight, persistence가 모두 역행한다.

### 2.5 concrete graphics가 보장하는 것과 아직 표현하지 못하는 것

모든 drawable position은 finite, width/height/radius/strokeWidth 등은 nonnegative, opacity는 0–1이다. text fontSize는 positive이며 fill/line style도 닫힌 validator를 통과한다. 실제 primitive property 집합에 image, raster tile, texture/pattern, arbitrary SVG DOM, shadow/filter, mesh가 없다. `createGraphics({type:'image'})`와 point shadowBlur는 실제로 거절됐다. [concrete validator][G24]

현재 structured fill은 linear gradient와 string fill이다. gradient는 rect/path에서 허용되며 circle/text 등의 모든 primitive에서 동일하게 허용되는 것은 아니다. blend도 normal/difference의 제한된 범위이며 circle은 normal만이다. source의 radial gradient, multi-stop alpha, pattern, image fill, arbitrary blend mode를 “색상 문자열 지원”으로 대체해서는 안 된다. 모든 새 paint 종류는 concrete schema, persistence, SVG, Canvas, native PNG/PDF, scene, visual oracle에 동시에 들어가야 한다. [paint grammar][G25]

#### 2.5.1 Geo를 막는 더 낮은 수준의 path 제약

path grammar는 **M/L/C/Z**만 허용한다. 최초 M 하나, subpath 하나, Z는 마지막이라는 검증을 강제한다. SVG의 A/Q/H/V 등의 원본 command는 직접 받지 않는다. A command 부재 자체는 cubic로 정확한 허용 오차 내 lowering하면 해결할 수 있지만, **holes/MultiPolygon의 topology를 표현할 compound subpath/fill-rule 계약이 없는 것**은 구조적인 결손이다. [path grammar][G26]

실행 증거:

| 입력 | 실제 결과 |
|---|---|
| M→L→L→Z 단일 polygon | accepted |
| 외곽 ring M…Z 뒤 내부 ring M…Z | `path.commands supports one subpath and only one initial M.` |
| path `fillRule:'evenodd'` | `Unknown path graphic property "fillRule".` |
| M 뒤 A arc command | `must be an M, L, C, or Z command.` |

Canvas path renderer는 공통 validator를 통과시킨 후 `beginPath`, moveTo/lineTo/bezierCurveTo/closePath, **인수 없는 `fill()`**로 그린다. SVG serializer도 같은 validator와 final Z 검사를 사용하고 `fill-rule` attribute를 생성하지 않는다. Canvas scene는 기존 renderer로 다시 내려간다. 따라서 외부 adapter에서 여러 ring을 임의로 넣어 해결할 수 없다. [Canvas path][G27] [SVG path][G28] [Canvas scene][G29]

**필수 제안:** compound path의 `subpaths` 또는 여러 M/Z를 허용하는 canonical commands와 `fillRule:'nonzero'|'evenodd'`를 정의한다. geometry bounds, clip bounds, gradient bounds, hit-test, scene topology key, persistence migration까지 동일한 ring 구조를 소비해야 한다. 대륙 바깥 ring과 호수 hole을 각각 채워진 shape로 칠하는 편법은 hole 색상을 background로 덮어쓰는 문제를 낳고, 지도 위 다른 layer/texture/transparent background에서 틀린 결과가 된다.

### 2.6 interaction: 현재 authoring selection은 좋은 기초지만 event engine은 아니다

`selectMarks`, `editMarkSelection`, `highlightMarks`, `filterMarks`, 각 remove action은 실제 구현돼 있고 저장·복원된다. selector는 field/channel/property 또는 source rows 기반이며 eq/neq/gt/gte/lt/lte/oneOf/range/min/max, item/stack grain을 갖는다. row selector는 `{data,indices}`로 원본·파생 row provenance를 연결한다. 이것은 program을 작성하는 연산이다. pointermove, click, drag, wheel, touch, keyboard를 등록하거나 tooltip DOM을 띄우는 작업이 포함돼 있지 않다. [selection grammar][G30]

`getMarkItems`는 semantic item별 key, mark type, fields, channels, concrete geometry 배열, row references, bounds를 반환한다. `inspectProgram`은 rawRows/logicalDataItems/drawablePrimitives/visibleCandidates, opacity-zero/zero-size/outside-clip/missing-skipped 등을 구분한다. 기존 mark의 semantic grain과 geometry를 재사용할 수 있으므로 새로운 hit-test가 raw SVG DOM index를 해석할 필요는 없다. 하지만 bounds가 존재한다는 것만으로 path stroke 거리, ring hole, occlusion, rectangular brush/nearest/lasso 판정을 지원하는 것은 아니다. [inspection API][G31]

**제안하는 engine/runtime 분리:**

1. core에 serializable selection parameter, predicate, target scope, output binding 등의 의미 계약을 둔다. event object/DOM node/callback 함수는 저장하지 않는다.
2. scene/inspection adapter가 mark item→geometry→spatial index를 만든다. stable item key와 original row lineage를 결과로 반환한다. index는 immutable scene version 단위로 cache하고 dispose 가능해야 한다.
3. browser runtime이 pointer/touch/keyboard input을 정규화하고 hit-test→selection value→effect action/ephemeral highlight→render를 수행한다.
4. data filter와 presentation highlight를 분리한다. hover마다 새 source dataset과 전체 immutable trace를 누적하는 방식을 기본으로 삼지 않는다.
5. cross-view linking은 pixel identity가 아니라 declared key/row lineage/field value predicate를 사용한다. aggregate mark는 membership semantics를 명시한다.
6. interaction commit 시점을 구분한다. drag 중 transient preview, pointerup의 committed domain, keyboard step, undo/redo, external controlled state update의 순서를 문서화한다.

**필수 테스트:** clipping된 item 불선택, stroke-only line tolerance, point polygon 정확한 hit, overlapping mark topmost/all policy, transformed child offset, facet scope, devicePixelRatio, CSS canvas resize, touch pointer cancellation, keyboard focus order, aggregate member selection, revised data에서 selection 유지/해제, event listener cleanup, stale async result 미반영, undo 시 transient state 처리. 목록에 있는 runtime을 구현하고 직접 실행한 뒤에야 “interaction compatible”로 판정할 수 있다.

### 2.7 animation: scene extraction과 player를 구분해야 한다

`createTransitionScene`은 현재 SVG format version 1과 Canvas format version 2를 생성한다. immutable program별 WeakMap cache를 사용하며 scene는 structured-clone 가능한 concrete 데이터다. SVG node는 serialized SVG와 offset/clip 및 key/topology를, Canvas node는 concrete properties와 clip stack을 제공한다. `renderTransitionScene`은 version 2를 검증해 기존 Canvas renderer로 그린다. mutable intermediate scene는 cache하지 않으므로 외부 animation consumer가 frame을 구성할 수 있도록 고려돼 있다. [scene producer][G32] [scene renderer][G29]

그러나 public surface에는 timeline, duration, easing, play/pause/seek/cancel, keyframe schedule, interpolation, interruption arbitration, RAF clock이 없다. 따라서 현재 기능은 **animation consumer용 scene 공급**이다. “애니메이션을 지원한다”는 넓은 문장 대신 “stable correspondence hints를 포함한 transition scene를 만들며 외부 consumer가 재생을 구현할 수 있다”고 기술해야 한다.

identity는 source dataset와 layer scope, member row의 value token을 조합한다. line/area에는 member order의 topology token도 있다. unknown provenance는 보수적인 fallback으로 남는다. 이는 style edit와 filter/sort의 일부 경우에 좋은 출발점이다. 하지만 reviseData probe의 0/3 shared key는 명시적 entity key가 없는 한 값 변경·stream update를 전부 같은 객체의 움직임으로 연결할 수 없음을 보여준다. **새 player 전에 key/lineage contract를 먼저 확정해야 한다.**

**제안:** `TransitionPlan`은 immutable before/after scene, node correspondence, enter/update/exit, interpolation eligibility, timing intent를 저장한다. pure `sampleTransition(plan,t)`는 clock 없이 deterministic intermediate scene를 만든다. host player는 RAF/virtual clock, pause/resume/seek/interrupt/dispose를 소유한다. public 명칭은 설계 예시이며 현재 API가 아니다.

interpolation 최소 규칙은 다음과 같다.

| 변화 | 기본 규칙 제안 | 금지할 편법 |
|---|---|---|
| circle/rect/line의 동일 primitive 숫자 값 | 단위가 같은 finite property를 interpolate | radius와 area를 같은 값으로 취급 |
| color/opacity | 명시된 color space, alpha 규칙, premultiplication 여부 | source color interpolation과 무관한 RGB 문자열 보간 |
| text content/font family/line break | stable label identity, crossfade 또는 명시된 discrete switch | 문자열을 숫자처럼 보간, label이 다른 tick으로 morph |
| path 동일 topology | matching subpaths/command arity/semantic point correspondence | vertex 수만 맞춘 임의 index zip |
| path topology 변경 | crossfade 기본; 별도 검증된 remeshing opt-in | hole 또는 line break가 연결되는 가짜 morph |
| scale/domain change | mark+axes+grid+legend+clip의 coherent plan | mark만 이동하고 tick/label을 마지막에 교체 |
| composition/reorder | child scope identity와 global/relative frame 구분 | DOM 순서를 identity로 사용 |
| interrupt | 현재 sampled scene부터 새 목표로; transaction 우선순위 명시 | 중단된 promise가 나중 상태를 덮어씀 |

테스트는 before/after screenshot만으로 충분하지 않다. t=0,중간,t=1 oracle, seek reversibility, reduced motion, duration=0, reentry/exit, simultaneous data+scale+layout, native/browser frame parity, clipping, long-session memory, scene cache lifetime를 확인해야 한다. full semantic program을 매 frame 재생성할 필요가 없는 변화는 concrete interpolation으로 처리하되 최종 committed program과 scene는 반드시 일치해야 한다.

### 2.8 geo: core가 가져야 할 의미와 host가 가져야 할 자원

현재 native geography resource/projection/GeoJSON/TopoJSON action은 없다. primitive path/custom point polygon이 존재해도 projection 정의, spherical geometry, ring topology, feature property, projection edit, geospatial hit-test, geographic data lineage를 저장하지 않는다. 목표를 만족하려면 다음을 독립적인 구현 범위로 잡아야 한다.

| 계층 | 필요한 책임 | 기존 접점 |
|---|---|---|
| resource adapter | GeoJSON/TopoJSON fetch/parse, object selection, content hash, license/provenance, size/complexity caps | createData 앞의 외부 loader/manifest |
| semantic geometry | feature ID/property/Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon/GeometryCollection, coordinate reference rules | semantic dataset/schema 및 새 geo geometry resource |
| projection | type/parameter/fit/extent/rotation/precision/clip; known invert availability | coordinate/scale의 새 소유자, 기존 Cartesian/polar와 구분 |
| materialization | spherical clipping, antimeridian cutting, adaptive resampling, projected path, feature row mapping | grammar + materialization plan |
| concrete drawing | compound path/fillRule, clip hierarchy, stroke/fill, point symbols | shared graphic schema, renderer, scene |
| interaction | feature hit, polygon hole, boundary tolerance, map pan/zoom/brush, inverse coordinate | item identity + hit-test + host events |
| animation | projection/camera change의 topology-aware interpolation 또는 crossfade | TransitionPlan, geographic correspondence |
| tiles/attribution | request/cache/cancel/provider-specific attribution, optional image/raster resource | 별도 host capability; semantic map contract에는 provenance 유지 |

projection API를 설계할 때 “mercator 하나를 지원하면 geo 완료”라고 범위를 줄이면 안 된다. 목표 source inventory에 존재하는 projection type·feature collection·point/line/polygon/raster·camera transition·graticule·sphere·choropleth join이 모두 capability requirement가 되어야 한다. 추가 projection은 source의 구현체 이름을 public domain action에 새겨 넣지 말고 수학적 type/parameter와 versioned lowering으로 설명해야 한다.

shape test는 위도경도 몇 개 찍는 것에 그치지 않는다. dateline을 가로지르는 polygon, pole 주변, hemisphere clip, hole orientation, degenerate ring, islands/MultiPolygon, tiny feature, null geometry, duplicated feature key, projection singularity, long route, wrong CRS, join unmatched feature, weighted color domain, nested facet map 등을 포함해야 한다. GeoJSON을 외부에서 SVG로 바꿔서 image/path로 끼워 넣은 결과는 정적 thumbnail fallback일 수 있어도 사용자 목표의 native simple-action translation 성공으로 계산해서는 안 된다.

### 2.9 persistence, inspection, accessibility와 backend 제품 계약

editable persistence는 schema version 3, graphic-only는 version 1이다. 구버전 editable envelope를 migration하고 program state/trace/extensions를 검증한다. `serializeProgram`은 열린 actionStack을 허용하지 않는다. graphic-only 저장은 렌더링된 geometry를 다시 그릴 수 있지만 semantic 편집 정보를 보존하지 않는다. report/adapter에서 두 저장 형식을 혼용하면 “roundtrip 성공”이 의미를 잃는다. [persistence][G33] [state keys][G34]

interaction/animation/geo를 추가하면 schema revision과 migration이 필요하다. 기존 program을 로드했을 때 새 resource가 absent인 상태가 명확해야 하고, supported version·extension availability·asset resolution failure를 오류로 분리해야 한다. DOM event binding이나 URL fetch를 deserialization side effect로 실행하지 않는다. asset resolver와 runtime attach는 명시적인 후속 단계여야 한다.

`comparePrograms`는 `equal/different/unknown`, `completeProgramComparison`을 제공한다. `inspectProgram` 또한 partial/unsupported를 드러낸다. 이 API는 현재의 불완전한 관찰 범위를 감추지 않는다는 점에서 유용하다. backend의 “번역 성공” check는 `unknown` 또는 partial을 equal로 취급하지 않아야 한다. `describeAction`의 supported/needs-input/incompatible/unsupported/unverified는 action 선택 보조 정보이며 모든 option combination을 렌더링 테스트했다는 증거가 아니다.

`exportAccessibleData`는 chart의 final semantic value/series/owner/child view를 export한다. SVG renderer는 title/description도 받는다. 이는 접근성 지원의 일부지만 focusable mark, keyboard interaction, live region, tooltip semantics, chart summary, brush/zoom의 동등 입력 방식까지 제공하는 complete widget toolkit이 아니다. 새로운 browser interaction layer는 이 export를 재사용하고 native semantic item과 focus/announcement identity를 연결해야 한다. [accessibility API][G35]

**제안하는 backend request/result 계약:**

```ts
// 설계 제안. 현재 ggaction public API가 아니다.
type BackendRequest = {
  requestId: string;
  sourceDialect: { name: string; version: string; sourceHash: string };
  actionPlan: readonly { op: string; options: JsonObject }[];
  resources: readonly ResourceManifestEntry[];
  viewport: { width: number; height: number; pixelRatio: number };
  textMetricsProfile?: TextMetricsProfileRef;
  expectedProgramRevision?: string;
};
type BackendResult = {
  requestId: string;
  programRevision: string;
  program: EditableProgramEnvelope;
  scene: VersionedConcreteScene;
  itemIndex: SemanticItemIndex;
  capabilityDecisions: readonly CapabilityDecision[];
  diagnostics: readonly SourceMappedDiagnostic[];
};
```

actionPlan은 가능한 native action으로 구성한다. 지원하지 않는 작업을 원본 renderer로 몰래 실행하고 result에 성공을 넣지 않는다. SourceMappedDiagnostic은 source JSON path/field/transform/mark와 ggaction target/action/option path를 함께 제공한다. 실패는 missing-data, unsupported-capability, invalid-input, layout-overflow, resource-limit, render-error로 구분한다. 모든 요구 기능을 끝내는 것이 목표이므로 unsupported는 영구 면제가 아니라 명시적인 backlog entry와 required test로 연결한다.

### 2.10 성능·자원·패키지 제약

현행 보호 한계는 기능이다. 한계를 끄는 것만으로 대규모 backend가 완성되지 않는다.

| 항목 | 현행 수치/규칙 | 목표에서의 영향 |
|---|---|---|
| 일반 generated items | 10,000 | facets×series×labels 등의 실제 expansion 고려 |
| point-owned graphics | 50,000 | 일반 path/rect까지 같은 수를 허용한다고 추정 금지 |
| generated work | 10,000,000 | group cross product, statistical algorithm 상한 |
| 한 path command | 30,000 | 고해상도 지도/복잡한 trajectory에서 resource 계획 필요 |
| computed AST | depth 16, nodes 128, work 10,000,000 | source expression compiler에서 정규화 후 크기 검사 |
| summary aggregate outputs | 64 | wide-table 번역 시 named transform 분해 |
| summary output rows | 30,000 | 일반 graphical item 한계와 별도임 |
| point custom polygon | 3–1024 vertices | GeoJSON polygon 허용량으로 전용 불가 |
| raster allocation | dimension 32,767; pixels 16,777,216 | canvas size×DPR² 확인, export resolution 제한 |
| PDF | 한 페이지; positive integer dimension, 별도 최대 | dashboard paging/export pagination은 host 설계 |

[공통 resource validation][G36] [raster limits][G37] [PDF adapter][G38]

package는 Node >=20을 요구하며 core에 필수 runtime dependency를 두지 않고 `@napi-rs/canvas`와 MCP SDK를 optional peer로 둔다. PNG/PDF Node adapter와 browser-safe core/scene가 나뉘어 있다. frontend bundle에 native dependency를 실수로 넣지 말고 package exports 수준에서 browser import smoke test를 유지해야 한다. geo/interaction/animation 확장도 `ggaction/geo`, `ggaction/interaction`, `ggaction/animation` 같은 optional entry point를 검토할 수 있으나 이 이름은 제안이다. projection·geospatial parser·spatial index를 default entry에 무조건 넣으면 기존 lightweight consumer 비용이 증가한다.

성능 검증은 `n`개의 source row만으로 충분하지 않다. `source rows, derived rows, semantic items, drawable primitives, path commands, text glyphs, active views, trace nodes, serialized bytes, raster pixels`를 함께 기록해야 한다. coarse source rows만 보고 비용을 제한하면 small input→large complete/facet/label expansion을 놓친다. 처음부터 모든 알고리즘을 incremental로 다시 작성할 필요는 없지만, stream/brush의 burst에서 previous request cancellation, latest-result-wins, caching/eviction, trace retention, disposal이 제품 계약에 들어가야 한다.

### 2.11 실제 실행한 현재 API recipe

다음 코드는 신규 API 제안이 아니라 focused probe에서 실행한 **현행 native API**다. 예제의 size/margin은 이 fixture의 guide layout을 통과하기 위한 값이며 모든 viewport의 자동 대응을 보장하지 않는다.

```js
import { chart } from 'ggaction';
import { serializeProgram, deserializeProgram } from 'ggaction/persistence';
import { createTransitionScene } from 'ggaction/scene';

const rows = [
  { id: 'a', x: 1, y: 2, group: 'A' },
  { id: 'b', x: 2, y: 1, group: 'B' },
  { id: 'c', x: 3, y: 4, group: 'A' }
];

// 1. semantic scatter + named source-row highlight + editable roundtrip
const scatter = chart()
  .createCanvas({ width: 600, height: 420, margin: 80 })
  .createData({ id: 'd', values: rows })
  .createScatterPlot({ id: 'p', data: 'd', x: 'x', y: 'y', color: 'group' });
const highlighted = scatter
  .selectMarks({ id: 'sel', target: 'p', rows: { data: 'd', indices: [0, 2] } })
  .highlightMarks({ selection: 'sel', color: '#e64343', dimOthers: { opacity: 0.2 } });
const restored = deserializeProgram(serializeProgram(highlighted));

// 2. field와 aggregate로 정의한 native rose
const rose = chart()
  .createCanvas({ width: 500, height: 500, margin: 80 })
  .createData({ id: 'd', values: rows })
  .createRosePlot({ id: 'rose', category: 'group', value: 'y', aggregate: 'sum', guides: false });

// 3. 원래 program을 공유 scale facet로 composition
const faceted = scatter.facet({
  field: 'group', data: 'd', columns: 2,
  scales: { x: 'shared', y: 'shared' }
});
const canvasScene = createTransitionScene(faceted, { format: 'canvas' });
```

첫 recipe는 원본 scatter를 변경하지 않고 selection/highlight가 저장·복원되며 SVG가 동일한 것을 확인했다. rose는 polar semantic coordinate와 arc item을 생성했고, facet는 두 child와 scene를 생성했다. 이 scene를 만든 사실은 animation을 재생했다는 뜻이 아니다.

### 2.12 구현 작업으로 바로 전환할 수 있는 gap 목록

다음 순서는 dependencies를 반영한다. 일부 design/statistics 확장은 identity/runtime 작업과 병렬화할 수 있지만, geo path와 interaction/animation은 공통 geometry/identity 계약을 공유해야 한다.

| ID | 작업 | 구현 owner | 완료 조건 |
|---|---|---|---|
| GA-01 | 외부 requirement→native capability manifest | contract/card generator + source adapters | source별 요구 feature/옵션/행동 100% 열거; unsupported를 성공 분모에서 제거하지 않음 |
| GA-02 | stable semantic item identity와 revision lineage | dataset schema/revision/selection/scene/persistence | 동일 entity 업데이트/reorder/duplicate/group/facet에서 key 관계를 oracle로 검증 |
| GA-03 | compound path와 fillRule | path/concrete schema/bounds/Canvas/SVG/scene/native | holes/MultiPolygon/clip/gradient/hit-test 모두 일치 |
| GA-04 | geographic resource/projection/marks | 새 grammar/action/materialization + loader | target corpus의 geometry/projection 전체, spherical oracle 통과 |
| GA-05 | read-only mapping/inversion 및 hit-test | scales + inspection/scene geometry | coordinate/child offset/clip/DPR 포함 정확한 selection |
| GA-06 | interaction intent와 browser lifecycle | semantic resource + 별도 runtime | pointer/touch/keyboard/linked views/tooltip/brush/zoom/dispose 전수 |
| GA-07 | deterministic transition plan/sample/player | scene identity + optional animation module | intermediate frame, interruption, reduced motion, final program 일치 |
| GA-08 | expression/transform 의미 확장 | closed AST + transform owners | source operator/type/null/order/time semantics 및 numerical oracle |
| GA-09 | image/paint/typography resource 계약 | concrete schema/renderers + style/label owners | 실제 target 요구 image/gradient/pattern/text를 모든 output backend에서 검증 |
| GA-10 | source geometry에 맞는 composition/layout | facet/compose/layout/typography | source chart별 plot box/guide box/text/clip의 명시 tolerance 충족 |
| GA-11 | backend adapter/session API | source-neutral plan + host runtime | request revision/cancel/cache/assets/errors/persistence roundtrip |
| GA-12 | complete compatibility gate | test/consumer/browser/render/realistic/source corpus | 모든 required chart와 event/animation state가 통과, allowlisted skip=0 |

각 작업의 테스트는 action가 property를 저장하는지 확인하는 수준에서 멈추면 안 된다. 예를 들어 GA-03의 최소 fixture는 외곽 사각형+내부 hole이고, semantic owner selection·SVG fill-rule·Canvas bitmap·PNG/PDF·scene roundtrip·bounds·hole hit-test를 한 번에 확인해야 한다. GA-02의 최소 fixture는 이 보고서의 reviseData 3행 예제다. 수정되지 않은 entity의 key가 유지되고, 수정된 entity도 declared key에 따라 대응하며, 제거된 entity는 exit, 새 entity는 enter로 분류되어야 한다.

### 2.13 현재 테스트 증거를 어떻게 해석해야 하는가

기존 `study/release-0.0.26/closeout.json`에는 local 6,281/6,281, Linux source 6,280 pass+1 font skip, browser 295/295, render 265/265, coverage lines 95.79%/branches 93.35%/functions 98.72%, critical floors 182개가 기록돼 있다. PR/main/release checks 또한 각각 20/20,20/20,22/22다. 이 숫자는 현재 release의 강한 회귀 검증 근거이며 이 audit에서 대규모 suite를 다시 실행하지 않았다.

**coverage 95.79%는 외부 표현력 95.79%가 아니다.** 새 feature가 source에 구현되지 않았다면 해당 feature는 executable line 분모에도 없다. full compatibility는 요구 chart/state/event/projection별 oracle가 모두 있어야 측정할 수 있다. “298개 action 모두 implemented”, “모든 unit test green”, “source chart screenshot 생성 성공”을 각각 “모든 source chart를 제대로 native action으로 번역했다”와 동치로 취급하지 않는다.

최종 검증은 적어도 네 축이 필요하다: (1) data/statistical meaning, (2) concrete geometry/design, (3) runtime interaction/animation sequence, (4) save/reload/edit/revise/export continuity. 모든 차트가 필요하다는 사용자 목표를 보존하려면 coverage report가 이 네 축 중 부족한 축을 명확히 보여줘야 한다.

### 2.14 증거 링크

아래 링크는 모두 분석 commit으로 고정돼 있다. source branch가 바뀌어도 이 보고서의 근거는 바뀌지 않는다. 전체 action별 링크는 machine inventory에 추가로 있다.

[G01]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/ChartProgram.js#L27
[G02]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/scatter.js#L27
[G03]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/materialization/planner.js#L3
[G04]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/extensionRegistry.js#L77
[G05]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/vocabulary.js#L1
[G06]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/schemas/graphic.js#L1
[G07]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/coordinates.js#L5
[G08]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/positionCompatibility.js#L1
[G09]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/parallelCoordinates.js#L15
[G10]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/curveCommands.js#L4
[G11]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/pointShapes.js#L6
[G12]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/pointPolygon.js#L4
[G13]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/seriesLayout.js#L35
[G14]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/scales/types.js#L11
[G15]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/scales/size.js#L20
[G16]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/create.js#L11
[G17]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/transforms.js#L298
[G18]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/computed.js#L8
[G19]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/revise.js#L35
[G20]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/textMetrics/index.js#L34
[G21]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/valueFormat.js#L1
[G22]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/plotComposition.js#L1
[G23]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/overlay.js#L6
[G24]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/schemas/concreteGraphic.js#L30
[G25]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/paint.js#L39
[G26]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/pathCommands.js#L10
[G27]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/canvas/path.js#L6
[G28]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/svgSerialization.js#L313
[G29]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/canvas/scene.js#L57
[G30]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/markSelection.js#L1
[G31]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/types/inspection.d.ts#L45
[G32]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/scene.js#L27
[G33]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence.js#L1
[G34]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence/validation.js#L63
[G35]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/types/accessibility.d.ts#L37
[G36]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/validation.js#L5
[G37]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/canvas/limits.js#L2
[G38]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/pdf.js#L69


## 3. Flint 조사 기록 — 참고 전용

> **과거 Flint 조사 — 참고 전용.** 이 장의 원본 사실·수치·이전 권고를 보존한다. 이전의 필수/호환/번역/완료 표현은 최신 계획의 의무가 아니다. POL-09/10에 따라 외부 정합성·통합·번역은 철회되었고, 활성 작업과 시험은 14–15장 및 GGA/USR 원장만 사용한다.

이 문서는 조사한 Flint의 기능을 ggaction의 차트 생성 능력, 데이터 의미, 디자인, 렌더링, 상호작용, 편집, 내보내기 계약으로 분해한다. **차트 이름을 비슷하게 그리는 것과 Flint backend로 작동하는 것은 별개의 합격 조건이다.** ggaction에는 이미 많은 Cartesian·polar·통계 차트를 만드는 도메인 액션이 있지만, 현재 액션 목록만으로 Flint의 semantic interaction runtime, geo camera, hierarchy/graph layout, 정책 기반 디자인 및 문서형 차트 레이아웃까지 호환된다고 판정할 수 없다.

조사 기준은 Flint `a794557384adcc3293a77043f6b9aff1c33d152c`(2026-10-21T16:39:01-07:00), JS package 1.0.1이며 ggaction 기준은 `40ec7edead7fc84de05aad31888dd0f7d264a512`(0.0.26)이다. 아래 GitHub 링크는 모두 조사 SHA에 고정되어 있다. ggaction 대응은 현재 `agent_docs/contract/ACTION_INDEX.json`에 존재하는 액션 이름을 확인한 **구현 후보**다. 각 옵션과 상호작용의 대응이 이미 렌더링 검증을 통과했다는 의미가 아니다.

> **개정 범위 안내:** 이 장은 원본 관찰을 보존한다. KPI/Gauge 제외, dual-Y 금지, Funnel→Pyramid, 조합 정책은 부록 F와 target-chart-mapping이 우선하며 source 목록의 존재가 구현 의무를 뜻하지 않는다.

### 3.1 조사 결과와 증거 수준

실제 TypeScript registry를 번들링하여 실행한 결과, Vega-Lite 39, ECharts 37, Chart.js 22, Plotly 38, Excel 18개, 총 154개 backend-template 등록을 확인했다. 중복 chart 문자열을 제거하면 **51개**이며, Donut Chart와 Doughnut Chart를 의미상 동일하게 취급하면 50개다. README의 “52 chart types”와 현재 코드가 다르므로 원본 조사 분모는 이 고정 스냅샷의 실제 목록이다. 구현 완료는 이 원장에 부록 F 정책을 적용해 판정한다. 추가로 공개 `image-charts` entry point가 10개 차트를 이미지 URL로 컴파일한다. 이는 headline의 5개 backend 외 추가 export이며, 51개 목록의 부분집합이다.

14개 theme, 23개 interaction preset, 44개 semantic type이 실제 registry에 존재한다. `SemanticTypes` 상수나 문서의 개념 목록을 실제 type registry와 혼동해서는 안 된다. 코드 파일 432개의 TS/TSX에서 exported interface/type 603개를 추출하고 선언 위치·필드 타입·주석을 기계 기록했다. chart property는 정적 registry에만 한정하지 않고 실제 `chartProperties` 접근도 별도 추출했다. 예를 들어 custom choropleth의 `levels`, `featureKey`, `baseMapUrl` 및 Tree의 `rootLabel`은 registry의 property selector만 읽으면 놓친다.

실행한 검사는 다음 범위다.

- upstream `TEST_GENERATORS`로 fixture 956개를 생성했다. 생성 오류는 없었다.
- 51개 literal chart 이름마다 기존 fixture 하나를 선택하여 등록된 154 backend 조합에 컴파일했다. **153개 컴파일 성공, 1개 명시적 오류**였다.
- 실패는 Excel Waterfall의 final total이다. Office.js가 해당 total-point 의미를 노출하지 않는다는 명시적 오류이며, 이를 Flint 자체의 전 backend 동일 기능이라고 가정해서는 안 된다.
- 이 검사는 DOM·픽셀·입력 이벤트를 실행한 검사가 아니다. 컴파일 성공은 수치·디자인·상호작용 fidelity를 증명하지 않는다. 이 문서에서 제안하는 ggaction 대응 프로그램을 이미 실행·렌더링한 것도 아니다.

재현 자료는 `evidence/flint-snapshot.json`, `flint-catalog.json`, `flint-api-types.json`, `flint-property-accesses.json`, `flint-compile-probe.json`, `flint-requirements.json`이다. 마지막 파일에는 고유 ID를 가진 **874개 요구사항**이 있으며, 51 chart family, 317 backend별 chart property, 22 encoding action, 23 interaction preset, 14 theme, 289 public contract field, 147 native-backend behavior declaration, 11 cross-cutting requirement로 나누었다. 이는 적합성 합격 결과가 아닌 원본 요구 원장이다. 개정된 구현 backlog는 scope disposition이 있는 requirements-traceability를 사용한다. dynamic function branch와 property 조합의 수까지 874로 제한한다는 뜻은 아니다.

근거: [template registry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/index.ts#L258-L319), [공개 package exports](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/package.json#L27-L148), [interaction registry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/registry.ts#L70-L312).

### 3.2 Flint의 실제 역할과 전체 흐름

Flint는 semantic chart specification을 여러 backend로 컴파일하는 라이브러리다. 입력은 `data`, `semantic_types`, `chart_spec`, `theme_spec`, `interaction_spec`, `options`, `field_display_names`다. chart_spec에는 chartType, encodings, chartProperties, title/subtitle/label/source/chrome, baseSize/canvasSize가 들어간다. 제목과 주석 같은 문서 요소, 차트 구조에 맞춘 레이아웃, 의미에 맞춘 축/색/정렬 및 그림 크기까지 컴파일 대상이다.

Vega-Lite 경로는 대략 다음 책임으로 분해된다.

1. **입력 정규화와 의미 분석**: shorthand field와 static-series array를 해석하고 wide→long fold, 필드 타입 추론, semantic annotations, encoding override, transpose/arrange/chart-type transform, aggregation, temporal parsing, zero/log/ordering 규칙을 적용한다.
2. **구조와 layout plan**: category cardinality, label 측정, mark의 perceptual channel, plot aspect, band step, grouping, facet, axes, legend, title/source/furniture를 함께 고려하여 공간을 배분한다.
3. **theme grounding**: 추상적인 ink/type/structure/marks/labels/legend policy를 실제 차트 역할과 공간에 맞춘 `DesignDecisions`로 결정한다. 좁은 공간에서 덜 강조하는 등 요청에서 벗어나는 결정은 report에 남긴다.
4. **backend realization**: backend template과 instantiate 단계가 plan을 구체적인 spec으로 만든다. static SVG 경로와 interactive mount 경로는 별개다.
5. **interactive runtime**: drawn geometry의 hit를 semantic value/records로 환원하고, preset gesture를 renderer-neutral update로 바꾸며, preview/retained state를 유지하고, 주석/overlay/controls/links/keyboard를 실행한다.

따라서 ggaction core에 `renderFlintChart` 같은 일괄 우회 액션을 넣는 접근은 목표와 맞지 않는다. 외부 adapter가 Flint의 요청을 ggaction의 소수 도메인 액션 조합으로 낮추되, 데이터 변환과 의미 변화와 graphic materialization이 trace에 드러나야 한다. renderer는 ggaction의 fully materialized graphicSpec만 읽는 원칙을 유지한다. 외부 라이브러리 이름·특화 오류·원본 spec 객체는 adapter에 둔다.

주의할 API 경계가 있다. `core/analyze.ts`의 analyzeChart, `core/plan.ts`의 planLayout, `vegalite/assemble.ts`의 vegaLiteStages/openVegaLiteSession은 소스 export지만 현재 public barrel로 모두 공개되지 않는다. package exports가 막힌 내부 deep import에 의존하는 adapter는 안정적인 통합이 아니다. **Flint upstream에서 backend-neutral preparation/plan 계약을 공개하고 adapter가 이를 소비하는 경로**를 우선 설계한다. 공개 API 확장이 불가능하다면 adapter 내부에 공개 helpers로 만든 독립 preparation을 두고, 그 결과를 upstream output에 맞추는 golden test를 유지해야 한다. 후자는 의미/레이아웃 정책을 두 곳에 유지하는 비용이 크다.

근거: [ChartAssemblyInput](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1290-L1431), [ChartAnalysis와 분석](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/analyze.ts#L10-L110), [Vega-Lite public exports](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/index.ts#L13-L46), [theme의 두 수준](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L5-L20).

### 3.3 차트별 ggaction 조합과 남은 계약

아래 `조합 후보`는 해당 이름의 액션이 현재 존재함을 확인한 것이다. `부분`은 관련 primitive는 있으나 composite geometry/layout/meaning 보장이 더 필요하다. `신규 핵심`은 필수 계산·좌표·geometry family가 현재 액션 집합에 보이지 않는다. 어느 행도 Flint 전체 옵션·interaction을 통과한 “완료”로 취급하지 않는다. VL/EC/CJ/PL/XL은 원본 backend 등록이며, 각 backend의 모든 디자인과 interaction이 같다는 뜻이 아니다.

| ID / chart | 원본 backend | ggaction 판단 / action 조합 후보 | 필수 gap / 검증 |
|---|---|---|---|
| FCH-001 / [Area Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/area.ts#L23-L201) | VL, EC, CJ, PL, XL | 조합 후보: `createAreaPlot`, `createStackData`, `encodeGroup` | baseline/stack/curve결측 및 semantic path provenance |
| FCH-002 / [Bar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bar.ts#L37-L127) | VL, EC, CJ, PL, XL | 조합 후보: `createBarPlot`, `createSummaryData`, `encodeColor` | aggregation/zero/transpose/dodge/label/rounded corner fidelity |
| FCH-003 / [Bar Table](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/bar-table.ts#L154-L522) | VL, PL | 부분: `createAdjacentPlot`, `createBarPlot`, `createTextPlot` | 공유 행높이/열정렬/셀포맷/헤더/스크롤 및 table layout |
| FCH-004 / [Boxplot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/boxplot.ts#L203-L514) | VL, EC, PL, XL | 조합 후보: `createBoxPlot`, `createPointMark` | quartile/whisker 규약, outliers/points/dodge 및 원본 row lineage |
| FCH-005 / [Bubble Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bubble.ts#L52-L180) | CJ | 조합 후보: `createScatterPlot`, `encodeSize` | radius와area 입력단위 명시 및 size legend |
| FCH-006 / [Bullet Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/bullet.ts#L31-L161) | VL, EC, PL | 부분: `createBarMark`, `createRuleMark`, `createReferenceBand`, `createOverlay` | POL-07: 기존 bands/bar/rule 조합, 공동 scale·hit role; 전용 constructor 없음 |
| FCH-007 / [Bump Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bump.ts#L31-L204) | VL, EC, CJ, PL | 조합 후보: `createWindowData`, `createLinePlot`, `orderCategories` | 시점별 rank/tie/dense-rank와 반전 y/rank label |
| FCH-008 / [Calendar Heatmap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/calendar.ts#L55-L191) | VL, EC | 부분: `createTimeUnitData`, `createHeatmap`, `facetGrid` | timezone/weekStart/ISO week/leap day/월경계 및 calendar 좌표 |
| FCH-009 / [Candlestick Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/candlestick.ts#L24-L170) | VL, EC, PL, XL | 부분: `createBarMark`, `createRuleMark`, `createOverlay`, `createWindowData` | OHLC 검증, open/close body, high/low wick, up/down color, MA overlay |
| FCH-010 / [Choropleth](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/choropleth.ts#L72-L135) | VL, PL | 신규 핵심: `createLookupData`, `encodeColor` | GeoJSON/TopoJSON, geo coordinate/projection, polygon mark, missing-join/LOD/geo hits |
| FCH-011 / [Combo Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/combo.ts#L46-L146) | CJ | 부분: `createOverlay`, `createLinePlot`, `createBarPlot`, `editCompositionScales` | 원본은 공통 x+독립 y이며 두 measure 구성은 POL-08로 금지. 허용 대안은 shared-Y layer 조합, 별도 fidelity variant |
| FCH-012 / [Connected Scatter Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/connected-scatter.ts#L70-L165) | VL, EC, CJ, PL, XL | 조합 후보: `createLinePlot`, `createPointMark`, `encodePathOrder` | 시간/순서채널이 x정렬과 독립; path segment provenance |
| FCH-013 / [Density Contour](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/density-contour.ts#L21-L101) | PL | 신규 핵심: `createBin2DData`, `createPointMark` | 2D bin-density contour polygon 추출/threshold topology; KDE로 대체금지 |
| FCH-014 / [Density Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/density.ts#L63-L129) | VL, EC, PL | 조합 후보: `createDensityData`, `createDensityPlot` | kernel/bandwidth/norm/extent grid수치일치 및 tail policy |
| FCH-015 / [Donut Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/excel/templates/pie.ts#L12-L16) | VL, PL, XL | 조합 후보: `createPiePlot`, `editArcMark` | inner radius 단위/정렬/pad angle/outside labels/legend |
| FCH-016 / [Doughnut Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/doughnut.ts#L23-L114) | CJ | 조합 후보: `createPiePlot`, `editArcMark` | Donut alias를 adapter에서정규화, percentage innerRadius 일치 |
| FCH-017 / [ECDF Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/ecdf.ts#L42-L120) | VL, EC, CJ, PL | 조합 후보: `createECDFData`, `createECDFPlot` | ties/step side/normalization/points/empty handling |
| FCH-018 / [Funnel Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/funnel.ts#L30-L194) | EC, PL, XL | 신규 핵심: `createSummaryData`, `createTextMark` | 공개 이름 Pyramid로만 변경(POL-05); 원본 가변너비 trapezoid/ordering/gap/orientation/percentage label 유지 |
| FCH-019 / [Gantt Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/gantt.ts#L38-L180) | VL, EC, CJ, PL | 조합 후보: `createBarMark`, `encodeX`, `encodeX2`, `encodeY`, `createMarkLabels` | start/end temporal interval, task height, invalid/reversed interval, overlap |
| FCH-020 / [Gauge Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/gauge.ts#L29-L223) | EC, PL | 원본 조사 후보(개정 범위 제외): `createArcMark`, `createRuleMark`, `createTextMark` | POL-06: 제외. source 관찰만 보존; 전용 구현/충실도 의무 없음 |
| FCH-021 / [Grouped Bar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bar.ts#L242-L456) | VL, EC, CJ, PL, XL | 조합 후보: `createBarPlot`, `encodeXOffset`, `encodeYOffset`, `encodeGroup` | nested grouping/dodge mode, missinggroups/inner-outer padding |
| FCH-022 / [Heatmap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/heatmap.ts#L55-L285) | VL, EC, PL | 조합 후보: `createHeatmap`, `encodeColor`, `createMarkLabels` | continuous/quantized/diverging colors, missing cell, cell labels+contrast |
| FCH-023 / [Histogram](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/histogram.ts#L17-L137) | VL, EC, CJ, PL, XL | 조합 후보: `createBinData`, `createHistogram` | bin boundary inclusive rule, binCount vs actual bins, emptybins/provenance |
| FCH-024 / [KPI Card](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/kpi-card.ts#L20-L196) | VL, PL | 원본 조사 후보(개정 범위 제외): `createTextPlot`, `createAdjacentPlot`, `createAnnotation` | POL-06: 제외. source 관찰만 보존; 전용 구현/충실도 의무 없음 |
| FCH-025 / [Line Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/line.ts#L25-L210) | VL, EC, CJ, PL, XL | 조합 후보: `createLinePlot`, `encodeGroup`, `encodePathOrder` | interpolate variants/gaps/points/shared indexhit/series end labels |
| FCH-026 / [Lollipop Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/lollipop.ts#L37-L141) | VL, EC, CJ, PL | 조합 후보: `createLollipopPlot` | orientation/negativevalue/pointsize and line role |
| FCH-027 / [Map](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/map.ts#L173-L295) | VL, PL | 신규 핵심: `createPointMark`, `encodeSize`, `encodeColor` | projection+basemap+lonlat coordinate/globe clip/camera/geo inverse |
| FCH-028 / [Marginal Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/marginal.ts#L249-L445) | VL | 부분: `createScatterPlot`, `createHistogram`, `createDensityPlot`, `createAdjacentPlot` | POL-07: scatter+histogram/density+adjacent 조합; 공통 bounds/guide 보강, 전용 constructor 없음 |
| FCH-029 / [Network Graph](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/graph.ts#L27-L167) | EC | 신규 핵심: `createPointMark`, `createLineMark` | graph node/edge layout circular/seeded force, graph identity/selflinks/multiedges |
| FCH-030 / [Parallel Coordinates](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/parallel.ts#L56-L190) | EC | 조합 후보: `createParallelCoordinates`, `createParallelAxes`, `editParallelScale` | numeric-column selection, independently scaledaxes, detail/color/provenance |
| FCH-031 / [Pie Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/pie.ts#L49-L135) | VL, EC, CJ, PL, XL | 조합 후보: `createPiePlot` | slice ordering/percent formatting/negative-zero policy/labels |
| FCH-032 / [Pyramid Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/pyramid.ts#L18-L161) | VL, EC, PL, XL | 조합 후보: `createBarPlot`, `createComputedData`, `createOverlay` | signed mirrored scales/absolute ticks/two cohort alignment  **POL-05:** 원본 인구형 Pyramid는 mirrored-bars recipe; renamed Funnel과 구별. |
| FCH-033 / [Radar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/radar.ts#L24-L149) | VL, EC, CJ, PL, XL | 조합 후보: `createRadarPlot`, `createRadialGrid`, `createThetaAxis` | shared vs each dimension normalization/closed path/angular order |
| FCH-034 / [Range Area Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/range-area.ts#L42-L184) | VL, EC, CJ, PL | 조합 후보: `createAreaMark`, `encodeY`, `encodeY2`, `encodeGroup` | range endpoints crossing/missing values/curve pairing and band selection |
| FCH-035 / [Ranged Dot Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/ranged-dot.ts#L14-L146) | VL, EC, PL | 조합 후보: `createDumbbellPlot`, `createIntervalPlot` | center optional/range ends/role-specific hits/caps/orientation |
| FCH-036 / [Regression](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/scatter.ts#L818-L915) | VL, EC, PL | 조합 후보: `createRegressionData`, `createRegressionPlot`, `createRegressionBand` | linear/log/exp/power/poly degree/loess differences and independentstats |
| FCH-037 / [Ridgeline Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/ridgeline.ts#L449-L876) | VL | 부분: `createDensityData`, `createAreaPlot`, `createAdjacentPlot` | overlap/offset baseline/sharedamplitude/category labels and clipping |
| FCH-038 / [Rose Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/rose.ts#L31-L185) | VL, EC, CJ, PL | 조합 후보: `createRosePlot`, `createRadialAxis` | equal angle radius encodesarea orlength asdeclared; sort/group/alignment |
| FCH-039 / [Sankey Diagram](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/sankey.ts#L30-L176) | EC | 신규 핵심: `createSummaryData` | weighted directedgraph layout/link ribbons/nodewidth/gap/orientation/conservation |
| FCH-040 / [Scatter Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/scatter.ts#L28-L137) | VL, EC, CJ, PL, XL | 조합 후보: `createScatterPlot`, `encodeChannels` | shape/area/opacity/log zero/category/axis label invariants |
| FCH-041 / [Slope Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/slope.ts#L45-L143) | VL, EC, CJ, PL | 조합 후보: `createLinePlot`, `encodePathOrder`, `createMarkLabels` | exactlytwo endpoints orfilteredsubset, endpointlabels collision |
| FCH-042 / [Sparkline](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/sparkline.ts#L71-L237) | VL, PL | 부분: `createLinePlot`, `createTextPlot`, `createAdjacentPlot` | row label+inline mini chart+value columns aligned; independent/shared y |
| FCH-043 / [Stacked Bar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bar.ts#L131-L238) | VL, EC, CJ, PL, XL | 조합 후보: `createStackData`, `createBarPlot` | stack order/normalize/diverging+negative stacks/provenance |
| FCH-044 / [Streamgraph](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/streamgraph.ts#L22-L231) | VL, EC, PL | 조합 후보: `createStackData`, `createAreaPlot` | wiggle/silhouette/diverging baseline algorithm and irregular x-spacing |
| FCH-045 / [Strip Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/jitter.ts#L56-L186) | VL, EC, CJ, PL | 조합 후보: `createStripPlot`, `jitterPoints`, `packPoints` | seeded jitter/spread/dodge/orient vs strip/lattice ambiguity |
| FCH-046 / [Sunburst Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/sunburst.ts#L77-L366) | EC, XL | 신규 핵심: `createArcMark`, `createSummaryData` | hierarchy partition/rings/parent-childangles/label rotation/drill state |
| FCH-047 / [Table](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/table.ts#L57-L115) | VL | 부분: `createTextPlot`, `createRectMark`, `createAdjacentPlot` | cell semantic table, percolumnformat/alignment/header/rowlimit/accessibility |
| FCH-048 / [Tree](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/tree.ts#L25-L145) | EC | 신규 핵심: `createPointMark`, `createLineMark`, `createTextMark` | hierarchy extraction/rootLabel/tidy tree LR/TB/links; native expand disabled |
| FCH-049 / [Treemap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/treemap.ts#L24-L226) | EC, XL | 신규 핵심: `createRectMark`, `createSummaryData`, `createMarkLabels` | hierarchy squarify areas/padding/nodeids/labels/breadcrumb/drill state |
| FCH-050 / [Violin Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/violin.ts#L17-L96) | VL, PL | 조합 후보: `createViolinPlot`, `createDensityData` | bandwidth/tailCut/box/median/half/full/dodge/countwidth/invalidgroups |
| FCH-051 / [Waterfall Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/waterfall.ts#L30-L139) | VL, EC, CJ, PL, XL | 조합 후보: `createWindowData`, `createComputedData`, `createBarMark`, `createRuleMark` | delta/subtotal/total mode and connector; avoid blindlysumtotalrows |

#### 재사용할 부분과 새로 만들 부분의 경계

Cartesian/polar의 대부분은 existing action의 올바른 조합부터 검증해야 한다. bar/line/scatter마다 새 액션을 추가하는 대신, 실제 부족한 공통 계약인 stable row identity, semantic hit registry, point radius/area 변환, ordered path, shared/independent composition scale, annotation placement, guide policies를 보완한다. 신규 chart helper는 검증된 data→geometry 조합을 명명하는 편의 API이고 low-level 단일 giant graphic patch가 되어서는 안 된다.

반대로 hierarchy·graph·geo·contour의 계산을 사용자가 모두 좌표 배열로 선계산하게 하면 “간단한 액션의 조합” 목표를 달성하지 못한다. 다음 source-neutral 기능이 필요하다. 이름은 **제안**이며 현재 API를 뜻하지 않는다.

- `createHierarchyData`는 group-field path 또는 id/parent-id를 explicit mode로 받고 nodeId/parentId/depth/value/rowIds를 만든다. duplicate ID, orphan, cycle, leaf/internal value policy를 검증한다. `layoutHierarchy`는 tree/treemap/partition을 구분하고 출력 node geometry와 stable ordering을 가진다. Tree는 shared line/point/text, Treemap은 rect/label, Sunburst는 arc/label로 재사용한다.
- `createGraphData`는 node table/edge table 또는 source/target/value fields를 명시적으로 받고 중복 edge aggregation, self-link, missing node 정책을 기록한다. `layoutGraph`의 circular/force는 seed·iterations·stable node order가 필요하다. force simulation을 renderer가 실행하지 않는다. 결정된 좌표를 graphicSpec에 저장한다.
- `layoutFlow`는 Sankey DAG layout을 수행하고 node conservation, link width, path ribbon, node gap/width/orientation을 보장한다. cycle을 지원할지 explicit error로 돌려줄지 공개 계약을 정해야 한다. 현재 Flint Sankey가 self-link를 삭제하는 것과 ggaction core가 같은 silent deletion을 하도록 만드는 것은 별개다. adapter는 upstream-compatible data policy를 명시하고 diagnostic을 제공한다.
- `createContourData`는 2D bin counts/density grid에서 iso-threshold polygon을 생성한다. Flint Density Contour는 Plotly `histogram2dcontour` 기반이므로 무조건 KDE를 사용하면 의미가 달라진다. bin extent, edge rules, normalization, threshold, disconnected ring/hole, saddle-case tie-break를 고정한다.
- `layoutCalendar`는 Gregorian date를 week/day/month cell geometry로 만들고 weekStart, timezone, ISO-year, missing-day, leap-day를 명시한다. 단순 year/month/day field가 있다고 calendar가 완성된 것은 아니다.
- generic polygon/ribbon/path mark 또는 기존 path graphic의 공개 도메인 액션이 필요하다. Pyramid(원본 Funnel)의 trapezoid, sankey ribbon, contour polygon, geo polygon을 하나의 불명확한 `customShape`로 몰지 않고 geometry마다 semantic role과 hit/clip/closed-ring contract를 유지한다.

### 3.4 데이터·scale·encoding의 완전성

Flint `ChartEncoding`은 field/type/aggregate/sortOrder/sortBy 외 scheme/reverse/mid/domain/bins/colors/title을 가진다. aggregate의 선언 값은 count/sum/average/mean이며 theme와 chart default가 implicit aggregation과 독립이다. `title:null`은 field 이름을 빈 문자열로 바꾸는 것이 아니라 guide title suppression이다. `domain`은 여기서는 color ramp extent로 문서화되어 있으므로 x/y domain으로 오독하지 않는다. static series array는 measure fields를 fold하고 synthetic series field를 만든다. synthetic field가 caller field와 충돌하면 생성 이름/identity namespace가 필요하다.

44개 registry type은 단순 Q/N/T shorthand보다 많은 의미를 담는다. 예를 들어 Percentage는 scale domain/format과 연결되고 Profit/PercentageChange/Sentiment/Correlation은 diverging midpoint와 sign; Rank는 순서 및 baseline; Date/Year/Quarter/Month/Week/YearWeek는 parser와 canonical order; Country/State/Latitude/Longitude는 geo inference와 연결된다. **type명별로 한 번의 행이 필요하고 annotation 조합별로 별도 fixture가 필요하다.** Unknown을 zero-value number로 강제 변환하거나 날짜를 locale-dependent Date.parse에만 맡기면 안 된다.

`FCORE-DATA-LINEAGE`의 필수 산출물은 다음이다.

- 입력 row는 stable `rowId`를 가지고, aggregation/bin/density/regression/fold/stack/window가 원본 row ID 집합 또는 provenance query를 보존한다. mark별 source records를 추적할 수 있어야 한다. density line의 점 하나를 단일 원본 row로 거짓 대응하지 않는다.
- 통계 계산과 renderer 계산을 분리한다. 수치 오라클은 별도 수식 또는 고정 수치 fixture를 사용한다. 현재 output으로 expected 값을 다시 생성하는 self-fulfilling test는 금지한다.
- 사용자 field name과 display name을 분리한다. 번역된 label을 row lookup key로 쓰지 않는다. tuple key는 JSON value type을 유지하므로 number 1/string "1"/null이 섞여도 충돌하지 않아야 한다.
- null, NaN, Infinity, invalid Date, empty string, empty group, singleton group, all-negative/all-zero, duplicate category의 정책을 각 transform에 기록한다. 출력 mark 개수보다 삭제된 행과 삭제 이유가 더 중요한 경우가 있다.
- categorical order, series order, facet order를 별개 자원으로 다룬다. sort/toggle/filter가 identity를 바꾸지 않고 다시 켰을 때 original ordering을 복원한다.
- repeated-measure와 wide-series에 대해 graph edit 이후 dependent data가 재계산되고 이전 ChartProgram은 변하지 않는지 확인한다.

근거: [encoding 전체 필드와 static series](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L29-L126), [실제 semantic registry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/type-registry.ts#L57-L186), [semantic target의 value/records](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L1-L69).

### 3.5 디자인은 팔레트 14개를 추가하는 일이 아니다

ThemeSpec은 ink, type, structure, marks, labels, legend, dataLabels, annotation, furniture, source, facets, layout, geometry, chartDefaults, compileDefaults, interaction, variants를 가진다. 14 preset은 nyt/economist/swiss/nature/mckinsey/datawrapper/powerbi/powerbi-light/pop/cartoon/apple/de-stijl/bbc/material이다. adapter가 preset 이름을 해석하고 neutral theme token과 resolved design으로 낮춰야 하며, ggaction core public vocabulary는 기존 source-neutral 원칙을 지킨다.

필수 구현 단위는 아래와 같다.

1. **색과 패턴**: categorical palette, sequential/diverging ramp, midpoint/domain/binning, per-value colors, missing color, background, neutral/structure/emphasis colors. texture `solid/diagonal/antidiagonal/horizontal/vertical/cross/dots`는 canvas/svg/pdf에서 동일한 물리 pitch·stroke·phase를 가져야 한다. pattern은 fill image screenshot으로 고정하지 말고 재사용 가능한 graphic resource로 materialize한다.
2. **역할별 글꼴**: headline/deck/axisLabel/axisTitle/valueLabel/keyLabel/annotation/footnote/display별 family,size,weight,italic,case,color; token 또는 px. 상하좌우 배치와 text measure는 렌더러가 사용한 실제 font/fallback으로 일치시킨다. 대문자 변환은 측정 전에 적용한다.
3. **구조**: axis presence ordinal omit/hairline/quiet/full/emphasised, tickDirection/tickLength/density/observed-only/endpoints/sparse, zero line/baseline/major/minor grid, dash/weight/color/behind/front. discrete-axis tick-label hit가 물리적으로 렌더링된 label과 동일해야 한다.
4. **mark geometry**: line width/dash/curve, point shape/size/outline/halo/fill, bar gap/corner radius, area opacity, arc gap/pad/inner radius, cell border. 패널이 좁아졌을 때 size와 opacity를 연동하는 policy도 resolved design에 남긴다.
5. **label fit**: wrap→skip→rotate45→rotate90 순서, minimum readable size, overflow/truncation tooltip, series-end label의 collision avoidance, mark-inside/outside value labels와 background 대비. `showValueLabels`와 theme policy 간 우선순위를 정하고 suppressWhenValuesPrinted가 axis/legend에 실제 반영되게 한다.
6. **legend**: categorical/continuous/quantized legend, placement/orientation/wrapping, title/header, tick labels, symbol/outline, capacity, per-series line/point glyph; legend toggle의 domain과 legend의 visible values가 같은 source of truth를 사용해야 한다.
7. **문서형 chrome**: kicker/figure label, headline/subtitle, source URL/text, logos/furniture의 zone와 frame(canvas/content/block), rule/icon/SVG furniture, footnote, facet header. chart_spec.chrome 부분 suppression이 source line을 잘못 숨기지 않게 한다.
8. **adaptive variants와 report**: variant guard가 width/height/count 같은 실제 context에서 평가되어 같은 입력+크기에는 같은 결정을 내린다. 지원하지 않는 decoration이나 fallback font는 `DesignDeparture{path,requested,resolved,reason}`와 같은 진단으로 남긴다. “조용히 무시”는 합격이 아니다.

ggaction의 applyTheme, guide/label/legend 편집과 측정 API를 최대한 재사용하되 위 정책의 gap을 비교해야 한다. resolved design을 그대로 보관하는 외부 불투명 blob은 충분하지 않다. 소스-neutral 의미와 graphic resources로 표현되고 edit/rematerialization/export에 참여해야 한다.

실제 theme realization은 backend마다 다르다. core types의 “Vega-Lite only” 주석 일부는 Plotly theme 구현과 맞지 않는다. Plotly assembler는 groundTheme/realizeTheme를 사용하지만 ECharts/Chart.js assembler에서 theme_spec 전체 적용은 확인되지 않는다. 따라서 reference는 각 기능의 구현이 존재하는 backend를 택하고, 모든 backend가 동일theme를 구현한다는 전제로 golden을 만들지 않는다.

근거: [ThemeSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1095-L1123), [type/axis roles](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L32-L125), [Plotly grounding 및 realization](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/assemble.ts#L494-L539).

### 3.6 layout·composition·responsive의 구체적인 합격 조건

baseSize는 원하는 크기이고 canvasSize는 전체 facet composition을 포함한 상한이다. plot box와 axes/header/title/legend/source를 포함한 block/canvas를 혼동하면 reference보다 실제 canvas가 커지거나 label이 겹친다. Flint의 categorical overflow는 단순 잘라내기가 아니라 category viewport rail로 표현될 수 있다. filter 후 total/count/start가 바뀌고 끝으로 스크롤한 상태에서 category가 삭제되면 start를 clamp해야 한다.

Flint planner가 다루는 항목은 step padding, elasticity, maxStretchX/Y, minStep/minBandStep/maxBandSize, facetElasticity/minSubplotSize/facetGap/column wrapping, continuous-axis ratio, band target aspect, cellGrowth, label font floor, group lane filling, rowNamesAbove, canvas fit/refit/treatment다. 전체 옵션명과 타입은 부록 및 JSON에 있다. 이름이 internal이라고 주석 처리된 옵션도 public AssembleOptions에 노출되어 있다는 사실을 기록하고 adapter policy로 직접지원/거부/내부전용을 구분한다.

필요한 neutral layout 결과는 `plotBox`, `contentBox`, `canvasBox`, child view boxes, axes/legend/title/source boxes, coordinate transforms, category viewport descriptors다. 하나의 숫자 width/height만 반환하면 host가 hit와 floating UI를 정렬할 수 없다. Table/Bar Table/Sparkline는 단일 plot이 아니라 text/tile/rule/plot view들의 구성이다. createAdjacentPlot으로 나란히 놓아 보이는 것만으로 공유 row grid·열 정렬·baseline이 맞지 않는다. row/column track layout을 명시적으로 모델링한다.

React wrapper fit은 `scale-down|crop|relayout` 세 가지다. 현 upstream은 relayout이 topology를 바꾸면 false를 반환하고 remount하며 이 경우 reader state가 유지되지 않는다고 명시한다. 목표 구현에서는 가능하면 semantic IDs로 rebase하여 state를 보존하고, 불가능하면 state loss를 설명해야 한다. source parity를 위해 현재 동작을 그대로 재현하는 모드와 개선된 host 정책을 구별한다. CSS scale로 줄인 canvas의 pointer 좌표, devicePixelRatio, page scroll, nested scroll, CSS transform이 selection geometry에 중복 적용되지 않게 한다.

필수 fixture는 320/640/1280 폭, 1/8/50/500 categories, 긴 영문/한글/숫자 labels, 1/4/25 facets, 공유/독립 scale, 열/행/양축 facet, nonuniform label widths, 모든 legend placement다. width가 한 px 변할 때 topology가 무한 oscillation하지 않는 안정성 테스트가 필요하다. 위 숫자는 제품 성능 주장이 아닌 제안하는 검증 grid다.

근거: [AssembleOptions](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1469-L1717), [React fit과 state 제한](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/react/index.ts#L72-L126), [renderer layout 계약](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L74-L115).

### 3.7 interaction 23개: 호스트·gesture·의미·표현을 분리한다

현재 `mountChart`의 interaction 지원은 Vega-Lite에 집중되어 있다. `composeInteractiveOptions`는 backend가 vegalite가 아니면 code/spec interaction을 삭제하고 `interactions_ignored` warning을 추가한다. ECharts/Chart.js/Plotly adapter에는 category rail과 resize/destroy는 있으나 semantic applyUpdate/getState 계약이 구현되어 있지 않다. 따라서 upstream backend parameter를 ggaction으로 추가하기만 하면 interaction은 전부 사라진다. **이 hardcoded 검사부터 capability registry 기반으로 바꾸어야 한다.**

**Native backend 동작은 별도 요구사항이다.** Flint가 비-VL 경로를 static이라고 부르는 것은 공통 preset/update runtime이 없다는 뜻이다. ECharts template은 자체 tooltip과 hover emphasis를 생성한다. 예를 들어 Network Graph의 adjacency highlight와 force layout, Treemap의 breadcrumb/leafDepth는 실제 option에 들어간다. 반면 Tree expandAndCollapse와 graph/tree/treemap roam은 명시적으로 false다. 원본 엔진이 할 수 있는 기능 전체를 Flint의 제공 기능으로 부풀려서는 안 되며, 실제 생성한 native option의 동작은 ggaction에서도 보존해야 한다. `flint-native-behaviors.json`은 ECharts/Chart.js/Plotly template/assembler의 tooltip, emphasis, hover, force, breadcrumb, zoom/roam, animation 관련 선언과 source 위치를 추가 기록한다. 동작값이 false인 것은 disabled configuration이고, JS 함수가 있는 것은 브라우저 실행을 통해 별도 증명해야 한다. ([Graph 실제 옵션](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/graph.ts#L113-L143), [Tree의 명시적 비활성화](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/tree.ts#L96-L111))

여러 chart를 연결하는 기능은 `linked-brush` preset 하나로 끝나지 않는다. public `LinkSpec.fields`와 chart별 send/receive, field별 `in|range` condition, hover의 transient layer, retained selection, global reset, source records에서 tuple 복원, `linked-selection` layer를 함께 처리해야 한다. 서로 다른 chart의 A/B field combination이 원래 존재하지 않는 조합까지 만들어내지 않는지 테스트하고, correlation-preserving tuple selection과 현재 upstream의 field-wise intersection 동작을 명시적으로 구별한다. host→chart→host feedback은 source와 update ID로 차단한다. ([link 계약](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/link.ts#L15-L118))

아래 표의 requires는 registry metadata다. 실제 chart/data/layout에서 support가 성립하는지는 runtime admission이 다시 결정한다. 원형 차트에 rectangle이 없거나 nominal 축에 continuous navigation이 없으면 명시적 rejection이 맞다. 상호작용 conflict는 gesture/target/state group 단위로 판단한다. 같은 plot drag를 pan과 rectangular brush가 동시에 소유하지 않게 modifier/mode 정책을 제시한다.

| ID / preset | gesture / requires | 실제 옵션·reset 계약 |
|---|---|---|
| FINT-001 / `click-highlight` | click; elements | `dimOpacity`, `targets`, `reset`; default reset: click-none, escape |
| FINT-002 / `axis-highlight` | click; discrete-axis | `axis`, `event`, `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-003 / `click-group-focus` | click; elements | `dimOpacity`, `groupBy`, `reset`; default reset: click-none, escape |
| FINT-004 / `hover-group-focus` | hover; elements | `groupBy`, `emphasis`, `dimOpacity`, `tolerance`; default reset:  |
| FINT-005 / `click-annotate` | click; elements | `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-006 / `select` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-007 / `lasso-select` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `reset`; default reset: click-none, escape |
| FINT-008 / `brush-x` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-009 / `brush-y` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-010 / `brush-angle` | drag; elements, angular-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-011 / `brush-zoom` | drag; navigation | `axes`, `guide`, `reset`, `transition`, `resetTransition`; default reset: double-click, escape |
| FINT-012 / `linked-brush` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`, `groupBy`, `brush`; default reset: click-none, escape |
| FINT-013 / `legend-toggle` | click; legend | `mutedOpacity`, `reset`; default reset:  |
| FINT-014 / `context-activate` | context; elements | ; default reset:  |
| FINT-015 / `long-press` | long-press; elements | `holdMs`, `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-016 / `double-activate` | double; elements | `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-017 / `inspect` | inspect; elements | `mode`, `cycle`, `tolerance`, `guide`, `selector`, `dimOpacity`; default reset:  |
| FINT-018 / `inspect-index` | inspect; index | `axis`, `tolerance`, `show`, `seriesBy`, `displayValue`, `guide`, `selector`, `reset`; default reset: escape |
| FINT-019 / `navigate` | navigate; navigation | `axes`, `pan`, `zoom`, `wheelSensitivity`, `domainGuard`, `reset`, `resetTransition`; default reset: double-click |
| FINT-020 / `drag-reorder` | drag; reorder | `reset`; default reset:  |
| FINT-021 / `accessible-navigation` | keyboard; elements | `emphasis`, `dimOpacity`, `caption`, `sections`, `maxFields`; default reset:  |
| FINT-022 / `filter-controls` | widget;  | `fields`, `mode`, `placement`, `render`, `initial`, `dimOpacity`; default reset:  |
| FINT-023 / `context-menu` | widget; elements, cartesian-region | `items`, `gesture`, `dimOpacity`, `reset`, `render`; default reset: click-none, escape |

공통 runtime의 불변 조건은 다음과 같다.

- pointer hit는 renderer datum을 그대로 사용자에게 넘기지 않고 `{visual:{kind,role},elements:[{value,records}]}`로 변환한다. line/path/region/widget/handle/legend/axis/chart/title/header 역할을 보존한다. 한 semantic element가 여러 graphic primitive를 가질 수 있다.
- interaction state는 source data/graphicSpec의 임의 필드에 흩어놓지 않는다. selection, hidden legend values, viewport, category windows, category order, annotations, filters를 읽을 수 있는 session state owner가 필요하다.
- preview는 pointermove/rAF 동안 발생하고 commit은 완료 시, cancel은 Escape/pointercancel/lost capture 등에 발생한다. 취소 후 preview 자원이 남거나 committed selection이 지워지면 안 된다. reader/host를 구분하여 link feedback loop를 막는다.
- 여러 update는 ID를 가진 retained/preview layers로 합성한다. 같은 ID 재적용은 replacement, clearUpdate는 해당 update만 해제, setUpdates는 선언된 집합으로 교체한다. viewport는 최신 업데이트가 기존 viewport를 supersede하는 upstream 규칙을 adapter에서 구현한다.
- target resolution 결과에는 resolvedTargets/unresolvedTargets/unsupportedOps와 applied/partially-applied/unsupported를 반환한다. missing semantic key를 모두 대상으로 오해해서는 안 된다.
- mouse/pointer/touch/pinch/keyboard/assist-distance를 공통 plot coordinate space로 투영한다. brush hit inclusion은 glyph center인지 polygon intersection인지 shape별 계약을 정한다. 선 segment hit와 series-level selection을 구별한다.
- assist targeting은 화면 px 거리로 동작하고 zoom/CSS transform 이후에도 일정한 hit tolerance를 유지한다. invisible/filtered/decorative marks가 target 후보에 들어가지 않는다.
- accessible-navigation은 screen reader label을 넣는 것 이상의 기능이다. chart→title/axes/legend/header→series→mark 탐색 순서, roving focus, announce value, keyboard region creation/move/resize, focus restoration, visible focus ring까지 검증한다.
- filter controls, context menu, annotation editor, floating panel은 host DOM 계층이며 core graphics와 ownership을 분리한다. 데이터 값은 textContent로 렌더링하고 arbitrary HTML을 실행하지 않는다. custom SVG overlay는 별도 sanitize/allowlist 계약을 가진다.
- destroy는 pending frame/timer/pointer capture/ResizeObserver/listener/floating-panel/renderer resources를 모두 정리한다. 중복 destroy는 안전하고 늦게 완료되는 async mount/update가 disposed surface를 복구하지 않는다.

현재 ggaction의 selectMarks/highlightMarks/filterMarks/editMarkSelection은 프로그램 표현과 선택 결과를 만들 때 활용할 수 있다. 이것만으로 pointer session, legend toggle, keyboard navigation, viewport transform, live panel을 완성했다고 판단하지 않는다. pure selection predicate와 host event runtime, semantic update application을 나눈다.

근거: [비-VL interaction drop](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/compose.ts#L25-L64), [admission/gesture 충돌](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/admission.ts#L43-L119), [interaction 상태](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L325-L407).

### 3.8 7가지 semantic update를 ggaction 액션으로 연결하는 계약

| 원본 update | neutral adapter의 처리 | 꼭 확인할 역연산/검증 |
|---|---|---|
| set-style | semantic selector→mark/guide owners→selection/highlight/style edit | 강조/음영/normal 복귀, 다른 update layer와 우선순위, unresolved target |
| set-annotation | semantic target anchor→annotation text/connector placement | offscreen이면 저장하되 inView=false, viewport 복귀 시 재등장, note ID 제거 |
| set-viewport | x/y domain 또는 geo region/camera 변경 | empty value home reset, log/time inverse, latest viewport supersession, animation settlement |
| set-order | category/series/facet ordering resource edit | field별 identity, unknown/missing values, visual and state order 일치 |
| set-overlay | 명명된 line/point/rule/rect/text data overlay | scale coordinate와 data provenance, clipping/z-order, remove by null |
| set-freeform-overlay | SVG/clone body와 screen/data anchors, transform | sanitization/clip/resource lifetime, resize/zoom anchor, export 포함 policy |
| set-data | main dataset replacement→의존 transform/materialization | IDs 유지/rebase, filter/selection의 유효성, source count와 hit records 일치 |

`set-freeform-overlay`를 generic chart authoring의 주 경로로 쓰면 안 된다. host가 임시 설명을 덧붙이는 기능과 원본 차트를 번역하는 기능을 분리한다. 차트 marks는 domain actions로 materialize하고 overlay는 별도 owner와 ephemeral/persisted 정책을 가진다.

현재 타입은 ChartState.selected/entries/hidden/viewport/windows/categoryOrder/annotations/filters를 반환한다. ChartChange는 changed facets, previous/current, source, phase, interactionId, action, target, geometry, reset을 가진다. 적용 후 render가 끝난 시점의 state를 보고하고, 변하지 않은 상태에 중복 change를 난사하지 않는 계약이 필요하다. onInteraction은 state 변화가 없어도 gesture를 보고하므로 onChange와 합치지 않는다.

근거: [7 update ops](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L227-L278), [UpdateResult](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/language/updates.ts#L36-L41), [ChartChange](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L24-L69).

### 3.9 애니메이션: 현재 범위와 완전한 목표를 구분한다

Flint의 viewport animation은 실제 구현이다. 타입 주석은 projected charts를 강조하지만 Cartesian navigation-scale도 tween을 수행한다. transformed axis space에서 center는 선형, span은 기하 보간하고 easeInOut를 적용하므로 log 축의 확대가 일정하게 보인다. host applyUpdate({transition:{duration}})는 마지막 render frame까지 기다리고 gesture-driven transition은 다음 입력을 막지 않는다. 새 transition은 이전 것을 취소하며 reset flight도 있다. geo는 extent/rotation과 detail-level 전환을 함께 처리한다.

다만 이 조사에서 general mark enter/update/exit, arbitrary chart morph, keyframe timeline, seek/record/export를 Flint public 계약으로 확인하지는 못했다. 이러한 기능은 사용자 목표의 “애니메이션도 다”를 완성하기 위한 **ggaction 확장 요구**로 분리한다. backend의 기본 ECharts/Plotly animation을 Flint의 공통 animation grammar로 오인하지 않는다.

필수 설계는 다음이다.

1. immutable ChartProgram A/B와 stable semantic owner/row keys로 element correspondence를 만든다. index-based 매칭은 filtering/reorder에서 잘못 연결되므로 금지한다.
2. animation session은 시작/목표 program과 timing, easing, stagger, interpolation policy, interruption policy를 가진다. semanticSpec은 최종 의미를 보존하고 frame마다 public action trace를 수천 번 추가하지 않는다. 각 frame은 graphics에서 계산하지만 source meaning은 양 끝 프로그램으로 추적된다.
3. coordinate와 scales 변화는 semantic-space/graphic-space 중 어떤 보간인지 명시한다. log domain은 transform-space, angle은 shortest/wrapped policy, color는 명시된 color space, path는 compatible topology 여부가 필요하다. 다른 topology는 cross-fade 등 선택된 fallback을 보고한다.
4. viewport pan/zoom, category reorder, filter enter/exit, value change, theme change, facet/composition resize, map rotation/projection/LOD를 각각 지원 case로 둔다. 한 animation에 decoration이 날아다니고 data mark가 다른 시점에 도착하지 않게 dependency timing을 정의한다.
5. reduced-motion과 duration=0은 즉시 최종상태로 이동하고 change events/Promise 결과가 일반 경로와 동일하다. cancel/interrupt/seek/end/dispose를 test clock으로 재현한다.
6. deterministic frame render API가 있어야 영상/GIF export, screenshot oracle, headless CI가 가능하다. wall-clock/rAF 성능 테스트와 numeric interpolation 테스트를 분리한다. immutable graph를 매 frame 전체복제하는 방식의 memory cost를 측정한다.

근거: [Cartesian tween](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/navigation-scale.ts#L95-L216), [host update settlement](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/runtime.ts#L1434-L1474).

### 3.10 Geo: projection 하나로 끝나지 않는 필수 범위

Flint Map은 lon/lat point와 basemap, Choropleth는 region ID와 color를 결합한다. US/world 자동판정과 explicit override, state/country 이름·short code·numeric ID gazetteer가 있고 Plotly는 별도의 geographic trace를 사용한다. 세계 지도 projection 선택은 mercator/equalEarth/orthographic/stereographic/conicEqualArea/conicEquidistant/azimuthalEquidistant/mollweide 8개이며 US 기본 albersUsa와 내부 pre-projected identity path도 있다. center preset은 19개다. orthographic globe는 Sphere를 기준으로 fit하고 sea/rim/no-data land를 decorative layer로 구분한다.

Choropleth는 US state/county/auto detail을 지원하고 custom `levels:[{value,url,feature?,enter?,exit?}]`, `featureKey`, `baseMapUrl`로 임의 GeoJSON/TopoJSON의 다중 레벨 지도를 만든다. default custom projection은 mercator다. detail level마다 zoom threshold를 두고 projection/camera가 변할 때 active level과 focus region을 상태로 반환한다. geography 자체는 mark인데 no-data base land는 선택 data mark가 아니다.

완전한 source-neutral 확장에는 아래가 필요하다.

- **Data/resource**: GeoJSON Feature/FeatureCollection, GeometryCollection 및 Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon; TopoJSON object 선택→decode; explicit featureKey와 row join; missing/duplicate join diagnostics; feature ID와 source row lineage를 분리한다. geometry index와 measures update를 분리해 값이 바뀔 때 모든 polygon을 다시 parse하지 않는다.
- **Coordinate**: geographic coordinate resource에 projection type/parameters/rotation/center/parallels/scale/translate/fit/clip을 저장한다. 렌더러가 browser projection 함수를 암묵적으로 호출하지 않고 materializer가 path/point를 만든다. viewport pointer inverse는 같은 projection definition에서 계산한다.
- **Geometry**: antimeridian cut, hole winding, ring closure, multipolygon islands, sphere clipping, horizon/backface, adaptive resampling, large coordinate bounds를 처리한다. projected planar geometry를 spherical lon/lat로 다시 해석하지 않는다. point symbol 크기는 지도 확대와 함께 원치 않게 확대하지 않는다.
- **Guide/theme**: sequential/diverging/quantized color legend, geographic graticule 필요 시, region label/collision, no-data land/sea/rim/border. 알려진 지역에만 값이 있어도 바탕 국가가 구멍처럼 사라지지 않게 한다.
- **Camera/runtime**: anchor-preserving pan/zoom, orthographic globe drag rotation, wrapped longitude, region fit, reset, clamp/overscroll/min/max visible fraction, camera tween, LOD hysteresis, geo focus region lookup. viewport copy/reload 시 exact camera와 logical lon/lat range가 서로 drift하지 않아야 한다.
- **Hit**: polygon interior와 hole, antimeridian을 넘는 지역, hidden globe backside, LOD 전환 전후 target identity, region selection+annotation을 검증한다. geometric pixel bounding box만으로 polygon을 선택하면 바다/구멍도 맞는 오류가 생긴다.
- **Assets**: world/us basemap의 remote URL을 core에 하드코딩하지 않는다. host resource resolver가 URL/inline/local/bundled asset을 처리하고 version/hash/license/cache/offline policy를 관리한다. URL loading 실패는 빈 지도 성공으로 처리하지 않는다.

필수 수치·기하 fixture는 (0,0), ±180° 근처, ±90° 근처, Aleutian wrapping, polygon hole, MultiPolygon island, Alaska/Hawaii inset, reverse-wound ring, degenerate ring, unknown ISO/FIPS, string/number ID, custom country levels, tiny island를 포함한다. projection forward/inverse 오차는 singularity/clipped 영역을 제외한 지점에 대해 명시된 단위 tolerance를 적용하고, clipping된 지점은 NaN path가 아닌 explicit no-geometry 결과여야 한다. 단계가 어렵다는 이유로 geo를 최종 완료 범위 밖으로 밀면 안 된다.

근거: [projection·center·basemap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/map.ts#L31-L194), [custom geography](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/map.ts#L548-L695), [map navigation와 spherical geometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/navigation-geo.ts#L1-L152).

### 3.11 host adapter 구현 순서와 API 경계

현재 공개 연결점은 `mountInteractiveChartSurface(container,input,adapter,options)`이고 `InteractiveRendererAdapter`는 `mount(container,input):Promise<InteractiveRenderer>`만 요구한다. 하지만 minimal interface를 만족하는 것과 full feature support는 다르다. full adapter는 viewports/setViewports/destroy 외 layout/getViewports/getViewportGeometry/getInteractionContext/getState/onChange/resize/relayout/refresh/applyUpdate/setUpdates/clearUpdate를 구현해야 한다.

다음은 **외부 adapter 패키지의 제안 계약**이다. ggaction public API라는 뜻이 아니다.

```ts
interface PreparedChart {
  program: ChartProgram;
  manifest: {
    fields: FieldMeaning[];
    views: ViewMeaning[];
    marks: MarkMeaning[]; // neutral owner ids; never raw backend scene nodes
    provenance: ProvenanceIndex;
    capabilities: ResolvedCapability[];
    resources: ResourceRef[];
  };
  diagnostics: Diagnostic[];
}
interface AdapterCompiler {
  prepare(input: ChartAssemblyInput, context: CompileContext): PreparedChart;
  update(previous: PreparedChart, change: InputChange): PreparedChart;
}
interface Session {
  getProgram(): ChartProgram;
  getState(): NeutralChartState;
  resolveHit(hit: RenderHit): SemanticTarget | null;
  apply(update: NeutralUpdate, options: ApplyOptions): Promise<ApplyResult>;
  relayout(size: AvailableSize): Promise<{inPlace: boolean; state: NeutralChartState}>;
  destroy(): void;
}
```

핵심은 manifest를 두 번째 geometry 저장소로 만들지 않는 것이다. geometry는 ggaction graphicSpec, meaning은 semanticSpec/neutral semantic selection metadata에 있고 adapter manifest는 외부 field/channel/semantic ID를 이 owner들과 연결한다. source shape를 그대로 두는 opaque blob으로 일반 액션을 우회하지 않는다. host gesture runtime과 UI widget은 adapter/session 계층이며 순수 ChartProgram의 immutable state와 별개다. 영속 interaction 선언 및 save할 state는 명시적으로 serialize한다.

실제 작업 항목은 다음 순서다.

1. **공개 compile 계약**: Flint upstream의 backend-neutral analyzed input/layout/design와 template metadata의 export 범위를 정한다. metadata-only module이 Vega/DOM dependency를 강제로 로드하지 않게 한다.
2. **정적 adapter**: 범위가 허용된 chartType을 semantic operations→data actions→marks/encodings→guides/theme→composition으로 변환한다. 51 literal 이름 모두를 인식하고 disposition을 반환한다. KPI/Gauge는 제외 진단, dual-Y는 금지 진단이다. 허용 이름과 Doughnut/Funnel alias는 외부 계층에서 처리한다. unmapped property는 error/diagnostic이다.
3. **capability registry**: backend availability를 정적 chart support + per-input semantic capabilities + export targets로 분리한다. `InteractiveBackend` union, mountChart switch, composeInteractiveOptions의 non-VL drop, validate의 backend check, package exports, React backend prop, MCP/backend enum, Python compiler route, site backend picker를 함께 검토한다.
4. **semantic selection/runtime**: mark/axis/legend/header hit metadata와 lineage, all seven update ops, preview/retained/reset, target resolution, onChange/onInteraction을 구현한다.
5. **host widgets**: surfaces의 controls/context-menu/floating panels/links를 재사용 또는 port하고, backend-private scenegraph 접근을 neutral runtime contract로 치환한다. 불가능한 capability는 admission에서 구체적으로 실패한다.
6. **mount lifecycle**: lazy load, async resource resolve, cancel token, pending mount/update disposal, resize/relayout state rebase, multiple simultaneous charts isolation을 구현한다.
7. **static/export routes**: renderSvg는 현재 VL/EC만 지원한다. ggaction svg/pdf/png adapter를 추가해 wrapper와 geometry가 일치하게 한다. Excel은 native workbook artifact와 그림 삽입을 구분한다. native Excel semantic chart 지원이 없는 chart를 이미지로 바꿔도 “동일 backend 기능”이라고 표시하지 않는다. Image-Charts URL output은 host/compiler 기능으로 남긴다.
8. **authoring/agent integration**: chart options/pivots/transforms, theme guidance, recommended channel/type, validation diagnostics, accessible tabular data를 backend가 바뀌어도 사용할 수 있게 한다. JSON schema에 backend-independent capabilities와 unsupported reasons를 노출한다.

근거: [mount facade switch](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/index.ts#L207-L299), [adapter/surface types](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L94-L191), [custom surface entry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/surface.ts#L207-L216), [static SVG](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/render/index.ts#L6-L58).

### 3.12 test와 합격 기준: 숫자·그림·상호작용을 함께 검증한다

이 문서의 874 요구사항과 chart-datasets/corpus 요구사항을 하나의 traceability manifest에 연결한다. 테스트 결과는 `requirementId,sourceCommit,fixtureHash,adapterCommit,programHash,oracleVersion,renderer,viewport,fontSet,result,evidencePath`를 가진다. unsupported가 있으면 coverage 계산에서 drop하지 않고 실패 또는 명시적 미구현으로 남긴다.

**Layer A, pure numeric/data**: aggregates/bin/window/stack/rank/density/regression/ECDF/hierarchy/flow/projection을 independently computed oracle로 검증한다. total sum, probability area, sorted rank, edge conservation, ring containment 등 property invariant도 사용한다. 원본 row mutation과 nondeterministic random seed를 검출한다.

**Layer B, semantic/program**: every chart and option maps to expected domain actions and semantic resources; no raw createGraphics-only translation. edit/rematerialization dependency closure, resource ambiguity errors, action trace, serialization/load, frozen prior program invariants를 확인한다. action count가 차트 크기와 무조건 O(rows)로 늘어나는 생성 방식을 피한다.

**Layer C, geometry/layout**: mark count만 보지 않고 positions/extents/path topology, scale domains/zero/baselines, guides, label bounding boxes, row/column alignment, legend color mapping, polar angles/radii, clipping, composition transforms를 검증한다. generated expected from target renderer는 oracle가 아니다.

**Layer D, visual**: 고정 font·DPR·viewport·locale·timezone에서 pinned upstream output과 target canvas/svg/png/pdf를 렌더링하고 semantic masks + geometric tolerances + perceptual diff + representative manual review를 한다. 서로 다른 backend의 default smoothing을 같은 정답으로 섞지 않는다. mismatch를 numerical/data/design/text/render-layer로 분류하고 큰 diff를 threshold 올려 덮지 않는다.

**Layer E, real interaction**: pointer move/down/up/cancel, drag out of viewport, wheel/pinch, modifiers, touch long press, keyboard arrows/Home/End/Enter/Escape, focus restoration, controls/menu/annotation/link chain를 실제 DOM으로 실행한다. event payload와 visible marks와 getState를 동시에 확인한다. tooltip이 안 보이는데 event만 발행되면 실패다.

**Layer F, animation**: deterministic clock t=0/0.25/0.5/1, interrupt/cancel/reset/dispose, identity reorder, log/polar/geo discontinuity, reduced motion, finalstate hash, promise settlement, no endlessframes를 검증한다. 60fps 주장은 측정한 장비·size·P95 frametime과 함께만 한다.

**Layer G, integration/package**: `npm pack` clean consumer, SSR no DOM import, tree-shaking/lazy peer deps, ESM/CJS/types, Python/MCP route, React StrictMode mount/unmount, CSP interpreter, asset failure/offline, data URL policy, SVG sanitization, image export fonts, accessibility output를 확인한다. 최소 의존성 registry probe에서 d3-format 직접 import가 package dependencies에 보이지 않았으므로, upstream bundle output이 이를 포함하는지 clean package consumer test로 확인해야 한다. 현재 source import만으로 published package broken이라고 단정하지 않는다.

property coverage는 binary 양쪽, enum 모든값, continuous min/mid/max 및 invalid boundary, applicability eligible/ineligible, value omitted/explicit default를 포함한다. 전체 곱이 너무 크면 pairwise+high-risk interaction combinations를 쓰되 누락 행을 기록하고 “all options” 완료 여부를 개별 requirement로 계산한다. 예를 들어 log + negative data, facet + independent scale + legend toggle, geo + LOD + annotation + resize, static-series + filter + selection lineage, theme wrap + tiny canvas + DPR=2는 반드시 직접 포함한다.

### 3.13 구현 단계와 의존성

| 단계 | 산출물 | 종료조건 | 다음 단계의 의존성 |
|---|---|---|---|
| P0-a: 기준 고정 | snapshots/catalog/requirements/reference renderer harness | 모든 실제 registry row와 숨은 property가 추적됨; 분모 불일치 설명 | 모든 구현 |
| P0-b: 의미·ID·provenance | row/owner/series/facet identity, selectors, hit manifest, update state schema | aggregate/fold/bin/stack에서도 value+records 왕복 | interaction, animation, geo |
| P0-c: composition/layout/design | shared tracks/scales/roles, resolvedtheme/guide policies | small/large/faceted document charts geometry 맞음 | static fullcoverage |
| P1-a: 기존 chart parity | 원본 51행을 보존한 허용 Cartesian/polar/statistical 옵션 | upstream fixture + edgefixture + rendered evidence | host연결 |
| P1-b: 신규 geometry/layout | contour/calendar/hierarchy/graph/flow/Pyramid + partition/UpSet/inference/bundling | 수치 oracle+geometry invariants+source/USR disposition 누락없음 | full chartgoal |
| P1-c: geo 전체 | source-neutral geographic data/coordinate/materializer/runtime | 8projection+US+customlevels+camera/LOD/selection/export | geo completion |
| P1-d: interaction runtime | 23presets+7ops+controls/links/accessibility | real-input state/event/visible output합치 | backend readiness |
| P1-e: animation | viewport+general mark/composition/geo transitions | deterministic frames/interruption/settlement | user animationgoal |
| P2: external integration | Flint adapter/publicregistry/React/MCP/Python/export/docs | upstream-compatible host scenarios+cleanpackage | release candidate |
| P2: exhaustive closure | row-by-row evidence manifest and resolved gaps | unimplemented/unknown=0 for agreed pinned scope; independent visual review | release |

P1 안의 독립 계산 작업은 병렬화할 수 있다. 그러나 “geo나 interaction을 차후 버전으로 넘기고 이번 범위를 완성했다고 선언”하는 것은 허용하지 않는다. 현재 요청은 구현 자체가 아니라 구현 가능할 정도의 보고서이며, 실제 public API/schema/architecture 구현은 별도 작업이며 기존 repository 계약과 개정된 사용자 범위를 따라 검증해야 한다.

### 3.14 라이선스·폰트·asset 및 외부 의존성

Flint code는 MIT이고 배포되는 LICENSE/copyright를 보존한다. theme 이름이 외부 브랜드에서 영감을 얻었더라도 brand assets/font 자체를 MIT로 추정하면 안 된다. core theme preset은 system-font fallback과 named font family를 지정하며, site에는 Kalam TTF, MCP assets에는 LiberationSans/DejaVuSans TTF가 별도로 있다. reference fidelity는 `FontManifest{family,file,hash,license,fallback}`로 관리하고 CI에서 실제 선택된 font를 기록한다. 시스템에서 빠진 font가 비슷하게 보여도 exact text layout proof로 인정하지 않는다.

Map source의 world/us URL은 vega.github.io의 versionless asset URL이다. 다운로드된 geography의 origin/version/hash/license 및 joins를 고정한 local test fixture를 별도로 만들어야 재현 가능하다. 라이브 URL을 매 테스트마다 사용해 baseline이 변하게 하지 않는다. custom geography와 SVG furniture는 host가 제공하는 resource이며 source-neutral resolver가 접근·캐싱·실패·export embedding을 처리한다.

npm runtime dependencies는 @floating-ui/dom, d3-time, d3-time-format이고 optional peers는 Vega/Vega-Lite/vega-tooltip, ECharts, Chart.js, Plotly, React다. 새 backend는 필요한 peer만 lazy load해야 한다. image-charts URL은 image-charts.com 외부 서버가 그리는 결과이므로 offline standalone ggaction render와 서비스 availability/transport/privacy 조건이 다르다. adapter가 URL을 만드는 경우 실제 network fetch 여부를 호출자에게 노출한다.

근거: [LICENSE](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/LICENSE#L1-L21), [dependency declarations](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/package.json#L143-L210), [hosted image backend](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/image-charts/index.ts#L5-L27).

> 아래 부록의 KPI/Gauge/Funnel/independentYAxis 등은 **고정된 외부 소스의 원문 인벤토리**다. 신규 구현 목표나 공개 API 권장명이 아니다. 최종 대상은 scope-policy/target-chart-mapping과 부록 F로 판정한다.


## 4. 코퍼스·기존 번역 조사 기록 — 참고 전용

> **과거 코퍼스/번역 조사 — 참고 전용.** 이 장의 원본 사실·수치·이전 권고를 보존한다. 이전의 필수/호환/번역/완료 표현은 최신 계획의 의무가 아니다. POL-09/10에 따라 외부 정합성·통합·번역은 철회되었고, 활성 작업과 시험은 14–15장 및 GGA/USR 원장만 사용한다.

> **범위 개정:** 모든 파일과 원본 선언은 유지한다. 부록 F에 따라 금지된 dual-Y 표현은 별도 policy disposition을 갖고, 허용 원본만 fidelity qualification 대상으로 삼는다. 별도 패널 등 재표현은 원본 합격으로 세지 않는다. 단순 independent Y 선언은 layer/facet 의미를 해석해야 한다.

이 절의 결론은 **현재 공개 번역본은 좋은 액션 구성의 출발점이지만, Chart-LLM 원본 전체의 정적·동적 동등성을 이미 증명한 데이터셋은 아니다**라는 것이다. 원본 1,981개의 번호를 보존한 전수 원장, 공개 번역본 1,387가족의 산출물 검사, 10,174개 프로그램의 AST 검사, 24,957개 저장소 차트 후보의 문법 분류, 현재 ggaction 0.0.26에서 수행한 46개 프로그램 재실행을 서로 다른 증거로 기록했다. 이 구분을 구현과 CI에도 그대로 도입해야 한다.

### 4.1 조사 기준과 재현 가능한 분모

2026-10-27 읽기 전용 스냅샷의 기준은 다음과 같다. 원본 파일이나 번역 프로그램, ggaction 코드는 수정하지 않았다.

| 대상 | 고정 커밋 | 의미 |
| --- | --- | --- |
| `hyungkwonko/chart-llm` | `6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24` | 목표 원본 및 저장소 전체 벤치마크 |
| `ggaction/chart-datasets` | `58791ace7212cacb98c2b64e3f92280722ab638e` | 공개된 1,387가족, 10,174개 액션 프로그램 |
| `ggaction/ggaction` | `40ec7edead7fc84de05aad31888dd0f7d264a512` | 이번 일부 프로그램 재실행의 0.0.26 런타임 |

Chart-LLM의 README는 주 데이터셋을 `docs/data/chart`의 1,981개 인간 작성 Vega-Lite 명세로 정의하고, 도구팁·팬/줌·연결 선택과 복합 뷰를 다양성의 핵심으로 설명한다. 따라서 번역 목표를 정지 화면으로 축소하는 것은 원본 데이터셋의 설명과 맞지 않는다. [원본 README L10–14](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/README.md#L10-L14)

저장소 전체는 추적 파일 25,399개, JSON 25,024개다. 모든 JSON을 파싱했고 파싱 실패와 중복 JSON 키를 발견하지 않았다. 이 중 최상위 차트 구조를 가진 후보는 24,957개, 데이터/메타데이터 배열 55개, 데이터/메타데이터 객체 11개, 차트를 내부에 담은 컨테이너 1개다. 후보의 JSON 정규화 해시로 묶으면 24,276종이다. **24,957과 24,276은 유효 차트 수가 아니다.** 최상위 `mark`, `layer`, `facet`, `repeat`, `concat` 등의 구조로 분류한 수이며, 동일 JSON은 동일 실행 환경이나 데이터 상태까지 의미하지 않는다.

| 그룹 | 루트 차트 후보 파일 | 그룹 내부 고유 JSON | 해석 |
| --- | ---: | ---: | --- |
| `docs/data/chart` | 1,981 | 1,981 | 기본 목표 원본. 번호를 영구 보존한다 |
| `chart-48` | 48 | 48 | 별도 출현 위치를 가진 부분집합 |
| `chart-48-in` | 48 | 48 | 입력용 부분집합; 원본과의 alias는 해시로 추적 |
| app 예제 | 11 | 11 | 앱에 포함된 명세 |
| framework sample | 1 | 1 | 프레임워크 샘플 |
| VisQA-release | 52 | 52 | 별도 벤치마크 명세 |
| ChartSeer | 9,917 | 9,897 | 모든 후보가 데이터 선언이 없는 추상 템플릿 |
| Data2Vis | 4,318 | 4,318 | 구형 `config.cell`, `bandSize`와 보조 속성이 있는 명세 |
| nvBench | 7,241 | 6,680 | inline 데이터 기반 후보; 동일 명세의 다중 출현 |
| Vega-Lite benchmark | 718 | 711 | 버전별 예제 출현 및 중복 |
| Vega-Lite v4 benchmark | 622 | 617 | 구형 예제; 별도 dialect qualification 대상 |

그룹 내부 고유 수는 전역 고유 수와 합산할 수 없다. 다른 그룹의 alias와 사본을 보존한 `corpus-duplicate-specs.json`이 중복의 근거다. ChartSeer의 9,917개는 데이터가 없는 문법 템플릿이므로 “원본 화면을 재현했다”라는 판정을 붙일 수 없다. 그렇다고 목표에서 지우지 않는다. 템플릿 인스턴스 생성 규칙, 타입별 테스트 데이터, bin/timeUnit/aggregate 조합의 의미 검사를 갖춘 별도 qualification track으로 다룬다.

루트 후보가 아닌 나머지 67개 JSON도 객체·배열·JSON 문자열 내부를 재귀 검사했다. `exp/d2_utterance/data/vlSpecs.json`에서 **30개 embedded chart 후보**를 추가로 확인했다. 각각의 키를 JSON pointer로 보존했고 28개는 선언 v3 스키마를 통과하며 2개는 실패한다. 따라서 root 파일 후보 24,957개와 내부 chart 출현 30개를 합친 **차트 후보 출현은 24,987개**다. 정규화 JSON 해시로 이 30개와 root 후보의 완전 일치 alias는 없었으므로 합산 고유 후보는 24,306개다. 이 30개를 canonical 1,981개에 몰래 합치거나 제외하지 않는다. composition child는 별도의 독립 원본으로 부풀리지 않고 각 후보의 tree 안에서 검사한다. 상세 경로·원문·스키마 결과는 `corpus-embedded-specs.json`에 있다.

선언된 `$schema`에 대해서도 검증했다. 공식 URL에서 가져온 스키마의 바이트와 SHA-256을 보관하고 Ajv로 구조·타입을 검사했다. `validateFormats:false`이므로 `format` keyword의 의미 검사는 제외했다. `$schema`가 없는 명세를 임의로 v5로 판정하지 않았다.

| 전 저장소 후보의 문법 상태 | 수 |
| --- | ---: |
| 선언한 JSON Schema 통과 | 2,870 |
| 선언한 JSON Schema 실패 | 610 |
| 스키마 미선언으로 dialect 미확정 | 21,476 |
| 선언한 `v4.2.1.json` URL이 404여서 미확정 | 1 |
| 합계 | 24,957 |

주 원본 1,981개는 모두 v5를 선언하지만 1,417개만 해당 스키마를 통과하고 564개는 실패했다. 스키마 통과는 컴파일 성공·데이터 가용성·동작·시각적 정확성을 보증하지 않는다. 반대로 실패는 “의도한 차트가 없다”라는 뜻이 아니다. 과거 `selection` 문법, 비표준 실험 속성, 잘못된 속성 위치 또는 철자가 남을 수 있다. 실패 원본도 원래 해시와 JSON pointer를 보존하고 **원본→dialect 해석→명시적 repair→native program**의 변환 기록을 남겨야 한다. 현재 스키마가 허용하지 않는 속성을 무조건 삭제하여 유효하게 만드는 방식은 금지해야 한다.

재현 명령은 보고서 폴더에서 다음 순서다. `corpus-schema-sources.json`의 각 URL과 SHA-256에 대응하는 스키마 파일은 evidence에 이미 저장되어 있으므로 재검증에는 네트워크가 필요 없다. Node 도구는 현재 ggaction checkout의 Acorn, Ajv, esbuild, Playwright를 사용한다.

```sh
python3 scripts/corpus-census.py
python3 scripts/corpus-source-deltas.py
node scripts/corpus-programs.mjs
node scripts/corpus-schema-validation.mjs
node scripts/corpus-embedded.mjs
node scripts/corpus-runtime-probes.mjs
python3 scripts/corpus-finalize.py
```

### 4.2 공개 번역본의 의미와 원본 식별 문제

공개 저장소의 manifest, 실제 폴더, stage 목록은 1,387가족/10,174프로그램으로 일치한다. 선언된 파일의 존재, 바이트 길이, SHA-256과 실제 stage 파일 집합 검사에서 실패가 없었다. Acorn으로 10,174개 ES module을 모두 파싱했고 구문 오류가 없었다. G1의 member-call site 수는 최소 4, 중앙값 12, 최대 235다. 이 수는 `Math.sqrt` 같은 helper 호출도 포함하므로 동적 액션 수나 간결성 점수로 사용하지 않는다. 이번 AST screening에서 반복문, 대입문, `graphicSpec`·`semanticSpec`·`scenegraph` 직접 참조를 발견하지 않았으나, 이것만으로 모든 입력 소유권과 의미 동등성이 증명되는 것은 아니다.

G1부터 G8까지의 프로그램 수는 각각 1,387 / 1,387 / 1,381 / 1,366 / 1,323 / 1,266 / 1,141 / 923이다. 모든 가족을 억지로 8단계까지 늘리는 구조가 아니라, 같은 결과를 의미 있는 작은 액션으로 분해하다가 frontier가 끝나면 멈추는 설계다. 이 원칙은 유지할 가치가 있다. [stage 원칙과 cutoff](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L44-L53)

하지만 공개 번역의 정확한 런타임 pin은 **ggaction 0.0.24**다. `runtime-lock.json`의 source commit은 `5f952f59b9ca236e8e9cff477c4f51067f2f8ea9`, release commit은 `fd5c4073fc80295c513bd099ac0ff0aa83059371`이고 npm archive SHA-256은 `ab6dce015ef4698aa9b1691ce91448c03ce6ad5244d0918a84d3f6f758413889`이다. 이 저장소가 기록한 1,387/10,174 replay 통과는 0.0.24의 사실이다. 0.0.26 전체 replay나 원본 동작 충실도로 옮겨 적으면 안 된다. [runtime pin과 검증 정책](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L86-L113), [runtime-lock](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/runtime-lock.json#L1-L18)

더 중요한 점은 **숫자 ID가 같은 파일이 반드시 이 GitHub 원본과 동일하지 않다**는 것이다.

| 원본 1,981개와 공개 `source.vl.json`의 관계 | 수 | 허용되는 결론 |
| --- | ---: | --- |
| 파일 바이트 동일 | 932 | 이 스냅샷의 원본 파일 식별 가능 |
| 바이트는 다르지만 JSON 정규화 값 동일 | 115 | 직렬화 차이 후보; 실행 환경까지 동일하다는 뜻은 아님 |
| JSON 구조 또는 값이 다름 | 340 | 원본과 다른 source artifact; 차이별 분석 필요 |
| 공개 가족 없음 | 594 | 공개 번역 및 공개 certification 부재 |

따라서 1,387/1,981=70.015%는 **번호가 연결된 공개 가족 비율**이지 충실도나 실제 지원률이 아니다. JSON 값까지 같은 source가 1,047개라는 사실도 번역 결과가 원본과 같은 비율을 뜻하지 않는다. provenance tuple은 `repository + commit + path + bytes SHA-256 + dialect + data-owner hashes`로 정의해야 한다.

`DATA_SOURCES.md`는 보존 대상이 “local corpus”이며 그 로컬 코퍼스에는 전체 라이선스나 canonical repository URL이 없었다고 명시한다. exporter는 그 로컬 workspace의 `source.vl.json`과 검증 기록의 해시를 확인하고 파일을 복사한다. 공개 Chart-LLM 커밋과 비교하는 단계는 이 경로에 없다. 즉, byte-for-byte 보존 주장은 **이미 가공된 로컬 source의 보존**일 수 있으며, 이번 결과만으로 exporter가 원본을 훼손했다고 말할 수 없다. 반대로 README의 “Unchanged original”을 현재 Chart-LLM GitHub 원본과 동일하다고 해석해서도 안 된다. [local corpus 설명](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/DATA_SOURCES.md#L3-L13), [exporter source 입력과 검증](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/scripts/sync-dataset.py#L160-L198), [copy 단계](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/scripts/sync-dataset.py#L266-L293)

왜 과거 로컬 입력에서 상호작용이 제거됐는지는 공개 배포 자료만으로 확정할 수 없다. 확인 가능한 근거는 현재 갤러리가 frozen SVG와 정적 복잡도에 초점을 둔다는 점, 복잡도 계산에서 tooltip과 interactive channel을 제외한다는 점, completion이 원본 Vega-Lite와 정확한 픽셀 일치를 뜻하지 않는다고 밝힌다는 점이다. 이 사실은 정적 변환이 만들어진 배경과 양립하지만, 실제 제거한 주체·시점·정당성을 증명하지 않는다. 과거 실행 로그가 없으면 “추정”으로 유지하고 새로운 원본 provenance로 재검증한다. [정적 catalog 정의](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L20-L27), [completion의 제한](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L161-L164)

### 4.3 원본과 다른 340개 source artifact의 분류

변경 JSON pointer를 분류한 결과는 아래와 같다. 한 원본이 여러 범주에 걸칠 수 있으므로 합계는 340을 넘는다. 이 표는 변경의 범위를 보여 주며 모든 변경이 손실이거나 오류라는 뜻은 아니다.

상세 원장에는 1,704개의 차이 기록이 있다. 길이가 다른 배열도 모든 공통 index를 재귀 비교하고 추가·삭제 index를 각각 보존한다. 배열 길이는 같은 배열 pointer의 `kind:"array-length"` 기록으로 별도 표시하며, 이 기록의 before/after는 배열 자체가 아닌 길이다. 나머지 `kind:"value"` 기록은 RFC 6901로 escape한 실제 JSON pointer의 값 변경이다. 길이가 다른 배열을 길이 한 줄로 요약하지 않는다. 모든 pointer를 실제 원본·번역 파일에 다시 적용하여 before/after 또는 excerpt hash가 맞는지 검증했다.

| 변경 범주 | 차트 수 |
| --- | ---: |
| mark 또는 encoding의 외형/선언 | 299 |
| interaction 또는 conditional 선언 | 182 |
| guide 또는 text | 175 |
| transform 또는 통계 의미 | 119 |
| layout 또는 responsiveness | 115 |
| data source 또는 values | 29 |
| empty transform / null aggregate 정규화 후보 | 14 |
| 기타 선언 | 59 |

feature 집합에서 사라진 선언을 따로 세면 selection 143개, 조건부 encoding 92개, hover 51개, brush 41개, pan/zoom 26개, cross-view selection reference 48개, input-binding 63개다. 이 수는 각 원본에서 해당 종류가 완전히 사라진 경우이며 일부 selection만 삭제된 경우를 전부 세는 방법은 아니다. 제거된 null/empty 속성과 동작 삭제를 한 수치로 합쳐 “semantic loss 340개”라고 쓰면 안 된다.

`vl_0035`, `vl_0062`, `vl_0140`, `vl_0200`, `vl_0202`, `vl_0208`은 이번 diff 분류에서 empty-transform/null-aggregate 정규화 후보만 발견됐다. 이것들도 dialect별 기본값 동등성 검증 전까지 무조건 harmless로 확정하지 않는다. 변경 없는 경우와, 동등함을 입증한 정규화와, 원본 의미를 바꾼 repair를 별도 상태로 저장한다.

#### 4.3.1 `vl_0011`: 화면 replay가 팬/줌을 증명하지 못하는 최소 사례

원본 `/selection`은 `selector014: {type: "interval", bind: "scales", encodings: ["x", "y"]}`이다. 번역 source에서는 `/selection` 전체가 없다. 원본 source 해시는 `d9613aa087f7b139d38d77fcbadfe4e3375465a1cbb10fbac519d97adfd38ac5`, 번역 source 해시는 `47b6825fee809ce6f95911f5536947565472bbae3ff791def672f25f63328ecf`이다. [원본 selection](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0011.vl.json#L32-L41)

현재 0.0.26에서 G1–G7이 모두 실행되고 과거 ggaction SVG와 바이트까지 같다. 그러나 휠과 드래그 후 x/y domain이 변경되는지에 대한 증거는 없다. 새 번역은 `createLinePlot` 등 기존 정적 구성에 domain을 바인딩한 interval state, hit surface, wheel/drag reducer, reset 정책을 연결해야 한다. 테스트는 초기·줌·팬·리셋의 domain과 화면을 함께 비교하고, 드래그가 view 밖으로 나가더라도 pointer capture와 종료가 정확해야 한다.

#### 4.3.2 `vl_0009`: nearest hover, 조건부 mark, 필터, input의 동시 제거

원본 해시는 `841509ee3e19add08247fa1b80ac5ca7db5ed0212feeb18f9355024b163f9da7`, 번역 source 해시는 `bfd61205f98cdf42aa523ffeca9e9f35efb95c7885750ffc40544b41124615c3`이다. 대표 변경은 다음과 같다.

| JSON pointer | 원본 | 번역 source |
| --- | --- | --- |
| `/layer/1/selection` | `selector040`, single, nearest, mouseover, `DateClean` field | 없음 |
| `/layer/2/encoding/opacity/condition` | selection이면 `value:1` | 없음 |
| `/layer/2/encoding/opacity/value` | `0` | `1` |
| `/layer/3/transform` | `filter:{selection:"selector040"}` | 없음 |
| `/layer/4/encoding/text/condition` | 선택 시 `Value` field 표시 | 없음 |
| `/params` | 원본의 입력 parameter 선언 | 없음 |
| `/transform/13` | `filter:"datum.Year>=minYear"` | 없음 |
| `/transform/14` | `filter:"datum.Year<=maxYear"` | 없음 |

원본에는 여러 연동 레이어와 입력 parameter가 있으므로 “같은 line chart”로 요약하면 의미를 놓친다. [원본 parameter](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0009.vl.json#L70-L90), [hover와 조건](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0009.vl.json#L143-L218)

기존 G1은 `createData → createComputedData(parseTime/replaceLiteral) → line/point/rule/text 구성 → encoding → guides/legend/title`의 native 액션으로 표현된다. 입력 날짜 문자열을 안전한 expression IR로 변환하는 구성은 재사용할 가치가 있다. 하지만 정적 source에 맞춰 포인트를 항상 보이도록 만드는 코드는 original interaction의 번역이 아니다. 원본 보존 버전은 `createSelection({id:"hover", kind:"point", fields:["DateClean"], nearest:true})`, `bindEvent({on:"pointermove", selection:"hover"})`, `encodeCondition({target, channel:"opacity", when:{selection:"hover"}, then:1, else:0})`, `filterData({predicate:{selection:"hover"}})` 같은 **제안 액션**으로 같은 상태를 공유해야 한다. API 이름은 최종 registry 설계에서 통일하되, 상태별 의미와 scope가 먼저 정해져야 한다.

nearest의 의미는 단순 화면상 가장 가까운 점인지, x축 날짜 기준인지, tie일 때 어떤 tuple을 선택하는지 명시해야 한다. 빈 선택의 `empty` 의미도 조건과 filter에서 동일하게 적용해야 한다. 원본이 초기 빈 선택에서 보여 주는 것과 첫 hover 후 보이는 것이 다르면 두 상태 모두 golden으로 저장한다.

#### 4.3.3 `vl_0002`: 고정 크기 replay가 responsive 계약을 증명하지 못함

원본 `/layer/0/width`와 `/layer/1/width`는 `"container"`, 두 레이어의 `/height`는 `300`이며 번역 source에서 네 속성이 모두 없다. 원본 해시는 `f3acbb98693ca4141b7d339866943a1359a3115508ab362070000ca77b11ca1a`, 번역 source는 `5ee740b0f23728760a3fe3a0397cc4b843c85553215d1a8332068b5ded37fb53`이다. [원본 첫 레이어 크기](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0002.vl.json#L39-L42), [두 번째 크기](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0002.vl.json#L74-L77)

G1–G7은 이번 실행에서 441×347의 동일 SVG를 출력했다. 원본의 layered size 선언이 최신 스키마상 유효한지도 별도 문제지만, 이를 고정 크기로 선택했다면 어떤 container 측정값과 어떤 repair 정책을 적용했는지 남겨야 한다. 320/768/1280px container, 장문 축 라벨, 폰트 로딩 전후에서 plot extent와 줄바꿈·clip·title/legend reserve가 결정적으로 재계산되는지 확인해야 한다. 하나의 고정 441×347 그림은 이 검사를 대신하지 못한다.

### 4.4 현재 실행으로 확인한 범위

이번 분석에서 공개 G1–Gn을 현재 0.0.26 소스에 bundle하고 Chromium 153.0.8010.12, en-US, UTC, 1280×960 viewport, DPR2, 네트워크 차단 상태로 실행했다. 설치 폰트의 파일 해시는 별도 고정하지 않았으므로 이것은 전체 배포 certificate가 아니라 진단 probe다.

| 가족 | 프로그램 수 | 현재 실행 | 가족 내 SVG 일치 | frozen ggaction SVG 일치 |
| --- | ---: | --- | --- | --- |
| 0002 | 7 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 0009 | 8 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 0011 | 7 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 0237 | 8 | 모두 성공 | 모두 동일 | 바이트 차이 |
| 1180 | 8 | 모두 성공 | 모두 동일 | 바이트 동일 |
| 1417 | 8 | 모두 성공 | 모두 동일 | 바이트 차이 |

합계 6가족/46프로그램이다. 0237/1417은 0.0.24 문서에도 바이트 차이와 DPR별 raster qualification이 기록되어 있다. **과거 certificate를 0.0.26에 재사용하지 않았다.** 이번 probe에서는 두 SVG의 픽셀 일치까지 인증하지 않았고, 현재 차이를 regression 또는 무해함으로 확정하지 않는다. 전체 10,174개가 현재 버전에서 통과한다고 일반화하지 않는다.

이 probe는 원본 Chart-LLM과 비교한 fidelity test가 아니다. 특히 0009/0011의 source 자체가 원본과 다르므로 frozen 결과와의 완벽한 일치는 원본 동작 손실을 감출 수 있다. 판정 축을 `accepted artifact`, `current runtime replay`, `original data fidelity`, `original geometry fidelity`, `original behavior fidelity`, `responsive fidelity`로 분리해야 하는 직접적인 이유다.

### 4.5 원본 선언의 전수 기능 프로필

다음 수는 “해당 선언을 하나 이상 가진 원본 수”다. nested mark의 총 개수나 지원 완료 수가 아니다. 전체 JSON pointer, composition tree, feature별 원본 목록은 `corpus-originals.json`과 `corpus-features.json`에 있다.

| mark | 원본 수 | 구현/검증 방향 |
| --- | ---: | --- |
| line | 859 | path order, invalid gap, interpolation, grouped series, conditional styles |
| bar | 509 | stack, grouped offsets, range/bin spacing, baseline, rounded ends |
| point | 273 | symbol area, shape path, fill/stroke, angle, hit target |
| circle | 258 | area/radius 의미, stroke 포함 bounds |
| text | 172 | multiline, anchor, baseline, offset, wrapping, clipping, formatting |
| rule | 155 | range endpoints, clipping, stroke cap, crosshair interaction |
| area | 135 | stacking, upper/lower path, defined gaps, interpolation |
| geoshape | 129 | 신규 geographic pipeline, 아래 C.8 참조 |
| rect | 82 | bin interval, band geometry, heatmap, overlap order |
| arc | 34 | theta/radius/secondary endpoints, pad/corner, polar labels |
| square | 30 | area normalization, angle, legends |
| tick | 21 | orientation, thickness, band position |
| errorbar | 14 | estimator, interval convention, cap geometry |
| boxplot | 11 | whisker/outlier/median conventions, sample edge cases |
| errorband | 8 | center/bounds, confidence intervals, alpha/overlap |
| image | 3 | 신규 image asset ownership, sizing and loading policy |
| trail | 1 | 신규 variable-width path mesh |

레이어 528개, explicit facet 43개, repeat 32개, hconcat 59개, vconcat 58개, concat 6개가 있다. 이 수는 encoding의 row/column facet과 implicit composite mark 확장을 포함하는 최종 panel 수가 아니다. IR은 원본 node tree와 확장된 view tree 둘 다 보존해야 한다. `unit`라는 이유로 단일 view로 분류하면 encoding-level row/column을 놓치며, 이 점이 #258 같은 layout 실패를 숨길 수 있다.

상호작용 선언은 tooltip 879개, selection 324개, input-binding 263개, conditional encoding 252개, selection reference 185개, variable parameter 161개, hover event 136개, cross-view selection reference 117개, nearest 101개, brush 97개, pan/zoom 63개, hyperlink 3개다. `input-binding` 수는 selection의 `bind` 형태도 포함하는 정적 census이며 263개의 독립 DOM 위젯이 있다는 뜻은 아니다. 조건부 encoding은 정적 predicate를 포함할 수 있어 252개를 모두 event interaction으로 세면 안 된다. 원본 metadata.xlsx의 interaction annotation은 1,010개이며, 자동 선언 census와 정의가 다르므로 어느 쪽도 다른 쪽을 덮어쓰지 않는다.

selection 종류는 interval 97, multi 47, point 70, single 136개에서 발견됐다. 한 원본이 여러 종류를 가질 수 있다. legacy single/multi와 modern point의 선택·toggle·empty·resolve 의미를 통일된 typed selection IR로 옮기되 원본 dialect의 기본값을 기록해야 한다.

| transform | 원본 수 | 현재 액션 구성에 대한 판단 |
| --- | ---: | --- |
| filter | 608 | 기존 정적 predicate와 신규 selection/parameter 반응형 predicate를 구분 |
| calculate | 478 | 안전한 expression IR 번역과 missing/null/type coercion 동등성 검증 |
| lookup | 136 | 입력 owner, 키 타입, 중복키, default와 nested object 보존 |
| fold | 120 | native shaping의 output order와 alias 충돌 검증 |
| window | 49 | peer, frame, sort 안정성, rank/lag/lead 의미 |
| regression | 35 | method별 fitting domain, coefficient, sample grid |
| aggregate | 33 | group/null semantics, sample/population 통계, argmin/argmax tie |
| pivot | 23 | 고정 범주 conditional columns+summary 가능; 일반 동적 pivot의 별도 계약 필요 |
| extent | 21 | extent를 parameter로 내보내 downstream domain을 갱신하는 semantics |
| timeUnit | 13 | UTC/local, week/day boundary, daylight-saving, interval end |
| impute | 10 | absent vs null, keyvals/frame, grouping/order |
| joinaggregate | 9 | group summary를 원래 row/order에 붙이는 native composition |
| flatten | 5 | zip/unequal lengths/index와 null padding |
| loess | 3 | 이미 `createRegressionData`+`editRegressionData(method:"loess")` 존재; 신규 기능으로 오인 금지 |
| stack | 3 | explicit transform뿐 아니라 encoding implicit stack을 함께 검증 |
| density | 2 | 기존 density action과 kernel/bandwidth/domain/grid/normalization 동등성 검증 |
| bin | 1 | explicit transform 수; encoding bin은 별도 다수 |
| quantile | 1 | quantile plot의 probability grid와 estimator convention을 명시 |

예를 들어 `vl_1412`는 기존 native regression에 `method:"loess"`, `span:0.3`, `robustIterations:2`를 설정한다. 따라서 “loess 없음”이 아니라 원본의 smoothing convention과 native output을 수치 검증하는 작업이다. [기존 native LOESS 구성](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_1412/G1.gg.mjs#L8-L18), [원본 LOESS](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_1412.vl.json#L263-L268)

`vl_0054`의 pivot은 세 알려진 범주에 대해 `createComputedData(if category then value else 0)` 세 번 뒤 `createSummaryData(sum)`로 구성되어 있다. 이는 간단한 native action의 조합으로 특정 pivot을 표현한 좋은 사례다. 그러나 동적으로 나타나는 범주, null/missing, non-sum aggregation, duplicate keys, `limit`, schema 변화까지 자동으로 해결했다는 증거는 아니다. general pivot은 고정 범주 조건합과 동등한 전제 조건을 증명할 수 있을 때만 이 lowering을 사용하고, 그 외에는 typed shaping action을 추가해야 한다. [native pivot recipe](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_0054/G1.gg.mjs#L50-L54), [원본 pivot과 hover](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0054.vl.json#L78-L93)

### 4.6 C-IR: 원본에서 native 액션까지의 번역 계약

번역기는 Vega renderer를 내부에 넣거나 source JSON을 opaque blob으로 저장한 뒤 통째로 렌더링하는 wrapper가 되어서는 안 된다. runtime core는 source-neutral이어야 하고, import adapter가 dialect와 defaults를 해석하여 공개 native action으로 내리는 구조가 필요하다. source별 예외를 renderer 안에 넣지 않는다.

1. **SourceDocument**: 원본 bytes, 해시, 파일 경로, upstream repository/commit, 선언 schema, parse diagnostics. 원본은 immutable이다.
2. **DialectResolution**: legacy/modern selection, config의 옛 위치, bin/timeUnit/scale 기본값, invalid value 정책을 판정한다. 스키마와 작성 문법이 충돌하면 repair record에 before/after pointer, 사유, 승인된 의미, reference hash를 기록한다. 불명확한 부분은 unresolved로 유지한다.
3. **ResolvedSourceIR**: 데이터 owner, lexical scope, view tree, transforms, scale/guide resolution, mark/encoding, parameter/selection, interaction graph, projection, asset graph를 타입으로 표현한다. 각 node는 source pointer와 source span을 가진다.
4. **SemanticLowering**: 최소한의 native action DAG로 변환한다. 부모 data의 상속과 child override, cross-view selection resolution, layer/concat/facet scope를 보존한다. 각 source node가 어느 action/semantic object로 내려갔는지 mapping을 만든다.
5. **NativeProgram**: 공개 action registry의 버전과 입력·출력 ID를 명시한다. JS helper나 generic path escape hatch로 원본 문제를 숨기지 않는다. G1은 의미가 있는 조합, G2 이후는 같은 semantic object와 output을 유지하는 refinement이다.
6. **Qualification**: 데이터·수치·geometry·guide/text·interaction state·resize·animation timeline의 독립 oracle을 통과시킨다. 실패는 원본 ID와 source pointer까지 돌아가야 한다.

`loweringCoverage`에는 원본의 모든 비메타 선언이 소비됐는지 저장한다. `tooltip`, `params`, `selection`, `projection`, `resolve`, `config`, `autosize`, `href` 등 사용하지 않은 선언이 있으면 명시적인 unsupported 진단을 발생시킨다. 최신 사용자 정책에 의한 제외/금지라면 unsupported 대신 해당 policy ID와 disposition을 기록하고 source pointer를 유지한다. 조용히 삭제하고 그림만 만드는 것을 통과로 처리하지 않는다. 단, 사용되지 않는 description/usermeta나 dialect에서 의미가 없는 선언은 구체적 이유와 함께 `non-semantic`으로 분류할 수 있다.

단순한 액션의 기준은 줄 수 최소화가 아니라 (a) 하나의 명확한 역할, (b) 재사용 가능한 인수, (c) immutable return, (d) state/ownership이 드러나는 ID, (e) 부분 편집 가능한 의미 단위다. `createEverythingFromVega(spec)`도, 수천 개의 `createPath`로 scenegraph를 복제하는 코드도 이 기준을 만족시키지 못한다.

### 4.7 C-EXP / C-DATA: 안전한 표현식과 데이터 보존

원본 표현식에서 문자열 리터럴을 제외한 lexical function 후보는 `timeParse` 93개, `substring` 72개, `join` 68개, `year` 63개, `if` 36개, `format` 32개, `replace` 21개, `parseInt`/`toNumber` 각 18개를 포함한다. 이 추출은 AST parsing 결과가 아니며 문자열/정규식/문법의 최종 해석은 dialect parser가 해야 한다. 낮은 빈도라도 `geoCentroid`, `scale`, `quantileNormal`, `quantileUniform`, `random`, `sequence`, `test`, UTC date helper가 존재한다.

구현은 source expression을 `eval`/`Function`으로 실행하는 대신 제한된 parser와 typed expression IR을 사용한다. `{field}`, `{constant}`, unary/binary/conditional, safe call, parameter ref, selection predicate, transform output ref를 구분한다. 배열/object 접근, 문자열 escape, field 이름에 점/공백이 있는 경우, null/missing/NaN, `-0`, Infinity, equality/coercion, regex subset, 날짜 파싱의 timezone을 테스트한다. 함수별 pure/deterministic/stateful 의존성을 registry에 표시한다. `random()`은 seeded reference policy가 있어야 재현 가능하며 user source에 seed를 몰래 추가하지 않는다. `scale()`은 scale scope와 domain 변경에 반응해야 하므로 단순 데이터 전처리 함수가 아니다.

데이터 선언은 remote URL을 가진 원본 1,449개, inline values 363개, named data 256개, embedded datasets 203개다. 서로 겹칠 수 있다. root `datasets`에서 이름을 찾는 단순 검사로 53개 원본의 named reference가 해결되지 않았다. 이는 full lexical-scope resolver의 최종 실패 수가 아니며 외부 주입 데이터·nested scope·미완성 source 가능성을 따로 확인해야 한다. 이번 감사는 URL을 전수 재다운로드하거나 HTTP 정상 여부를 확인하지 않았으므로 remote data의 현재 가용성은 미확정이다.

필수 resolver 계약은 다음과 같다.

- `DataOwner`는 값이 같은 테이블도 원본 소유자가 다르면 구분한다. 부모에서 상속한 참조와 별개 입력을 합치지 않는다. 빈 원본 table도 유지한다.
- URL의 원본 문자열, 최종 redirect, MIME, fetch 시점, status, 응답 SHA-256, parse format, source pointer, 캐시 파일을 남긴다. mutable main URL과 commit-pinned URL을 구별한다.
- CSV/TSV/JSON/TopoJSON과 `format.property`, `format.parse`, 날짜/숫자 parser를 source semantics에 맞춘다. 로컬 테스트는 immutable cache만 사용하고 network 변화는 별도 freshness check로 관리한다.
- typed row/key order와 `-0`, null/absent, duplicate keys 처리 방침을 보존한다. transform 전 원본과 transform 후 파생 테이블은 별도 provenance를 가진다.
- lookup은 보조 입력을 모두 inventory에 포함한다. row count가 작거나 chart에서 일부만 사용한다고 원본 table을 truncate하지 않는다.
- image URL과 geo resource도 같은 asset graph에 포함한다. 데이터가 없으면 `blocked-data`로 기록하고 translation capability와 분리한다.

공개 데이터셋의 raw-input ownership 검사와 Acorn import-binding audit는 그대로 발전시킬 가치가 있다. 이 기존 검증은 새로운 canonical source identity 확인 단계와 연결해야 한다. [기존 입력 소유권과 원본 row 검증](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/README.md#L140-L153)

### 4.8 C-GEO / C-ASSET: 지리와 비정형 마크

geoshape 선언이 있는 129개와 longitude/latitude 계열을 사용하는 27개 원본은 **공개 1,387가족에 하나도 포함되지 않았다**. 이미지 3개와 trail 1개도 전부 미포함이다. 지도/이미지/trail을 canonical denominator에서 제거하면 현재 번역의 넓은 coverage를 과장하게 된다.

projection 선언은 112개이며 타입은 mercator 42, naturalEarth1 25, albersUsa 20, equalEarth 12, identity 7, equirectangular 4, orthographic 3, conicConformal 2, conicEquidistant 1개에서 나타난다. 여러 projection이 있는 원본은 중복 집계될 수 있다. TopoJSON feature reference 75개, graticule 2개, sphere 1개도 확인했다.

**필수 native primitive**는 `createProjection`, `createGeoShape`, `encodeLongitude`, `encodeLatitude`, `encodeGeoGeometry`, `createGeoGraticule` 또는 동등한 source-neutral API다. API 표면보다 semantic model을 먼저 만든다. projection은 type, center, rotate, parallels, scale, translate, precision, clipping, fit extent, reflect, datum/units를 명시하고 view별 소유권을 가진다. geoshape는 feature ID·properties·geometry·원본 owner를 보존해야 한다. GeoJSON Feature/FeatureCollection/GeometryCollection, Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon, TopoJSON arc decoding과 feature extraction을 지원한다.

`createData(geometry) → createProjection({type,fit}) → createGeoShape({data,projection}) → encodeColor({field}) → createLegend`가 기본 choropleth recipe다. 지명/관측점은 같은 projection을 공유하는 point/text layer로 추가한다. 지리선을 Cartesian 직선으로 대신하지 말고 great-circle 또는 source가 요구하는 곡선·resampling 의미를 명시한다. sphere/background와 graticule도 projection clipping을 공유한다. [원본의 복합 지도 레이어 예](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_0004.vl.json#L1-L58)

통과 기준은 단순히 “미국 지도가 보임”이 아니다. antimeridian crossing, polygon hole/winding, polar clipping, multipolygon, empty/null geometry, projection fit 후 bounds, identity projection의 y reflection, sphere, graticule, inset projection, 입력 좌표 순서와 degree/radian convention을 fixture로 고정한다. geographic hit testing은 화면에 projection된 geometry를 사용하되 선택 결과는 원본 feature ID로 반환한다. 줌/팬 후 tooltip/selection mapping, facet마다 다른 projection scope, resize 후 fit와 explicit scale의 우선순위를 검증한다. 애니메이션 중 projection parameters가 바뀌면 clipping/resampling과 hit geometry도 동일한 시점으로 갱신해야 한다.

image mark는 asset data와 drawable object를 분리하고 URL field, intrinsic size, explicit width/height, aspect ratio fit, align/baseline, clipping, opacity, cross-origin/export 가능 여부, load/error state를 계약으로 만든다. 대체 텍스트와 안정적인 export failure 진단도 필요하다. bitmap을 data mark의 대용으로 사용하여 차트 전체를 붙이는 번역은 허용하지 않는다.

trail은 각 sample의 size가 선폭에 영향을 주는 ordered path다. `createTrailMark`와 `encodeWidth` 또는 기존 line type의 명시적 variable-width 확장으로 표현한다. normal vector, joins/caps, zero-length segments, duplicate x, reversed order, missing gaps, variable width interpolation, stroke/fill bounds를 수치 검증한다. [유일한 canonical trail 원본](https://github.com/hyungkwonko/chart-llm/blob/6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24/docs/data/chart/vl_1775.vl.json#L25-L31)

### 4.9 C-INT: 반응형 상태와 이벤트의 실행 의미

정적 `selectMarks`·`highlightMarks`가 존재해도 pointer 이벤트, brush lifetime, cross-view selection storage, control binding을 구현한 것은 아니다. 이 차이를 API 문서와 capability manifest에 드러내야 한다. 하나의 event를 처리할 때 `hitTest → event normalize → selection/parameter reducer → dependency invalidation → data/scale/mark rematerialize → render → accessible state update`가 동일한 transaction으로 수행되어야 한다.

최소 상태 모델은 point tuple set, interval domains, scalar parameter, legend category selection, view viewport를 구분한다. 상태의 owner/view scope, stable ID, initial value, empty semantics, union/intersection/global resolve, toggle, clear, nearest, projection field, event filter를 포함한다. tool/runtime가 state JSON을 export/import할 수 있어 agent가 현재 상태를 읽고 재현할 수 있어야 한다. event handler의 JS closure를 프로그램의 유일한 진실로 삼지 않는다.

필수 작은 액션의 역할은 다음과 같다. 이름은 제안이며 현재 구현된 API로 오인하지 않는다.

| 제안 액션 역할 | 핵심 인수와 결과 | 검증 oracle |
| --- | --- | --- |
| selection 선언 | ID, point/interval, fields/encodings, resolve, empty | 직렬화된 state schema와 scope |
| event binding | event stream, target view/marks, filter, reducer | pointer/key/wheel event trace |
| conditional encoding | target, channel, predicate, then/else | 상태별 mark props, default 복원 |
| parameter 선언/편집 | 타입, 초기값, allowed range/options | invalid value 거절, downstream 갱신 |
| input control binding | range/select/checkbox/radio/text, parameter ID | keyboard/input/change, label/ARIA |
| tooltip | fields, format, anchor, trigger, aggregate policy | 내용·좌표·hide lifecycle |
| viewport binding | x/y scales, zoom anchor, clamp, reset | domain과 화면 bounds |
| linked filter | source/selection scopes, predicate | 선택한 tuple과 출력 row IDs |

브러시가 빈 상태일 때 all인지 none인지, multi의 Shift toggle과 click clear가 무엇인지, legend binding이 field-domain과 어떻게 연결되는지 원본 dialect에 맞게 테스트한다. hover에서 원본이 nearest selection을 사용하면 SVG 요소의 browser hit box에만 의존해서는 안 된다. line의 투명 point layer처럼 hit-test 전용 geometry도 provenance와 bounds가 있어야 한다. mouse/touch/pen, pointer cancellation, Escape/reset, keyboard focus, focus-visible tooltip까지 계약에 포함한다.

단일 차트 324개의 selection 선언만 성공해도 완료가 아니다. 117개의 cross-view reference는 서로 다른 data owner, aggregate output, facet instance에서 같은 selection을 어떤 key로 적용할지 검증해야 한다. 반복된 panel은 `selectionId + viewInstanceId`로 구분하고 resolve 규칙에 따라 합친다. 축의 scale binding은 실제 domain state와 연결되어야 하며 display transform만 확대해서 tick/domain은 그대로 남는 구현은 탈락이다.

### 4.10 C-ANIM: 코퍼스에 없는 요구를 숨기지 않는 애니메이션 계획

이번 canonical 선언 census에서 명시적인 animation/transition/timer 선언을 발견하지 않았다. 이 사실은 animation이 필요 없다는 근거가 아니다. 사용자의 별도 목표가 animation을 포함하고 Flint backend 통합에도 시간 상태가 필요하므로 **코퍼스 fidelity와 별도의 animation conformance suite**를 만들어야 한다.

이 0건은 raw data values를 제외한 JSON 선언 키와 timer event stream을 검사한 결과다. JSON 바깥의 앱 코드가 차트를 갱신하며 만드는 animation까지 없다는 뜻은 아니다. 검사 방식과 결과를 `corpus-animation-declarations.json`에 저장했다.

timeline은 `transitionId`, source/target semantic snapshot, duration, delay, easing, stagger, keyed correspondence, interruption policy, clock source를 가진다. `createTransition`, `editTransition`, `play`, `pause`, `seek`, `cancel`의 역할을 분리하고 interactive parameter의 연속 업데이트와 authored timeline을 구분한다. 원본에는 없는 애니메이션을 번역 과정에서 임의로 추가하지 않는다.

mark matching은 source owner + row key + layer ID를 기반으로 하며 index matching만 사용하지 않는다. enter/update/exit, sorted/filtered data, duplicate keys, aggregated marks, facets 추가/삭제를 검증한다. color space, numeric props, angle wrap, band scale movement, scale type 변경, line/area path topology 변경, geo projection 변화는 interpolation 규칙이 다르다. 지원하지 않는 topology morph는 명시적 crossfade policy 또는 error를 선택하고 silent jump로 성공을 선언하지 않는다.

deterministic virtual clock으로 t=0, 0.25, 0.5, 0.75, 1의 semantic/graphic snapshots와 screenshot을 고정한다. animation 중 selection hit geometry와 tooltip anchor는 현재 frame에 맞아야 한다. interruption은 cancel/rebase/queue 중 정책을 명시하고 background tab, reduced-motion, seek backward, pause/resume, export frame에서 결과가 같아야 한다. 성능 검사는 frame budget뿐 아니라 반복 play/cancel 뒤 listener/timer/data cache 누수가 없는지도 확인한다.

### 4.11 C-LAYOUT / C-TEXT: 정확한 디자인을 완료 조건으로 만들기

원본의 많은 옵션을 지원하는 것과 실제 픽셀 배치를 맞추는 것은 별개의 문제다. axis/legend/title/header의 기본값, font metrics, mark bounds, shared scale resolution, band step, repeat expansion, padding/spacing/align/bounds, clipping, stroke extent를 모두 명시적인 layout inputs로 만들어야 한다. 수동으로 한 차트의 offset만 보정하면 다른 폰트·문자열·패널 수에서 다시 실패한다.

현재 공개 번역의 `vl_1180`은 shape별 `selectMarks → highlightMarks`로 크기·위치를 미세 조정하고, metadata에 source-bound subpixel contour approximation을 공개한다. 이것은 숨겨진 임의 편집보다 나은 provenance지만, 장기적으로는 native symbol area/bounds/anchor convention이 원본과 일치하도록 해결해야 한다. existing shape correction을 제거할 때는 원본 reference와 비교하고 G1..Gn 전체를 함께 갱신해야 한다. [1180 native 프로그램](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_1180/G1.gg.mjs), [1180 metadata](https://github.com/ggaction/chart-datasets/blob/58791ace7212cacb98c2b64e3f92280722ab638e/charts/vl_1180/metadata.json)

원본 `vl_0522`, `vl_0628`, `vl_0944`는 공개 1,387가족에 모두 없다. 현재 열려 있는 #258의 원본 layout/facet fidelity 문제를 “이미 accepted dataset에 있으므로 해결됨”으로 처리할 수 없다. 알려진 다른 3-row header의 0.890625px residual도 원본 ID·row 수·실제 text metrics·renderer environment와 함께 재현해야 한다. 이번 census의 `static-supported-candidate`는 이런 layout 동등성을 입증한 상태가 아니다. [issue #258](https://github.com/ggaction/ggaction/issues/258)

layout oracle은 각각의 panel plot rectangle, outer rectangle, shared guide ownership, header baseline, title/legend block bounds, child order, clipping rectangle를 수치로 비교한다. typography oracle은 문자열 자체, font family/file hash, weight/style, font size, baseline, line height, letter spacing, alignment, rotation, multiline split, truncated ellipsis, minus sign/locale formatting을 비교한다. `applyTextMetrics`는 source-qualified measurements를 재현할 수 있어야 하지만 모든 chart를 고정 문자 폭 lookup으로만 맞추는 구조는 dynamic label 변화와 responsive text를 지원하지 못한다. 실시간 측정 cache와 deterministic export metrics의 경계를 설계해야 한다.

### 4.12 완료 판정, regression, 구현 순서

각 원본의 상태는 최소 아래 축으로 저장한다. 하나의 `completed:true`로 합치지 않는다.

```text
sourceIdentity: exact | normalized-equivalent | repaired | different | missing
dialect: schema-valid | schema-invalid-reviewed | unresolved
data: resolved-and-hashed | external-injection-required | unavailable | unknown
lowering: complete | unsupported-features | unresolved-semantics
runtime: passed(version, artifactHash, environment) | failed | not-run
staticFidelity: numeric + geometry + typography + raster evidence
behaviorFidelity: event trace + state + dynamic data/domain evidence
responsiveFidelity: container matrix + font-load + DPR evidence
animationConformance: required cases + deterministic frames
```

전체 원본 1,981개 원장에는 정적 선언상 검토가 필요한 gap candidate 1,065개와 static-supported candidate 916개가 있다. 이 분류는 보수적 feature screening이고 **verified 916개라는 뜻이 아니다**. 모든 원본의 original fidelity는 이번 감사에서 최종 인증하지 않았다. 현재 재실행 상태가 있는 것은 위 6가족뿐이다. 데이터 불확실성, schema repair, issue #258 같은 외부 fidelity blocker는 각각 독립 필드로 남겼다.

완료를 위한 실행 순서는 다음과 같다.

1. **분모와 provenance 고정**: 1,981 primary originals와 모든 benchmark candidate를 registry에 등록한다. 340개 source 차이는 exact diff로 해결하거나 명시적인 repaired branch로 분리한다. 594개 미포함 ID는 retained backlog다. schema-invalid 564개를 제외하지 않고 intended dialect 판정과 source-reference policy를 만든다.
2. **데이터·환경 reference 고정**: 모든 table/asset을 owner별로 resolve하고 hash를 부여한다. reference renderer의 버전, browser, viewport, DPR1/2/4, timezone, locale, font bytes, random seed policy를 기록한다. 데이터 unavailable 상태와 라이브러리 unsupported 상태를 분리한다.
3. **소스→IR와 lowering coverage checker**: 모든 선언의 소비 여부와 source pointer mapping을 완성한다. unsupported 선언이 있으면 정확히 진단하고 정적 그림 성공으로 통과하지 않는다.
4. **기존 정적 기능의 수치·디자인 qualification**: 현재 1,387가족 10,174프로그램을 0.0.26 exact artifact에서 다시 실행하고 원본 reference와 비교한다. 통계/scale/time/geometry/layout 문제를 재사용 가능한 native semantics로 해결한다. #258과 미포함 static candidate를 포함한다.
5. **반응형 parameter/selection/event kernel**: dynamic filter, conditional channels, tooltip, controls, cross-view selection, pan/zoom을 구현하고 0009/0011 같은 동작이 삭제된 source를 원본으로 복구하여 event traces로 검증한다.
6. **geo/image/trail/남은 transform**: geo 129개+좌표 27개, image 3개, trail 1개, quantile/일반 pivot 및 표현식 잔여 기능을 source-neutral action으로 연결한다. 이미 있는 LOESS/density를 새로 중복 구현하지 말고 필요한 semantics를 확장한다.
7. **timeline과 전체 backend conformance**: animation suite와 Flint 요구를 합쳐 event→state→render→export 계약을 검증한다. canonical 원본에서 animation 사례가 없다는 이유로 이 단계의 exit criterion을 생략하지 않는다.
8. **전수 승격과 공개 문서**: 각 ID별 원본 identity·runtime·정적/동적 fidelity·제약을 공개한다. 새 런타임 release마다 입력·program·runtime hash를 묶은 certificate를 재생성한다. 과거 certificate의 version만 고쳐 재사용하지 않는다.

테스트 전략은 fixture 한 장의 screenshot 통과에 의존하지 않는다. 수치 oracle은 transform/scale의 중간 결과를 독립 계산하고, semantic oracle은 data owner와 view scope를 검사하고, geometry oracle은 경로/좌표/bounds를 비교하고, screenshot은 마지막 합성 결과를 확인한다. 외부 renderer를 테스트 oracle로 사용하는 것은 허용되지만 ggaction runtime 구현을 그 renderer의 scenegraph 복사에 의존시키지 않는다.

동적 테스트는 action chain을 만든 뒤 실제 browser event를 주입하여 관찰 가능한 결과를 비교한다. state를 테스트가 직접 최종값으로 대입하면 event binding 결함을 놓친다. 반대로 kernel unit test에서는 입력 event의 canonical representation과 reducer state transition을 빠르게 검증한다. 두 층을 함께 둔다. selection이 참조하는 row와 표시 tooltip row가 다른 오류, zoom 후 hit target이 옛 좌표에 남는 오류, animation 중 exit mark가 계속 선택되는 오류를 명시적 regression case로 만든다.

통과 기준은 “전부 render됨”이 아니라 (a) every original accounted, (b) every semantic declaration lowered or explicitly unresolved, (c) all data owners preserved, (d) original event states equivalent, (e) numeric/layout/text tolerances justified, (f) current exact artifact certificate, (g) no unexplained approximation이다. 원본 자체의 오류·외부 데이터 소실 때문에 달성 불가능한 항목이 있으면 원본을 삭제하는 대신 재현 가능한 blocker와 복구 정책을 남긴다.

### 4.13 산출물과 직접 활용 방법

이 절의 모든 숫자는 아래 파일에서 다시 계산할 수 있다. 구현자는 Markdown의 대표 예제만 처리하지 말고 CSV/JSON 원장을 CI 입력으로 사용해야 한다.

| 파일 | 용도 |
| --- | --- |
| `evidence/corpus-original-crosswalk.csv` | 원본 1,981개 전체, source hash, schema 상태, 번역 presence, source identity, gap 후보, 현재 probe, #258 연결 |
| `evidence/corpus-originals.json` | 각 원본의 feature, JSON pointer, composition nodes, expression, resource, translation metadata, qualification 상태 |
| `evidence/corpus-all-files-qualified.csv` | JSON 25,024개 모두의 분류와 schema qualification |
| `evidence/corpus-schema-validation.json` | candidate 24,957개의 개별 schema 결과 및 진단 |
| `evidence/corpus-embedded-specs.json` | root 후보 밖에 있는 30개 embedded chart의 파일·JSON pointer·원문·schema 결과 |
| `evidence/corpus-schema-sources.json` | 공식 스키마 다운로드 URL, 파일, SHA-256, 404 근거 |
| `evidence/corpus-features.json` | 모든 그룹의 모든 관측 feature와 해당 파일 목록 |
| `evidence/corpus-duplicate-specs.json` | JSON 정규화로 같은 spec의 모든 출현 경로 |
| `evidence/corpus-source-deltas.json` | 원본과 다른 340개 source의 pointer/before/after/digest |
| `evidence/corpus-array-diff-revision.json` | 배열 차이 보완 전후 검산, 모든 pointer의 실제 값 대조, 원본 1,981개·번역 source 1,387개 해시 재확인 |
| `evidence/corpus-original-metadata.json` | metadata.xlsx sheet3의 1,981개 upstream provenance/annotation |
| `evidence/corpus-data-dependencies.json` | 모든 primary 원본의 외부/named data dependency 출현 |
| `evidence/translations-artifact-inventory.json` | 1,387가족의 stage와 파일 식별, notes, 과거 replay 상태 |
| `evidence/translations-integrity-failures.json` | 이번 artifact 무결성 검사 실패 목록: 빈 배열 |
| `evidence/translations-programs.json` | 10,174개 프로그램의 import와 member-call site AST inventory |
| `evidence/translations-runtime-probes.json` | 0.0.26에서 실제 실행한 46개 stage의 SVG hash와 결과 |

metadata.xlsx는 1,981개 원본 모두에 upstream URL, repository, license key/url 등을 연결하며 기록된 license key가 19종이다. 이 정보는 provenance이며 독립적으로 검증된 재배포 허가가 아니다. 예전 local corpus에 metadata가 없었다는 사유를 그대로 유지하는 대신 canonical upstream metadata를 연결하되 URL과 license의 실제 관계·버전을 확인해야 한다. 보고서의 기술적 지원률과 라이선스 상태는 서로 다른 필드로 보관한다.

향후 보고서는 최소 세 수치를 나란히 공개해야 한다. **원본 등록률**, **현재 런타임 실행률**, **원본 의미·디자인·동작 충실도 인증률**이다. 지금 확인한 1,387개 번호 연결과 46개 현재 실행을 마지막 수치로 재표현하지 않는다. 이 원칙이 있어야 사용자가 원하는 “모든 차트를 간단한 native 액션으로 제대로 번역”을 실제로 측정하고 완료할 수 있다.


## 5. 목표 아키텍처: 현재의 장점을 유지하면서 부족한 기반 추가

이 장 전체는 **구현 제안**이다. 현재 API의 지원 선언이 아니다. 신규 공개 이름·타입·저장 형식은 구현 전에 기존 저장소의 계약 절차로 확정한다. 다만 구현자가 핵심 결정을 다시 추측하지 않도록 여기서는 권장 동작과 불변식을 구체적으로 정한다.

### 5.1 세 경계와 한 방향의 계산

권장 흐름은 `native 데이터·작성 의도 → ggaction 도메인 액션 → 의미/배치/구체 그래픽 → renderer`다. 사용자 입력은 별도 controller에서 의미 target으로 변환하고 같은 공개 액션을 실행한다. 애니메이션은 시작·종료 scene과 사전에 계획한 typed parameter sampling kernel을 사용한다. projection 회전·scale/guide 변화는 endpoint 좌표를 단순 보간하지 않고 해당 kernel이 현재 매개변수의 geometry를 재평가한다.

| 계층 | 소유할 책임 | 다른 계층에 맡길 책임 |
|---|---|---|
| ggaction core | 불변 프로그램, typed resources, 데이터 lineage, 인코딩·스케일·좌표·배치·가이드·materialization | DOM 이벤트와 네트워크·프레임 타이머 |
| interaction controller | host와 reader 입력, hit testing, transient preview, transaction, callbacks, cleanup | 별도 영구 chart truth를 임의로 유지하는 것 |
| animation planner/player | item correspondence, 시간 샘플링, 재생 제어, 현재 프레임과 취소·완료 | 렌더러에서 의미를 다시 해석하는 것 |
| SVG/Canvas/PNG/PDF | concrete scene/graphicSpec를 출력 | source-specific spec 해석, fetch, 통계 재계산 |

이 구조는 현재 `semanticSpec`, `materializationConfigs`, `graphicSpec`, `trace`의 역할을 유지한다. renderer에 Vega-Lite/Flint spec을 넣는 shortcut이나 매 프레임 semantic compiler를 호출하는 별도 렌더링 경로를 추가하지 않는다. 이번 계층에는 외부 adapter/translator를 포함하지 않는다. core 액션 이름과 계약은 ggaction 자체 의미로 설계한다.

### 5.2 상태 소유권과 저장 계약

| 상태 | 정본 위치의 제안 | 저장 여부 | 규칙 |
|---|---|---|---|
| 원본 표 데이터와 revision | semantic data resource | 저장 | caller 입력 불변; 논리 dataset identity와 revision identity 분리 |
| row/item key 및 변환 lineage | semantic resource + derived index | 정책·할당 key vector·occurrence·allocator·revision chain 저장; 검색 index 재생성 가능 | 정렬·resize·재렌더·값 수정에도 동일 개체의 key 유지 |
| geometry와 projection | 별도 semantic resource | 저장 | 원본 lon/lat와 투영 결과 중 원본이 정본 |
| 마크·스케일·좌표·selection 정의 | semanticSpec | 저장 | renderer의 DOM 속성을 역으로 정본으로 사용하지 않음 |
| theme·guide·layout·retained style 의도 | 해당 materialization config 또는 명시 resource | 저장 | 동일 의도를 여러 mutable map에 중복 저장하지 않음 |
| hit-test 공간 인덱스·텍스트 측정 cache | program/scene revision에 종속된 cache | 저장 안 함 | revision, font, DPR, clip 변경 시 invalidation |
| hover, 진행 중 pointer, brush preview | controller transaction | 기본 저장 안 함 | commit 때만 프로그램/host state로 반영 |
| 등록 callback, DOM node, AbortController, rAF id | host/controller | 저장 안 함 | `destroy()`에서 전부 해제 |
| animation recipe와 keyframe 의미 | 별도 serializable plan resource | 요청 시 저장 | 함수·DOM 참조 금지; 시작/종료 program hash 기록 |
| 현재 재생 시간과 일시정지 | player instance | 기본 저장 안 함 | 필요 시 숫자만 export; timer 복원 금지 |

추가 resource가 생길 때 program schema, 검증기, serialize/deserialize, inspection, scene export, package types, action cards, 문서, LLM 문서를 동시에 바꾼다. 현재 editable schema는 3이며 기존 named selection/highlight는 `materializationConfigs.selections/highlights`에 있다. 우선 이 작성 상태를 유지하고 신규 interaction definition/parameter와 분리한다. 뒤에 통합한다면 schema migration에서 기존 `{data,indices}`를 해당 snapshot의 보존된 row key로 변환한다. source revision을 복구할 수 없는 ambiguous 참조는 추측하지 않고 진단한다. 캐시나 runtime 객체를 JSON round-trip에 기대지 않는다. [현행 persistence 검증](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence/validation.js#L486)

### 5.3 안정적인 identity와 provenance가 첫 번째 기반이다

현재 scene key는 원본 dataset id와 row 값에 영향을 받는다. 이번 프로브에서는 id 필드가 있는 세 점 중 한 점의 y만 바꾸고 `reviseData`로 새 dataset을 만들었는데, 기존 점의 scene key와 겹치는 것이 0개였다. 따라서 현재 scene을 그대로 animation correspondence나 retained selection의 영구 key로 사용하면 안 된다. [재현 증거](evidence/ggaction-probes.json), [현재 scene 구현](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/scene.js#L27-L52)

권장 식별자는 다음처럼 역할을 분리한다. 아래 타입은 제안이다.

```ts
type LogicalDatasetId = string;
type RevisionId = string;
type RowKey = string;
type SemanticItemKey = string;

interface DataIdentityPolicy {
  key: { fields: readonly string[] } | { generated: 'stable-ingest-order' };
  duplicate: 'error' | 'occurrence';
  missing: 'error' | 'generated';
}
interface ItemProvenance {
  dataset: LogicalDatasetId;
  revision: RevisionId;
  rowKeys: readonly RowKey[];
  transformPath: readonly string[];
  grain: Readonly<Record<string, unknown>>;
}
interface SemanticItemIdentity {
  key: SemanticItemKey;
  owner: string;
  role: string;
  provenance: ItemProvenance;
}
```

`rowKey`는 행 전체 값의 hash가 아니다. 명시 key 필드는 복합값을 타입과 경계를 보존해 encode한다. key가 없으면 최초 ingest 시 생성하고 immutable revision chain에서 전달한다. 할당된 key vector·occurrence·allocator 상태를 snapshot에 저장해 reload 후 정렬해도 key가 유지되게 한다. 명시 key 없는 전체 데이터 교체에는 explicit old→new row mapping을 받거나 새 identity/enter-exit로 처리한다. 독립 dataset 사이의 자동 동일시는 하지 않는다. duplicate 허용 모드에서는 occurrence를 처음부터 부여하고, 정렬 순서로 다시 번호를 매기지 않는다. 동일 key의 중복/충돌은 진단에 남긴다.

aggregation item은 group key + 통계 역할로 식별하고 contributing rowKeys를 보존한다. bin은 경계·폐구간 규칙을, stack은 category/series와 segment 역할을, line/area는 series 경로와 각 vertex provenance를 가진다. facet·layer·composition은 owner scope를 포함한다. color나 좌표 변경은 identity를 바꾸지 않는다. bin 경계나 group grain이 바뀌면 명시적으로 새 항목이며 모호한 morph 대신 재매칭 정책을 적용한다.

**필수 시험:** 값 갱신·행 순서 변경·행 추가/제거·중복 key·lookup·aggregate·stack·facet·정렬 후 key와 선택을 비교한다. 변하지 않은 두 행은 같은 key를 유지하고 변경된 한 행도 명시 key가 같으면 같은 item으로 남아야 한다. 잘못된 key 자동 매칭은 데이터가 뒤바뀐 애니메이션보다 위험하므로 ambiguous correspondence는 실패 또는 명시 crossfade로 기록한다.

### 5.4 기능 등록과 실행 계획

신규 `capabilities()` 제안은 액션 이름 목록보다 구체적이어야 한다. mark/coordinate/transform/renderer/interaction/animation/export의 조합별 지원, 옵션 제약, 준비 resource, 기능 버전과 검증 fixture를 반환한다. `supported: true` 한 값으로 모든 옵션을 뭉개지 않는다.

native action plan은 공개 action/options/resource dependencies와 작성 의도를 기록한다. 각 step은 입력 검증과 dependency invalidation을 설명할 수 있어야 한다. data resource의 출처·row lineage는 보존하지만 외부 chart spec의 JSON pointer를 모든 core API에 강제하지 않는다.

```ts
// 제안: ggaction 자체 작성·검증을 위한 계획 형태.
interface NativeActionPlanStep {
  id: string;
  action: string;
  options: Readonly<Record<string, unknown>>;
  dependsOn: readonly string[];
  intent?: string;
}
interface NativePlanDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  ownerId?: string;
  optionPath?: string;
  requirementId: string;
  message: string;
}
```

알 수 없는 native 옵션은 조용히 지우지 않고 validation error를 반환한다. description/title/aria는 접근성·export 계약으로 다루고 통계·geometry 옵션과 분리한다. capabilities의 선언과 schema/type/runtime/examples가 일치해야 한다. source spec을 정규화하거나 번역 성공률을 계산하는 경로는 이번 실행 계획에 포함하지 않는다.

## 6. 인터랙션: 선택 액션에서 사용자 입력 시스템으로

### 6.1 현재 selection/highlight를 활용하되 입력 런타임을 분리한다

현재 selection과 highlight 관련 액션은 의미 있는 선택·표현 기반이다. 하지만 마우스/키보드 이벤트를 받아 target을 찾고, pointer capture를 유지하고, brush를 미리 보여 주고, 상태 변경을 host에 알리는 전체 런타임은 별도 문제다. 신규 entry point `ggaction/interaction`은 browser controller를 제공하고, pure hit-test/semantic selection 계산은 DOM 없이 검사 가능하게 나눈다.

```ts
// 제안 API: 현재 ggaction의 공개 API가 아님.
const controller = mountInteractiveChart(container, program, {
  renderer: 'canvas',
  interactions: interactionDefinitions,
  onChange(change) { host.accept(change); },
});
await controller.applyUpdate(update, { transition: { duration: 180 } });
controller.resize({ width: 720, height: 420 });
controller.destroy();
```

`program`은 immutable committed baseline이고 controller는 그 위의 preview를 관리한다. `getProgram()`/`getState()`는 문서화된 snapshot을 반환하며 내부 mutable 객체를 노출하지 않는다. 한 pointermove마다 영구 trace를 추가하지 않는다. 드래그 한 번은 preview 여러 번과 commit 하나 또는 cancel 하나다. 선택을 문서에 저장하는 경우에는 명시 commit된 selection resource만 직렬화한다.

### 6.2 hit testing과 의미 target

SVG DOM target과 Canvas pixel 위치가 같은 의미 결과를 내야 한다. SVG에만 의존하는 event delegation은 Canvas/PNG 기반 editor와 export 일관성을 깨뜨린다. 기본 경로는 concrete geometry에서 만든 공간 인덱스의 후보 검색 → clip/transform 적용 → 정확한 shape 검사 → paint order tie break → semantic owner/provenance resolve다.

| 대상 | geometry 검사 | 의미 결과 |
|---|---|---|
| point/rect/bar/arc | fill 영역 + stroke + 설정된 hit slop | row/group/stack segment |
| line/trail/path | segment 거리, 곡선 flatten 오차 한계, stroke width | series와 가까운 vertex/구간; 둘을 구분 |
| area/polygon | ring fill rule, holes, clip | region/series와 contributing records |
| text/image | 배치·회전된 bounds; 필요 시 alpha/shape policy | label/asset 역할과 소유 mark |
| legend/axis/header/title | 가이드의 의미 단위별 bounds | category/range/facet/title 역할 |
| background/brush/handle | plot와 widget bounds | chart/region/handle |

좌표는 page/client, container CSS pixel, plot local, device pixel, data/geo 공간을 구분한다. DPR은 마지막 raster 단계에만 적용하고 event hit radius는 CSS pixel 단위다. nested facet/concat의 matrix와 clip stack을 누적한다. 투명 fill, `stroke:none`, 닫히지 않은 path, zero-size mark, 겹친 mark의 우선순위를 테스트한다. hover index는 owner/series/축 값 기준으로 resolve하며 화면상 가까운 다른 facet을 잘못 잡지 않는다. 애니메이션 중에는 최종 program이 아닌 현재 presentation frame revision의 geometry로 hit test한다. enter/exit는 보이는 기간의 hit 가능성과 alpha threshold를 정하고 crossfade의 동일 semantic key는 중복 선택하지 않는다. index 갱신과 paint를 같은 frame transaction으로 묶는다.

hit 결과는 ggaction item ID·owner·role·원본 row lineage로 정의한다. DOM node나 외부 RenderHit/SemanticTarget 타입을 영구 상태 계약으로 사용하지 않는다. 집계 bar를 누르면 집계값뿐 아니라 기여 원본 records를 얻을 수 있어야 한다. 축 label은 문자열만으로 category를 역추정하지 않고 formatting 이전 값을 보존한다. [Flint target 계약](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L1-L92)

### 6.3 이벤트, gesture, cancellation

입력 정규화는 pointer id, buttons, modifier, timestamp, CSS 좌표, pointer type, keyboard key를 가진다. pointerdown에서 capture를 시작하고 pointerup에서 끝내며 pointercancel, lost capture, Escape, window blur, destroy, owner 제거 시 preview를 취소한다. 터치의 long-press threshold와 move tolerance, double activation 시간창, touch-action/scroll 충돌을 명시한다. 단일/다중 pointer를 구분하고 pan과 brush가 동시에 시작하지 않도록 gesture arbitration 우선순위를 둔다. 기본형: handle drag → 명시 modifier gesture → 직접 brush → navigation → inspect. 차트/호스트가 이를 바꿀 수 있지만 결과는 결정적이어야 한다. [Pointer Events 표준](https://www.w3.org/TR/pointerevents3/)

wheel/trackpad navigation은 anchor data 위치를 보존하고 burst를 한 transaction으로 묶는다. inertia를 넣는다면 명시 옵션과 deterministic clock이 필요하다. 구현 초기에는 이를 암묵적으로 켜지 않는다. drag threshold 이전의 pointerup은 click이며 drag 완료 뒤 click을 중복 발생시키지 않는다. keyboard arrow/Home/End/Enter/Space/Escape, focus 이동, context activation을 같은 semantic command로 연결한다.

### 6.4 selection, parameter, predicate의 표현력

ggaction의 native selection/parameter 계약으로 empty, toggle, clear, nearest, resolve, fields, encodings, init, bind, gesture 조건을 명시한다. 외부 legacy selection/params DSL 파싱·번역은 이번 범위가 아니다. interval selection은 pixel rectangle만 저장하지 않고 data domain과 coordinate를 함께 가진다. projection/geographic region, polar angle wrapping, discrete category subset에는 별도 domain 타입이 필요하다.

제안 resource는 selection definition, parameter value, predicate AST를 분리한다. predicate는 `and/or/not`, field 비교·집합·범위, selection membership, parameter reference를 지원한다. 조건부 color/opacity/size/text/tooltip/shape/order는 materialization 의존성으로 들어가야 한다. 단순 highlight만으로 필터·조건부 인코딩을 대신하지 않는다.

cross-view selection은 선언 scope와 resolve 방식(global/union/intersect)을 보존한다. 한 view의 selection이 다른 view의 dataset filter·aggregate·domain을 바꾸면 downstream dataflow만 invalidation한다. 논리 의존성은 parameter/selection → data transform → domain/scale → geometry/guide/layout → scene → event다. 현재 planner의 실제 순서는 scales→marks→guides→layout→highlights다. responsive/geo를 추가할 때는 intrinsic geometry·text/guide 측정 → layout solve → 확정 geometry/guide materialization의 두 단계로 확장한다. wrap/fit 상호 의존은 제한된 반복 횟수와 수렴 기준, 실패 diagnostics를 갖고 무한 relayout을 막는다. update cycle은 원본 pointer와 함께 오류를 낸다.

표현식은 parser + typed AST + allowlisted pure functions로 처리한다. `eval`/`new Function`이나 전역 접근을 사용하지 않는다. 자체 typed expression 함수 목록과 numeric/string/array/date/null semantics를 정의하고 독립 기대값으로 검사한다. 외부 expression DSL의 모든 함수·오류·truthiness를 복제할 의무는 없다. 시간대, UTC/local, DST, invalid date, regular expression, 정수/소수 변환의 결과를 oracle과 비교한다. 잘못된 식을 `0`이나 빈 문자열로 대체하지 않는다.

### 6.5 native 인터랙션 기능과 검증 범위

| 기능 그룹 — 아래 이름은 분류이며 외부 API 계약이 아님 | 반드시 검증할 행동 |
|---|---|
| click-highlight, axis-highlight | mark/axis 의미 target, 반복 click과 reset, 선/면/집계 mark의 영향 범위 |
| click-group-focus, hover-group-focus | group 전체 강조, 원래 opacity 복구, hover와 retained selection의 우선순위 |
| click-annotate | 안정적인 anchor, resize/data revision 후 위치·기록 유지 |
| select, lasso-select | modifier toggle/replace, 다중 선택, lasso boundary/holes/clip |
| brush-x, brush-y, brush-angle | 연속/범주 domain, 빈 선택, polar 0/2π crossing |
| brush-zoom, navigate | log/temporal domain invert, pan bounds, reset, geo camera |
| linked-brush | view 간 lineage/field mapping, feedback loop 차단 |
| legend-toggle | hidden 상태와 scale-domain 정책, mark·legend·접근성 일치 |
| context-activate, long-press, double-activate | pointer/keyboard parity, gesture 충돌, callback payload |
| inspect, inspect-index | tooltip target/format, shared index, focus/hover 동등성 |
| drag-reorder | category/series/facet reorder의 preview·commit·cancel과 key 유지; 자체 owner별 유효 순서와 오류 계약 |
| accessible-navigation | focus 순서, semantic announcement, keyboard selection/navigation |
| filter-controls | input binding, 검증·debounce·reset, filter→aggregate/domain 결과 |
| context-menu | 위치, focus trap/return, keyboard trigger, action dispatch·dismiss |

각 기능은 ggaction의 gesture→semantic command→state→materialization 계약으로 정의한다. 외부 프리셋 이름·23개라는 수·옵션 기본값을 맞출 필요가 없다. 위 기능은 유지하며 reset·modifier·geometry·접근성·취소·조합을 자체 fixture로 검사한다.

### 6.6 native 상태·명령·이벤트의 정합성

상태는 immutable committed program + 명시적인 session state + transient preview로 구분한다. 영구 저장할 selection/parameter/annotation은 명시 commit하고, hover/pointer capture/현재 presentation frame은 runtime에 둔다. 순수 액션은 DOM 없이 동작하며 controller만 pointer/keyboard/clock/resource lifecycle을 소유한다.

| native 명령 영역 | 실행과 계약 |
|---|---|
| data·parameter | 새 revision을 생성하고 필요한 transform/domain/geometry만 재계산. lineage와 안정 item ID 유지 |
| selection·visibility | replace/add/remove/toggle/clear와 범위 정의. 연결된 view에는 origin/revision을 전파해 loop 방지 |
| style·overlay | 이름을 가진 표현 변경을 baseline 위에 결정적으로 적용. opacity 누적 곱셈 없이 clear로 복원 |
| annotation | item 또는 coordinate anchor와 text/leader를 저장. resize/revise 뒤 의미 anchor 유지 |
| order | category/series/facet owner별 순서 변경. duplicate/missing/new key 정책과 preview/commit/cancel |
| viewport·camera | Cartesian domain과 geo camera를 별도 타입으로 처리. reset 기준·bounds·anchor 유지 |

위 분류는 고정된 외부 7op union이 아니다. 실제 public API는 기존 ggaction action convention과 resource 소유권에 맞춰 정한다. 자유로운 raw graphics나 외부 callback을 opaque payload로 저장하는 방식을 정상 chart 작성 경로로 만들지 않는다.

native event 제안은 `{transactionId, origin, phase, revision, affectedOwners, previous, current, diagnostics}`다. origin은 user/programmatic/playback, phase는 preview/commit/cancel이다. 드래그는 여러 preview와 commit 하나 또는 cancel 하나다. programmatic animation은 최초 origin을 유지하며 가짜 user 입력 이벤트를 만들지 않는다. 외부 엔진의 관찰된 중복 event나 특례를 복제하지 않는다.

검증 오류는 commit 전에 전체 명령을 거절하는 atomic 기본 계약이다. batch의 partial mode가 필요하면 명시 옵션과 항목별 결과를 사용한다. 성공·취소·교체·실패를 구별하고 promise의 settlement 시점과 state/event/paint 순서를 문서화한다. 새 update로 animation을 교체하면 현재 presentation frame에서 이어지고 오래된 async 결과는 generation token으로 폐기한다. cancel은 baseline을 복구하며 destroy 후 callback/listener/timer는 남지 않는다.

## 7. 애니메이션: scene 추출과 재생을 분리한 완전한 시간축

### 7.1 필요한 범위

현재 `createTransitionScene`은 대응 가능한 scene을 추출하고 `renderTransitionScene`은 resolved scene을 그린다. 이것만으로 duration, easing, seek, enter/update/exit, interruption이 구현된 것은 아니다. Cartesian viewport·geo camera를 포함해 ggaction의 모든 채택된 상태 변화를 자체 시간 모델로 설계한다. 외부 tween의 기본 duration·easing·event 순서와 일치시킬 필요는 없다.

필수 범위는 데이터/인코딩/스타일/스케일/가이드/배치/좌표/geo camera 전환, 항목 생성·수정·삭제, keyframe sequencing, play/pause/seek/rate/reverse/cancel/finish, 현재 프레임에서의 중단·재시작, 정적 프레임 export, reduced-motion이다. 최종 사용자용 편집 UI나 동영상 codec 전체 구현은 이 보고서의 core 기능으로 요구하지 않는다. 대신 프레임과 시간 샘플링 계약을 제공해 그런 UI/encoder가 붙을 수 있게 한다.

### 7.2 제안 API와 시간 모델

```ts
// 제안: pure planner/sampler는 DOM 없이 실행된다.
const plan = planTransition({
  from: { kind: 'program', program: beforeProgram },
  to: { kind: 'program', program: afterProgram },
  format: 'canvas',
  duration: 400,
  easing: { type: 'cubic-bezier', values: [0.2, 0, 0.2, 1] },
  correspondence: { by: 'semantic-item-key', unmatched: 'enter-exit' },
  incompatibleGeometry: 'crossfade',
});
const frame = sampleTransition(plan, { time: 200 });
renderTransitionScene(frame, canvasContext, { pixelRatio: 1 });
const player = mountAnimation(container, plan, { clock, reducedMotion: 'respect' });
player.seek(200); player.pause(); player.play();
await player.finished;
```

위 sampler의 canvas 결과는 현행 `renderTransitionScene(scene, CanvasRenderingContext2D, options)`가 받는 Canvas scene v2에 맞춘다. 중단 후 시작점은 `from:{kind:'frame',scene,identity,provenance,frameRevision}`도 허용하며 frozen snapshot을 복사해 소유한다. plan 저장은 endpoint program/scene와 key index를 포함한 envelope 또는 hash로 조회되는 동봉 content store를 사용한다. hash만 저장하고 실제 내용을 잃어버리면 복원 가능하다고 하지 않는다. schema/kernel version, font metrics와 asset manifest도 고정한다. projection/scale/guide 전환은 planner가 typed sampling kernel을 컴파일한다. sampler가 필요한 projection, tick/format, clipping, geometry를 다시 계산할 수 있지만 매 프레임 전체 semantic action chain과 원본 데이터 분석을 재실행하지는 않는다. 이 두 경로는 명시적으로 구분한다.

시간 단위는 ms, progress는 명시 clamp된 [0,1], easing 전후 progress를 구분한다. `sampleTransition`은 같은 plan/time에서 같은 scene을 반환하며 endpoint t=0/t=end가 원래 scene과 동등해야 한다. 지연, 반복 횟수, 방향, fill, playbackRate와 timeline segment 경계에서 생기는 off-by-one을 계약화한다. 브라우저 player는 monotonic clock/rAF를 주입받고 테스트에서는 가상 시계를 사용한다. Web Animations의 시간 개념을 참고하되 SVG DOM 속성만 애니메이션해 Canvas/PDF가 빠지는 구조를 만들지 않는다. [Web Animations 초안](https://www.w3.org/TR/web-animations-1/)

### 7.3 속성별 보간 정책

| 속성 | 기본 제안 | 금지·예외 |
|---|---|---|
| x/y/width/height/opacity/strokeWidth | 수치 보간, 음수 크기·NaN 방지 | opacity 0과 missing paint를 혼동하지 않음 |
| radius/area encoding | geometry radius와 의미 size 전환 정책 구분 | area 값을 radius로 직접 보간해 지각 의미 변경 금지 |
| color | 선택한 색공간을 plan에 고정, alpha 포함 | 플랫폼 기본 CSS 보간에 의존하지 않음 |
| transform/rotation | decomposition과 명시 shortest-turn 정책 | determinant 부호 변화는 unsafe morph 처리 |
| line/area/path | stable vertex/series identity, topology 검사 | index 수만 맞춰 의미가 다른 vertices를 연결하지 않음 |
| polygon with holes | ring/feature identity별 대응 | hole이 외곽으로 바뀌는 중간 self-intersection 금지 |
| text/format | position/style 보간, 내용은 명시 switch/crossfade | 숫자 문자 하나씩 임의 morph 금지 |
| axis/legend | tick/category semantic key로 match | formatter 문자열만으로 같은 tick 판정 금지 |
| clipping | clip geometry도 같은 시간 샘플링 | 중간 프레임에서 plot 밖 요소 노출 금지 |
| scale domain | transform된 공간의 정의된 정책 | log domain을 단순 선형 보간해 0/음수 통과 금지 |
| geo camera | projection별 회전·extent 정책 | 경도 179→-179를 무조건 358도 회전 금지 |

지원하지 않는 topology morph는 explicit crossfade로 표시한다. 이것은 지원한 듯한 잘못된 morph보다 정확한 기본 동작이다. 다만 원본의 특정 morph가 요구되면 crossfade로 해당 fixture를 통과 처리하지 않고 전용 correspondence를 구현한다. plan의 diagnostics에 fallback 이유와 item keys를 남긴다.

viewport의 제안 보간은 중심 선형·양의 span 기하 보간이며 log는 변환 공간에서 처리한다. 이는 native 설계 결정으로 명시하고 t=0,.25,.5,.75,1의 독립 수치 oracle를 고정한다. 외부 engine과 픽셀·event trace가 같아야 하는 조건은 없다.

### 7.4 중단·동시 갱신·성능

새 update가 오면 이전 애니메이션의 목표가 아니라 **현재 샘플링된 scene**에서 새 transition을 시작한다. semantic committed target과 presentation frame을 분리하고, finished promise는 completed/cancelled/replaced를 구분한다. host `applyUpdate(update, {transition:{duration}})`는 native 계약에 따라 final frame까지 기다릴 수 있어야 하고 reader gesture는 같은 promise를 기다리느라 입력을 막으면 안 된다. [Flint runtime 경로](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/runtime.ts#L1434-L1474)

변하지 않는 geometry/paint를 공유하고 프레임마다 원본 데이터 transform·폰트 측정·path parse를 반복하지 않는다. 대규모 데이터는 frame budget을 넘기면 animation quality 정책을 명시하되 마지막 상태와 선택 정확도는 유지한다. reduced-motion에서는 즉시 endpoint 또는 짧은 opacity 정책을 적용하고 seek/export는 여전히 결정적이다. 접근성 announcement는 매 프레임 읽지 않고 commit/의미 변화 중심으로 emit한다.

**필수 시험:** 가상 시간의 endpoint/중간 프레임, enter/exit 잔존, 중간 cancel, 역재생, 반복, t 경계, resize 중 animation, 자료 갱신 중 선택 유지, 다중 facet·polar·geo, SVG/Canvas 동일 geometry, detached container, destroy 후 rAF/listener 0, reduced-motion, CPU frame time/메모리 안정성.

## 8. Geo: 투영 함수보다 넓은 범위의 기능

### 8.1 지리 데이터와 그래픽 계약부터 확장한다

GeoJSON/TopoJSON을 일반 scalar table의 우연한 object 값으로 밀어 넣지 않는다. 권장 `createGeometryData` resource는 원본 geometry, feature id/property, 좌표계·단위, topology reference, source hash를 가진다. 속성 table은 feature key로 join하며 one-to-one/one-to-many/미매칭/중복 정책을 검증한다. geometry는 raw로 보존하고 projection 결과는 파생값이다.

GeoJSON의 longitude/latitude 순서와 WGS84 의미, ring·bbox·antimeridian을 명시한다. 단, source가 pre-projected planar geometry와 `identity` projection을 지정한 경우는 geographic resource와 별도 coordinate kind로 보존한다. 실제 대표 원본 7개에는 identity projection이 있으므로 이를 경위도로 wrap하거나 구면 clip하지 않는다. planar fit/translate/scale/reflectY를 독립 계약으로 둔다. TopoJSON은 arcs의 delta transform, reverse index, shared boundaries를 decode하는 별도 순수 단계로 처리한다. 원본 파일을 조용히 뒤집거나 shape를 수정하지 않고 normalized geometry와 원본 hash를 함께 남긴다. [GeoJSON RFC 7946](https://www.rfc-editor.org/rfc/rfc7946)

현재 한 subpath 제한은 즉시 풀어야 한다. 그래픽 path는 복수 `M…Z`, open/closed subpath, `fillRule: 'nonzero' | 'evenodd'`를 표현해야 한다. SVG `fill-rule`, Canvas `fill(rule)`, PNG/PDF의 같은 규칙, scene serialization, bounds, hit test가 동시에 바뀌어야 한다. 수학적 arc를 지원할지 cubic으로 normalize할지도 단일 canonical path 규칙으로 정한다. 지도 구현에서만 private path 문법을 쓰지 않는다.

### 8.2 projection과 geographic coordinate

```ts
// 제안: source-neutral geo 도메인 액션의 작성 형태.
const map = chart()
  .createCanvas({ width: 720, height: 420, margin: 30 })
  .createGeometryData({ id: 'regions', format: 'geojson', values: boundaries,
    featureKey: { property: 'region_id' } })
  .createData({ id: 'values', values: observations })
  .createGeoJoinData({ id: 'joined', geometry: 'regions', data: 'values',
    geometryKey: 'region_id', dataKey: 'region', unmatched: 'retain-geometry' })
  .createProjection({ id: 'projection', type: 'equalEarth', fit: { geometry: 'regions' } })
  .createGeoCoordinate({ id: 'geo', projection: 'projection' })
  .createGeoshapeMark({ id: 'regions-mark', data: 'joined', coordinate: 'geo' })
  .encodeColor({ /* 현행 encodeColor 계약에 맞춰 값과 scale을 지정 */ });
```

마지막 encoding을 포함한 위 예시는 설계 표기이며 그대로 실행할 수 있는 샘플은 아니다. 구현할 때 action cards/types에 맞는 완전한 실행 예제를 만든다. 지도마다 `createWorldMapWithGDPAndTooltip` 같은 전용 API를 만들지 않는다. geometry→join→projection→mark→encoding→guide→interaction의 조합을 재사용한다.

native projection registry는 Mercator, equirectangular, Equal Earth, Natural Earth, orthographic, stereographic, gnomonic, azimuthal equal-area/equidistant, conic equal-area/conformal/equidistant, transverse Mercator, Albers USA composite와 planar identity를 명시적으로 채택한다. 각 타입의 center/rotate/parallels/scale/translate/fit/precision/clip과 inverse 지원을 자체 계약으로 정의한다. 외부 catalog 변화로 자동 확장하지 않으며 서로 다른 투영을 조용히 대체하지 않는다.

권장 구현은 순수 projection/stream 수학을 검증된 d3-geo 계열로 재사용하되 그래픽 생성과 렌더링은 ggaction이 소유하는 방식이다. 독립 모듈/선택 entry point로 bundle 비용을 분리하고 정확한 package/version/license를 기록한다. 새 외부 엔진으로 차트 전체를 렌더링하는 것과 순수 수학 kernel 재사용은 다르다. dependency를 피하고 자체 구현을 선택한다면 같은 수학·절단·재표본화 oracle을 먼저 마련해야 한다. [d3-geo 공식 소스](https://github.com/d3/d3-geo)

### 8.3 geometry pipeline과 수치 조건

geographic 경로의 순서는 decode/validate → longitude/latitude normalization → 필요 회전 → spherical clipping/antimeridian split → projection → adaptive resampling → planar clip → concrete multi-subpath → bounds/hit index다. planar/identity 경로는 경위도 normalization·구면 clipping·구면 resampling을 우회해 planar transform/fit/reflectY/clip으로 간다. 투영별로 정확한 단계 위치가 달라지는 부분은 선택 kernel의 stream 계약과 일치시킨다. fit 대상은 선택된 원본/visible data 중 무엇인지 명시하고, pan/zoom 때 매번 fit을 다시 계산해 사용자의 viewport를 덮어쓰지 않는다.

반드시 시험할 경우: Polygon hole, MultiPolygon, GeometryCollection, dateline crossing, ±180° 양쪽 점, 극점 부근, antipodal segment, globe 뒷면, null geometry, 빈 collection, degenerate ring, 지름 0 bounds, 아주 큰/작은 좌표, feature id 문자열/숫자 구분. 화면 오차 허용치는 CSS pixel로 정의해 DPR에 따라 topology가 달라지지 않게 한다. ring winding과 projection kernel의 구면 면적 convention 차이는 명시적 normalization 복사본에서 해결한다.

지도 mark는 region·symbol·line/route·graticule·sphere·label을 구분한다. choropleth는 null/missing region 색, domain, 분류/연속 범례, stroke border 공유를 검사한다. GeoJSON 선과 대권 경로는 같은 것이 아니므로 line interpolation을 옵션으로 둔다. point size와 region color를 한 지도에서 조합하고 projection 아래 legend·title·annotation은 화면 좌표와 구분한다.

### 8.4 interaction, LOD, asset, export

geo는 자체 projection/center/fit/clip/camera/LOD 계약을 정의한다. GeoJSON/TopoJSON, planar identity, region join, custom geography, zoom/pan/globe rotate, 지역 상세도 전환을 지원한다. 외부의 특정19개 center preset·옵션명·선택 기본값을 복제하지 않는다.

geo viewport는 Cartesian x/y domain으로 가장하지 않고 projection camera/extent resource로 정의한다. invert 불가능한 projection에서 pointer lon/lat를 추정해 유효한 결과인 듯 반환하지 않는다. region hit는 projected geometry와 원 feature identity에 연결한다. LOD 교체 시 selection key를 유지하거나 parent/child reconciliation 정책을 명시한다. 큰 영역에서 선택한 state가 county view로 내려갈 때 자동으로 무엇을 선택하는지 결정하고 시험한다.

외부 지도·image·font 로딩은 host asset resolver가 수행한다. manifest는 URI, hash, mime, dimensions/CRS, attribution/license metadata와 상태를 가진다. fetch/abort/cache는 renderer 바깥에 두고 asset이 없는 상태는 placeholder/오류를 명시한다. CORS나 Canvas taint를 PNG export 순간에야 발견하지 않도록 사전 검증한다. export는 사용한 asset과 projection 설정을 고정하고 Node/browser에서 같은 geometry를 출력한다. 데이터·폰트·지도 라이선스는 원 저장소의 표시만 수집한 상태와 재배포 권한 확인 완료를 구분한다.



## 9. 차트·디자인·데이터의 나머지 결손을 공통 기능으로 해결하기

이 장의 새 액션 이름은 설계 제안이다. GGA/USR native capability 원장과 부록 F가 실제 요구 범위이며, 아래 알고리즘은 그 요구를 어떻게 reusable action으로 낮출지 정한다. 이미 있는 통계·마크를 새로 만드는 대신 먼저 현재 계약의 옵션을 검증한다. 예를 들어 loess는 현재 `createRegressionData`와 `editRegressionData({method:'loess', ...})` 경로가 있으므로 이름 부재만 보고 신규 기능으로 분류하면 안 된다.

### 9.1 구조 데이터와 레이아웃 알고리즘

| 기능 | 제안 입력·출력 및 알고리즘 | 합격 불변식과 edge case |
|---|---|---|
| hierarchy data | group-field path 또는 id/parent-id를 명시. node key, parent key, depth, own/aggregate value, row lineage 생성 | cycle/orphan/duplicate ID 진단, null category, internal value 중복 합산 금지, sibling stable order |
| tidy tree | hierarchy → node x/y + edge path, 방향 LR/RL/TB/BT와 separation | 같은 입력에서 동일 좌표, 같은 depth 정렬, subtree overlap 없음, 긴 label과 single node |
| treemap | hierarchy + values → nested rects, squarify/원본 요구 알고리즘, padding/rounding/leaf depth | parent 내 containment, 면적 비례, zero/negative 처리, padding 후 음수 크기 없음 |
| Icicle/Sunburst 공통 partition | hierarchy → normalized interval+depth → Cartesian rect 또는 polar arc | 같은 node ID·집계·순서·선택; 상세 F.2–F.3 |
| graph inference | kNN/radius/similarity/MST/group/sequence → GraphResource | topology와 node layout 분리; 상세 F.6–F.7 |
| edge bundling | graph+node layout → edge routes: hierarchical/FDEB/KDE/edge-path | endpoint·edge ID·adjacency 보존; 상세 F.8–F.9 |
| graph | node/edge table 또는 source/target table → canonical graph | edge key, directed/undirected, parallel edge/self-loop/missing node 정책 |
| circular/force graph | graph → deterministic layout, force는 seed·iterations·정지 기준 고정 | 입력 행 순서 불필요 의존 없음, 빈/불연결 graph, coincident nodes, frame마다 의미 재생성 없음 |
| Sankey flow | directed weighted graph → columns/node boxes/link ribbons | node 유량과 link 폭 보존, source/sink, zero/negative, cycle 정책, stable edge order |
| density contour | 2D histogram 또는 KDE grid → threshold polygon set | 원본 estimator 구분, threshold 포함 규칙, marching-squares saddle 결정, disconnected islands·holes |
| calendar | date + value → week/day cells/month boundary | timezone/weekStart, leap day, 연말 주차, missing date, 날짜 중복 집계 |

이 기능들은 semantic layout resource를 만들어야 한다. 사용자에게 최종 좌표 배열을 계산하도록 요구하지 않는다. `createHierarchyData → layoutHierarchy → createRectMark/createArcMark/createNodeMark`처럼 데이터 구조, 배치, 시각화를 분리하고, 편의 facade는 이 액션을 호출한다. 표의 `layoutHierarchy/layoutGraph/layoutFlow/layoutCalendar`는 같은 제안을 가리키는 권장 도메인 이름이며 최종 이름은 카탈로그와 함께 고정한다.

Sankey는 DAG와 cyclic flow를 명시적인 native layout mode로 구분하고 cycle/negative/self-link 정책을 정의한다. DAG mode가 cycle을 거절하는 것은 정상 오류이며 cyclic mode를 지원한 것으로 표시하지 않는다. 최종 범위에는 cyclic 경로의 geometry·유량·hit 검증도 포함한다. graph의 adjacency 강조, tree의 탐색, treemap의 breadcrumb/깊이 제한은 자체 상태 계약으로 구현한다. self-link를 조용히 삭제하지 않고 명시 오류 또는 표시 정책을 사용한다.

### 9.2 범용 기하와 차트 facade

Pyramid(외부 Funnel의 이름만 변경)는 단계별 폭·간격·방향을 가진 trapezoid/segment다. KPI/Gauge 전용 기능은 제외한다. Bullet 표현은 기존 qualitative band·bar·target rule의 조합으로 만들고 전용 API를 추가하지 않는다. 나머지 candlestick은 OHLC body·wick, waterfall은 delta/subtotal/total와 connector라는 의미 단위로 만든다. 하나의 giant path로 합치면 각 부분 선택·편집·annotation이 불가능해지므로 role별 owner를 유지한다.

ridgeline은 shared x와 density amplitude, row baseline offset, overlap/clip/labels의 조합이다. streamgraph는 단순 centered stack과 wiggle baseline이 다르므로 원본에서 사용한 baseline 알고리즘과 irregular x spacing을 검증한다. ranged dot·range area·error band는 endpoint 순서와 범위 교차, missing 처리, uncertainty 의미를 분리한다. 원본이 가진 상·하한을 새로 계산한 confidence interval로 바꾸면 안 된다.

Table/Bar Table/Sparkline은 좌표축 차트만큼 명시적인 cell layout이 필요하다. column width, 숫자 정렬, header/row separators, format, row limit, clipped value 표시, inline sparkline의 공통 x와 독립 y, 조건부 bar/color를 cell resource에 둔다. cell과 row/column header의 의미를 접근성 table과 hit target에 전달한다. 수백 개 독립 text의 수동 x/y 지정은 정상 최종 recipe가 아니다.

### 9.3 아직 없는 image·trail·paint 계약

native image mark는 현재 concrete primitive 목록에 없으며 image asset resource + image semantic mark + renderer serialization이 필요하다. URL, hash, dimensions, preserve-aspect/fit, opacity, clip, cross-origin/export policy를 가진다. loader는 browser와 Node에서 달라도 resolved asset의 의미는 같아야 한다. 외부 SVG image는 sanitize/지원 요소를 검증하고 embedded script/external reference를 실행하지 않는다. 이것은 실제 image asset을 표현하는 기능이며 차트 전체를 screenshot으로 바꾸는 허용이 아니다.

trail은 선의 vertex마다 size가 바뀌는 의미를 가진다. 일정 strokeWidth line으로 대체하지 않는다. centerline + width samples → join/cap이 있는 ribbon geometry로 materialize하고, break/curve/ordering/size interpolation, zero width, 급격한 turn, hit와 bounds를 검증한다.

native 디자인의 texture는 named paint resource로 처리한다. solid/diagonal/antidiagonal/horizontal/vertical/cross/dots의 pitch, stroke, phase, local/global coordinate, alpha, background를 정의한다. SVG pattern/Canvas pattern/PDF vector tiling 또는 동등한 결정적 geometry를 생성한다. 현재 linear gradient만으로 radial gradient·pattern·image fill을 지원한다고 할 수 없다. 원본에서 실제 사용한 radial gradient, 그림자, halo, outline, blend와 필요한 paint 종류는 별도 인벤토리 행으로 추가한다. 모든 renderer에 없는 paint를 조용히 단색으로 바꾸지 않는다.

### 9.4 데이터·통계·표현식의 정확성

기존 summary/bin/bin2d/stack/window/fold/flatten/lookup/impute/regression/density/ECDF/timeUnit을 우선 재사용한다. native aggregate 계약에서 sample/population variance, quantile interpolation, inclusive bin edge, null/NaN 처리, sort stability, frame bounds, density normalization, regression weighting/span/bandwidth를 명시하고 검사한다. pivot은 row/column grain, generated field collision, missing cell, duplicate aggregation을 가진 native transform으로 보강한다. transform 순서를 임의로 교환하지 않는다.

계산 표현식 확장은 현재 AST가 수용하는 연산만을 기준으로 한다. 예를 들어 현재 timeUnit action의 여러 단위와 computed `datePart`의 year 전용 계약은 다르다. native trig/date/string/conditional 함수는 실제 AST node/function을 추가해 처리하고 action trace와 오류 source pointer를 보존한다. formatter와 데이터 transform을 섞지 않는다. `"1"`, `1`, `null`, `""`, missing, boolean의 동등성·정렬·형변환은 자체 타입 계약으로 고정한다.

named/inline/URL/relative dataset, CSV/JSON format, parse directives, field escaping, dotted literal field와 nested field path, parameter-dependent data source를 구분한다. remote data는 재현 manifest에서 hash를 고정한다. 데이터·schema·binding은 자체 명시 입력으로 검증한다. 합성 fixture는 native 연산의 정확성·경계·성능을 확인하며 외부 원본의 번역 성공을 주장하지 않는다.

### 9.5 디자인 우선순위·폰트·레이아웃

디자인 우선순위의 권장 규칙은 ggaction 기본값 < chart family 기본값 < theme < plot/mark style < explicit channel/mark/guide 값 < named interaction overlay다. 이는 ggaction 자체 설계 제안이며 외부 dialect나 adapter의 precedence에 맞추지 않는다. `undefined`, omitted, `null`, `false`, `0`을 합치면 축/범례 숨김, baseline, padding이 틀어진다. 최종 resolved value와 출처를 inspection에서 볼 수 있게 한다.

native theme은 팔레트만이 아니라 headline/deck/axis/value/annotation typography, structure, geometry, facet, layout, annotation, furniture, texture, interaction policy를 포함한다. 자체 token schema와 chart별 override 우선순위를 정하고 검증한다. 외부14개 테마와의 매핑은 요구하지 않는다. 작은 화면에서 label wrap→skip→rotate 순서, minimum plot size, overflow, legend collect, footer/source note가 결정적으로 작동해야 한다. 텍스트 측정은 실제 renderer가 선택한 font/hash/fallback을 사용한다. font load 뒤 layout revision을 갱신하되 stale request가 새 차트를 덮지 않는다.

composition에는 canvas bounds, content bounds, plot bounds, guide bounds를 구분한 계약이 필요하다. 분리된 panel의 shared/independent scale, nested facet, 같은 frame의 shared Y와 단일 Y guide, top/bottom lane, full-bounds packing, header baseline, footer axis, empty cell, variable row height, responsive container를 각각 검증한다. 고정 margin을 원본보다 크게 바꿔 오류만 피하면 visual-qualified가 아니다.

여러 행의 facet, 긴 label, 공유 footer, 가변 row height를 가진 합성 fixture로 공통 배치를 검사한다. 과거 외부 원본의 fidelity 사례는 참고할 수 있지만 특정 source ID의 번역·픽셀 재현이 이 작업의 완료 조건은 아니다. tolerance를 키워 shared alignment 오류를 숨기지 않는다.

## 10. ggaction 자체 설계의 결정 원칙과 공개 계약

### 10.1 외부 정합성·통합·번역은 이번 목표에서 제외

Flint adapter, upstream prepare API, mount/React/MCP/Python 연결, 외부 template·theme·preset·update-op parity를 구현하지 않는다. chart-llm 및 기타 외부 chart spec의 parser/normalizer/translator, 파일별 source fidelity qualification도 별도 프로젝트다. 외부 저장소 변경이나 테스트 실행을 ggaction release의 선행 조건으로 삼지 않는다. 과거 상세안은 [철회 기록](evidence/withdrawn-external-design.ko.md)에 남긴다.

기능의 범위는 축소하지 않는다. native 데이터·통계·복합 geometry·paint·가이드·조합·구조형 chart·geo·hit·interaction·animation·저장·export·접근성·성능을 GGA-01–10과 USR-01–22로 추적하되 USR-03/04는 이번 의무에서 제외한다. 외부에서 본 아이디어는 이 계약을 개선하는 참고이며, 외부 속성이 존재한다는 이유만으로 core 옵션을 추가하지 않는다.

### 10.2 설계 판단의 우선순위

1. 데이터 의미·수학적 정확성·일관된 identity와 lineage.
2. 기존 immutable ChartProgram, 추적 가능한 작은 액션, 명시적 materialization, renderer-neutral graphicSpec의 경계.
3. 조합 가능성, 읽고 수정하기 쉬운 API, 결정적 저장·복원과 inspectability.
4. 실제 조작·접근성·성능·취소·자원 관리 및 SVG/Canvas/export 일관성.
5. 구현·타입·스키마·문서·agent 지원의 동일한 계약.

이 기준을 충족하면 외부 API 이름·기본값·event ordering·시각적 결과와 달라도 된다. 구현자가 외부 호환을 위해 core에 compatibility branch를 추가하지 않도록 dependency와 release gate에서 검사한다. 향후 외부 adapter가 필요하면 별도 프로젝트가 native public API를 소비하도록 한다.

### 10.3 공개 API와 resource의 책임

순수 action은 data/resource/semantic intent를 입력받아 새 program과 trace를 만든다. data inference는 topology, layout은 배치, routing은 edge 경로를 담당한다. concrete graphics는 explicit materialization에서 생성하며 renderer는 semanticSpec를 해석하지 않는다. controller는 사용자 입력과 session lifecycle, animation player는 clock과 presentation frame을 담당한다.

public action 옵션은 자체 catalog/types/schema로 정의한다. 필요한 경우 여러 native 기능이 공유하는 공통 계약을 추가하고, 특정 외부 JSON을 통째로 받는 opaque escape API를 만들지 않는다. capability 조회는 action 존재 여부뿐 아니라 option+coordinate+renderer+interaction 조합의 검증 증거를 반환한다.

### 10.4 기본값·변경·오류의 관리

theme/scale/selection/animation/inference/bundling 기본값은 native intent와 독립 oracle로 선택한다. 모든 값의 단위·범위·null/omitted 의미·우선순위·version을 문서화한다. 변경 시 explicit migration 또는 versioned resource를 사용하고 기존 snapshot의 의미를 조용히 바꾸지 않는다. 실패는 정확한 owner/option/constraint를 돌려주고, 임의의 external fallback을 성공으로 표시하지 않는다.

## 11. 자체 fixture와 검증 파이프라인

### 11.1 입력의 의미를 통제할 수 있는 fixture

각 native capability에 작은 수작업 예제, 경계·오류 예제, 실제 규모 예제, 조합 예제를 둔다. data·asset·font·locale·timezone·viewport를 고정하고 예상 숫자·bounds·state transition·중간 animation frame을 독립적으로 정의한다. 외부 논문·수학 reference는 알고리즘 oracle로 사용할 수 있으나 외부 chart engine이 있어야 시험을 실행할 수 있는 구조는 피한다.

### 11.2 기능별 수직 검증

`native requirement → public action/resource → validation → explicit materialization → render/hit → interaction/time → save/load/edit → export/package`로 연결한다. geometry snapshot 하나나 API 이름 등록만으로 완료하지 않는다. renderer 간 같은 semantic geometry, 입력 중 취소, revise/resize 뒤 identity, dispose 뒤 자원 해제를 함께 확인한다.

### 11.3 조합과 표현력

partition 직교/극좌표, inferred graph+layout+bundling, geo+camera+selection+animation, facet+filter+shared guides처럼 기능을 조합한 fixture를 필수로 둔다. 한 기능이 다른 기능의 상태나 자원을 임의로 변경하면 실패다. KPI/Gauge 제외, 단일 Y, 전용 Marginal/Bullet/Combo API 없음도 native 생성·수정·복원 경로에서 검증한다.

### 11.4 외부 자료의 위치

Flint 874개 관찰 요구와 코퍼스 1,405종 feature는 reference-only 원장으로 보존한다. active 작업·인수 시험·완료 분모는 없다. 원본 번역률, 차트 이름 수, 외부 엔진 픽셀 일치율을 이번 구현의 성공 지표로 사용하지 않는다. 나중에 번역 프로젝트가 이 자료를 재사용할 수 있지만 현재의 core 설계 결정을 제약하지 않는다.

## 12. 사람과 agent가 같은 지원 상태를 읽게 만들기

새 기능의 문서는 도메인 개념 → 최소 실행 예제 → 조합 예제 → edit/resize/serialize 예제 → 제한·오류 → 검증된 native 조합 사례 순으로 작성한다. 현재 지원과 계획을 한 표에서 구분하고, `compatibility.json`에 feature/version/renderer/fixture/evidence를 저장해 human docs와 LLM 문서를 같이 생성한다. 계획 중인 API를 current action catalog에 implemented로 넣지 않는다.

action card에는 intent, owner/resource, prerequisites, required/optional options, defaults, mutually-exclusive options, pure/runtime 구분, serialization, materialization invalidation, identity 영향, interaction/animation 가능 여부, executable examples와 negative cases가 있어야 한다. geo/animation의 경우 렌더링 없이 의미만 저장한 상태와 실제 화면·상호작용까지 가능한 상태를 구분한다.

agent가 지원 여부를 물으면 API 이름의 존재뿐 아니라 해당 option+coordinate+renderer+interaction 조합의 evidence를 돌려준다. 모르는 조합은 `unqualified`로 답하고 근거 없는 조합을 만들어 내지 않는다. requirement와 fixture ID는 사람 보고서, JSON, CI 결과, issue/PR 설명에서 동일하게 사용한다. core 계약의 변경이 문서·types·MCP/LLM artifact에 반영되지 않으면 release gate가 실패하게 한다.


### 12.1 개정 범위를 문서와 agent 출력에 유지

Icicle/Sunburst는 같은 partition card의 coordinate 예제로 설명한다. UpSet 전용 문서는 후속 설계 기록에만 남긴다. inference와 layout·bundling은 각각 독립 card다. 네 bundling method와 여섯 inference rule의 옵션·오류·provenance·검증 상태를 모두 표기한다. Marginal/Bullet/Combo는 조합 recipe 검색어로만 노출하며 전용 API처럼 소개하지 않는다. Pyramid의 외부 Funnel alias와 원본 인구 피라미드의 구분을 mapping 카드에 명시한다. KPI/Gauge 전용 지원은 제외 상태, dual-Y는 금지 상태를 문서화하고 agent가 이를 구현 추천으로 재도입하지 않게 한다.


## 13. '완전 지원'을 실제로 판정하는 검증 시스템

### 13.1 서로 다른 종류의 coverage를 분리한다

첫째는 코드 coverage다. 분기와 예외 처리를 얼마나 실행했는지 측정한다. 둘째는 계약 coverage다. 공개 액션·옵션·입력 경계·resource lifecycle을 검증한다. 셋째는 native capability coverage다. 데이터·geometry·상태·시간축의 요구가 자체 fixture와 독립 oracle로 검증되는지 판정한다. 넷째는 조합 coverage다. 예를 들어 facet+log+selection+animation처럼 기능이 같이 작동하는지 확인한다. 이 네 수치를 하나의 백분율로 합치지 않는다.

필수 지표는 native requirement별 구현·계약·수치·기하·입력·시간축·저장·패키지의 검증 상태다. GGA 10개 capability와 USR 20개 요구를 활성 원장으로 관리하며 USR-03/04는 후속 과제로 보존한다. 외부 Flint 874행과 코퍼스 1,405행은 참고 자료다. 전체 2,311행 중 활성30/후속2/참고2,279를 분리하며 외부 자료를 필수 합격 분모로 사용하지 않는다.

### 13.2 native 계약과 독립 reference

reference는 수학적 기대값, 별도의 알고리즘 구현, 수작업 state transition, 고정된 geometry constraint를 우선한다. native defaults·version·units·error semantics를 fixture에 기록하고 같은 구현 함수로 expected를 재생성하지 않는다. 외부 논문은 알고리즘 근거로 사용할 수 있지만 외부 chart engine의 이벤트 순서·픽셀·테마를 복제하는 시험은 요구하지 않는다.

외부 spec의 dialect/schema/asset 문제와 원본 번역 fidelity는 별도 프로젝트다. 이번 gate에 unresolved source나 corpus translation failure를 연결하지 않는다. native 기능의 미완료를 외부 범위 제외로 숨겨서도 안 된다.

### 13.3 oracle을 여러 층으로 만든다

| 층 | 비교 대상 | 실패가 뜻하는 것 |
|---|---|---|
| 원본·자원 | spec/data/font/map/image hash, dialect/profile | 다른 입력을 비교하고 있음 |
| data/semantic | rows, transforms, group grain, aggregate, domain, order, lineage | 그림이 비슷해도 의미가 다름 |
| geometry | mark endpoint/bounds/path topology, scale mapping, clip | 위치·범위·면적·연결이 다름 |
| guide/text/layout | ticks/labels/format/font/line breaks, header/footer, alignment | 디자인 또는 읽기 순서가 다름 |
| raster/vector | 고정 환경의 pixel diff와 SVG/PDF geometry | 렌더링·paint·anti-aliasing 차이 |
| behavior/state | 입력 후 화면, selection/filter/viewport, event trace | 이벤트만 있거나 화면만 변하는 불완전 구현 |
| time | 중간 프레임, key matching, cancellation, final state | endpoint만 맞는 잘못된 animation |
| lifecycle/package | fresh install, reload, resize, dispose, platform | 실제 backend/배포에서 사용 불가 |

수치 기대값을 ggaction의 같은 함수로 다시 계산하지 않는다. known analytic example, 독립 구현, source engine의 검증된 intermediate result를 사용한다. projection은 순수 수학 oracle와 topology invariants, 통계는 수식·외부 기준값, layout은 독립 bounds/constraints, interaction은 실제 input script와 state transition table을 함께 사용한다.

### 13.4 tolerance와 baseline 변경 규칙

대상값마다 단위와 이유가 있는 tolerance를 둔다. 순수 산술은 절대+상대 오차를 명시하고, geometry는 logical CSS pixel, projection inverse는 degree/radian, area는 데이터 단위, animation은 ms/값 단위로 검사한다. **초기 설계 제안**은 일반 geometry 최대 오차 0.5 CSS px, 정렬·공유 경계는 같은 layout 계산에서 exact equality다. 실제 source kernel과 font 환경을 고정한 뒤 더 엄격하거나 필요한 별도 한계를 정한다. 이 숫자는 이번 조사에서 검증된 모든 fixture의 보장치가 아니다.

pixel diff는 anti-aliasing 차이를 분리하되 geometry·text·색·data oracle 실패를 평균 diff로 덮지 않는다. 글자 하나가 잘못되어도 전체 이미지 면적에서 차지하는 비율은 작으므로 전역 5% 같은 단일 threshold만으로 합격시키지 않는다. region mask와 edge/text/color metrics를 병행한다. issue #258처럼 작은 header 오차도 shared alignment 의도가 깨지면 원인을 해결한다.

baseline 업데이트는 원본/의도 변경, 엔진·폰트 변경, target 버그 수정의 이유와 이전/이후 수치·그림을 포함한다. 테스트가 실패한다는 이유만으로 모든 snapshot을 재생성하지 않는다. 의도적 departure는 requirement row에 남기고 완전 동등 판정과 구분한다.

### 13.5 test matrix의 분모와 조합 전략

native capability의 모든 채택된 옵션과 대표 조합 fixture를 실행한다. 모든 boolean은 양쪽, enum은 모든 값, 연속값은 경계·대표값·잘못된 값, optional은 omitted와 explicit default, nullable은 null을 포함한다. 무한한 연속값 전체를 시험할 수는 없으므로 property invariants와 fuzz seed를 고정해 보강한다.

옵션의 전체 Cartesian product를 '전수'라고 약속하지 않는다. 모든 채택된 native 조합 + 모든 단일 옵션 값 + pairwise + 위험한 고차 조합을 명시 matrix로 관리한다. 반드시 직접 포함할 조합은 log/negative, facet/independent scale/legend toggle, shared guide/reorder/resize, selection/filter/aggregate, polar/angular brush, geo/LOD/annotation/tween, image/clip/export, font-load/resize/destroy, animation/data revision/hit-test다. 지원 불가 조합은 native 계약의 이유와 진단을 명시한다. GGA/USR 필수 조합이면 미완료로 남겨 해결한다.

환경은 Node와 실제 browser, SVG/Canvas/PNG/PDF, DPR 1/2/3, 고정 기본 timezone과 UTC/DST 경계, 최소 두 locale/한글 fallback, 작은·중간·큰 container, keyboard/touch/pointer, reduced-motion을 포함한다. 모든 대형 benchmark를 매 PR마다 실행할 필요는 없지만 release candidate에서는 전체 qualification manifest를 닫는다. 변경 dependency에 따른 subset 선택은 누락 검출 audit와 함께 유지한다.

### 13.6 실제 입력을 검증하는 방식

인터랙션 시험은 `setState`를 직접 호출해 그림만 바꾸는 것으로 대체하지 않는다. Playwright 같은 실제 browser 입력으로 pointerdown→move→up, wheel, keyboard, touch/cancel을 보내고 paint된 geometry, visible tooltip/widget, getState, event trace를 같은 checkpoint에서 수집한다. guide label의 font load가 끝나기 전후, container 밖 release, nested scroll, CSS resize, DPR 변경, focus loss를 포함한다.

접근성은 accessible data export만으로 끝나지 않는다. 논리 focus 순서, focus indicator, keyboard equivalent, tooltip의 focus 접근, context menu 열기·닫기·focus 복원, 선택/숨김 상태 설명, 색 외 구분, reduced-motion을 확인한다. 수천 mark를 모두 tab stop으로 만드는 대신 chart entry와 내부 탐색 모델을 제공한다. core data semantics와 host accessibility tree를 함께 검증한다. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

### 13.7 성능과 자원 관리

성능 수치를 측정하기 전에 '60fps 지원'이라고 문서화하지 않는다. 시험은 point 수, path vertex 수, facet 수, geometry ring 수, labels 수, parameter dependency 범위로 size class를 정의한다. 같은 10,000 marks라도 circle과 복잡한 polygon의 비용은 다르다. 장비/OS/browser/font/cache/CPU throttling을 기록한다.

| 항목 | 초기 측정 목표 제안 | 완료 판정 방법 |
|---|---|---|
| 일반 hover/selection 반응 | small/medium fixture에서 input→paint P95 50ms 이하 | 실제 event timestamp와 frame 측정, tooltip 포함 |
| animation | 지정 medium fixture에서 P95 frame 16.7ms 이내를 목표 | main thread/paint 시간, dropped frames, 정확한 final state 함께 기록 |
| 대형 정적/geo 업데이트 | dataset/geometry size별 별도 SLO | parse/project/layout/paint 시간을 분해; 선형·증분 기대와 비교 |
| mount/dispose 장시간 반복 | 지속적인 retained heap 증가 없음 | GC 조건 고정 반복, listener/rAF/DOM/asset handle 잔존 검사 |
| bundle | core 기존 소비자에 geo·DOM·animation 의존성 강제 유입 없음 | package import graph/tree-shaking/clean consumer 측정 |

이 수치는 측정 시작을 위한 제안이며 현재 달성한 성능이 아니다. 지원 size class와 예산은 구현 전에 고정하고 이후 실패를 숨기려고 일방적으로 낮추지 않는다. 대형 chart에서 명시적인 품질 정책을 쓰더라도 데이터 의미·최종 geometry·선택 정확성을 버리지 않는다. source 요구에 없는 WebGL/3D 엔진을 범위에 억지로 추가하지 않으며, 필요가 드러나면 새 요구 행으로 판단한다.

### 13.8 증거 레코드와 CI gate

```json
{
  "requirementId": "GGA-08",
  "fixture": { "version": "native-fixture-v1", "path": "fixture-path", "sha256": "..." },
  "profile": { "contractVersion": "native-v1", "renderer": "canvas", "viewport": [720,420] },
  "target": { "commit": "candidate-sha", "packageSha256": "...", "programSha256": "..." },
  "environment": { "fontManifestSha256": "...", "timezone": "UTC", "dpr": 2 },
  "results": { "semantic": "pass", "visual": "pass", "behavior": "unrun", "time": "unrun" },
  "qualification": "visual-qualified",
  "evidence": ["semantic.json", "source.png", "target.png", "diff.png"]
}
```

위는 저장 형식 제안이다. `unrun`, `unknown`, `source-blocked`, `unsupported`를 pass로 집계하지 않는다. 특정 layer가 적용되지 않으면 `not-applicable`과 근거를 저장한다. 문서의 지원표는 이 manifest에서 생성한다. 코드 변경이 전혀 없어도 source/font/engine hash가 바뀌면 해당 qualification을 재검증한다.


### 13.9 개정 범위의 독립 oracle와 정책 gate

부록 F의 partition/kNN·radius·MST 수치 예제는 [revision-oracle-fixtures.json](evidence/revision-oracle-fixtures.json)에 저장했다. 구현 함수로 expected를 재생성하지 않는다. bundling은 각 method의 별도 reference, endpoint·identity·adjacency 불변식, route provenance, deterministic iteration, frame hit/geo clip을 함께 검사한다.

정책 gate는 KPI/Gauge 전용 지원 제외, 단일 frame의 숨은 독립 Y와 mirror guide 거절, 합법적인 facet·range endpoint 허용, 전용 Marginal/Bullet/Combo API 부재, Pyramid의 명칭·의미 보존를 확인한다. native fixture의 frame/scale resolution을 검사한다. corpus screening은 과거 참고 자료이며 종결 의무가 없다.


## 14. 구현 작업 패키지와 의존 관계

아래 22개 작업은 모두 최종 목표에 포함된다. `WP-00`의 조사 기준은 이번 산출물로 시작할 수 있지만 향후 reference renderer와 실제 입력 oracle까지 완성해야 한다. 모든 상태는 **제안/미구현**이며 구현 완료나 추정 개발 기간을 뜻하지 않는다. 공개 API·schema 변경은 저장소 계약 절차로 확정하고, 각 작업에서 types/contracts/tests/docs를 함께 수정한다.

| ID | 작업과 산출물 | 선행 작업 | 인수 시험 |
|---|---|---|---|
| WP-00 | **현행 기반·독립 oracle 고정** — ggaction 계약·수치/geometry/state/time oracle와 환경/hash 고정; 외부 자료는 역사적 참고 | 없음 | AT-01, AT-02 |
| WP-02 | **안정적인 item identity와 lineage** — logical dataset/revision/row/item keys, lineage, key 없는 교체 정책 | WP-00 | AT-06, AT-07, AT-08 |
| WP-03 | **resource·schema·persistence 확장** — selection/parameter/geometry/layout resource 소유권, schema 3 migration, inspection | WP-02 | AT-09, AT-10 |
| WP-04 | **복합 path와 geometry 계약** — 복수 subpath, fill rule, bounds/clip/flatten, 모든 renderer와 scene 동등성 | WP-03 | AT-11, AT-12 |
| WP-06 | **data transform·expression·조건부 인코딩** — native AST/functions/pivot/statistics, parameter dependency와 조건부 채널의 자체 의미 계약 | WP-03 | AT-16, AT-17, AT-18 |
| WP-05 | **paint·image·font 자원** — pattern/필수 gradient/image, resource hash/resolve/export, text metrics | WP-03, WP-04 | AT-13, AT-14, AT-15, AT-04 |
| WP-08 | **구조형·연속 기하 layout** — tree/treemap/graph/flow/contour/calendar의 data/layout; partition은 WP-22와 공유 | WP-02, WP-04, WP-06 | AT-22, AT-23, AT-24, AT-25 |
| WP-22 | **Icicle·Sunburst 공통 partition** — normalized hierarchy partition, Cartesian/polar materializer, stable focus와 coordinate kernel | WP-02, WP-03, WP-04, WP-06 | AT-62, AT-63, AT-64, AT-65 |
| WP-24 | **규칙 기반 graph inference** — kNN/radius/similarity/MST/group/sequence, metric/preprocessing/provenance와 edge limits | WP-02, WP-03, WP-06 | AT-70, AT-71, AT-72, AT-73, AT-74 |
| WP-07 | **ggaction 디자인·가이드·반응형 조합** — 자체 theme/typography/paint/guide 우선순위와 layout solve, nested facets, 자체 합성 fixture의 배치 검증 | WP-03, WP-05 | AT-19, AT-20, AT-21 |
| WP-25 | **네 대표 edge bundling 방법** — HEB/FDEB/KDE/edge-path, 독립 EdgeRouteResource, endpoint/identity/direction 보존 | WP-04, WP-08, WP-22, WP-24 | AT-75, AT-76, AT-77, AT-78, AT-79, AT-80, AT-81, AT-82 |
| WP-10 | **geo 전체 경로** — GeoJSON/TopoJSON/identity, projection/join/fit, LOD/camera/geo marks | WP-02, WP-04, WP-05, WP-07 | AT-29, AT-30, AT-31, AT-32 |
| WP-11 | **semantic hit와 공간 인덱스** — CSS/DPR/composition/clip/frame 기반 hit, guide roles와 원본 records | WP-02, WP-04, WP-07 | AT-33, AT-34 |
| WP-26 | **자체 설계 원칙·단일 Y·조합·명칭** — ggaction-native 정책, 단일 Y frame validator, 조합 recipe, Pyramid 명칭; 외부 adapter 필수 아님 | WP-03, WP-07 | AT-83, AT-84, AT-85, AT-86, AT-87, AT-88, AT-92 |
| WP-09 | **native 차트 표현과 공통 조합 recipe** — ggaction domain semantics와 기존 액션 조합; Pyramid/table/trail/OHLC 등 역할 보강; 외부 chart catalog parity 불필요 | WP-06, WP-07, WP-08, WP-22, WP-25, WP-26 | AT-26, AT-27, AT-28 |
| WP-12 | **native selection·gesture·입력 controller** — 선택/brush/lasso/linked views/filter/legend/reorder/annotation/navigation/accessibility를 자체 계약으로 설계 | WP-03, WP-06, WP-11, WP-22, WP-24, WP-25, WP-26 | AT-35, AT-36, AT-37, AT-38 |
| WP-14 | **transition planner·sampler·player** — 정적 보간과 typed kernel, enter/update/exit, interrupt/seek/timeline, frame export | WP-02, WP-04, WP-07, WP-10, WP-11, WP-22, WP-24, WP-25, WP-26 | AT-42, AT-43, AT-44, AT-45 |
| WP-13 | **native 상태·명령·이벤트·lifecycle** — committed baseline+preview, commit/cancel, typed updates/events, async settlement, clear/reset; 외부 op 수·이름 고정 없음 | WP-07, WP-10, WP-12 | AT-39, AT-40, AT-41 |
| WP-18 | **접근성·export·복원 종단검증** — keyboard/focus/accessible data, SVG/Canvas/PNG/PDF, offline program/animation 재생 | WP-05, WP-12, WP-13, WP-14 | AT-53, AT-54, AT-55, AT-89 |
| WP-19 | **성능·배포패키지·문서·agent 지원** — 성능 SLO와 memory cleanup, clean consumer, current action/LLM/capability docs | WP-18 | AT-56, AT-57, AT-58, AT-90 |
| WP-20 | **native 계약·조합·성능 qualification** — GGA/USR 요구의 증거를 닫고 독립 oracle 검토; 외부 참고 행은 gate 밖 | WP-00, WP-18, WP-19, WP-22, WP-24, WP-25, WP-26 | AT-59, AT-60, AT-88, AT-91, AT-92 |
| WP-21 | **릴리스 후보와 공개 산출물 검증** — 동일 tarball CI/package/docs/registry artifact 확인, native capability qualification 동봉 | WP-20 | AT-61 |

### 14.1 코드 소유 위치와 병렬 작업

| ID | 구현 접점 — `(new)`는 제안 위치/모듈 |
|---|---|
| WP-00 | `native fixture/oracle harness (new)` |
| WP-02 | `src/actions/data/revise.js`; `src/actions/data/revisionBindings.js`; `src/scene.js`; `src/inspection.js` |
| WP-03 | `src/core/ChartProgram.js`; `src/grammar`; `src/persistence`; `types/program.d.ts` |
| WP-04 | `src/grammar/pathCommands.js`; `src/grammar/schemas`; `src/renderers`; `src/scene.js` |
| WP-06 | `src/actions/data`; `src/grammar/computed.js`; `src/grammar/transforms.js`; `src/actions/encodings` |
| WP-05 | `src/grammar/paint.js`; `src/renderers`; `src/actions/textMetrics`; `asset resolver (new)` |
| WP-08 | `src/actions/data`; `domain layout modules (new)`; `src/grammar` |
| WP-22 | `hierarchy layout/materializer (new)`; `src/actions/charts`; `src/grammar` |
| WP-24 | `graph inference data actions (new)`; `src/grammar`; `types` |
| WP-07 | `src/actions/guides`; `src/materialization`; `src/actions/composition`; `src/grammar` |
| WP-25 | `edge routing kernels/materializer (new)`; `src/inspection`; `src/renderers` |
| WP-10 | `geo resource/kernel/materializer (new)`; `src/grammar`; `src/renderers` |
| WP-11 | `src/inspection.js`; `src/scene.js`; `hit-test module (new)` |
| WP-26 | `policy/admission module (new)`; `src/actions/composition`; `docs` |
| WP-09 | `src/actions/charts`; `src/actions/marks`; `src/grammar/plotComposition.js` |
| WP-12 | `interaction entry/runtime (new)`; `src/actions/selection`; `types (new)` |
| WP-14 | `src/scene.js`; `animation entry/planner/player (new)`; `types/scene.d.ts` |
| WP-13 | `interaction session (new)`; `native command/event contract (new)` |
| WP-18 | `src/accessibility.js`; `src/renderers`; `src/persistence`; `browser tests` |
| WP-19 | `test/browser`; `scripts/package-consumer.js`; `knowledge`; `agent_docs`; `docs`; `types` |
| WP-20 | `qualification manifest/dashboard (new)`; `all test suites` |
| WP-21 | `existing release workflow`; `package/docs publication` |

개정 정책 WP-26을 먼저 적용한다. partition WP-22, inference WP-24, bundling WP-25는 모두 필수이며 상세 계약은 부록 F에 있다. critical path는 identity/resource → compound geometry/layout → geo/hit → interaction/animation → native runtime → 전수 검증이다. data/expression, design/layout, hierarchy/graph는 공통 계약 이후 병렬화할 수 있다. 여러 작업이 같은 core schema를 각자 정의하지 않도록 `WP-03`의 resource와 migration 계약을 먼저 고정한다.

외부 차트 이름별 PR로 나누기보다 공통 기반과 의미 단위로 나눈다. 한 PR은 domain action+validator+materializer+renderer 적용+types+문서+독립 oracle까지 수직으로 완결한다. 단, API 이름이나 snapshot만 먼저 올리고 runtime이 비어 있는 상태를 지원 완료로 표시하지 않는다.

### 14.2 요구사항 추적 원장

Flint 874개 추출 요구사항, 코퍼스 1405종 관찰 feature, 사용자 요구 22개와 native capability 10개를 합친 **2311행**의 [요구사항 원장](evidence/requirements-traceability.json)을 만들었다. [CSV](evidence/requirements-traceability.csv)에서는 작업 소유권과 시험 ID를 필터링할 수 있다. 이 행들은 서로 다른 단위이며 합계를 차트 수나 지원률로 해석하면 안 된다. 개별 옵션의 값/위치/원본 목록은 원 source inventory에 연결되어 있다. 외부 관찰 2,279행은 reference-only이며 작업·시험 소유권과 release 의무가 없다. 사용자/native 30행이 active 원장이며 UpSet 관련2행은 deferred-by-user다. 현재 routing은 구현 소유권 배정이며 합격 증거가 아니다.

WP-01/15/16/17 및 AT-03/05/46–52는 철회했다. ID를 재사용하지 않고 [철회 기록](evidence/withdrawn-flint-plan.json)에 남긴다. 외부 adapter/parity/번역은 선행 조건이 아니다.

UpSet 및 집합 시각화 WP-23, USR-03/04, AT-66–69는 후속 과제로 이관했다. 관련 data/API/interaction도 이번 필수 범위가 아니다. [후속 기록](evidence/deferred-set-visualization-plan.json)을 참고한다.

## 15. 인수 시험 명세

다음 79개는 실제 입력과 기대 결과를 정한 **추가해야 할 시험군**이다. 이번 조사에서 실행한 19개 core probe, 154개 Flint compile, 46개 번역 replay와 혼동하지 않는다. 각 행은 요구 옵션과 사례를 전개하는 generator/fixture 묶음이며 한 테스트 함수만 추가하라는 뜻이 아니다.

| ID | 입력·시나리오 | 반드시 확인할 결과 |
|---|---|---|
| AT-01 | ggaction baseline·공개 action/schema·환경 hash | 기준 버전과 계약 추적, native fixture hash 재현; 외부 저장소 실행 불필요 |
| AT-02 | 독립 numeric/geometry/state/time reference 생성 | 동일 native 입력에서 결정적 출력과 반복 가능한 oracle; 외부 엔진 필수 아님 |
| AT-04 | native data/font/map/image resource offline replay | 자원 hash·binding·오류·abort 정확; source dialect/번역 의무 없음 |
| AT-06 | 3rows 중1row값변경, 정렬, append/delete, reload | 명시 key가 같은 항목 identity 유지; old program 불변; generated key 할당 보존 |
| AT-07 | duplicate/null key 및 key없는 전체 set-data 교체 | 명시 error/occurrence/mapping/new-identity 정책; 자동 잘못 매칭 없음 |
| AT-08 | aggregate/bin/stack/fold/lookup/facet 후 hit·filter·revise | contributing row lineage와 grain 정확; series/owner/facet key 충돌 없음 |
| AT-09 | schema3 selection/highlight 프로그램을 새 버전에서 load/edit/save | 기존 상태 동등, indices→rowkey 변환 근거 보존, ambiguous 참조 명시 오류 |
| AT-10 | 새 모든 resource/action을 serialize→새프로세스 load→edit | 등록/스키마 검증·trace·inspection 일치, DOM/function/cache 유입 없음 |
| AT-11 | outer ring+hole+islands와 nonzero/evenodd를 모든 renderer로 출력 | 구멍이 실제 비어 있음; transparency/overlay에서도 topology 동일 |
| AT-12 | open/closed curved path, clipping, bounds, invalid commands | 정확한 stroke/fill/bounds, finite geometry, canonical 변환 오차 한계 검증 |
| AT-13 | 7texture와 요구 gradient/alpha를 SVG/Canvas/PNG/PDF에 출력 | pitch/phase/색/투명도/clip 일치, 지원 안 하는 paint 무음 대체 0 |
| AT-14 | native image asset와 load failure/CORS/abort/export | fit/aspect/clip·사전 진단·dispose 뒤 callback 없음 |
| AT-15 | 고정font+fallback+한글+긴label+font load delay | 실제 font hash 측정과 render 일치, stale layout 없음, line break/origin 검증 |
| AT-16 | ggaction expression AST/function과 null/date/string 경계 | 자체 타입·오류·수치 계약 일치, eval/global access 없음; 외부 DSL 번역 제외 |
| AT-17 | 모든 transform과 stats의 numeric fixtures | 독립 수식·불변식 일치; pivot/loess/bin/window/timezone/DST 포함 |
| AT-18 | parameter→filter→aggregate→scale→조건부 encoding 연쇄 | 정확한 dependency invalidation; cycle 오류; 모든 condition branch 실행 |
| AT-19 | ggaction theme token schema·override/null/false/0 | 자체 precedence와 provenance·typography·paint·guide 일치; 외부14theme 복제 불필요 |
| AT-20 | unit/layer/facet/concat/repeat와 허용 scale/guide scope | frame별 Y 하나; 분리된 facet 독립 scale 허용, bounds와 responsive 정렬 |
| AT-21 | nested facet·3행 full-bounds·긴label·resize 합성 fixture | 공통 header/plot/footer 정렬과 text metrics 정확; corpus source ID 재현 의무 없음 |
| AT-22 | hierarchy/tree/treemap의 단일/다층/빈/잘못된 구조 | cycle/orphan·containment·stable ID; 통합 partition은 AT-62~65 |
| AT-23 | graph/circular/force와 Sankey DAG/cyclic/edge 경계 | deterministic seed, node/link lineage·유량/폭·cycle routing·tooltip/adjacency |
| AT-24 | native histogram/KDE contour의 saddle/hole/disconnected/empty | 선택한 estimator/bin/threshold 계약과 독립 수치·topology oracle 일치 |
| AT-25 | calendar 윤년/연말/DST/weekStart/누락날짜 | 날짜→cell mapping과 month boundary, timezone/aggregation 정확 |
| AT-26 | native chart capability와 조합 recipe 전수 | GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지 |
| AT-27 | Pyramid/OHLC/waterfall/table/sparkline와 reference-band 조합 | role별 의미·hit·정렬, KPI/Gauge 전용 개발 제외, 별도 Bullet facade0 |
| AT-28 | trail/polar/radar/rose/streamgraph/violin native variants | width/area/angle/baseline/bandwidth의 자체 의미·수식·missing/negative/zero 계약 |
| AT-29 | 자체 projection API와 native-supported projection/planar/inset | 수학 reference 및 forward/inverse/fit/clip 검증; Flint preset parity 아님 |
| AT-30 | GeoJSON/TopoJSON hole/dateline/pole/geometrycollection/null | ring/feature identity·clipping·join 정확; NaN path와 hidden-backside hit 없음 |
| AT-31 | custom geography levels와 region join, county/stateLOD | 중복/미매칭 정책, LOD hysteresis, 선택·annotation rebase, asset hash 보존 |
| AT-32 | geo pan/zoom/rotate/region fit/reset/resize/tween | native camera/viewport 왕복·anchor·dateline·clipped inverse 정확 |
| AT-33 | 모든 geometry와 legend/axis/header/title hit at DPR1/2/3 | CSS좌표 기준 same semantic target, clip/occlusion/stroke tolerance와 provenance 정확 |
| AT-34 | animation frame hit와 overlapping enter/exit/crossfade | 현재 보이는 geometry 선택, semantic key 중복 이벤트 없음 |
| AT-35 | native interaction command와 gesture/options/reset 충돌 | 자체 상태·event·화면 계약 일치, 실제 pointer/touch/keyboard; Flint preset 이름 불필요 |
| AT-36 | brushx/y/angular/lasso/log/time/category의 down→move→cancel/up | domain invert/0-2π crossing/빈선택·capture정리; commit1회 또는 cancel1회 |
| AT-37 | native parameter/selection bind/empty/toggle/nearest/resolve | 자체 의미와 선언된 option 계약 정확; legacy/new 외부 selection 번역 제외 |
| AT-38 | linked brush/filter/legend/reorder/controls/contextmenu | scope·order·focus 보존, origin loop 없음, 삭제된 data/child 선택 reconciliation |
| AT-39 | native update commands와 preview/commit/cancel/reset | 불변 baseline·결정적 overlay·도메인 갱신; 외부7ops 특례 복제 없음 |
| AT-40 | programmatic/user 입력의 native event 순서 | origin/phase/revision 명확, 중복 commit0, preview취소와 async settlement 정확 |
| AT-41 | mount/update/asset/resize 중 cancel/destroy/reentry | stale 결과 덮어쓰기0, 중복destroy안전, listener/timer/DOM leak0 |
| AT-42 | t=0,.25,.5,.75,1와 duration0의 deterministic transition | endpoint 동일, 색/형상/guide/kernel sample 수치와 topology 올바름 |
| AT-43 | play/pause/seek/reverse/rate/repeat/interrupt | 현재 frame에서 이어짐, finished상태정확, virtualclock 재현 |
| AT-44 | logscale/polar/geo/layout/data 동시변경 | transformed-space·camera kernel 정확, 잘못된 topology morph와 flicker 없음 |
| AT-45 | animation envelope 저장→offline 새프로세스 replay | endpoint/asset/font/kernel 버전고정, same time same frame, reduced motion 보존 |
| AT-53 | keyboard focus·screenreader표·tooltip·reducedmotion | 차트 정보와 actionable targets 접근 가능, hidden/filter 상태 일치, focus 복구 |
| AT-54 | SVG/Canvas/PNG/PDF·frame export 비교 | 같은 semantic/geometry, asset embedding/font/clip 정확, vector/raster역할명시 |
| AT-55 | 저장된 interacted chart/geo/animation offline 재개 | 필수자원 동봉, 상태/선택/viewport 복원, functions/network숨은의존없음 |
| AT-56 | sizeclass별 startup/update/hit/frame/memory benchmark | 사전에고정한SLO통과, 장비·size·P50/P95 기록, 반복mount/dispose 안정 |
| AT-57 | npm pack clean consumer, SSR/browser/Node/types | 소스checkout없는환경에서실행, optionaldeps 격리, schema/types/runtime일치 |
| AT-58 | catalog/contracts/types/examples/docs/LLM/MCP 산출물 검사 | new API계약누락0, executableexamples통과, planned와current지원구분 |
| AT-59 | active GGA/USR requirement→work→test→evidence | active orphan0·미완료0; reference-only 외부2,279행은 gate 분모 제외 |
| AT-60 | 모든 실패 diff 독립검토와 성공 stratified sample review | 통계/폰트/레이아웃/입력원인별판정, baseline대량재생성으로실패덮음없음 |
| AT-61 | 동일 candidate tarball을CI·설치·출판·docs에서hash대조 | 필수CI통과+공개artifact동일; native capability evidence 버전 동봉 |
| AT-62 | 동일 hierarchy에서 Icicle/Sunburst 생성 | 같은 normalized partition/node ID, value·순서·선택 동등 |
| AT-63 | partition 수치 fixture와 zero/internal value/forest/cycle | 독립 기대 interval·합·containment; 잘못된 구조 명시 오류 |
| AT-64 | partition orientation/padding/rootVisible/deep tree/작은 wedge | finite geometry·clip·label·hit 일치; radial area 의미 명시 |
| AT-65 | partition focus/filter/breadcrumb/keyboard/coordinate morph | 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion |
| AT-70 | kNN directed/union/mutual와 ties·duplicate points | 수작업 fixture edge 일치, stable ID tie, 0거리 edge 유지 |
| AT-71 | radius/similarity/metric/preprocessing 경계 | inclusive radius, cosine zero/Jaccard empty/geo units/null 정책과 provenance |
| AT-72 | MST/forest/group/sequence rule | 독립 Kruskal 결과, component 수·비용, group 경계·lag·edge budget |
| AT-73 | exact accelerator와 opt-in approximate search | brute-force exact 일치, approximate seed/recall 기록, 무음 sampling0 |
| AT-74 | data revise/k change/layout drag/resize와 graph selection | topology invalidation 이유 정확, node/edge ID 및 observed/inferred 보존 |
| AT-75 | 네 bundling 방법 공통 입력 불변성 | graph/adjacency/node position 불변, edge ID/count/direction/weight·endpoint 보존 |
| AT-76 | HEB hierarchy mapping/LCA/strength0·1/누락 endpoint | independent hierarchy path oracle, 직선 endpoint, missing mapping 진단 |
| AT-77 | FDEB compatibility/subdivision/schedule/zero·opposite edges | paper reference numeric oracle, deterministic double buffer, finite 고정 endpoint |
| AT-78 | KDE grid/gradient/endpoint pin/direction/resample | density reference와 tolerance, vector route 보존, grid 밖 NaN0 |
| AT-79 | Edge-path connected/disconnected/directed/stretch | route provenance 실제 graph path, maxStretch 준수, fallback·locking 결정적 |
| AT-80 | bundle 겹침/선택/unbundle/tooltip/keyboard | candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility |
| AT-81 | bundle animate/interrupt/seek/revise/geo date line | endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0 |
| AT-82 | bundling sizeclass/abort/worker/cache/export | stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등 |
| AT-83 | Pyramid 공개 명칭과 단계형 geometry | 이전 Funnel 의미·order·gap·value 보존; 외부 alias 구현은 의무 아님 |
| AT-84 | Marginal/Bullet/Combo action AST와 composition fixtures | 전용 constructor0, 공통 layout/scale/role 사용, 같은 frame Y 공유 |
| AT-85 | 같은 frame에 두 Y scale/guide·숨긴축·mirror axis | 모두 정책 오류, 독립 scale 숨김·overlaid frame 우회 금지 |
| AT-86 | 독립 facet/concat panels·y2 range·polar/geo | 합법적 별도 frame/범위 endpoint 오탐0; native frame 의미로 단일 Y 검증 |
| AT-87 | KPI/Gauge 전용 API 제외와 docs/LLM scope | 필수개발·새 facade로 재유입0; 외부 입력 adapter admission은 의무 아님 |
| AT-88 | native 정책과 외부 참고 원장의 분리 | native fixture에 단일Y·조합·제외 정책 적용; 외부 reference-only를 pass/필수로 집계하지 않음 |
| AT-89 | 새 resource/action save/load/type/schema/clean consumer | JSON codec·refs·version·lineage 왕복, source checkout/DOM 숨은 의존0 |
| AT-90 | 신규 domain docs/agent packet/recipes/option presets | planned/current 구분, parameter defaults/version 고정, 실행 예제와 negative cases |
| AT-91 | native completion manifest와 기존 CI | 필수 GGA/USR qualification과 공개artifact 일치; 외부 호환성·번역 미요구 |
| AT-92 | core/API/event/defaults/dependency/release gate 독립성 | Flint·번역기 import, upstream 변경·adapter·corpus parity의 필수 의존0; native 기능 축소0 |


## 16. 최종 완료 조건과 실제 구현 착수 순서

최종 완료는 다음 조건을 **모두** 만족할 때다.

1. GGA-01–10과 USR-01–22 중 USR-03/04를 제외한 자체 계약이 구현되고 적용되는 수치·geometry·상태·시간·오류·조합 시험이 통과한다.
2. 외부 adapter/upstream 변경/Flint 정합성/번역기/코퍼스 fidelity를 선행 조건으로 두지 않는다. 외부2,279행은 참고로 보존하며 활성30행과 분리한다. native 기능의 누락은 남김없이 추적한다.
3. geo는 채택한 native projection과 planar identity, geometry/join/clip/LOD/camera/export/hit/animation을 포함한다. interaction은 실제 입력과 상태·표현·event를, animation은 중간 프레임과 중단·복원까지 확인한다.
4. normal recipe에 private state, raw graphics escape, 원본 screenshot, 외부 렌더러 fallback, row별 수동 geometry가 없다. 새 facade의 trace는 의미 있는 하위 액션으로 설명된다.
5. 저장·로드·edit·resize·data revise·theme change 뒤 의미와 디자인이 보존되고, 모든 지원 renderer와 설치된 npm package에서 동작한다. 접근성·자원 정리·고정된 성능 SLO도 통과한다.
6. 코드·타입·계약·human docs·LLM/MCP 문서·capability manifest가 같은 지원 상태를 말한다. 릴리스에는 동일 candidate tarball의 CI·공개 artifact hash와 native capability qualification manifest를 함께 확인한다.

구현 첫 변경은 `createMap`이나 `animate`처럼 큰 facade 하나를 만드는 것이 아니다. **WP-00 기준 고정 → WP-02 identity의 재현 실패를 native 계약으로 해결 → WP-03 상태/schema 합의 → WP-04 compound path**가 공통 선행 작업이다. WP-01/15/16/17의 외부 통합·번역 작업은 철회되었으며 선행 조건이 아니다. 그 뒤 데이터/레이아웃/구조형 차트/geo/interaction/animation을 작업 패키지 의존 관계에 따라 완성한다.

이 순서가 중요한 이유는 하나다. identity 없이 animation을 만들면 data revision에서 다시 고쳐야 하고, compound path 없이 geo를 만들면 holes와 hit/export를 다시 고쳐야 하며, 자체 계약과 독립 oracle가 없으면 같은 구현 오류를 테스트가 반복할 수 있다. 이번 목표는 검증 가능한 native 표현력을 늘리는 것이다. 조사 원장과 실패 사례를 구현의 입력으로 유지해야 한다.

추가 완료 게이트: Icicle/Sunburst 공통 partition, 여섯 graph inference rule, 네 bundling method가 모두 구현·검증되어야 한다. 조합 표현의 전용 API는 추가하지 않고 한 frame의 Y scale/guide 제약을 모든 생성·수정·복원 경로에서 지킨다. native 계약의 미완료가 남아 있으면 완료가 아니다. 최종 주장은 `ggaction-native-2026-10-27` capability 충족이며 외부 호환성·번역 주장이 아니다.

## 17. 산출물, 재현, 보고서의 사용 범위

이 보고서의 본문은 현재 기능과 구현 방침을 사람이 읽는 문서다. 부록 A는 298개 액션 전수 목록, 부록 B·C는 Flint의 154개 template 및 공개 타입 필드 전수 자료다. JSON/CSV는 원본 pointer와 옵션·출처를 잃지 않기 위한 구현 입력이다. 문서만 읽고 수작업으로 몇 개 사례를 골라 처리하지 말고 원장을 fixture generator와 CI에 연결한다.

| 산출물 | 역할 |
|---|---|
| [REPORT.ko.md](REPORT.ko.md) / [REPORT.ko.html](REPORT.ko.html) | 통합 보고서와 오프라인 목차·검색 읽기 화면 |
| [implementation-plan.json](evidence/implementation-plan.json) | 22개 활성 작업, 의존성·코드 접점·79개 인수 시험군 |
| [requirements-traceability.csv](evidence/requirements-traceability.csv) | native/사용자30행 + 후속2행 + 외부참고2,279행 = 2,311행; required와 scope disposition 구분 |
| [ggaction-inventory.json](evidence/ggaction-inventory.json) | 현재 298개 액션의 옵션·타입·소스·계약 위치 |
| [flint-requirements.json](evidence/flint-requirements.json) | chart/property/preset/theme/public field/native behavior 요구 |
| [corpus-original-crosswalk.csv](evidence/corpus-original-crosswalk.csv) | 원본 1,981개 전체와 번역 존재/원본 변경/스키마/현재 probe |
| [corpus-all-files-qualified.csv](evidence/corpus-all-files-qualified.csv) | 추적 JSON 전체 25,024개 분류와 schema 상태 |
| [corpus-embedded-specs.json](evidence/corpus-embedded-specs.json) | 파일 내부 30개 중첩 차트의 pointer와 원문 |
| [corpus-source-deltas.json](evidence/corpus-source-deltas.json) | 340개 구조 차이의 before/after/hash |
| [translations-programs.json](evidence/translations-programs.json) | 10,174개 프로그램의 AST·작성 방식 |
| [README.ko.md](README.ko.md) | 재현 순서, 도구 환경, 파일 안내 |

이번에 수행한 일은 소스 고정, 인벤토리·스키마 검사, 핵심 runtime probe, 요구사항 분석, 구현·검증 명세 작성이다. **ggaction 새 기능 구현·소스 수정·PR 생성·릴리스는 수행하지 않았다.** 현재 source-family 전체 fidelity가 검증됐다고 주장하지 않는다. 이 보고서에 제시한 제안 API와 인수 시험은 다음 구현 작업의 계약 초안이다.


개정 명세는 부록 F, [scope-policy.json](evidence/scope-policy.json), [target-chart-mapping.json](evidence/target-chart-mapping.json), [corpus-scope-screening-summary.json](evidence/corpus-scope-screening-summary.json), [revision-oracle-fixtures.json](evidence/revision-oracle-fixtures.json)을 함께 읽는다.

[자체 capability 원장](evidence/native-capability-requirements.json)과 [철회된 작업·시험 기록](evidence/withdrawn-flint-plan.json)이 최신 목표를 정의한다. 과거 조사 파일은 구현 의무가 아니다.



## 부록 A. 공개 action 298개 전수 목록

옵션/타입/소스 위치는 companion JSON/CSV에서 같은 이름으로 조회한다. 아래는 domain별 전수 명단이며 서로 중복 집계하지 않았다.

### core (47)

- `createCanvas` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/canvas/actions.js#L135); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L5)
- `editCanvas` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/canvas/actions.js#L103); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L73)
- `fitCanvas` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/canvas/fitting.js#L234); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L115)
- `applyTextMetrics` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/textMetrics/index.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L153)
- `removeTextMetrics` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/textMetrics/index.js#L44); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L174)
- `applyTheme` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/theme/actions.js#L31); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L190)
- `removeTheme` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/theme/actions.js#L73); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L261)
- `createData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/create.js#L13); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L289)
- `reviseData` — user-facing; Immutable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/revise.js#L61); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L331)
- `removeData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/resources/remove.js#L165); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L352)
- `removeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/resources/remove.js#L168); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L388)
- `removeCoordinate` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/resources/remove.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L412)
- `bindMarkData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/derived.js#L165); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L435)
- `filterData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/filter.js#L85); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L467)
- `createDensityData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/density.js#L47); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L961)
- `createRegressionData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/regression.js#L46); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L893)
- `createRegressionStatisticsData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/regressionStatistics.js#L44); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1468)
- `createWindowData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/window.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1529)
- `createTimeUnitData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/timeUnit.js#L19); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1416)
- `createBin2DData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/bin2d.js#L129); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1588)
- `editBin2DData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/bin2d.js#L170); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1652)
- `editDerivedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L380); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1083)
- `editFilteredData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L455); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1145)
- `editTimeUnitData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L476); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1259)
- `editWindowData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L482); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1275)
- `editDensityData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L487); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1291)
- `editRegressionData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L496); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1322)
- `editRegressionStatisticsData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/regressionStatistics.js#L60); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1506)
- `createCoordinate` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/coordinates/actions.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1700)
- `editCoordinate` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/coordinates/edit.js#L30); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1726)
- `createScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/create.js#L81); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1783)
- `editScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/edit.js#L159); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1871)
- `editXScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L11); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1993)
- `editYScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L19); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2007)
- `editXOffsetScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/offset.js#L42); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2021)
- `editYOffsetScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/offset.js#L43); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2068)
- `editParallelScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/parallel.js#L48); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2090)
- `editThetaScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2112)
- `editRScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L34); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2126)
- `editColorScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L41); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2140)
- `editStrokeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L48); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2154)
- `editSizeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L56); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2174)
- `editOpacityScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L63); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2195)
- `editShapeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L69); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2209)
- `editStrokeWidthScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L73); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2223)
- `editStrokeDashScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L80); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2237)
- `createDerivedData` — user-facing; Immutable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/derived.js#L38); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1049)

### statistics (45)

- `createSummaryData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/summary.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L511)
- `createBinData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/bin.js#L21); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L568)
- `createLookupData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/lookup.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L604)
- `createFlattenData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/flatten.js#L11); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L642)
- `createFoldData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/fold.js#L16); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L677)
- `createComputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/computed.js#L16); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L706)
- `createNormalizedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/normalize.js#L19); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L749)
- `createSortedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/sort.js#L13); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2258)
- `createCompleteData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/complete.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L784)
- `createImputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/impute.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L824)
- `createStackData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/stack.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L859)
- `editComputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L452); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1130)
- `editLookupData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L461); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1161)
- `editFlattenData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L458); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1185)
- `editFoldData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L464); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1212)
- `editSummaryData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L467); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1227)
- `editBinData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L470); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1243)
- `editStackData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L493); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1307)
- `editIntervalData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L505); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1338)
- `editECDFData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L510); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1354)
- `editNormalizedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L515); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1369)
- `editSortedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L502); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2277)
- `editCompleteData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L521); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1385)
- `editImputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L526); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1401)
- `createIntervalData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/interval.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L34)
- `createECDFData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/ecdf.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L5)
- `createRegression` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/create.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L307)
- `editRegression` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/edit.js#L253); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L371)
- `createErrorBar` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBars/create.js#L255); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L77)
- `editErrorBar` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBars/edit.js#L399); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L140)
- `createErrorBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBands/create.js#L169); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L183)
- `editErrorBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBands/edit.js#L314); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L253)
- `editErrorBandBoundary` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBands/edit.js#L476); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L286)
- `createBoxPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/boxPlots/create.js#L23); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITE_MARKS.md#L9)
- `editBoxPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/boxPlots/edit.js#L201); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITE_MARKS.md#L123)
- `createGradientPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/gradientPlots/create.js#L22); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRADIENT_PLOTS.md#L37)
- `editGradientPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/gradientPlots/edit.js#L114); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRADIENT_PLOTS.md#L114)
- `createViolinPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/violinPlots/create.js#L135); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/VIOLIN_PLOTS.md#L7)
- `editViolinPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/violinPlots/edit.js#L60); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/VIOLIN_PLOTS.md#L65)
- `createRegressionBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L75); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L405)
- `editRegressionBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L123); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L474)
- `createRegressionLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L187); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L443)
- `editRegressionLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L158); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L494)
- `createDensityPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/density.js#L17); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L604)
- `createHorizonPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/horizon.js#L44); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L647)

### marks (35)

- `createPointMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/create.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L149)
- `createTickMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/tick/actions.js#L96); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L237)
- `createStatisticalReference` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/references.js#L773); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L843)
- `createReferenceLine` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/references.js#L752); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L890)
- `createReferenceBand` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/references.js#L762); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L964)
- `createMarkLabels` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L351); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L996)
- `editMarkLabelSelection` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/selection.js#L43); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1057)
- `editMarkLabelPlacement` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/layout.js#L357); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1089)
- `removeMarkLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/removal.js#L143); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1137)
- `createAnnotation` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L269); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1171)
- `createTextMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L130); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1210)
- `editTextMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L484); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1261)
- `layoutLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/layout.js#L326); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1285)
- `removeLabelLayout` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/layout.js#L417); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1324)
- `editPointMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/edit.js#L25); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L202)
- `editTickMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/tick/actions.js#L148); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L270)
- `jitterPoints` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/jitter.js#L32); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L291)
- `removeJitter` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/jitter.js#L50); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L333)
- `packPoints` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/packing.js#L32); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L350)
- `removePointPacking` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/packing.js#L47); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L382)
- `removeMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/remove.js#L218); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L399)
- `createLineMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/line/actions.js#L99); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L422)
- `editLineMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/line/actions.js#L286); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L503)
- `createBarMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/bar/create.js#L25); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L535)
- `editBarMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/bar/edit.js#L26); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L565)
- `createAreaMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/area/actions.js#L63); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L603)
- `createRuleMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rule/actions.js#L98); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L730)
- `editRuleMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rule/actions.js#L156); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L761)
- `editAreaMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/area/actions.js#L244); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L647)
- `createArcMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/arc/actions.js#L95); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L681)
- `editArcMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/arc/actions.js#L250); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L709)
- `createRectMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rect/actions.js#L56); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L785)
- `editRectMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rect/actions.js#L162); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L821)
- `createOverlay` — user-facing; Stable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/overlays/index.js#L117); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/OVERLAYS.md#L3)
- `editOverlay` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/overlays/index.js#L145); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/OVERLAYS.md#L26)

### encodings (39)

- `encodeX` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L178); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L187)
- `encodeY` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L188); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L284)
- `encodeChannels` — advanced; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/channels.js#L404); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L127)
- `encodeX2` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L563)
- `encodeColor` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/color/index.js#L54); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1167)
- `encodeStrokeDash` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/strokeDash.js#L65); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1310)
- `encodeStroke` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/stroke.js#L106); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L606)
- `encodeStrokeWidth` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ruleAppearance.js#L25); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L652)
- `encodeSize` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L154); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1366)
- `encodeShape` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L181); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1416)
- `encodeAngle` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/angle.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1443)
- `encodeOpacity` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L232); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1475)
- `encodeRadius` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L87); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1514)
- `encodeTheta` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L198); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1547)
- `encodeR` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L208); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1585)
- `encodePointRadius` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L120); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1622)
- `removePointRadius` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L130); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1641)
- `encodeXOffset` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/offset.js#L118); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L468)
- `encodeYOffset` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/offset.js#L119); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L511)
- `encodeY2` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L187); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L534)
- `encodeYRange` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L294); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L694)
- `encodeXRange` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L295); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L726)
- `encodeGroup` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L297); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L749)
- `encodePathOrder` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/pathOrder.js#L77); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L786)
- `encodeParallelCoordinates` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/parallel.js#L24); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L817)
- `removePathOrder` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/pathOrder.js#L103); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L854)
- `orderCategories` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/categoryOrder/index.js#L82); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L874)
- `removeCategoryOrder` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/categoryOrder/index.js#L96); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L918)
- `removeEncoding` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/remove.js#L208); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L89)
- `encodeText` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/text.js#L34); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1717)
- `encodeDx` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/text.js#L116); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1823)
- `encodeDy` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/text.js#L117); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1846)
- `encodeHistogram` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/histogram.js#L9); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L938)
- `encodeDensity` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/density.js#L117); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L983)
- `editDensity` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/density.js#L262); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1043)
- `encodeHorizon` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/horizon.js#L280); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1092)
- `editHorizon` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/horizon.js#L112); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1141)
- `encodeBarWidth` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/barWidth.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1661)
- `layoutSeries` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/seriesLayout.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1771)

### axes (55)

- `createParallelAxes` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L50); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L246)
- `createParallelAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L86); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L261)
- `editParallelAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L87); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L276)
- `removeParallelAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L89); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L291)
- `removeParallelAxes` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L101); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L306)
- `createAxes` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axes.js#L198); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L382)
- `createXAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axis.js#L191); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L800)
- `createYAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axis.js#L192); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L824)
- `createXAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L172); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L846)
- `createYAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L173); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L865)
- `editXAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L132); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L882)
- `editYAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L133); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L900)
- `createXAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L251); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L915)
- `createYAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L251); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L935)
- `editXAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L207); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L954)
- `editYAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L207); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L971)
- `createXAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L543); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L989)
- `createYAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L544); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1016)
- `editXAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L478); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1034)
- `editYAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L479); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1051)
- `createXAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L169); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1069)
- `createYAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L170); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1090)
- `editXAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1108)
- `editYAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L172); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1127)
- `createXAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L425); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1144)
- `createYAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L426); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1165)
- `editXAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L362); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1182)
- `editYAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L363); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1199)
- `editAxes` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axes.js#L332); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1332)
- `editXAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/edit.js#L227); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1218)
- `editYAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/edit.js#L228); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1250)
- `removeXAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L62); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1268)
- `removeYAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L63); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1286)
- `createThetaAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L234); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L494)
- `createRadialAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L235); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L508)
- `editThetaAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L236); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L522)
- `editRadialAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L237); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L536)
- `removeThetaAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L64); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L776)
- `removeRadialAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L65); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L788)
- `createThetaAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L111); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L558)
- `editThetaAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L113); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L678)
- `createRadialAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L112); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L573)
- `editRadialAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L114); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L690)
- `createThetaAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L156); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L588)
- `editThetaAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L158); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L702)
- `createRadialAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L157); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L603)
- `editRadialAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L159); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L714)
- `createThetaAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L229); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L618)
- `editThetaAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L231); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L726)
- `createRadialAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L230); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L633)
- `editRadialAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L232); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L738)
- `createThetaAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L194); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L648)
- `editThetaAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L196); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L750)
- `createRadialAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L195); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L663)
- `editRadialAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L197); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L763)

### grid (11)

- `createGrid` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L255); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L58)
- `createHorizontalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L180); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L152)
- `createVerticalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L181); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L174)
- `editHorizontalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L182); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L193)
- `editVerticalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L183); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L215)
- `editGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L185); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L232)
- `removeGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L307); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L250)
- `createThetaGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L243); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L104)
- `createRadialGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L244); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L116)
- `editThetaGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L245); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L128)
- `editRadialGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L246); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L140)

### legend_and_title (13)

- `createLegend` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/categorical/actions.js#L578); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L54)
- `editLegend` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/edit.js#L953); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L356)
- `editLegendBlock` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/blocks.js#L370); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L438)
- `editLegendLayout` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L515)
- `editLegendLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L29); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L531)
- `editLegendTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L549)
- `editLegendSymbols` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L46); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L565)
- `editLegendBorder` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L52); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L583)
- `createGuides` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/guides.js#L132); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L655)
- `removeLegend` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/remove.js#L75); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L605)
- `createTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/titles/actions.js#L124); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L699)
- `editTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L471); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L762)
- `removeTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/titles/actions.js#L194); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L792)

### mark-selection (7)

- `filterMarks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/filter.js#L302); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L87)
- `removeMarkFilter` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/filter.js#L282); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L152)
- `selectMarks` — advanced; Stable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L271); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L172)
- `editMarkSelection` — advanced; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L283); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L214)
- `removeMarkHighlight` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L316); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L242)
- `removeMarkSelection` — advanced; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L340); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L263)
- `highlightMarks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L624); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L284)

### primitives (3)

- `editSemantic` — primitive; Primitive; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/primitives/semantic.js#L34); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/PRIMITIVES.md#L10)
- `createGraphics` — primitive; Primitive; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/primitives/createGraphics.js#L104); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/PRIMITIVES.md#L70)
- `editGraphics` — primitive; Primitive; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/primitives/editGraphics.js#L168); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/PRIMITIVES.md#L129)

### composition (15)

- `editCompositionLayout` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L370)
- `replaceCompositionChild` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L247); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L470)
- `insertCompositionChild` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L288); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L491)
- `removeCompositionChild` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L328); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L511)
- `reorderCompositionChildren` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L355); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L529)
- `facet` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L352); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L92)
- `facetGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L584); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L196)
- `repeatCharts` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L553); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L226)
- `editFacetSource` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L712); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L260)
- `editFacetHeaders` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L587); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L286)
- `editFacetScales` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L607); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L405)
- `editFacetGuides` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L642); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L440)
- `createLayerPlot` — user-facing; Structural create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/layer.js#L6); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L718)
- `createAdjacentPlot` — user-facing; Structural create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/adjacent.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L620)
- `editCompositionScales` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L385); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L658)

### charts (28)

- `createScatterPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/scatter.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L58)
- `createTextPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/text.js#L12); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L404)
- `createDotPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L265); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L88)
- `createLollipopPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L296); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L105)
- `createDumbbellPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L340); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L122)
- `editEndpointPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L491); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L143)
- `createECDFPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/ecdf.js#L62); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L21)
- `editECDFPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/ecdf.js#L148); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L49)
- `createIntervalPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/interval-regression.js#L85); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L166)
- `createRegressionPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/interval-regression.js#L142); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L199)
- `createLinePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/line.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L112)
- `createPolarScatterPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/polar.js#L42); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L227)
- `createPolarLinePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/polar.js#L92); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L254)
- `createRadarPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radar.js#L226); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L279)
- `editRadarPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radar.js#L340); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L318)
- `createRugPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/rug-strip.js#L82); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L352)
- `createStripPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/rug-strip.js#L209); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L382)
- `createBeeswarmPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/beeswarm.js#L32); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L412)
- `createRaincloudPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/raincloud.js#L408); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L439)
- `editRaincloudPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/raincloud.js#L417); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L474)
- `createBarPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/bar.js#L40); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L165)
- `createHistogram` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/histogram.js#L26); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L228)
- `createHeatmap` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/heatmap.js#L142); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L280)
- `createParallelCoordinates` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/parallel.js#L56); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L349)
- `createPiePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/pie.js#L4); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L561)
- `createRosePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radial.js#L67); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L507)
- `createRadialBarPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radial.js#L70); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L534)
- `createAreaPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/area.js#L14); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L690)



## 부록 B. 모든 backend-template의 channels와 registry property

이 표는 runtime registry의 전체 등록을 그대로 나열한다. property의 default/min/max/options/동적 applicability/encoding action은 JSON에 전부 들어 있다. chartProperties의 실제 코드 접근은 `flint-property-accesses.json`을 함께 읽어야 한다. 같은 이름의 chart라도 backend마다 옵션이 다르며 합집합을 지원해야 “모든 Flint 기능” 목표를 충족한다.

| backend / chart | 채널 | registry properties |
|---|---|---|
| VL / Scatter Plot | x, y, color, size, shape, detail, opacity, column, row | opacity, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Marginal Plot | x, y, color, size, shape, opacity | marginal, opacity, stackMode, bandwidth, binCount, whiskerMethod, showOutliers, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Regression | x, y, size, color, column, row | regressionMethod, polyOrder, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Connected Scatter Plot | x, y, order, color, detail, column, row | independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Ranged Dot Plot | x, y, color | logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Strip Plot | x, y, color, size, column, row | stepWidth, pointSize, opacity, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Bar Chart | x, y, color, opacity, column, row | cornerRadius, independentYAxis, xAxisType, yAxisType, showValueLabels |
| VL / Grouped Bar Chart | x, y, group, color, column, row | dodge, independentYAxis, showValueLabels |
| VL / Stacked Bar Chart | x, y, color, column, row | stackMode, independentYAxis, showValueLabels |
| VL / Lollipop Chart | x, y, color, column, row | dotSize, independentYAxis, xAxisType, yAxisType, showValueLabels |
| VL / Waterfall Chart | x, y, color, column, row | cornerRadius, totals, showValueLabels, independentYAxis |
| VL / Gantt Chart | y, x, x2, color, detail, column, row | taskHeight, cornerRadius, intervalLabels, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Bullet Chart | y, x, goal, color, column, row | independentYAxis |
| VL / Histogram | x, color, column, row | binCount, independentYAxis |
| VL / Density Plot | x, color, column, row | bandwidth, opacity, stackMode, independentYAxis |
| VL / Ridgeline Plot | x, y, color | overlap, interpolate, opacity, order, tailCut, colorBy, perspective, skew, tilt, markAt, valueMax, bandwidth |
| VL / ECDF Plot | x, color, detail, column, row | showPoints, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Violin Plot | x, y, color, row | bandwidth, showPoints, showMedian, showContour, widths, medianWidth, independentYAxis |
| VL / Boxplot | x, y, color, opacity, column, row | whiskerMethod, showPoints, showOutliers, dodge, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Pyramid Chart | x, y, color | showValueLabels |
| VL / Candlestick Chart | x, open, high, low, close, column, row | independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Line Chart | x, y, color, strokeDash, detail, opacity, column, row | interpolate, showPoints, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y, xAxisType, yAxisType |
| VL / Sparkline | x, y, color, detail, row, column | interpolate, baseline, trendWidth, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Bump Chart | x, y, color, detail, column, row | interpolate, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Slope Chart | x, y, color, detail, column, row | showText, showSeriesInLabel, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode, independentYAxis, xAxisType, yAxisType |
| VL / Streamgraph | x, y, color, column, row | interpolate, independentYAxis |
| VL / Range Area Chart | x, y, y2, color, column, row | interpolate, opacity, independentYAxis |
| VL / Pie Chart | size, color, column, row | innerRadius, sortSlices, independentYAxis, showValueLabels |
| VL / Donut Chart | size, color, column, row | innerRadius, sortSlices, independentYAxis, showValueLabels |
| VL / Rose Chart | x, y, color, column, row | padAngle, alignment, sortSlices, independentYAxis, showValueLabels |
| VL / Radar Chart | x, y, color, column, row | filled, fillOpacity, strokeWidth, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Heatmap | x, y, color, column, row | showValueLabels, independentYAxis, xAxisType, yAxisType |
| VL / Calendar Heatmap | x, color | cornerRadius |
| VL / Bar Table | y, x, color, column, row | maxRows, showPercent, independentYAxis |
| VL / KPI Card | metric, value, goal | layout, style, behindThreshold |
| VL / Table |  |  |
| VL / Map | longitude, latitude, color, size, opacity | region, projection, projectionCenter |
| VL / Choropleth | id, color, detail | region, level, projection, projectionCenter |
| EC / Scatter Plot | x, y, color, size, opacity, column, row | opacity |
| EC / Regression | x, y, size, color, column, row | regressionMethod, polyOrder |
| EC / Connected Scatter Plot | x, y, order, color, detail, column, row |  |
| EC / Ranged Dot Plot | x, y, color |  |
| EC / Boxplot | x, y, color, opacity, column, row | whiskerMethod, showPoints, showOutliers, dodge |
| EC / Strip Plot | x, y, color, size, column, row |  |
| EC / Bar Chart | x, y, color, opacity, column, row | cornerRadius |
| EC / Grouped Bar Chart | x, y, group, color, column, row | dodge |
| EC / Stacked Bar Chart | x, y, color, column, row | stackMode |
| EC / Lollipop Chart | x, y, color, column, row | dotSize |
| EC / Pyramid Chart | x, y, color |  |
| EC / Heatmap | x, y, color, column, row |  |
| EC / Calendar Heatmap | x, color |  |
| EC / Line Chart | x, y, color, strokeDash, opacity, column, row | interpolate, showPoints |
| EC / Bump Chart | x, y, color, detail, column, row |  |
| EC / Slope Chart | x, y, color, detail, column, row |  |
| EC / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode |
| EC / Streamgraph | x, y, color, column, row |  |
| EC / Range Area Chart | x, y, y2, color, column, row |  |
| EC / Pie Chart | size, color, column, row | innerRadius, cornerRadius, sortSlices, labelType |
| EC / Funnel Chart | y, size | sort, orient, gap |
| EC / Treemap | color, size, detail | breadcrumb |
| EC / Sunburst Chart | color, size, detail, group | innerRadius, labelRotate |
| EC / Tree | color, detail, size | orient |
| EC / Histogram | x, color, column, row | binCount |
| EC / Density Plot | x, color, column, row | bandwidth |
| EC / ECDF Plot | x, color, detail, column, row | showPoints |
| EC / Parallel Coordinates | color, detail |  |
| EC / Candlestick Chart | x, open, high, low, close, column, row | showMA, maWindow |
| EC / Waterfall Chart | x, y, color, column, row |  |
| EC / Gantt Chart | y, x, x2, color, detail, column, row | taskHeight, cornerRadius, intervalLabels |
| EC / Bullet Chart | y, x, goal, color, column, row |  |
| EC / Radar Chart | x, y, color, column, row | shape, filled, fillOpacity |
| EC / Rose Chart | x, y, color, column, row | alignment, sortSlices |
| EC / Gauge Chart | size, column | min, max, showProgress |
| EC / Sankey Diagram | x, y, size | orient, nodeWidth, nodeGap |
| EC / Network Graph | x, y, size | layout |
| CJ / Scatter Plot | x, y, color, size, opacity, column, row | opacity |
| CJ / Connected Scatter Plot | x, y, order, color, detail, column, row |  |
| CJ / Bubble Chart | x, y, size, color, opacity, column, row | opacity |
| CJ / Strip Plot | x, y, color, size, column, row | stepWidth, pointSize, opacity |
| CJ / Bar Chart | x, y, color, opacity, column, row | cornerRadius |
| CJ / Grouped Bar Chart | x, y, group, color, column, row | dodge |
| CJ / Stacked Bar Chart | x, y, color, column, row |  |
| CJ / Lollipop Chart | x, y, color, column, row | dotSize |
| CJ / Combo Chart | x, y, column, row | cornerRadius |
| CJ / Histogram | x, color, column, row | binCount |
| CJ / Waterfall Chart | x, y, color, column, row |  |
| CJ / Gantt Chart | y, x, x2, color, column, row | taskHeight, cornerRadius, intervalLabels |
| CJ / Line Chart | x, y, color, opacity, column, row | interpolate |
| CJ / Bump Chart | x, y, color, detail, column, row |  |
| CJ / Slope Chart | x, y, color, detail, column, row |  |
| CJ / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode |
| CJ / Range Area Chart | x, y, y2, color, column, row |  |
| CJ / ECDF Plot | x, color, detail, column, row | showPoints |
| CJ / Pie Chart | size, color, column, row | innerRadius, sortSlices |
| CJ / Doughnut Chart | size, color, column, row | innerRadius, sortSlices |
| CJ / Radar Chart | x, y, color, column, row | filled, fillOpacity |
| CJ / Rose Chart | x, y, color, column, row | alignment, sortSlices |
| PL / Scatter Plot | x, y, color, size, shape, opacity, column, row | opacity |
| PL / Regression | x, y, size, color, column, row | regressionMethod, polyOrder, opacity |
| PL / Connected Scatter Plot | x, y, order, color, detail, column, row |  |
| PL / Ranged Dot Plot | x, y, color |  |
| PL / Strip Plot | x, y, color, size, column, row |  |
| PL / Bar Chart | x, y, color, opacity, column, row | cornerRadius |
| PL / Grouped Bar Chart | x, y, group, color, column, row |  |
| PL / Stacked Bar Chart | x, y, color, column, row | stackMode |
| PL / Lollipop Chart | x, y, color, column, row | dotSize |
| PL / Waterfall Chart | x, y, color, column, row | totals, showTextLabels |
| PL / Pyramid Chart | x, y, color |  |
| PL / Histogram | x, color, column, row | binCount |
| PL / Boxplot | x, y, color, column, row | showPoints, showOutliers |
| PL / Violin Plot | x, y, color, column, row | showBox, showPoints |
| PL / Density Plot | x, color, column, row | bandwidth |
| PL / ECDF Plot | x, color, detail, column, row | showPoints |
| PL / Candlestick Chart | x, open, high, low, close, column, row | showMA, maWindow |
| PL / Density Contour | x, y, column, row | binCount, showPoints |
| PL / Line Chart | x, y, color, strokeDash, opacity, column, row | interpolate, showPoints |
| PL / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode |
| PL / Bump Chart | x, y, color, detail, column, row |  |
| PL / Slope Chart | x, y, color, detail, column, row |  |
| PL / Streamgraph | x, y, color, column, row |  |
| PL / Range Area Chart | x, y, y2, color, column, row | opacity |
| PL / Pie Chart | size, color | sortSlices, labelType |
| PL / Donut Chart | size, color | innerRadius, sortSlices, labelType |
| PL / Radar Chart | x, y, color, column, row | filled, fillOpacity |
| PL / Rose Chart | x, y, color | sortSlices |
| PL / Heatmap | x, y, color, column, row |  |
| PL / Gantt Chart | y, x, x2, color, detail, column, row | taskHeight, cornerRadius, intervalLabels |
| PL / Bullet Chart | y, x, goal, color, column, row |  |
| PL / KPI Card | metric, value, goal | layout |
| PL / Sparkline | x, y, color, detail | baseline, trendWidth |
| PL / Bar Table | y, x, color, column, row | maxRows, showPercent |
| PL / Map | longitude, latitude, color, size, opacity | region, projection, projectionCenter |
| PL / Choropleth | id, color, detail | region |
| PL / Funnel Chart | y, size | sort |
| PL / Gauge Chart | size, column | min, max |
| XL / Bar Chart | x, y, color |  |
| XL / Grouped Bar Chart | x, y, group |  |
| XL / Stacked Bar Chart | x, y, color |  |
| XL / Pyramid Chart | x, y, color |  |
| XL / Line Chart | x, y, color, strokeDash |  |
| XL / Area Chart | x, y, color |  |
| XL / Scatter Plot | x, y, color, size |  |
| XL / Connected Scatter Plot | x, y, order, color, detail |  |
| XL / Pie Chart | color, size, theta |  |
| XL / Donut Chart | color, size, theta |  |
| XL / Histogram | x, color |  |
| XL / Boxplot | x, y, color |  |
| XL / Candlestick Chart | x, open, high, low, close |  |
| XL / Waterfall Chart | x, y, color |  |
| XL / Radar Chart | x, y, color |  |
| XL / Funnel Chart | y, size |  |
| XL / Treemap | color, size, detail |  |
| XL / Sunburst Chart | color, size, group, detail |  |

## 부록 C. 중요한 타입의 모든 직접 선언 필드

타입의 nested field/union/주석/상속·source line은 `flint-api-types.json`에 있다. 아래 필드 이름표를 구현 체크리스트로 쓰되 inherited fields와 implementation-only behavior를 생략해서는 안 된다.

| 타입 / source | 직접 선언 필드 |
|---|---|
| [SemanticAnnotation](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L50-L101) | `semanticType`, `intrinsicDomain`, `unit`, `divergingMidpoint`, `sortOrder`, `colors`, `polarity` |
| [FormatSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L104-L113) | `pattern`, `prefix`, `suffix`, `abbreviate` |
| [DomainConstraint](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L116-L121) | `min`, `max`, `clamp` |
| [TickConstraint](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L124-L131) | `integersOnly`, `exactTicks`, `minStep` |
| [ChartState](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L364-L381) | `chartType`, `selected`, `entries`, `hidden`, `viewport`, `windows`, `categoryOrder`, `annotations`, `filters` |
| [TypeRole](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L69-L83) | `family`, `size`, `weight`, `style`, `case`, `color` |
| [AxisRole](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L85-L121) | `line`, `lineWeight`, `color`, `ticks`, `tickLength`, `tickDirection`, `labelGap`, `placement`, `tickLabels`, `tickDensity`, `suppressWhenValuesPrinted` |
| [ThemeInk](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L138-L266) | `surface`, `text`, `structure`, `series`, `accent` |
| [ThemeType](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L271-L293) | `minSize`, `headline`, `deck`, `axisLabel`, `axisTitle`, `valueLabel`, `keyLabel`, `keyTitle`, `annotation`, `footnote`, `kicker`, `display` |
| [ThemeStructure](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L295-L365) | `axis`, `grid`, `frame`, `baseline` |
| [ThemeMarks](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L367-L533) | `bandFraction`, `group`, `areaEdge`, `barOpacity`, `barMinLength`, `gradient`, `strokeWeight`, `strokeCap`, `strokeJoin`, `interpolation`, `fillOpacity`, `cornerRadius`, `outline`, `sizeRange`, `minSize`, `zOrder`, `separator`, `slice`, `arc`, `tile`, `point`, `connector`, `trailingFill`, `interval`, `summary`, `observations`, `reference`, `redundantEncoding`, `redundantChannels`, `texture` |
| [ThemeLabelFit](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L549-L558) | `minChars`, `turnedLimit`, `gap`, `rowLimit` |
| [ThemeLabels](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L560-L587) | `truncation`, `rowNames`, `flush`, `overflow`, `fit` |
| [ThemeLegend](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L592-L644) | `show`, `placement`, `direction`, `title`, `gradientLength`, `maxSwatches`, `swatch`, `arrangement`, `titlePosition`, `align`, `gaps`, `suppressWhenAxisNames`, `suppressWhenValuesPrinted`, `endValue` |
| [ThemeDataLabels](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L646-L662) | `show`, `placement`, `inkMode`, `anchor`, `fallback`, `minContrast` |
| [ThemeAnnotation](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L664-L715) | `unit`, `axisTitles`, `axisTitlePlacement`, `axisTitleGap`, `unitsInAxisTitle`, `numberFormat`, `pointEmphasis`, `pointLabels`, `statistics` |
| [ThemeFurniture](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L736-L769) | `kind`, `at`, `frame`, `align`, `anchor`, `color`, `width`, `height`, `text`, `type`, `svg`, `src`, `href`, `alt` |
| [ThemeSource](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L775-L805) | `show`, `leadIn`, `leadInWeight`, `leadInStyle`, `leadInCase`, `align`, `frame`, `rule`, `credit`, `gap` |
| [ThemeFacets](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L807-L814) | `header`, `panelFrame`, `axisRepetition`, `spacing`, `preferredColumns`, `sharedScale` |
| [ThemeLayout](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L816-L855) | `density`, `targetWidth`, `titleBlock`, `bandStep`, `bandStepFit` |
| [ThemeGuard](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L858-L869) | `markChannel`, `hasBandedAxis`, `seriesCount`, `categoryCount`, `isPartToWhole`, `isSigned`, `isTemporal`, `isFaceted`, `isSummarised`, `canvasWidth` |
| [ThemeVariant](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L875-L881) | `when`, `then`, `because` |
| [LineGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L894-L907) | `width`, `opacity`, `cap`, `join`, `interpolation`, `wash`, `washOpacity` |
| [PointGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L909-L946) | `presence`, `size`, `vertexSize`, `fill`, `shape`, `opacity`, `ink`, `outlineWidth`, `halo`, `density` |
| [AreaGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L948-L959) | `opacity`, `edge`, `edgeWidth`, `interpolation`, `fill` |
| [BandGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L961-L984) | `fraction`, `group`, `cornerRadius`, `opacity`, `outline`, `outlineWidth`, `outlineInk`, `minLength` |
| [ArcGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L986-L1001) | `cornerRadius`, `gap`, `gapStyle`, `order`, `startAngle`, `hole` |
| [CellGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1003-L1008) | `gap`, `cornerRadius`, `opacity` |
| [ThemeGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1028-L1035) | `line`, `point`, `area`, `band`, `arc`, `cell` |
| [ThemeChartDefaults](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1053-L1055) | `$index` |
| [ThemeCompileDefaults](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1066-L1069) | `baseSize`, `canvasSize` |
| [ThemeInteraction](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1071-L1083) | `tooltipFormat`, `selectionBoundary` |
| [ThemeSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1095-L1122) | `extends`, `id`, `label`, `ink`, `type`, `structure`, `marks`, `labels`, `legend`, `dataLabels`, `annotation`, `furniture`, `source`, `facets`, `layout`, `geometry`, `chartDefaults`, `compileDefaults`, `interaction`, `variants` |
| [ChartEncoding](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L52-L78) | `field`, `type`, `aggregate`, `sortOrder`, `sortBy`, `scheme`, `reverse`, `mid`, `domain`, `bins`, `colors`, `title` |
| [ChartPropertyDef](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L716-L735) |  |
| [EncodingActionDef](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L820-L847) |  |
| [PivotDef](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L938-L986) | `key`, `label`, `transpose`, `permute`, `shift`, `facetBudget`, `transitions` |
| [ChartAssemblyInput](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1290-L1425) | `data`, `semantic_types`, `chart_spec`, `theme_spec`, `interaction_spec`, `options`, `field_display_names` |
| [AssembleOptions](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1469-L1801) | `addTooltips`, `liveLayoutSignal`, `stepPadding`, `elasticity`, `maxStretch`, `maxStretchX`, `maxStretchY`, `facetElasticity`, `minStep`, `maxColorValues`, `minSubplotSize`, `facetFixedPadding`, `facetGap`, `facetGapColumn`, `facetGapRow`, `facetColumns`, `defaultBandSize`, `bandStepFit`, `bandStepFitCapacityX`, `bandStepFitCapacityY`, `labelStep`, `rowNamesAbove`, `canvasFit`, `canvasRefit`, `canvasTreatment`, `themeDecisions`, `minBandStep`, `maxBandSize`, `groupBandFillsLanes`, `baseLabelFontSize`, `minLabelFontSize`, `baseTitleFontSize`, `maintainContinuousAxisRatio`, `continuousMarkCrossSection`, `facetAspectRatioResistance`, `autoFacetWrap`, `targetBandAR`, `cellGrowth`, `bandBalance`, `targetAspect`, `aspectTolerance` |
| [LinkSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/link.ts#L20-L25) | `fields`, `charts` |
| [ChartLink](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/link.ts#L37-L46) | `sends`, `receives`, `gestures`, `notes` |
| [InteractiveRenderer](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L94-L116) | `layout`, `viewports`, `warnings`, `getViewports`, `setViewports`, `getViewportGeometry`, `getInteractionContext`, `getState`, `onChange`, `resize`, `relayout`, `refresh`, `applyUpdate`, `setUpdates`, `clearUpdate`, `destroy` |
| [InteractiveChartSurface](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L155-L191) | `element`, `chartId`, `ready`, `interactions`, `warnings`, `layout`, `getViewportState`, `setViewport`, `dispatch`, `applyUpdate`, `setUpdates`, `clearUpdate`, `getState`, `onChange`, `onInteraction`, `refresh`, `relayout`, `destroy` |
| [FlintChartProps](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/react/index.ts#L86-L136) | `spec`, `backend`, `interactions`, `updates`, `renderer`, `expressionInterpreter`, `background`, `width`, `height`, `fit`, `onChange`, `onInteraction`, `onRender`, `onWarnings`, `onError`, `fallback`, `className`, `style`, `ariaLabel`, `chartId` |

## 부록 D. 재현 명령과 범위

이 보고서의 JSON은 현재 checkout에서 다음 명령으로 다시 생성한다. 최소 runtime은 조사 clone 안의 `.audit-runtime`에만 설치하며 ggaction dependencies나 source를 변경하지 않는다. 일반적인 전체 workspace install이나 전체 test suite를 실행하지 않았다.

```sh
cd study/coverage-expansion-2026-10-27/sources/flint-chart
npm install --prefix .audit-runtime --ignore-scripts --no-audit --no-fund esbuild@0.25.12 typescript@5.6.3 d3-time@3.1.0 d3-time-format@4.1.0 d3-format@3.1.0 @floating-ui/dom@1.7.4
node ../../scripts/flint-inventory.mjs
node ../../scripts/flint-compile-probe.mjs
python3 ../../scripts/flint-requirements.py
```

inventory script는 HEAD가 조사 SHA와 다르면 중단한다. compile probe는 fixture마다 actual input data/encoding metadata를 변환하여 assembler를 호출하지만 렌더러를 실행하지 않는다. 이미 제공한 candidate mapping은 ggaction에 대한 실행 가능한 adapter를 생성하지 않으며, 그 구현과 전체 검증은 위 단계의 별도 산출물이다.


## 부록 E. 신규 API 계약 초안과 이름 정리

이 부록은 **신규 구현의 권장 계약 초안**이다. 현재 패키지에는 아래 API가 제공되지 않는다. 앞의 조사 장에서 `createGeoShape`, `layoutFlow`, `createFlowLayout`처럼 방향을 설명하며 사용한 예시 이름은 아래 명칭으로 통일하는 것을 권장한다. 구현 시 실제 action catalog와 저장소 계약 검토에서 최종 확정한다. 현재 이미 있는 API의 이름·타입은 부록 A가 우선이며, 기존과 충돌하는 새 이름을 등록하지 않는다.

### E.1 공통 규칙

모든 authoring action은 immutable `ChartProgram`을 반환한다. `id`는 owner scope 안에서 고유하고, 기존 lifecycle 규칙에 따라 create/edit/remove를 구분한다. `data`는 명시 dataset resource, `coordinate`는 coordinate resource, `projection`은 projection resource, `layout`은 layout resource를 참조한다. 문자열 하나가 여러 역할의 ID로 해석되지 않게 typed reference를 사용한다. composition target은 기존 scoped target 규칙을 따른다.

새 resource 입력은 clone/freeze하고 persistence codec이 무손실로 복원하는 값만 저장한다. callback은 host registry에 이름으로 연결하며 함수·외부 mutable Date 참조·DOM·network handle을 semantic state에 넣지 않는다. 시간 값은 자체 codec의 tagged epoch/단위 계약을 따르고 caller의 mutable Date를 그대로 보관하지 않는다. 현행 ggaction이 허용하는 scalar/null/missing 표현은 기존 codec과 일치시킨다. geographic 입력 단위, time input unit, screen px, angle radian/degree는 필드 이름·타입에서 구분한다. 모든 finite/nonnegative/range 제약은 materializer 전에 validator에서 적용한다.

현행 persistence codec은 `undefined`, `NaN`, `Infinity`, `-0`, `bigint` 같은 값을 tag로 보존한다. 새 action plan/snapshot도 일반 `JSON.stringify`만으로 저장하지 않고 이 codec을 사용하거나 동등한 versioned envelope를 정의한다. source table 값의 보존과 concrete geometry의 finite 제약은 별개다. 특수값을 저장할 수 있다고 NaN 좌표를 허용하지 않으며, geometry 제약을 이유로 원본 data를 조용히 바꾸지도 않는다. [현행 tagged codec](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence/codec.js#L8)

공통 오류는 `unknown-resource`, `wrong-resource-kind`, `duplicate-id`, `unsupported-combination`, `invalid-domain`, `ambiguous-identity`, `cyclic-dependency`, `unresolved-asset`, `layout-unsatisfied`에 세부 path/owner/sourcePointer를 붙인다. 이 오류 코드는 제안이며 현행 diagnostics 체계와 통합한다. 오류를 무음 no-op으로 바꾸지 않는다. typed result가 필요한 순수 계산/API는 authoring action과 별도 함수로 둔다.

### E.2 데이터·geometry·paint·layout 액션

| 권장 이름 | 필수 입력 / 선택 입력과 기본값 | 출력 의미·검증·수정 시 영향 |
|---|---|---|
| `createGeometryData` | id, format=`geojson\|topojson`, values, coordinateKind=`geographic\|planar`; featureKey, topoObject | Feature/GeometryCollection 보존. TopoJSON object 여러 개면 명시 선택. geographic은 degree/WGS84, planar는 원 단위. identity/row lineage·raw hash 저장 |
| `createGeoJoinData` | id, geometry, data, geometryKey, dataKey; cardinality 기본 one-to-one, unmatched 기본 retain-geometry | 중복 join은 기본 error. 미매칭 feature는 값 없음으로 보존. raw geometry 재사용. revise는 key/geometry/measure 변경을 구분하고 실제 dependent color/domain/size/label/filter/fit/selection을 재계산 |
| `createProjection` | id, type; center/rotate/parallels/scale/translate/fit/precision/clipAngle/clipExtent/reflectY | type별 허용 parameter 검증. fit과 explicit scale/translate 충돌 정책 명시. inverse 가능 영역 노출. 모든 source projection 포함 |
| `editProjection` | target, patch | projection 정본 수정 → geographic mark·clip·label·hit·scene invalidation. 원 geometry 불변. 이전 program 유지 |
| `createGeoCoordinate` | id, projection; viewport/clip | coordinateKind와 projection 타입 일치. geographic/planar의 값 공간과 CSS pixel mapping 연결. 기존 createCoordinate의 typed facade로 구현 가능 |
| `createGeoshapeMark` | id, geometry 또는 joined geometry, coordinate; role, fill/stroke | feature별 semantic item + compound path. hole/collection/empty policy 유지. color는 기존 encoding과 결합 |
| `createGeoPointMark` | id, data, coordinate, longitude, latitude; identity/group | 값 검증 후 투영 point. size는 화면 단위 기본. projection camera와 별개 glyph-size 정책 |
| `createGeoLineMark` | id, data 또는 geometry, coordinate, order/group; interpolation=`source-segment\|great-circle` | 경로·break·segment provenance 보존. source segment와 대권 경로를 명시 선택 |
| `createGraticule` | id, coordinate; longitudeStep,latitudeStep,extent | decorative role과 별도 hit policy. 투영 clipping 동일 적용. Sphere/background는 별도 명시 role의 geometry facade |
| `createImageResource` | id, uri/hash/mime/dimensions 또는 동봉 resource ref; attribution | loader가 resolve한 asset을 참조. pixel payload의 snapshot 포함/동봉 정책 명시. renderer는 fetch하지 않음 |
| `createImageMark` | id, data 또는 resource, x/y/size 의도; fit=`contain`, align, clip | image 자체가 원본 mark일 때 사용. aspect/alpha/bounds/export 동일. chart screenshot 우회는 translator lint 실패 |
| `createPattern` | id,type,pitch,strokeWidth,colors; phase,coordinateSpace | 7종 texture와 모든 backend의 동일 pattern geometry. paint resource reuse 및 snapshot |
| `createTrailMark` | id,data,coordinate,group,order; curve/join/cap | sample별 width 채널이 ribbon을 생성. 기존 encodeSize와 별도 width 계약의 매핑을 확정. self-overlap/zero-length/clip 검사 |
| `createPivotData` | id,source,groupby,pivot,value,aggregate; limit,missing | 동적 category→column shaping, field collision·duplicate grain 진단. output schema와 source lineage 보존 |
| `createHierarchyData` | id,source,mode=`fields\|parent-id`; pathFields 또는 key/parent, value | canonical nodes/edges와 root/depth/leaf/row membership. orphan/cycle/중복 정책은 explicit. own/aggregate value 구분 |
| `layoutHierarchy` | id,hierarchyRef,method=`tree\|treemap\|partition`; method별 size/orientation/order/valueMode | partition은 normalized u/depth를 출력하고 size/padding은 view가 적용. tree/treemap은 method별 geometry; Icicle/Sunburst는 같은 partition 사용 |
| `createGraphData` | id,nodes/edges 또는 source/target fields; value,directed,key,duplicatePolicy | edge/node identity·row lineage 보존. missing node 생성 여부·self-loop·parallel edge를 정책으로 기록 |
| `layoutGraph` | id,graph,type=`circular\|force`,size; seed,iterations,force parameters | finite deterministic positions. seed/iteration 기본값은 profile에 고정. renderer에서 simulation하지 않음 |
| `layoutFlow` | id,graph,size; orientation,nodeWidth,nodeGap,align,order | Sankey node boxes/link ribbons. positive weight/conservation과 cycle policy, stable ordering. source variant를 위한 algorithm profile |
| `createContourData` | id,source,x,y,estimator=`histogram\|kde`; grid/bins/thresholds/bandwidth | grid와 contour polygon을 별도 파생 resource로 추적. saddle/hole/islands와 estimator 의미 검사 |
| `layoutCalendar` | id,source,date,value,timezone,weekStart; year/month mode,aggregation | date→cell/month boundary를 결정. 중복날짜와 missing 처리, leap/DST/year boundary |
| `createCellLayout` | id,data,columns,rowKey; widths/alignment/header/rowLimit | Table/Bar Table/Sparkline의 cell 의미·bounds. text/mini-chart는 기존 마크와 child를 배치 |

`createFlowData`는 특별한 별도 데이터 표현을 더 만들기보다 `createGraphData`의 directed weighted graph로 통일한다. `createFlowLayout`은 `layoutFlow`와 같은 제안이다. `createGeoShape`는 `createGeoshapeMark`, `createData(geometry)`는 `createGeometryData`로 정리한다. 추상적인 `createCustomChart` 한 개로 이들을 덮지 않는다.

각 resource에 edit/remove를 만들 때 의존자가 있으면 cascade/remove-dependents 또는 명시 오류 중 기존 lifecycle과 일치하는 정책을 적용한다. geometry resource 삭제 후 mark만 남거나 projection 변경 후 hit cache만 이전 상태인 프로그램은 생성할 수 없어야 한다. 데이터를 가진 layout resource는 원본 data를 복제하지 않고 참조와 파생 결과를 유지한다.

### E.3 interaction 의미 액션과 browser controller

| 권장 API | 입력·반환 | 필수 계약 |
|---|---|---|
| `createParameter` / `editParameter` | id,type,value,domain/bind 의도 → program | scalar/tuple/range/category set 타입, invalid input 진단, dependent dataflow 갱신 |
| `createInteractionSelection` | id,scope,type,fields/encodings,empty/toggle/resolve/init → program | 기존 named authoring selection과 구분. 저장되는 정의와 runtime preview 분리 |
| `bindInteraction` | id,selection/command,gesture spec,effect refs → program | event object나 callback 저장 금지. named host handler와 serializable gesture definition |
| `encodeCondition` | target,channel,cases(predicate,value/field),otherwise → program | 기존 encoding family로 lower, predicate의 precedence/empty/null 의미 고정 |
| `createHitIndex` | concrete scene + semantic identity index → disposable immutable index | CSS pixel·clip·paint order·frame revision 보존, geometry별 정확한 hit |
| `resolveTarget` | hit/index + semantic manifest → target/result | raw DOM node를 외부 target으로 노출하지 않음. 집계 grain·records·guide value 보존 |
| `mountInteractiveChart` | HTMLElement,program,options → controller | mount/resize/getProgram/getState/applyUpdate/subscribe/destroy. 외부 adapter interface 구현은 이번 목표에서 제외 |
| `applyUpdate` | typed neutral update + options → Promise(result) | named retained/preview fold, native typed commands, diagnostics/transition settlement, stale generation 차단 |

gesture spec은 event type, modifiers, pointer types, threshold, capture, reset을 명시한다. event stream DSL을 지원할 경우 parser와 허용 연산을 제한하되 source가 사용한 stream 조합은 모두 구현한다. 내부 함수나 임의 JavaScript를 문자열로 저장하는 binding은 지원하지 않는다. host handler는 mount 시 registry로 주입하고 serialize 시 이름·필요 capability만 기록한다.

### E.4 animation 순수 API와 player

| 권장 API | 입력·반환 | 필수 계약 |
|---|---|---|
| `planTransition` | from(program/frame),to(program),timing,correspondence,format → immutable plan | endpoint/key/kernel/resource를 고정. incompatible topology와 crossfade policy 진단 |
| `sampleTransition` | plan,{time} → concrete frame scene | DOM/clock 없음. 같은 시간 같은 결과. parametric projection/scale/guide kernel 허용 |
| `createTimeline` | named segments/keyframes/dependencies/repeat/direction → timeline | segment overlap·빈구간·동일 timestamp의 순서와 fill 정책 명시 |
| `sampleTimeline` | timeline,{time} → frame+active segment state | seek/reverse에 독립적인 pure evaluation. 이전 sample 호출에 의존하지 않음 |
| `mountAnimation` | container 또는 renderer target,plan/timeline,clock,reducedMotion → player | play/pause/seek/rate/reverse/cancel/finish/destroy, finished result의 completed/cancelled/replaced |
| `serializeAnimation` / `deserializeAnimation` | plan envelope ↔ JSON/content-addressed resources | endpoint/hash만으로 복원 가능하다고 하지 않음. offline asset/font/kernel version 재현 |

현재 `renderTransitionScene(scene, context, {pixelRatio})`는 Canvas scene를 그리는 기존 API로 재사용할 수 있다. SVG frame export는 별도 typed serializer를 추가하거나 기존 SVG scene format의 역할을 명확히 확장한다. 버전 1 SVG scene와 버전 2 Canvas scene를 무타입 object로 섞지 않는다. 새 scene/animation schema는 기존 저장 프로그램 schema와 독립적인 호환 버전을 가진다.


### E.6 추가 domain API 계약 — 부록 F의 필수 구현

아래는 제안 이름이다. resource 생성은 ChartProgram의 불변 action이며 runtime signal/worker/player는 별도 session context다. 모든 action은 기존 persistence codec, lineage, explicit materialization 경계를 따른다.

| 제안 API | 필수 입력과 주요 옵션 | 출력·실패 계약 |
|---|---|---|
| `layoutHierarchy` partition variant | hierarchyRef, method=partition, valueMode, stable order | normalized u/depth layout; cycle/negative/invalid own-value 오류 |
| `createPartitionPlot` | layoutRef, coordinate, orientation 또는 angleRange/radiusPolicy, focus/root/padding | Icicle/Sunburst 공통 owner·node ID; 좌표계 변경 시 data 불변 |
| `createInferredGraphData` | dataRef,nodeKey,rule,featureRefs,metric,ruleOptions | GraphResource+inference provenance; budget/metric/ID 오류 |
| `bundleGraphEdges` | graphRef,nodeLayoutRef,method,methodOptions,coordinateSpace | edge별 RouteResource; source graph/layout 불변; method version 저장 |
| `createGraphEdges` | graphRef,routeRef,encoding/arrow/clip | 원 edge ID·direction·weight·semantic hit 보존 |
| `createGraphNodes` | graphRef,nodeLayoutRef,encoding/shape | 원 node ID/lineage와 endpoint anchor 공유 |
| `createPyramidPlot` | stage data, value/order/orientation/gap, native profile | 이전 Funnel geometry 의미 유지; 인구형 표현은 별도 bar 조합 가능; 외부 이름 매핑 의무 없음 |

Marginal/Bullet/Combo 전용 constructor는 제안하지 않는다. KPI/Gauge 전용 action은 범위 밖이다. `secondaryY`, layer별 독립 Y, 같은 frame의 두 Y guide는 공개 생성·수정·복원 계약에서 정책 오류다. 신규 resource의 edit/delete/revise는 공통 resource revision·dependency 계약을 따르며 orphan ref와 stale layout을 거절한다. mutation성 매개변수를 renderer에 숨기지 않는다.

### E.7 계약의 독립성

위 API의 옵션·return type·event payload는 ggaction 자체 grammar/action/resource 기준으로 확정한다. 외부 InteractiveRenderer/ChartAssemblyInput, legacy selection DSL, chart spec translator는 이 표의 구현 의무가 아니다. 기존 source 링크는 조사 근거로만 사용한다. 외부 adapter와 번역은 별도 프로젝트에서 native public API를 소비한다.


## 부록 F. 확정 범위: partition·graph inference·edge bundling 상세 설계

이 부록은 2026-10-27 사용자의 최신 결정을 반영한 **필수 구현 명세**다. 원본 소스 관찰을 바꾸지 않으며, native 구현 목표에 제외·금지 조건과 추가 기능을 적용한다. 최신 POL-09/10에 따라 외부 정합성·통합·번역은 제외한다. 아래 API 이름·기본값·오류 코드는 제안 계약이며 현재 구현이 아니다. 알고리즘의 학술 근거와 ggaction에 적용하기 위한 설계 결정을 구분한다. 작업 `WP-22`–`WP-26`, 시험 `AT-62`–`AT-92`과 연결된다.

### F.1 범위 정책과 호환성 주장의 변경

| 정책 | 확정 결정 | 구현·검증에 미치는 영향 |
|---|---|---|
| POL-01 | Icicle과 Sunburst는 하나의 hierarchy partition 계열 | 동일 hierarchy/layout resource를 직교 또는 극좌표로 materialize. 별도 데이터 알고리즘 두 벌 금지 |
| POL-02 | UpSet·집합 시각화 후속 이관 | 전용 데이터·API·상호작용·시험을 이번 범위에서 제외 |
| POL-03 | 대표 edge bundling 필수 | hierarchical, force-directed, density/KDE, edge-path 네 방법을 완료 범위에 포함 |
| POL-04 | 규칙에 의한 graph inference 필수 | kNN, radius, similarity threshold, MST/forest, group/sequence rule을 분리된 data action으로 제공 |
| POL-05 | Funnel의 공개 이름만 Pyramid로 변경 | 단계 순서·폭·방향·간격·값·라벨 의미는 유지. 외부 Funnel 문자열은 adapter alias로만 소비 |
| POL-06 | KPI·Gauge 제외 | 전용 facade, 전용 behavior, 전용 원본 충실도는 필수 개발에서 제외. 원본 행은 남기고 제외 사유 표시 |
| POL-07 | Marginal·Bullet·Combo는 조합 | 별도 public chart constructor/semantic mark family를 만들지 않는다. 기존 mark·data·layout·scale 액션으로 작성 |
| POL-08 | 이중 Y축 금지 | Cartesian plot frame 하나에 Y scale 하나, 표시 Y guide 최대 하나. 축을 숨긴 독립 Y scale도 금지 |
| POL-09 | ggaction 자체 설계 우선, Flint 정합성 제외 | 외부 adapter/upstream/API·theme·preset·event parity 의무 없음 |
| POL-10 | 번역은 별도 프로젝트 | chart-llm 및 기타 source translator·원본 충실도 검증은 이번 목표 제외 |

현재 profile은 `ggaction-native-2026-10-27`이다. 완료 기준은 GGA/USR native 기능의 정확성·조합성·재현성이다. 외부51이름/154등록과 기존49/150 등의 수치는 역사적 참고이며 구현 분모가 아니다. 외부 이름 충돌·옵션 차이를 core 설계로 해결할 필요도 없다.

KPI/Gauge 전용 지원은 제외하고 단일 frame의 복수 Y scale/guide는 금지한다. native fixture로 검사하며 외부 원본 전체의 정책 판정이나 번역 성공은 요구하지 않는다. separate panel의 독립 Y와 layer의 복수 Y는 native frame 의미로 구분한다. `y2` range endpoint는 같은 scale을 사용하는 정상 표현이다.

### F.2 통합 partition: 데이터와 normalized layout

Icicle은 계층의 구간과 깊이를 직사각형으로, Sunburst는 같은 구간을 각도로 표현한다. D3의 partition도 두 표현에 공통인 계층 배치로 제공된다. [D3 partition 공식 문서](https://d3js.org/d3-hierarchy/partition)

ggaction에서는 `createHierarchyData → layoutHierarchy({method:'partition'}) → createPartitionPlot`으로 고정한다. 마지막 액션의 `coordinate:'cartesian'|'polar'`가 표현을 선택한다. gallery의 사람이 읽는 이름 Icicle/Sunburst는 유지할 수 있지만, 별도 계산·집계·선택 모델을 만들지 않는다. `layoutHierarchy`는 tree/treemap과도 공유하는 discriminated union이며 method별 옵션을 섞으면 validation error다.

| 자원 | 필수 필드 | 소유권·의미 |
|---|---|---|
| HierarchyResource | id, revision, nodeId, parentId, children, depth, ownValue, aggregateValue, lineage | 데이터 원본, 안정 ID, 원본 row 연결. layout 좌표 없음 |
| PartitionLayout | id, hierarchyRef+revision, nodeId, u0, u1, depth0, depth1, order, effectiveValue | 정규화된 구간과 깊이. 좌표계·화면 크기에 독립 |
| PartitionView | layoutRef, coordinate, orientation 또는 angleRange/radiusPolicy, padding, rootVisible, focusNodeId, maxDepth | 직교/극좌표 mapping과 표시 범위. 원본 hierarchy를 삭제하지 않음 |

기본 집계는 `valueMode:'leaf-sum'`: leaf의 nonnegative finite 값을 합치고 internal 값은 합산하지 않는다. internal 값이 제공되면 무시 사실을 diagnostic에 남긴다. `valueMode:'inclusive'`는 internal 선언 총합과 자식 합의 일치/잔여를 검사한다. `valueMode:'own-plus-children'`는 own 값을 명시한 residual 영역으로 별도 표시한다. inclusive 모드에서 parent 총합<자식 합은 오류, 더 크면 차이를 명시 residual 영역으로 만든다. 숨은 parent 값으로 자식 구간 합이 작아진 채 정상 합격하지 않는다. negative/nonfinite는 오류, zero는 identity를 보존한 영폭 항목이다. root total=0은 빈 상태와 0 합계를 표시하고 임의 동일 폭으로 꾸미지 않는다. `equal-weight`가 필요하면 별도 명시 옵션이다.

형제 순서는 기본 stable node ID 순; source order/value order/explicit order를 선택할 수 있다. 선택한 order와 tie-break는 저장한다. typed ID `1`과 `'1'`을 구분하고 경로 문자열의 delimiter 충돌을 피한다. parent가 없는 node, cycle, 다중 parent, duplicate ID는 자동 고치지 않는다. forest는 `rootPolicy:'synthetic'`를 명시해야 하며 synthetic root는 원본 node처럼 tooltip에 표시하지 않는다. deep hierarchy는 iterative traversal로 stack overflow를 피한다.

partition 기본식은 parent 구간을 자식 effective value에 비례해 나누는 것이다. root u=[0,1], child length=(parent length)×child value/parent value. padding은 데이터 배치 후 view 단계에서 적용하며 원래 구간과 분모를 바꾸지 않는다. child residual이 있는 mode는 residual owner까지 합쳐 parent를 덮는다. float 합 오차는 마지막 경계 보정과 명시 tolerance로 처리하고 원본 value는 바꾸지 않는다.

### F.3 통합 partition: 좌표·상호작용·애니메이션

Cartesian 기본은 x=Wu, y=H·depth/(visibleDepth+1)이며 방향 TB/BT/LR/RL을 지원한다. Polar는 theta=theta0+(theta1-theta0)u, 기본 radius는 균등 깊이 밴드다. `radiusPolicy:'equal-depth-area'`는 r=sqrt(rInner²+t(rOuter²-rInner²))를 사용한다. 이는 **깊이 밴드별 전체 면적**을 같게 만드는 선택이며, 서로 다른 깊이의 모든 node 면적이 같은 전역 값 척도를 따른다는 보장은 아니다. angleRange≤2π, 음의 sweep 금지, clockwise 별도 boolean, 시작각은 정규화하되 저장된 회전 연속성은 유지한다.

직교 padding은 CSS px, polar angularGap은 arc length 기준 CSS px로 주어 반경에 맞춰 변환한다. 반경 0 부근의 division, 좁은 wedge, 최대 padding clamp는 공통 geometry kernel에서 처리한다. rootVisible=false일 때 빈 중심/첫 깊이 배치를 명시하고 가짜 데이터 재집계로 root를 제거하지 않는다. label은 공간이 부족하면 숨기되 접근성 트리·tooltip·검색에서 node를 유지한다. text rotation, keep-upright, full-circle seam, clipping, 최소 hit 크기를 renderer와 공유한다.

focus/zoom은 선택 subtree의 u 구간과 depth window를 viewport로 변환한다. `focusNodeId`와 selection은 분리하고 parent 이동·breadcrumb·keyboard arrows·Escape/root 복귀를 지원한다. filter가 집계 분모를 바꾸는 `recompute`와 기존 분모에 숨김만 적용하는 `preserve`를 명시적으로 선택한다. 기본은 recompute이며 상태에 원래 총합과 현재 총합을 함께 제공한다. 두 view를 연결할 때 node selection은 같은 hierarchy ID/node ID로 전파된다.

Icicle↔Sunburst 전환은 rect/path 문자열을 단순 보간하지 않는다. 각 node의 동일 u/depth 경계를 연속 coordinate mapper로 샘플링하여 같은 semantic item을 유지한다. 한 가지 구현 가능한 kernel은 bend 각도 α를 0→2π로 늘리며 x=(R+v)sin(α(u-.5)), y=(R+v)cos(α(u-.5))-R, t=α/(2π), R=(1-t)W/α+t·rInner로 배치하고 α≈0에서 해석적 직선 극한을 쓰는 방식이다. v는 t에 따라 직교 깊이 높이에서 최종 radial depth까지 보간한다. 실제 viewport fit·root band·최종 회전은 endpoint mapper와 일치시킨다. 이 식은 제안이며 full turn seam, 자기 교차, 두 endpoint 정확성을 시험해야 한다. 보간 topology를 보장하지 못한 경우 명시 crossfade로 전환하며 이를 continuous bend 지원이라고 주장하지 않는다. 최종 완료에는 검증된 bend kernel과 reduced-motion 경로가 모두 필요하다.

독립 fixture: root10, A6(children A1=2,A2=4), B4. root[0,1], A[0,.6], B[.6,1], A1[0,.2], A2[.2,.6]. Cartesian width1000에서 A폭600; full polar에서 A각도1.2π. 이 정확한 interval·같은 node ID·selection·저장/복원 결과를 두 view에서 비교한다. raster screenshot만으로 partition 정확성을 검증하지 않는다.

### F.4–F.5 집합 시각화 — 후속 과제

UpSet과 집합 시각화는 이번 범위에서 제외한다. `createSetData`, `createIntersectionData`, `createUpSetPlot`, 전용 membership/intersection resource, exact/inclusive intersection query, matrix/bar 조합 및 연결된 상호작용·시험을 함께 이관한다. WP-23, USR-03/04, AT-66–69는 후속 기록으로만 유지하며 활성 기능의 선행 조건이나 릴리스 게이트가 아니다. [기존 상세 설계](evidence/deferred-set-visualization-design.ko.md)는 향후 재검토용이다.

일반 selection의 원소 집합, linked views, predicate의 집합 연산, graph 유사도 metric은 집합 시각화 전용 기능이 아니므로 기존 계획을 유지한다.

### F.6 Graph inference: topology·layout·routing의 분리

`createInferredGraphData`는 **누가 누구와 연결되는지** 결정한다. `layoutGraph`는 **node를 어디 놓는지**, `bundleGraphEdges`는 **이미 존재하는 edge를 어떤 경로로 그리는지** 결정한다. force-directed node layout과 force-directed edge bundling은 서로 다른 계산이다. 한 `force` 옵션이 세 의미를 동시에 바꾸는 API는 만들지 않는다.

명시 edge table은 `createGraphData`; 추론은 `createInferredGraphData`로 선택한다. 추론 출력도 같은 GraphResource이므로 layout·interaction·bundling을 재사용한다. node는 원본 row의 stable ID, edge는 directed ordered endpoint 또는 undirected canonical endpoint + rule ID + parallel occurrence로 식별한다. graph에는 `origin:'observed'|'inferred'`, rule version/options/source revision/feature preprocessing/provenance가 포함된다. 추론된 연결을 관측 사실이나 인과 관계로 표시하지 않는다.

| rule | 필수 옵션·판정 | 경계 조건·기본 정책 |
|---|---|---|
| knn | features, metric, k; 각 node의 가까운 k개 | self 제외. `symmetry:'directed'|'union'|'mutual'`; 기본 directed. k 정수 1…n-1, 초과는 error; clamp는 명시 선택 |
| radius | features, metric, radius, boundary | 기본 d≤radius, radius≥0; 0거리 중복점 연결을 유지; units 필수 |
| similarity-threshold | similarity, threshold, comparator | 기본 similarity≥threshold; cosine/Jaccard 범위 검증. 거리 cutoff와 이름을 섞지 않음 |
| mst | metric, candidateGraph 또는 complete | nonnegative 거리, deterministic Kruskal 기준. disconnected candidate는 forest와 component count; 강제로 가짜 edge를 추가하지 않음 |
| group-rule | groupFields, connection:'clique'|'star' | null group 정책, star anchor 명시/ID 최소값, clique edge budget 사전 계산 |
| sequence-rule | groupFields, orderFields, lag | 기본 lag1, stable tie-break, 그룹 경계 연결 금지, 날짜 단위·null ordering 명시 |

kNN/radius 그래프의 connectivity와 distance 표현을 구분하는 기존 실용 API를 참고하되 ggaction의 ID·저장·lineage 계약은 별도로 정의한다. [kNN 공식 API](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.kneighbors_graph.html), [radius 공식 API](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.radius_neighbors_graph.html)

### F.7 Graph inference: 거리·재현성·갱신

features는 numeric field vector 또는 명시 set vector/geo coordinate resource다. 화면 x/y를 자동 feature로 사용하지 않는다. metric은 Euclidean, Manhattan, cosine distance, Jaccard distance, great-circle을 지원하고 맞는 feature type에만 허용한다. great-circle은 degrees/radians와 Earth radius 단위를 고정하며 경도 차이를 date-line 기준으로 정규화한다. geo의 projection 이후 screen 거리와 지리 거리를 혼용하지 않는다. cosine zero norm은 기본 오류, Jaccard empty/empty는 거리0으로 명시한다.

preprocessing 기본 none; standardize/minmax/impute/drop을 사용하려면 별도 저장 가능한 data transform과 fitted parameters를 참조한다. categorical 필드를 숫자로 자동 변환하거나 null을0으로 바꾸지 않는다. feature와 ID validation이 실패하면 일부 graph를 성공으로 반환하지 않는다. 모든 거리·similarity·rank는 endpoint provenance와 저장하고 화면 stroke width에 사용하는 값은 별도 encoding이다. routeCost는 거리/유사도와 구분하며 shortest-path용은 nonnegative finite다.

tie-break는 (distance, typed stable node ID). 입력 행 순서를 바꾸어도 같은 edge 집합이 나온다. union은 양방향 중 하나라도 있으면 undirected edge 하나, mutual은 두 방향 모두 있어야 edge 하나다. rankSource/rankTarget를 보존하고 방향 합치기로 weight를 2배 하지 않는다. 실제 node ID가 다른 duplicate feature points는 0거리로 연결될 수 있으며 sparse 구조의 0값을 “edge 없음”으로 취급하지 않는다.

기본 exact search는 작은 n에서 brute-force oracle와 일치해야 한다. k-d tree/ball tree 등 exact accelerator는 metric/dimension 적용성을 검증한다. approximate search는 명시 opt-in, seed/algorithm version/recall target/측정 sample을 기록하고 exact로 표시하지 않는다. `maxNodes/maxEdges/maxCandidatePairs` 초과는 실행 전 estimate와 error/사용자가 명시한 대체 옵션으로 처리한다. 자동 sampling이나 k 축소는 금지한다. chunk/worker/abort/progress를 지원해 runtime을 멈추지 않되 중간 graph를 최종 상태로 publish하지 않는다.

데이터 revise→preprocessing dependency→inference→layout→routing 순으로 invalidation한다. layout drag/resize만으로 inference를 다시 하지 않는다. 화면 위치로 graph를 만드는 특수 용도는 `featureSpace:'screen'`를 명시하며 이후 drag로 topology가 변함을 UI와 trace에 드러낸다. 표시 filter의 기본은 `graphFilterMode:induced-view`: 기존 topology의 endpoint가 둘 다 남은 edge만 보이고 새 이웃을 찾지 않는다. 사용자가 `recompute`를 명시하면 필터된 dataset으로 새 kNN/radius 등의 topology를 계산한다. tooltip과 trace에 어느 정책인지 남긴다. 기존 selection은 edge ID가 남으면 유지, 삭제되면 reconcile하고 새 edge에 옮기지 않는다. 같은 rule ID에서 metric/k를 변경하면 configuration revision만 올리고 동일 endpoint edge ID는 유지한다. 별개의 inference rule resource를 생성하면 새 namespace의 edge ID를 사용한다.

독립 1차원 fixture: a=0,b=1,c=3,d=10, k=1. directed는 a→b,b→a,c→b,d→c; union은 ab,bc,cd; mutual은 ab만. radius2 inclusive는 ab,bc; complete Euclidean MST는 ab(1),bc(2),cd(7), 총10. 추가 tie fixture a=0,b=2,c=4에서 b의 이웃은 ID tie-break로 a다. 이 값은 [계획용 수치 fixture](evidence/revision-oracle-fixtures.json)에 고정한다.

### F.8 Edge bundling 공통 resource와 네 필수 방법

기본 pipeline은 `createGraphData/createInferredGraphData → layoutGraph → bundleGraphEdges → createGraphEdges + createGraphNodes`다. bundling은 GraphResource나 NodeLayout을 변형하지 않고 EdgeRouteResource를 새로 만든다. node 위치 고정, edge 수·ID·방향·weight·adjacency 보존은 모든 방법의 공통 invariant다. bundle 교차점은 graph node가 아니며 새로운 adjacency를 만들지 않는다.

```ts
// 제안 계약의 형태. 현재 호출 가능한 API 예제가 아니다.
type BundleOptions =
  | { method:'hierarchical'; hierarchyRef:string; strength:number }
  | { method:'force-directed'; compatibilityThreshold:number;
      cycles:number; iterations:number; stepSize:number; springConstant:number }
  | { method:'density'; gridSize:number; bandwidth:number;
      iterations:number; advectionStep:number; directionPolicy:'ignore'|'separate' }
  | { method:'edge-path'; maxStretch:number; lengthExponent:number;
      directionPolicy:'respect'|'ignore' };
// 공통: id, graphRef, nodeLayoutRef, coordinateSpace, precision,
// seed, algorithmVersion, maxWork, abort signal은 runtime context로 분리.
```

`EdgeRouteResource`는 edgeId, sourceNodeId/targetNodeId, polyline/controlPoints, endpoint attachments, method/options/version, graph/layout revision, route provenance, diagnostics, bounds를 가진다. 시작점/끝점은 node anchor와 정확히 일치해야 한다. shape 경계 attachment와 arrowhead shortening은 renderer 단계에서 각각 계산하며 raw route endpoint를 잘라 버리지 않는다. 자기 loop/parallel edge/0길이 edge의 별도 경로 정책을 제공한다.

**Hierarchical Edge Bundling.** node inclusion hierarchy와 adjacency graph를 따로 받는다. 두 endpoint 사이의 hierarchy path/LCA를 control path로 사용하고 strength로 직선과 계층 경로의 결합 정도를 조절하는 계열이다. [Holten 2006 원 논문](https://doi.org/10.1109/TVCG.2006.147)

ggaction 구현 제안은 hierarchy endpoint mapping 검증→LCA path 추출→중복 control point 제거→strength blending→고정된 cubic B-spline basis로 샘플링이다. strength=0은 직선,1은 전체 계층 경로 영향. hierarchy에 endpoint가 없으면 error 또는 명시 unbundled fallback+diagnostic; node ID의 문자열 prefix로 parent를 추정하지 않는다. Icicle/Sunburst의 같은 hierarchy를 쓸 수 있지만 root 경유 경로와 화면 clip은 view에 맞게 처리한다. 별도 hierarchical layout을 강제하지 않고 전달된 node layout을 존중한다.

**Force-Directed Edge Bundling (FDEB).** edge를 세분화한 점들에 spring과 edge 간 attraction을 적용하는 방법이다. node force layout이 아니다. 각도·길이·위치·visibility 기반 compatibility로 묶일 후보를 제한한다. [Holten & van Wijk 2009 원 논문](https://onlinelibrary.wiley.com/doi/pdf/10.1111/j.1467-8659.2009.01450.x)

ggaction 구현 제안은 고정 endpoint→compatibility graph→arc-length subdivision→spring+compatible-point attraction 반복→step/iteration schedule 변경→최종 smoothing이다. 계산 중 모든 update는 이전 iteration buffer를 읽고 새 buffer에 쓰며 edge 방문 순서에 따른 결과 차이를 막는다. 반대 endpoint orientation은 최소 대응 거리로 정렬하되 graph 방향은 바꾸지 않는다. threshold[0,1], cycles/iterations 양의 정수, step/spring finite nonnegative를 검사한다. zero-length edge는 compatibility 분모에서 제외하고 기존 anchor에 유지한다. 후보 pair pruning은 exact compatibility reference와 비교하고 omitted compatible pairs를 숨기지 않는다.

**Density/KDE bundling.** edge 표본으로 density field를 만들고 gradient를 따라 내부 점을 이동시키는 계열이다. [Hurter·Ersoy·Telea 2012 원 논문](https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis12/kdeeb.pdf)

ggaction 구현 제안은 normalized layout grid→polyline deposition→KDE convolution→gradient advection→resampling/smoothing을 반복한다. endpoint pin mask, empty density/flat gradient 처리, grid boundary 정책을 고정한다. bandwidth와 step은 normalized coordinate 단위이며 CSS px 옵션은 view transform을 통해 변환하여 저장한다. density는 내부 계산이며 최종 출력은 edge별 vector route다. direction separation 요청은 방향 bin별 density/compatibility를 사용하고 반대 방향의 흐름이 구별되는지 시험한다. CPU reference부터 구현하고 GPU 가속은 수치 tolerance와 fallback을 검증한다.

**Edge-Path Bundling.** graph의 대체 경로를 사용해 edge를 routing하는 방법으로, 서로 연결되지 않은 edge 집단을 한 연결 구조처럼 보이게 하는 문제를 줄인다. 모든 시각적 모호성을 없앤다는 뜻은 아니다. [Wallinger 외 원 논문](https://arxiv.org/abs/2108.05467)

ggaction 구현 제안은 원 논문의 edge 처리 순서·locking 규칙을 고정한 reference부터 작성한다. candidate edge를 제외한 graph에서 geometry length^lengthExponent 비용으로 shortest alternative path를 찾고 geometric route length≤maxStretch×straight length인 경우만 채택한다. path의 각 edge ID와 node ID를 provenance에 남긴다. directed respect 모드에서는 directed path만 허용한다. 경로가 없거나 stretch를 넘으면 원래 직선+진단이며 연결되지 않은 component를 이어 붙이지 않는다. zero-length/negative cost와 deterministic tie를 검증한다. spanner 기반 최적화는 후속 accelerator로 가능하지만 baseline과 다른 결과를 동일 알고리즘 버전으로 숨기지 않는다. [2023 가속 연구](https://doi.org/10.1111/cgf.14789)

네 방법의 기본값은 논문 숫자를 임의로 섞지 않는다. `algorithmVersion`과 `presetVersion`을 분리하고 normalized coordinate scale, epsilon, sampling, smoothing basis, stopping criteria까지 fixture manifest에 고정한다. balanced preset의 실제 수치 선정은 독립 reference 비교와 benchmark를 통과해야 하며, **미정 기본값을 남긴 상태는 WP-25 미완료**다. 구현자는 명시 옵션 fixture로 시작할 수 있고 default 최적화는 그 뒤 수행한다.

### F.9 Edge bundling: interaction·animation·geo·성능

hit test는 현재 보이는 route에 대한 stroke 거리와 spatial index를 사용한다. 한 bundle에 여러 edge가 겹치면 nearest만 임의 반환하지 않고 ordered candidate IDs와 disambiguation을 제공한다. 단일 edge 강조, incident edge 강조, focus+context, bundle 전체 선택을 분리한다. bundle 전체 선택은 표시 group selection이며 새로운 graph edge나 node로 저장하지 않는다. tooltip은 원래 endpoint/direction/value와 inferred 여부를 보여준다. arrowhead·gradient 등 방향 표현도 원 edge 방향을 따른다.

선택된 edge를 일시적으로 풀어 보여주는 explode/unbundle view를 제공하며 원 graph/layout은 불변이다. mouse/touch뿐 아니라 node 목록→incident edges→endpoint 이동의 keyboard 경로와 accessible edge table을 지원한다. clipping 밖 route는 hit하지 않는다. 화면에 그려지지 않은 virtualized edges의 존재·개수는 접근성 summary에서 유지한다.

bundling strength/parameter 변경 transition은 edge ID로 대응하고 arc-length resampling으로 vertex 수를 맞춘다. endpoint는 node transition에서 계산한 현재 위치에 고정한다. method 전환과 graph topology 변화는 별도 transition plan으로 처리하며 matching 불가능한 route는 명시 crossfade, 새/삭제 edge는 enter/exit다. seek/reverse/interrupt에서 현재 frame의 hit index를 갱신하고 reduced motion은 최종 route를 즉시 적용한다. runtime solver가 매 frame 새 graph를 추론하면 실패다.

geo network는 geodesic inference→projection/clip→layout-space routing 순서를 명시한다. 날짜변경선의 양쪽 segment를 화면 가로질러 다시 연결하지 않는다. geo camera 변경은 projection revision과 route invalidation을 유발한다. 지도 위 bundle은 실제 교통 노선이나 지형을 따른 최단 경로가 아니라 시각적 routing임을 metadata/tooltip에서 구분한다. globe backside는 clip하며 endpoint가 숨겨진 경우 route의 표시 정책을 고정한다. 실제 road-network routing은 별도 graph input일 때만 주장한다.

성능 fixture는 E=100/1k/10k와 density grid128/256/512를 포함한다. FDEB의 all-pairs O(E²) reference는 작은 fixture oracle로 유지하고 큰 입력은 spatial candidate pruning/worker/chunk를 사용한다. pruning이 근사이면 표시하고 quality metric을 비교한다. 시간 제한으로 solver를 중단할 때 `converged:false/iterationsCompleted/residual`을 반환하며 “완료”로 포장하지 않는다. dispose/abort 뒤 stale route publish·GPU buffer·worker·event listener 누수가 없어야 한다. benchmark는 inference/layout/bundling/render/hit/frame 비용을 분리한다.

### F.10 Pyramid와 조합 recipe: 이름을 늘리지 않는 구현

**Pyramid는 이전 Funnel의 이름만 바꾼다.** width/area value interpretation, sort, stage order, gap, orientation, labels, percent denominator, negative/missing 정책은 기존에 의도한 단계형 chart 계약에 따라 유지한다. 위아래를 뒤집거나 정삼각형을 강제하거나 값 순서대로 자동 정렬하지 않는다. 공개 `createPyramidPlot`을 제안하고 stage data→trapezoid/segment marks→encoding/labels로 낮춘다. native 문서의 권장 이름은 Pyramid다. 외부 alias를 받는 adapter는 이번 작업에서 만들지 않는다.

외부 자료에 같은 이름의 인구형 막대 차트가 있어도 native 명칭을 그 registry에 맞출 의무는 없다. 인구형 표현은 기존 bar 조합으로 만들 수 있다. 외부 Funnel/Pyramid 문자열 매핑과 ID 충돌 처리는 향후 별도 번역·adapter 프로젝트의 일이다.

| 사용자 표현 | 공개 액션 조합 | 반드시 보강할 공통 계약 | 만들지 않을 전용 기능 |
|---|---|---|---|
| Marginal | scatter + histogram/density + adjacent composition | 주 plot과 분포의 공유 domain, plot bounds 정렬, joint filter/selection, legend owner | 별도 Marginal constructor/mark |
| Bullet | reference bands + actual bar + target rule + text | 같은 척도와 baseline, role별 tooltip/hit/format, target outside domain 정책 | 별도 Bullet constructor/mark |
| Combo | bar/line/point/area + layer composition | 한 frame의 공유 Y scale·domain union·통합 legend·z-order | 별도 Combo constructor, secondary Y 옵션 |

새로운 부족한 기능은 공통 track/grid alignment, guide ownership, shared-domain solver, role/lineage 보강으로 해결한다. 문서/gallery에서 기존 차트 용어로 검색되게 만드는 것은 허용하지만 action catalog에 새 독립 API처럼 등록하지 않는다. recipe가 길어지면 이름 전용 API를 추가하기 전에 공통 조합 액션의 계약을 개선한다.

### F.11 단일 Y축 정책의 실제 enforcement

정책 단위는 전체 canvas가 아니라 Cartesian frame ID다. 각 overlay layer는 동일 Y scale resource를 참조하고 domain은 참여 layer의 값에서 공통 규칙으로 계산한다. 축을 오른쪽으로 옮기는 것은 가능하나 왼쪽과 오른쪽을 동시에 표시하지 않는다. 같은 scale을 복제한 mirror axis도 이번 사용자 정책에서는 금지다. axis를 숨긴 독립 scale, 양쪽에서 다른 단위를 쓰는 label transform, 보이지 않는 두 번째 frame을 겹쳐 놓는 우회도 금지한다.

서로 다른 단위의 두 measure는 기본적으로 shared-Y overlay를 거절한다. 사용자가 명시한 정규화/표준화와 제목·단위 변경을 포함한 새 데이터 변환이면 하나의 척도로 표현할 수 있지만 source-equivalent로 승격하지 않는다. 별도 adjacent/facet panel은 각자 한 Y scale을 가질 수 있다. x/x2 또는 y/y2 range endpoint는 같은 scale의 하한/상한이므로 금지 대상이 아니다. polar radius/angle, geo latitude/longitude도 Cartesian dual-Y로 오판하지 않는다.

검사는 ① native API admission ② action options/schema ③ composition scale-resolution ④ materialized frame/guide inspection ⑤ saved program load/edit와 runtime update의 다섯 경계에서 실행한다. `E_POLICY_MULTIPLE_Y_SCALES`와 `E_POLICY_MULTIPLE_Y_GUIDES`는 owner/frame/source pointer/허용 대안을 반환한다. 외부 참고 예제의 `resolve.scale.y:'independent'`는 layer인지 facet인지 구조를 보고 판정한다. 단순 문자열 grep로 전체 spec를 제외하지 않는다. 외부 dialect/default resolution은 번역 프로젝트에서 처리하며 이번 native 검사 의무가 아니다.

기존 저장 프로그램의 정책 위반은 원본을 지우거나 조용히 shared scale로 다시 저장하지 않는다. load 시 profile admission 오류와 원본 보존, 명시적 재표현 export를 제공한다. 현재 버전 소스를 이번 문서 수정으로 변경하지 않는다. 향후 API migration은 기존 grammar의 유지/오류 경계를 type·schema·문서·runtime에서 일치시키고 새 profile에서 금지 경로가 노출되지 않게 한다.

### F.12 구현자가 따라갈 순서와 release gate

1. WP-26 자체 설계 정책과 frame 의미를 고정한다. 외부 원장은 참고로 보존하며 필수 의존성에서 제거한다.
2. WP-02/03/04/06 위에 WP-22 partition, WP-24 graph inference를 구현한다.
3. WP-08 graph layout과 WP-24 topology 위에 WP-25 네 bundling method를 구현한다.
4. WP-07/11/12/14의 composition·hit·interaction·animation을 연결하고 resize/revise/save/load/실제 입력까지 검증한다.
5. WP-19 docs/types/LLM과 WP-20 native qualification을 통과한 뒤 WP-21 릴리스로 진행한다. 외부 upstream·adapter·translator·corpus 실행은 선행 조건이 아니다.

각 신규 domain은 schema validator, public action contract, immutable resource, explicit materializer, renderer-neutral graphics, inspector, types, docs, executable recipe, numeric oracle, interaction/frame oracle, clean-package consumer를 갖춰야 한다. 렌더러가 semanticSpec를 해석하는 자동 compiler로 바뀌지 않으며, 순수 action과 DOM/runtime session의 기존 경계도 유지한다.

완료 조건은 **채택된 native capability + 사용자 requirement의 qualification**, 제외 항목의 정확한 비노출, 금지 입력의 정확한 거절, 조합 recipe의 공통 액션 사용이다. excluded/prohibited를 성공 차트로 세지 않고 별도 표에 공시한다. 이 문서와 JSON 원장은 제안/미실행 상태이며 report validation 통과를 신규 알고리즘 구현 성공으로 해석하지 않는다.

### F.13 명시 옵션·진단·캐시 계약

아래는 구현을 시작할 수 있는 **제안 reference preset v1**이다. 성능·미관이 검증된 제품 default라는 주장이 아니다. 좌표는 bounding box의 긴 변을 1로 정규화하고 원래 affine transform을 저장한다. 각 kernel은 inverse mapping 뒤 원래 endpoint를 다시 고정한다. 기본값을 변경할 때 preset version을 올리고 저장된 프로그램은 기존 값을 유지한다.

| 대상 | 제안 기본값 | 검증·변경 규칙 |
|---|---|---|
| partition | leaf-sum, stable ID order, rootVisible=true, padding=0, full-turn, equal-depth radius | 내부 값은 diagnostic; inclusive/own-plus-children은 명시 선택 |
| inference | exact, preprocessing none, missing error, self=false, k/radius/threshold 필수 | kNN 기본 directed; 각 입력 metric 명시, Euclidean numeric default만 허용 |
| HEB | strength=.85, cubic basis, normalized sampling tolerance=.001 | strength0 직선 보장, 최대 subdivision 한도4096/edge; 초과 진단 |
| FDEB | spring=.1, compatibility threshold=.6, cycles6, initial subdivision1, subdivision×2/cycle, initial iterations60, iterations×2/3/cycle, initial step=.1, step×.5/cycle | iteration은 ceil, 최소1. epsilon1e-9. reference mode는 all-pairs, pinned endpoints. normalize scale과 함께 고정 |
| density | grid256, bandwidth=.05, iterations20, bandwidth×.9/iteration, min bandwidth=2/grid, advection step=.005, direction ignore | gradient norm≤1e-9이면 이동0, endpoint pin, bilinear grid sample; 각 iteration equidistant resampling |
| edge-path | maxStretch2, lengthExponent2, direction respect | geometric length 검증; directed input의 역방향 route 금지, 비용 tie는 stable edge ID |

KDE의 기본 smoothing은 interior point에 [1,2,1]/4 한 pass, endpoint는 고정한다. resampling 간격은 min(bandwidth/4,1/grid), 최대4096 samples/edge다. exact method 이름이 원 논문 구현과 다른 수치 결과를 내면 algorithm profile에 변형과 이유를 명시한다. 알고리즘 reference 시험은 고정한 수학·수치 옵션을 사용하고 balanced preset의 미관 평가와 분리한다. GPU/worker 수와 플랫폼 차이에도 정해진 수치 tolerance를 지켜야 한다.

허용 옵션의 범위를 제안 schema에 넣는다: strength/compatibility는 [0,1], maxStretch≥1, lengthExponent>0, bandwidth/step>0, iteration/cycle/grid 정수 양수. 최대작업량 기본은 maxNodes100000, maxEdges1000000, maxCandidatePairs10000000, maxSamples10000000으로 시작하는 자원 guard이며 해당 크기의 실시간 성능 약속이 아니다. 버퍼 할당 전에 estimate하고 초과 시 `E_WORK_BUDGET`를 반환한다. source/profile이 더 큰 입력을 요구하면 사용자가 명시한 budget 확대와 독립 성능 qualification이 필요하다.

공통 진단은 `E_DUPLICATE_ID`, `E_UNKNOWN_NODE`, `E_HIERARCHY_CYCLE`, `E_INVALID_VALUE`, `E_INVALID_METRIC`, `E_K_OUT_OF_RANGE`, `E_WORK_BUDGET`, `E_POLICY_MULTIPLE_Y_SCALES`, `E_POLICY_MULTIPLE_Y_GUIDES`를 구분한다. 결과에는 severity, code, owner ID, source pointer, option, observed value, allowed range, repair alternative가 포함된다. source-blocked/unsupported/policy-excluded/approximate/nonconverged를 모두 warning 하나로 합치지 않는다.

캐시 key는 algorithm+version+options hash, input resource ID/revision, preprocessing parameters, hierarchy/graph/layout revision, coordinate transform/projection/clip revision, output precision이다. 색·선택 강조처럼 routing에 영향을 주지 않는 style 변경은 route를 다시 풀지 않는다. node 크기가 endpoint attachment만 바꾸면 route anchor와 trimmed display path 중 영향을 받는 단계만 갱신한다. font 변경이 node layout 크기를 바꾸면 layout→route invalidation을 수행한다. cache hit도 provenance를 유지하며 cache 자체를 ChartProgram persistence에 직렬화하지 않는다.

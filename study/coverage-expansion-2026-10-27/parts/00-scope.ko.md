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

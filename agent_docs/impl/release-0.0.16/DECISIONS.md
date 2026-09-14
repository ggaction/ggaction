# 0.0.16 공개 계약 결정안

Gate state: `ready-for-review`

## 진행 상태

- [x] 31개 개선 항목 전체 구현·릴리즈 요청 확인
- [x] 기존 API 오류 수정의 독립 checkpoint 검증 및 원격 반영
- [x] 보고서에서 미정이었던 설치·저장·신규 API 계약 구체화
- [ ] 이 문서의 구체적 계약 승인 기록
- [ ] 승인된 계약 구현·타입·문서·패키지·통합 검증

범위 승인은 사용자 요청 “싹다 고치고, 0.0.16으로 릴리즈”를 재사용한다. 이 Gate는 이미
승인된 입력/축/MCP 누락 수정, 성능 최적화, CI 개선 또는 릴리즈 권한을 다시 묻지 않는다.
아래에서 새로 고정하는 공개 설치 정책·persisted format·메서드만 대상으로 한다.

## 1. 선택적 Node 의존성 — 항목 16

`ggaction`, `ggaction/basic`, `ggaction/svg`는 별도 native/MCP 설치 없이 동작한다.
`@napi-rs/canvas`와 `@modelcontextprotocol/sdk`는 optional peer dependency로 옮기고 개발
환경에서는 devDependency로 설치한다. 기존 entry와 `ggaction-mcp` executable 이름은 유지한다.

```sh
npm install ggaction
npm install ggaction @napi-rs/canvas
npm install ggaction @modelcontextprotocol/sdk
```

첫 줄은 browser/Canvas/SVG 소비자, 둘째는 Node PNG/PDF, 셋째는 MCP 소비자다. 해당 선택
기능을 호출할 때 dependency가 없으면 패키지 이름과 설치 명령을 포함한 오류를 반환한다.
의존성을 실행 중 자동 설치하지 않는다. companion package를 새 이름으로 발행하지 않는다.
이는 기존 Node/MCP 사용자의 설치 절차가 달라지는 변경이므로 migration과 릴리즈 노트에 명시한다.

## 2. 메모리 렌더링 — 항목 29

```typescript
// ggaction/png, Node-only
renderToPNGBuffer(program, options?: { pixelRatio?: number }): Promise<{
  buffer: Uint8Array; width: number; height: number; pixelRatio: number; bytes: number;
}>;
// ggaction/pdf, Node-only
renderToPDFBuffer(program, options?: { metadata?: PDFMetadata }): Promise<{
  buffer: Uint8Array; width: number; height: number; pages: 1; bytes: number;
}>;
```

기존 file 함수는 같은 buffer 생성 경로를 사용한다. buffer는 호출자 소유의 출력 데이터이며
immutable program state에 저장하지 않는다. 옵션·geometry·allocation 검증이 encoding과
파일 쓰기보다 먼저 실행된다. PNG encoding은 backend가 제공하는 asynchronous 경로를
사용하고 Canvas 그리기가 동기 실행된다는 점은 문서에 구분한다.

## 3. 명시적인 원본 revision — 항목 26

```javascript
const next = program.reviseData({
  source: "observations", id: "observationsUpdated", values: nextRows
});
```

`source`와 새 `id`는 필수이며 서로 달라야 한다. 기존 source는 materialized 원본이어야
하고 새 id는 사용 중이면 안 된다. 값을 제자리에서 덮어쓰지 않는다. 새 source dataset을
만들고 해당 원본에 실제로 의존하는 derived chain, mark/composite owner, scale, guide,
label, selection/highlight를 기존 domain materializer로 원자적으로 갱신한다. 기존 layer와
chart owner identity 및 명시한 style을 유지한다. 이전 프로그램은 변경되지 않는다.

Unit program과 retained source가 있는 facet/repeat를 지원한다. Concat의 child 갱신은
기존 `replaceCompositionChild`와 child program의 `reviseData`를 조합한다. 같은 이름의
여러 child source를 자동 선택하지 않는다. Source/field/schema/selection incompatibility는
전체 거부하고 이전 그래픽을 반환 결과처럼 사용하지 않는다. 과거 원본은 자동 삭제하지
않으며 필요하면 기존 `removeData`로 명시적으로 정리한다.

Public trace root는 `reviseData`; source 생성과 각 domain의 rebind/rematerialization은
wrapped children이다. Raw graphic path를 사용자에게 요구하지 않는다.

## 4. 버전 있는 저장·복원 — 항목 27

Browser-safe 별도 entry `ggaction/persistence`를 둔다.

```javascript
const text = serializeProgram(program);
const restored = deserializeProgram(text);
const graphicText = serializeGraphic(program);
const renderOnly = deserializeGraphic(graphicText);
```

Editable과 render-only format을 구분한다. JSON envelope는 `schemaVersion: 1`, `kind`,
생성 packageVersion, 필요한 extension 이름, encoded payload를 포함한다. Plain JSON이
잃는 undefined/non-finite number/bigint는 충돌 없는 tagged value codec으로 보존한다.
Symbol/function/class instance/cycle은 위치를 포함해 거부하며 string으로 조용히 변환하지
않는다. 저장 format은 외부 코드 실행이나 dynamic import 지시를 포함하지 않는다.

Editable payload는 semanticSpec, graphicSpec, materialization configs, resolved scales,
context, trace, retained children와 composition state를 보존한다. 열린 actionStack은 거부한다.
복원 시 envelope, concrete tree, semantic references와 owner consistency를 검증하고
현재 설치된 built-in/등록 extension만 사용한다. 미등록 extension/custom subclass는
정식 복원 adapter가 없으면 거부한다. 알 수 없는 schemaVersion을 최선 추측으로 읽지 않는다.

`serializeGraphic`은 concrete graphicSpec만 저장하고, `deserializeGraphic`은 renderer에
전달할 `{ graphicSpec }`를 반환한다. 이를 편집 가능한 ChartProgram이라고 표시하지 않는다.
trace의 count summary를 원래 인자로 복원하거나 실행하는 방식은 사용하지 않는다.

## 5. 선택적 저작용 폰트 metrics — 항목 18

```javascript
const measured = program.applyTextMetrics({ profile });
const estimated = measured.removeTextMetrics();
```

`profile`은 version 1의 immutable 데이터이며 고유 id, font family/size/weight 조합과
문자열별 width를 포함한다. 실제 측정은 host 또는 선택적 Node 도구가 담당하고 프로그램에는
callback/backend 객체를 저장하지 않는다. Profile 적용은 재계산이 필요한 text owner의
기존 wrapped materialization을 실행한다. Renderer는 이미 정해진 text graphics만 그린다.

Profile에 정확한 문자열·font 조합이 없으면 기존 deterministic estimate를 사용한다.
Profile의 선언된 값은 finite non-negative여야 한다. 설치 시 profile을 clone/freeze하고
같은 snapshot은 이후 host 폰트나 외부 원본 변경에 영향받지 않는다. Remove는 profile을
제거하고 기존 추정 정책으로 재계산한다. Typography 자체를 다른 font로 자동 변경하지 않는다.

## 6. 구조화된 진단 — 항목 28

기존 Error/TypeError/RangeError의 종류를 유지한다. 공통 검증과 named-resource 실패에
안정적인 `code`, `operation`, `optionPath`, `resourceId`, `candidates`, `limit`, `actual` 중
해당하는 필드를 제공한다. 임의의 원본 행·사용자 함수·전체 상태는 포함하지 않는다.
오류 code는 invalid-option, invalid-value, missing-resource, ambiguous-resource,
incompatible-resource, resource-in-use, resource-limit, unsupported-format 범주로 시작한다.
그 외 오류를 메시지 정규식으로 억지 분류하지 않고 action-failed로 표시한다.

새 browser-safe `ggaction/diagnostics`의 `getErrorDetails(error)`는 해당하는 frozen details
또는 undefined를 반환한다. 호출자가 에러 문자열을 parse할 필요가 없게 한다.

## 7. 접근성 보조 데이터 — 항목 30

```javascript
const alternative = exportAccessibleData(program, { target: "sales" });
```

Browser-safe `ggaction/accessibility`의 read-only 함수다. target 생략은 unit의 모든
visible chart owner를 반환하고 composition은 view hierarchy를 유지한다. 결과는
`schemaVersion: 1`, title, views의 collection이며 view는 owner ID, 역할이 있는 columns,
rows, units와 facet/series 정보를 가진다. Bar 집계, histogram bin, error interval,
최종 filter 결과 등 해당 owner의 시각적 grain을 기존 계산 정책에서 읽는다. 임의의 raw
source 표를 최종 차트 표처럼 반환하지 않는다. 지원할 수 없는 owner는 explicit error를
반환하고 일부 view를 조용히 누락하지 않는다. Host가 실제 HTML table, 설명과 ARIA를 만든다.

## 8. MCP packet 의미 — 항목 09/24/25

Task packet을 schemaVersion 5로 올린다. `requiredOptions`는 계약상 필수 및 선택된 branch의
필수 옵션만 담는다. 대표 snippet에 나온 선택 옵션을 필수로 분류하지 않는다. 예제/실제
설정 값은 `exactCalls`와 `appliedOptions`에서 읽는다. 카드/타입/런타임에서 조건부 필수
의미를 공유하고, 명확하게 해석하지 못한 사용자 요구는 원문과 함께 unresolved로 남긴다.
Direct adapter와 MCP의 byte equality 및 6 KiB 제한을 유지한다. 기존 schema 4 소비자에는
버전 확인과 migration을 안내한다.

## 검증 계획과 현재 근거

현재 검증된 독립 수정은 `86f73c8e`(입력 경계)와 `7babe683`(좌표계 assertion)이다.
입력·타입·renderer 82개, 수정된 contract 재검증 85개 중 package를 제외한 84개 및 package
3개, axis unit 29개와 관련 contract 45개를 통과했다. 일반 suite 전체를 한 번 실행해
generic 타입 때문에 영향받은 검사 도구도 수정했다. 최종 통합은 모든 새 기능 구현 후 다시 실행한다.

승인 후 각 계약은 positive/negative type case, round trip·불변성·실패 원자성,
Full/Basic/extension 경계, 실제 installed package 소비자, browser/native output,
문서와 schema freshness를 함께 검증한다. 신규 API는 승인 전 Current 문서·타입·runtime에
추가하지 않는다. 이 문서 승인은 기존 main 보호 우회, tag 덮어쓰기, 다른 패키지 발행 또는
새 외부 서비스 권한으로 확대되지 않는다.

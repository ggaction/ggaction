# 철회된 외부 통합·번역 설계 — 참고 전용

최신 사용자 지시로 구현 의무가 없다. 활성 설계는 보고서 10–11장이다.

## 10. Flint 백엔드로 실제 연결하는 명세

### 10.1 공개 API를 먼저 확보한다

Flint의 `analyzeChart`, `planLayout`, `vegaLiteStages`, `openVegaLiteSession`은 source 파일에 export되어 있어도 조사 시점의 공개 barrel/export 계약에 모두 노출된 것은 아니다. 외부 npm adapter가 private deep import로 내부 구현을 가져오면 버전·bundle 경계가 깨진다. 권장 경로는 Flint에 **backend-neutral 준비 결과를 반환하는 공개 계약**을 추가하고 별도 adapter 패키지가 이를 소비하는 것이다. 이는 제안이며 현재 제공 API가 아니다.

```ts
// 제안 Flint public contract. 이름은 upstream과 확정한다.
interface PreparedBackendInput {
  resolvedChartType: string;
  structure: ResolvedChartStructure;
  appliedTransforms: readonly TransformProvenance[];
  normalizedData: readonly Readonly<Record<string, unknown>>[];
  fieldSemantics: readonly FieldSemantic[];
  resolvedEncodings: ResolvedEncodings;
  resolvedDesign: ResolvedDesign;
  layout: ResolvedLayout;
  chartProperties: Readonly<Record<string, unknown>>;
  provenance: SourceProvenance;
  diagnostics: readonly Diagnostic[];
}
function prepareChart(input: ChartAssemblyInput, context: {
  profile: CompatibilityProfile;
  availableSize: { width: number; height: number };
  textMetrics: TextMetricsProvider;
  resources: ResourceManifest;
}): PreparedBackendInput;
```

`FieldSemantic` 등 위 타입의 구체 필드는 기존 Flint 공개 타입과 분석 결과를 기준으로 추출한다. transform 이후 template이 바뀌는 경우 resolved chart type/structure와 변환 provenance를 반환한다. profile, available size, text metrics, theme, pins, title/source가 layout에 미치는 영향을 context 또는 분석 결과에 빠짐없이 보존한다. ggaction의 `ChartProgram`을 Flint core가 알아야 하는 구조로 만들지 않는다. 반대로 ggaction core가 `ChartAssemblyInput`을 알아야 하는 구조도 만들지 않는다. 어댑터의 compiled result는 program + semantic target mapping + diagnostics이며, mapping은 geometry를 복제하지 않고 owner/item key만 참조한다.

### 10.2 assembly 순서와 재계산

Flint의 assembly 의미를 보존하는 권장 순서는 다음과 같다. static series 정규화와 encoding override → semantic type/zero/aggregation 결정 → layout mode 선언 → temporal normalization → channel budget·overflow filter → layout 계획 → native action materialization → guide/theme/facet/post-process → tooltip/interaction admission이다. templates는 shape를 책임지고 의미 추론을 제각각 재실행하지 않는다. [백엔드 추가 문서](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/docs/adding-a-backend.md)

데이터 변경은 data-dependent 분석을 갱신하고, 크기 변경은 layout-dependent 부분을 갱신한다. theme 변경이 font·geometry를 바꾸면 layout도 invalidation한다. filter·legend hidden이 domain에 미치는 영향은 원계약에 따른다. viewport만 바뀌었는데 source field inference와 aggregation을 다시 선택해 차트 의미가 바뀌면 안 된다. materialization dependency graph에 update reason을 남긴다.

### 10.3 InteractiveRenderer의 전체 계약

| surface | 어댑터가 제공할 동작 | 확인할 시험 |
|---|---|---|
| mount(container,input) | 분석·asset resolve·compile·render·controller 생성 후 renderer 반환 | 중간 취소, 동시 chart, 실패 시 DOM/resource 정리 |
| viewports/getViewports | CategoryViewport 배열: channel/field/orderedValues/visibleCount/totalCount | category window 정확성, readonly snapshot; 연속축 domain과 구분 |
| setViewports | `{x?:startIndex,y?:startIndex}`로 범주 window 시작 인덱스 갱신 | category rail과 동기화, 범위 clamp/reset; 연속/geo는 set-viewport update 사용 |
| layout | 실제 plot/views/block 배치 정보 | nested composition, CSS px, resize 후 갱신 |
| getViewportGeometry(channel) | category rail의 `{offset,extent}` | 전체 plot bounds와 혼동하지 않음; 범주 scrollbar 위치 정확성 |
| getInteractionContext/getState | semantic capability/target/order/filter/selected/hidden/annotation | stale geometry·무효 selection 없음 |
| onChange | previous/state/phase/source와 target을 원계약대로 알림 | render와 emit 순서, unsubscribe, reset |
| resize/relayout | 크기에 맞춰 재배치하고 가능한 상태 유지 | font load, tiny canvas, in-place 결과 의미 |
| refresh():void | host CSS rescale 이후 overlay 재투영 | 동일 data/program에서 좌표 정렬 유지; data 수정은 set-data 또는 재compile 경로 |
| applyUpdate/setUpdates/clearUpdate | 7개 op와 retained/preview entry 처리 | named overlay fold, partial diagnostics, transition settlement |
| warnings | fallback/지원 제약을 수집 | warning을 지워 성공으로 보이지 않음 |
| destroy | listener/timer/asset request/index/widget 모두 해제 | 중복 호출 안전, dispose 후 event/paint 0 |

이 표는 책임을 요약한 것이다. **메서드의 정확한 매개변수·반환 타입은 pinned [InteractiveRenderer 타입](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L94-L135)을 그대로 구현한다.** 위의 내부 제안 controller API와 외부 adapter interface를 혼동하지 않는다. 최소 mount/setViewports/destroy만 만족해도 타입이 통과할 수 있으나 전체 호환성이 아니다.

Geo의 내부 camera resource는 Flint 외부 `set-viewport.value:{x?,y?,region?}`와 `ChartState.viewport:{x?,y?,level?,focus?}`로 양방향 변환한다. camera를 Cartesian 축 의미로 잘못 저장하지 않으면서도 host에게는 기존 필드와 단위·reset·LOD 상태를 반환해야 한다. mapping 함수의 왕복, custom region, level 전환, getState와 실제 화면 일치를 시험한다.

Flint 외부 `DomainValue`에는 Date가 포함된다. ggaction의 저장 가능한 temporal 값은 tagged epoch/단위를 사용하고 어댑터가 fresh Date로 복원한다. 외부 Date를 내부에 그대로 참조하거나 숫자로만 돌려줘 타입 계약을 바꾸지 않는다. time brush, viewport, getState, event의 타입·값 왕복과 caller Date 불변을 검증한다. [DomainValue 계약](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L299-L306)

### 10.4 반드시 수정할 통합 지점

1. `InteractiveBackend` union과 `mountChart` switch에 새 backend를 등록한다.
2. `interactive/spec/compose.ts`에서 backend가 Vega-Lite가 아니면 interaction을 삭제하는 현재 admission을 capability 기반으로 바꾼다. registry에 이름만 넣고 모든 preset이 버려지는 상태를 막는다.
3. template metadata, supported backend 목록, package exports, tsup entry, lazy import와 peer dependency, React prop, gallery/backend selector, generator, smoke test를 연결한다.
4. 공개 renderSvg 및 PNG/PDF adapter 경로, MCP/agent backend enum와 Python wrapper 경로를 점검해 web demo에서만 선택 가능한 반쪽 통합을 막는다.
5. `mountInteractiveChartSurface`를 쓰는 외부 plugin 경로와 built-in mount 경로를 모두 시험한다. surface의 controls, menu, links, annotation widgets가 renderer-private 데이터에 기대는 곳을 neutral context로 전환한다.
6. non-VL backend가 가진 native tooltip/emphasis/treemap behavior는 Flint preset 지원 여부와 별도로 수집한다. 이름이 같은 preset만 이식하고 원래 화면에서 되던 hover가 사라지면 실패다.

현재 비-VL interaction 삭제 근거는 [compose.ts](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/compose.ts#L47-L57), 외부 연결점은 [surface.ts](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/surface.ts#L207-L216)다. 추가 backend 문서의 최소 4개 기본 차트 readiness는 현재 사용자 목표의 완료 기준으로 사용하지 않는다.

### 10.5 출력 형식과 '호환'의 경계

ggaction의 역할은 Flint가 제공하는 chart semantics/design/interaction을 자기 native action과 renderer로 표현하는 것이다. 각 원 백엔드의 사양 JSON·Excel native workbook·Image-Charts URL을 모두 ggaction이 동일 포맷으로 재구현해야 한다는 뜻으로 섞지 않는다. 이런 host export capability가 필요한 경로는 기존 exporter를 유지하거나 명시 adapter를 구현하고, 지원 상태를 구분한다. 특히 Excel native chart를 그림으로 바꾸면서 native 편집 가능성이 유지된다고 주장하면 안 된다.

따라서 완료 manifest는 `chart behavior parity`, `ggaction renderer export parity`, `host integration`, `native external artifact capability`를 별도 열로 가진다. source에서 실제 제공한 export 기능이 사라지지 않게 host route를 유지하는 것도 통합 시험에 포함한다. 새로운 ggaction backend 선택 시 사용할 수 없는 특정 외부 포맷은 숨기지 않고 명확한 route/진단을 제공하며, 합의된 최종 기능 요구에 속하면 구현 미완료로 남긴다.

## 11. chart-llm 전수 번역 파이프라인

### 11.1 원본은 변경하지 않고 해석 기록을 추가한다

파일별 레코드는 source commit/path/hash, canonical hash, schema/dialect, data references, source engine/version, feature pointers, repair ledger, native plan/program hashes, oracle outputs, 검증 상태를 가진다. 현재 1,981개 원본과 1,387개 기존 번역의 crosswalk를 시작점으로 삼는다. 340개의 구조 차이는 pointer별 원인과 영향을 확인한다. selection 제거가 실제 확인된 사례와 empty transform/null aggregate 정규화만 있는 6개를 같은 의미 손실로 단정하지 않는다.

공식 선언 스키마 검사에서 대표 원본 1,981개 중 564개가 invalid다. 이것은 564개를 버려도 된다는 뜻도, 564개 모두 원 엔진에서 실행 불가능하다는 뜻도 아니다. legacy selection, 오탈자, 실험 속성, dialect 혼합은 해당 버전 엔진의 실제 처리와 비교한다. `repair ledger`는 before/after pointer, 이유, 원 엔진 관찰, 결과 변화, 승인된 해석을 남긴다. 의도가 모호하면 여러 가능한 해석 중 하나를 조용히 고르지 않고 unresolved로 유지한다.

### 11.2 전체 단계

`enumerate → scope admission/decision ledger → classify → schema/dialect check → bind/freeze assets → source-engine execute → normalize → action plan → native program → semantic oracle → visual oracle → behavior/time oracle → package replay`를 각각 저장한다. 상위 단계가 실패해도 원본 row를 삭제하지 않는다. 변환기의 grammar support는 데이터가 없는 추상 benchmark에서도 시험할 수 있지만 완전한 원본 재현 판정은 원래 데이터가 있어야 한다.

기존 번역을 사용할 때는 원본 hash가 같은지 먼저 확인하고, 0.0.24 프로그램을 현재 버전으로 재실행한 결과와 원본 reference를 각각 비교한다. accepted artifact와 일치하지만 source selection이 빠진 사례는 `native-executable`까지만 인정한다. 완전 동등한 중복 source는 결과를 공유하되 원본 경로별 증거 row와 source-data binding을 유지한다.

### 11.3 번역 결과의 형태

각 가족은 실행 가능한 단일 ESM recipe, 모든 중간 action plan, data/asset manifest, 원본 사양, semantic/layout oracle, interaction script, frame expectations를 가진다. 간단한 chart는 현재 facade를 쓰고, 특수 chart는 새 도메인 data/layout action을 조합한다. private `_with…` 호출, `graphicSpec` 직접 대입, row 수에 비례한 그래픽 생성 loop, 원본 JSON의 거대한 opaque blob, renderer fallback은 lint에서 검출한다.

LLM이 번역을 보조할 수는 있다. 다만 LLM의 성공 설명을 합격 기준으로 사용하지 않는다. action schema를 검증하고, 모든 원본 feature pointer가 plan 또는 명시적 제외/금지 정책에 대응되는지 검사하고, 독립 oracle을 실행한다. agent용 packet은 선택한 action의 실제 옵션·선행 자원·실패 예·검증 명령을 포함한다. `unknown` 속성을 지워야 더 짧아진다는 제안은 자동 검증에서 실패해야 한다.


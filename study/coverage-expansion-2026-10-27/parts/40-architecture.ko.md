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


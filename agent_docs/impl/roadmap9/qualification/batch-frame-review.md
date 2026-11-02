# Circle column 표현: 구체 검토, 미채택

이 문서는 제품 변경이 아니다. 기존 원100k50ms/P95/100cycle 의무를 유지한다.
현재 compiler 제품은 반환형을 보존한다. 아래 후보는 public frame inspection과 저장 schema를
바꾸므로 그 채택과 제품화는 별도 판단이 필요하다.

## 병목과 범위

기존 원100k prepare 뒤GC 순수sample1300.18/890.98ms 기록은 P95가 아니다. 현재 약120만
freeze와60만owned 등록을 만든다. Compiler clone만 없애도 sampler의 row별 meaning/property/
node/decision/placement는 남는다. 따라서 새 구조는 sampler→scene→graphicSpec→frame meaning
전달 전반에서 구체 수치열을 유지해야 한다. Renderer에서 semantic scale을 계산하거나 lazy
getter로 graphicSpec을 완성하는 안은 제외한다.

## 검토 대상 schema

새 graphic primitive 후보는 `circle-batch`다. 아래 이름은 검토용이며 현재 공개 API가 아니다.

```ts
interface ConcreteCircleBatch {
  type: 'circle-batch';
  properties: {
    x: readonly number[];
    y: readonly number[];
    radius: readonly number[];
    appearance: Readonly<CircleAppearance>; // 기존 circle의 x/y/radius 외 실제 concrete props
  };
}
```

배열은 dense own-data이며 같은 length, finite x/y와 기존 radius 검사를 통과해야 한다. 총 row수는
x.length로 유도하고 별도 count를 저장하지 않는다. 처음에는 같은 concrete appearance와
placement/clip을 가진 **인접** circle만 묶는다. 다른 appearance/placement나 legacy shape가
끼면 run을 끊는다. 순서를 바꾸거나 모든 circle을 모아 새로운 z-order를 만들지 않는다.
단일 batch의 appearance가 gradient/pattern/shadow/outline/blend일 때 기존 per-circle bounded
paint의 의미가 같다는 renderer 검증 전에는 그 속성의 circle은 legacy로 남긴다. 지원을 제거하지
않으며, 그 fallback의 목표 충족을 검증하기 전 전체 SLO 완료로 기록하지 않는다.

Scene 쪽에는 구체 x/y/radius열과 shared topology/offset/clip/clips, exact node key vector가
필요하다. 예: 새 version3의 entries가 기존 node 또는 circle-run이며 run은 `keys`, 위 properties,
shared placement를 갖는다. 기존 version2 nodes의 임의 index 접근과 동일한 public 형태는 아니다.
현재 frame.decisions와 private positions도 row record를 매번 만들면 병목이 유지된다. 검토용
meaning table은 shared `kind/kernel/ownerKey/role`, per-row sourceIndex/targetIndex/itemKey열,
x/y semantic value열과 각 축의 exact immutable sampled scale을 유지한다. Native origin/metrics
vector는 private proof에만 두고 공개/저장 payload에 native 권한을 싣지 않는다. 각 row의 검산은
기존 의미·geometry/decision 계약과 같아야 하고 inspection용 객체를 renderer 경로에서 만들지 않는다.

## 소유권과 숫자 보존

초기 후보는 freeze한 plain numeric arrays다. Mutable TypedArray/ArrayBuffer를 얕게 freeze하여
immutable snapshot으로 취급하지 않는다. 데이터는 sample 중 전부 계산하고 row별 검산 뒤 local
array를 한 번 소유한다. Caller 배열을 stamp하지 않는다. Plan의 정적 owned key/identity열 공유는
가능하지만 새 frame 좌표열은 매번 분리하고 plan은 이전 frame/buffer를 보관하지 않는다.

일반 JSON numeric arrays는 -0을0으로 바꾼다. V8 binary로 확인한 -0/extreme 보존은 저장 형식
결정이 아니다. 저장은 기존 tagged numeric codec의 엄격한 범위/length/work/hash 검산과 연결하거나
동등한 명시적 tag를 설계해야 한다. Prototype의 nodeOrder/propertyOrder는 기존 scene를 byte순서까지
정확히 펼치기 위한 검토 데이터이며 새 primitive schema에 이 보조 필드를 넣기로 결정한 것이 아니다.

## 호환 선택

Root가 확인한 qualification-delivery 원계약54줄은 원1k/10k/100k의 **full-frame sample**을
요구하며 default legacy frame shape를 고정하지 않는다. 원100k의 명시 capacity/format4처럼 새
명시 mode도 검토 가능하다. 해당 mode의 sampler timer 안에서 좌표·appearance·placement·meaning·
native identity가 모두 완결된 backend-neutral immutable frame을 반환해야 한다.4renderer/hit/native/
offline/rebase는 이를 직접 소비해야 한다. Timer 밖 adapter로 graphicSpec을 완성하거나 semantic
계산을 수행하면 원목표 후보가 아니다. 이 해석은 구체 새 schema의 채택을 뜻하지 않는다.

| 영역 | 구체 의무와 미결정 선택 |
|---|---|
| Default sampleTransition | 현재 TransitionFrame(scene2/decisions array/graphic object per row)를 유지하면 새 batch가 주경로가 되지 못한다. Default shape 변경은 명시적인 public 변경이다. |
| 명시 새 format/mode | 기존 v3–v5 반환·저장 호환을 보존하면서 선택 가능하다. 원계약의 full-frame SLO는 default legacy shape를 고정하지 않으므로 같은 원 workload의 full-frame을 timer 안에서 완성하고 모든 직접 소비자가 검증되면 원목표 달성 후보가 된다. Legacy mode 미달성은 별도로 명시한다. |
| Legacy inspection | 명시적 eager expand 함수는 full materialized batch를 기존 row구조로 복원 가능하다. Getter/proxy/lazygraphicSpec 안은 제외한다. Adapter 비용은 측정·문서화해야 한다. |
| SVG | 저장된 x/y/radius를 row순서대로 circle로 emit, 공통 appearance는 동일. Renderer가 semantic state를 읽지 않는다. |
| Canvas/PNG/PDF | 구체 수치열을 row순서대로 직접 draw. 반투명 circle을 한 path에 모아 fill하면 겹침 alpha가 달라지므로 금지한다. PNG/PDF 각각 실출력 검사 필요. |
| Hit/native | Exact batch-row→source identity/origin/metrics 매핑, clip/geometry 검산, topmost order 유지. 복원한 offline에는 native 권한 부여0. |
| Rebase/timeline | Sampled concrete열과 의미표를 함께 endpoint로 받고 current exact geometry 검사. Interrupt/dispose 후 old frame 미보유. |
| Persistence | 기존 v3/v4/v5 reader 유지. New representation version/explicit export downgrade 선택이 필요. Unknown/new representation을 legacy reader가 조용히 해석하면 안 된다. |
| Work/node/byte quota | Logical row와 paint/geometry work로 동일 guard 적용. 물리 container 수가 줄었다고 원100k 비용 guard를 낮추거나 우회하지 않는다. |
| Data/load/revise | 현재 data rows/identity/source fingerprint와 preflight/trace 계약은 그대로다. Graphic batch만으로 load/revise의 row freeze/SHA 비용이 없어지지 않는다. reviseData apply2회 제거는 이 안의 제품 범위 밖이다. |

## 작은 oracle와 남은 검증

현 prototype은 현재 제품의 v3/v4 native, mixed, timeline, timeline rebase, fallback와 rebase
62frame/62110nodes에서 circle-run→legacy scene의 deep equality와 JSON field순서까지 확인했다.
Caller mutation 격리·freeze, -0 및 finite극값의 binary 왕복, 중간 legacy node 경계의 순서도 확인했다.
첫 시도는 node field순서가 바뀌어 JSON 동등성에 실패했으며 nodeOrder 보존 뒤 통과했다.

이 결과는 표현의 손실 없는 묶음 가능성만 보인다. 아직 실제 batch renderer·hit/native authority,
새 저장 reader·resource accounting·50ms 또는100cycle 검증은 없다. 제품화 전 public schema와
호환 경로를 선택하고 owner별 small oracle를 확장해야 한다. 이후 같은 원100k와 모든 렌더러,
반투명 중첩·clip·paint·selected/highlighted row·mixed 및 모든 timeline/rebase로 검증한다.

## 기존 mode의 Public 형태를 유지하는 별도 좁은 후보

Default schema 변경보다 먼저 검토할 대안도 남는다. 원 point run의 decision 필드는 source/target
indices와 identity/kind/kernel로, 해당 결과가 실제 동일한지 매 sample 검산한 뒤 plan별 마지막
vector를 bounded 재사용할 수 있는지 조사할 수 있다. 현재 sampler는 모든 row에 새 placement
offset/clip/clips tuple과 두 sampled-position record를 만들고 곧 private meaning record로 투영한다.
동일 placement의 안전한 공유와 private point meaning의 column projection은 public scene2를 유지할
수 있는 후보다. 기존 scalar 함수의 owned 반환을 raw로 바꾸거나 검산을 생략하는 것으로 해결하지
않으며, 새 private 경로가 기존함수의 검산·errororder·math를 그대로 보존하는 구체 oracle가 먼저다.

이 조합을 해도 매 row의 concrete properties/node/graphic wrapper는 새로 완성해 소유해야 한다.
따라서 이번 원100k profile의 freeze 수를 그만큼 줄일 가능성이 있다고만 말할 수 있으며50ms 달성을
예측할 자료는 없다. 완성container compiler 제품과 이 미채택 대안을 섞지 않는다.

## 명시 호출과 frame 타입 후보

새 API 이름을 늘리기보다 기존 `formatVersion`의 명시 새 값6을 검토 대상으로 제안한다.
이는 숫자 예약/채택이 아니며 현재 제품은3/4/5만 지원한다.

```js
const plan = planTransition({from, to, options: {
  durationMs: 100, easing: 'linear', formatVersion: 6,
  maxEndpointNodes: 200002, maxOutputNodes: 100001
}});
const frame = sampleTransition(plan, 50);
// 이 반환 시점에 graphicSpec, scene, decisions, native meaning은 이미 완결된다.
```

검토용 타입은 기존 frame 반환을 overload로 분리한다. 새 frame의 graphicSpec은 기존 container와
placement order를 사용하되 새 `circle-batch` primitive를 허용한다. Scene와 decisions는 아래처럼
entry 단위로 연결한다. 엔트리의 논리 row 시작점은 앞 entry 길이의 prefix sum으로 유도한다.

```ts
type SampleEntry =
  | { kind: 'single'; node: CanvasTransitionNode; decision: TransitionDecision | null }
  | {
      kind: 'circle-run';
      keys: readonly string[];
      topology: string;
      offset: readonly [number, number];
      clip: readonly [number, number, number, number];
      clips: readonly ConcreteClip[];
      properties: ConcreteCircleBatch['properties'];
      decisions: null | {
        kind: 'semantic-kernel'; kernel: 'cartesian-point';
        ownerKey: string; role: string;
        sourceIndices: readonly number[];
        targetIndices: readonly number[];
        itemKeys: readonly string[];
      };
    };
interface BatchedTransitionScene {
  version: 3;
  width: number; height: number;
  entries: readonly SampleEntry[];
}
interface BatchedTransitionFrame {
  // 동일한 authentic private frame token이 별도로 등록된다.
  graphicSpec: BatchedGraphicSpec;
  scene: BatchedTransitionScene;
  progress: number;
}
```

이 후보는 decisions를 entry에 붙여 scene row와 decision table의 재정렬 불일치를 피한다.
Exact endpoint는 single와 circle-run 모두 `decision(s):null`을 사용하고, 이는 기존 endpoint의
빈 decisions와 대응한다. Interior sample은 각 entry의 decision을 반드시 갖는다. 기존 endpoint
progress/decision 일치 검산을 같은 논리 row 수에 적용한다. Native point semantic run의 source/target/item key열은
keys/x/y/radius와 같은 length이며 기존index범위·identity검사를 전수 수행한다. Role/key/owner는
그리기 입력이 아니며 renderer는 concrete properties/placement만 읽는다.

Private meaning 후보는 `pointColumns:{x:{values,scale},y:{values,scale}}`이며 shared exact owned
scale이 같은 경우에만 run을 유지한다. Per-item timeline이 다른 sampled scale을 요구하면 run을
분리하거나 single로 표현한다. Native origin/metrics의 prepared immutable vectors는 private proof로
등록하고 caller가 만든 유사한 scene나 deserialize된 offline frame에는 native proof를 부여하지 않는다.
이 private table도 반환 전에 완성하고 sample 후 lazily 계산하지 않는다.

## 실행과 검토 경계

기준 source pin은 `aa18606de9146c8cf508cf789948125011ea6ab0`이며 runtime변경0이다.
[작은 oracle receipt](batch-frame-review-evidence/qualification.json)와 실행기 원문을 함께 보존한다.
이 read-only 검토는 plan format6/meaning schema·type overload·legacy adapter를 채택하지
않는다. Root가 concrete review를 판단한 뒤 저장 codec와 소비자 계약을 고정하고 제품 구현을 별도로
진행해야 한다. 사용자에게 승인을 재요청할지 여부는 기존 remainingApproval의 범위를 따르며,
이 기록 자체는 새로운 승인 기록이 아니다.

재현은 evidence의 input.mjs.gz/oracle.mjs.gz를 repository root의
`.artifacts/batch-review-draft/`에 풀고 `node .artifacts/batch-review-draft/oracle.mjs`를 실행한다.
Public API로1k 실제 data를 생성하므로 거대한 숨겨진 snapshot 입력은 필요 없다. Native와 offline
legacy frame이 같은지 먼저 검사한 뒤 scene representation 왕복을 검증한다. 제품에 새 batch
reader/renderer가 없으므로 그 native/offline 증거를 새 mode의 통과로 승격하지 않는다.

Batch의 논리 row 식별은 `(graphic object ID, row index)`로 명시한다. Scene key와 identity열은
그 pair에 대응하며, 기존 source program의 hit 결과 ID는 private exact origin에서 복원한다.
새 mode에서 legacy `graphicSpec.objects[pointId]` 접근을 그대로 제공한다고 약속하지 않는다.
그 필요가 있는 caller는 legacy mode 또는 명시적인 eager inspection adapter를 선택한다.
이는 scene/graphicSpec의 실제 concrete data를 변경하거나 renderer가 scene를 읽는 이유가 되지 않는다.

# 원100k sampler CPU와 후속 구조 검토

상태: 읽기 전용 검토. Source는 제품 pin `fcb84891671a1f7b3427a9f15790809b147dc1d8`이며
새 runtime 변경0, 새 제품 채택0이다. 최신 Geo5 root 통합은 이 source에 포함하지 않았다.
원100k 한 process만 배정 슬롯에서 실행했고 끝난 즉시 슬롯을 반환했다. 기존50ms와 최종
retained-heap100cycle 의무를 낮추거나 완료로 변경하지 않는다.

## 원100k 결과와 비용 귀속

Node24.22.1, `--expose-gc --max-old-space-size=6144`, 원 fixture SHA
`b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`를 사용했다.
이전 root profile과 같은 순서로 prepare→explicit GC→순수 sample timer→100k 독립 좌표 oracle,
이전 frame 해제→GC→Inspector profile의 두 번째 sample→별도 oracle을 실행했다.

| 측정 | 순수 sample | 좌표 oracle | 별도 사항 |
|---|---:|---:|---|
| 첫 호출, Inspector 없음 | 1300.18ms | 16.25ms | prepare 뒤 GC |
| 두 번째 호출, Inspector 있음 | 890.98ms | 13.58ms | stop 응답 2.10ms는 sample timer 밖 |

두 호출 모두100k 좌표가 맞았다. 이 단일 기록은 warm-up·GC·CPU 환경을 통제한 반복 P95가
아니므로 과거1120ms와의 개선비율이나 SLO 통과를 주장할 수 없다. 현재 원50ms와 큰 차이가
남는다는 진단에는 충분하다. [Receipt](sampler-cpu-review-evidence/receipt.json.gz),
[CPU 원본](sampler-cpu-review-evidence/sample.cpuprofile.gz),
[실행기](sampler-cpu-review-evidence/run.mjs.gz).

Profile은 sample subtree 귀속752.04ms, native GC125.25ms, Inspector `post`293.54ms 등을
기록했다. GC는 JS caller stack을 잃으므로 subtree에서 빠지지만 sample timer 안의 GC를
제외해 해석해서는 안 된다. `post`는 timer 밖의 Inspector 제어 구간이며 전체 profile1184ms를
sample 시간으로 보고하지 않는다. Oracle은 Profiler.stop 뒤 실행한다.

| 현재 owner | inclusive | self | 해석 |
|---|---:|---:|---|
| `sampleNode` | 373.17ms | 106.62ms | properties·meaning·node·placement의 row별 생성 포함 |
| `canvasSceneProgram` | 244.08ms | 7.50ms | compile162.75와 final clone73.83 포함 |
| `compile` | 162.75ms | 124.42ms | current node 검증, wrapper·objects 구성 |
| `samplePositionInterpolation` | 112.83ms | 34.54ms | scalar 계산과 row별 결과 ownership |
| `freezeOwned` 합계 | 180.29ms | 180.29ms | 여러 caller의 비용 합계, 상위 inclusive와 중복 |
| `validateConcreteGraphicProperties` | 45.00ms | 21.13ms | 현재 circle의 concrete 검산 |
| `captureFrameMeaning` | 25.42ms | 15.04ms | current decision/source·native owners 확인 |

따라서 작은1k profile에서 크게 보였던 capture를 현재 최대 병목으로 선택하지 않는다.
Background index·native owner list의 bounded 재사용은 검토 여지가 있지만, 현재 capture 전체를
없앤 가상 경우에도 약25ms 범위일 뿐이다. 현 decision/native 검산을 제거하거나 더 큰
retention 경계를 늘려서 이 작은 영역을 먼저 최적화하지 않는다.

## 현재 표현의 row별 비용과 한계

실제1k의 후속 후보 전 counter는 clone31회지만 core owned 등록6044회, 전체 Object.freeze
12053회다. Position x/y 결과2006 freeze, point sampler8000, decision vector 부근1006,
compiler wrapper1001 등이 포함된다. 이는 stack으로 분리한 실제 호출 수이며 logical resource
work나 비용 guard로 재정의하지 않는다.

각 point는 x/y sampled 결과, `{value,scale}` 두 meaning과 그 부모, properties, node, decision,
compiler wrapper를 만든다. Placement offset/clip/clip-list의 새 tuple도 별도로 동결한다.
현재 point sampled x/y 결과는 곧 meaning으로 투영되지만 private sampler의 owned 반환 계약이
있다. 그것을 raw/frozen-only로 바꾸거나 node/properties ownership을 삭제하는 안은 제외했다.

100k이면 대략120만 freeze와60만 ownership 등록이 유지된다.50ms 전체 예산은 row당0.5μs이며,
이 모든 freeze만으로 나누어도 호출당 약42ns다. 이는 불가능성의 수학적 증명이나 V8 하한은
아니다. 그러나 현재 clone 수만 줄여서50ms가 가까워졌다고 판단할 수 없음을 보여준다.
Compiler244ms와 capture25ms를 모두 없앤다고 가정해도 나머지 측정 경로가50ms보다 훨씬 크다.
상위/하위 inclusive 중복은 빼지 말아야 하며 이런 가상 잔여는 성능 보장이나 절대 하한이 아니다.

## 가장 큰 남은 container projection의 최소 후보

[Loader](sampler-cpu-review-evidence/loader.mjs)는 source를 수정하지 않고 compiler만 바꾼다.
`objects` 전체를 마지막 `cloneAndFreeze`가 다시 Object.entries로 복사하는 부분과, compiler가
자체 생성한 ID-only children 배열의 두 번째 순회를 줄인다. 새 cache·API·schema는 없다.

1. Compiler는 생성 순서대로 raw group/borrowed·translated node wrapper만 작은 pending list에
   모은다. 이미 owned props를 가진 wrapper는 현재 제품과 같은 직접 ownership을 유지한다.
2. 모든 기존 node/clip 검증과 geometry translation이 끝난 뒤 pending 순서대로 처리한다.
   Local group의 children은 compiler가 넣은 string ID만 있으므로 직접 core-owned로 동결한다.
3. 각 raw object는 기존 `cloneAndFreeze`로 snapshot한다. 원래 경로
   `state.graphicSpec.objects.<id>`를 전달해 오류 class/message/순서도 유지한다.
4. 모든 child가 owned가 된 후 새 local objects dictionary·order·graphicSpec·program record를
   직접 owned로 동결한다. Caller scene/properties를 stamp하거나 반환 시점을 늦추지 않는다.

| 경계 | 현재·후보 모두 지키는 증거 |
|---|---|
| Mutable/raw caller | snapshotSignature의 own data/getter 검산, 변경 시 재컴파일, caller freeze/stamp0 |
| Translated props/path clip | 기존 raw clone, 생성 순서, clone 경로 그대로 |
| Final graph | 완성된 모든 child core-owned, 즉시 fully materialized graphicSpec,4renderer 같은 output |
| Native/hit/offline | 원 frame authority와 validation/work 그대로, compiler가 새 권한을 발급하지 않음 |
| Lifetime | 추가 cache0, pending은 호출 local, earlier frame·program을 보관하지 않음 |

| 1k counter | 원본 | 후보 |
|---|---:|---:|
| clone | 31 | 26 |
| clone이 읽는 record key 합계 | 1031 | 26 |
| clone이 읽는 array slot 합계 | 9011 | 8009 |
| core owned 등록 | 6044 | 6044 |
| Object.freeze | 12053 | 12053 |
| WeakSet.add | 6076 | 6071 |
| WeakSet.has | 17145 | 16136 |

Clone 횟수보다 큰 dictionary/children의 이중 순회가 사라지는 점이 이 후보의 목적이다. 반면
per-row output 생성·freeze·ownership·current validation은 그대로이므로50ms의 주된 구조 해법은
아니다. 후보의 원100k 시간은 측정하지 않았으며 위244/73ms 전체가 사라진다고 주장하지 않는다.

후보는 실제1k v3/v4 whole frame·native positions·offline·batch·sampled rebase·geometry/color
 timeline 및 timeline rebase·mixed GeoText·fallback의 work/wire 동등성을 통과했다. Boundary는
7 compiler types, getter0회, mutable 갱신, translated/partial-owned props, function+뒤 invalid node의
오류 순서를 비교했다. 현재 plan과 다음 frame을 유지한 채 이전 frame/scene/graphicSpec/decision
vector/decision/node/props/wrapper8refs는5GC 후 baseline/후보 모두0개 생존했다.
Owning animation/hit/renderer1294개와 별도4-renderer 검증은 qualification에 기록한다.

## 50ms를 향한 구조 검토 범위

현재 public frame shape를 그대로 지키는 소규모 최적화의 효과는 각각 측정해야 한다. 이번
compiler 후보를 제품화할 수는 있으나 이것을 연쇄 적용하면50ms가 달성된다는 계획으로 삼지
않는다. 다음 구조 검토는 row별 JS record/freeze 수 자체를 줄이는 수단을 구체화해야 한다.
다음은 **미채택 설계 범위**이며 새 batch/lazy API를 구현하거나 승인받았다는 뜻이 아니다.

- Canonical scene/graphicSpec에 backend-neutral point batch를 정식으로 표현한다면 x/y/radius 등
  모든 현재 좌표를 sample 안에서 완전히 계산하고, immutable column과 exact row identity를 함께
  저장해야 한다. 렌더링할 때 의미를 해석하거나 graphicSpec을 지연 생성하는 방식은 제외한다.
  공개 mutable TypedArray/ArrayBuffer를 immutable state로 취급할 수 없으므로 숫자 배열의
  deep ownership 또는 별도 안전한 snapshot 계약을 구체적으로 정해야 한다.
- 현재 scene node와 graphic wrapper를 각각 row마다 만드는 부분을 함께 줄여야 한다. Compiler만
  batch로 바꾸고 기존 sampled node/props/decision/temporary 결과를 전부 유지하면 큰 비용이 남는다.
  기존 `frame.scene.nodes`와 `graphicSpec.objects`의 shape를 exact 유지하면서 row record를
  만들지 않는 것은 서로 맞지 않으므로 공개 타입·inspection·save/replay의 material decision이다.
- Canvas·SVG·PNG·PDF 모두 동일한 concrete batch를 읽어야 한다. Scalar와의 pixel/primitive
  equivalence, clip와draw order, opacity/paint/image/shadow/weighted source 및 혼합 family 경계를
  명시한다. 빠른 Canvas만 만들고 다른 renderer를 unsupported로 만드는 안은 제외한다.
- Hit/native는 exact row index·identity·origin/metrics를 batch와 결합해 현재 geometry로 query해야
  한다. 전체 source program/history를 숨겨 보관하지 않고 sampled rebase·timeline interrupt·dispose·
  offline rejection 권한을 보존한다. Borrowed/copy/frozen/forged token에 권한을 발급하지 않는다.
- Offline에는 기존 v3/v4 reader 호환과 새 저장 표현/명시 version 또는 lossless adapter 범위를
  정해야 한다. 저장 변환만 legacy scalar로 펼칠 수 있는지와 그 비용도 명시한다. Logical row/work/
  bytes guard를 물리 container 수가 줄었다는 이유로 완화해서는 안 된다.
- 최초 eligible 범위는 원100k fixture의 exact native circle scale 이동으로 좁힐 수 있으나 다른
  paint/shape/clip/mixed 경로의 지원을 제거하지 않는다. Fallback과 출력을 위한 명시 경계 및
  동일 원 workload50ms·P95·100cycle·4renderer/installed archive 검증 의무가 필요하다.

이 범위는 아직 prototype·채택 이전이다. 현재표현을 유지할지, canonical batch를 새로 정의할지는
구체 schema·reader·renderer/hit 호환 표와 실제 소형 oracle을 만든 후 기존 승인 범위와 material
departure 여부를 root가 판단해야 한다. 사용자 요구를 축소하는 closeout 근거로 쓰지 않는다.

# Prepared scalar mapping + local position record 검토

상태: `ready-for-review`. 제품 source/API/schema/guard 변경0. `b3da444d7` source를
Node loader로 변형한 읽기 전용 실행 증거이며 제품 채택이나 완료 기록이 아니다.
[포괄 승인](../AUTHORIZATION.json#remainingApproval) 범위에서 root가 이 구체안을 채택할 수
있다. 별도 사용자 승인 질문은 필요하지 않는다. 원 제안은
[prepared scalar mapping](prepared-scalar-mapping-review.md)이다.

## 정확한 실행 후보

[loader.mjs](scalar-mapper-prototype-evidence/loader.mjs)는 기존 `mapLinearValues`와
`mapTransformedValues`의 scalar callback 및 validator prefix를 실제 source에서 추출한다.
일반 vector 함수 원문은 수정하지 않는다. 위치의 interior mapping만 증거용 private scalar
factory로 연결한다. 따라서 이 증거는 scalar 수식/검산 재사용의 결과를 비교하며, 최종 제품의
공유 helper 추출 자체를 검증한 결과로 오해하면 안 된다.

제품 구현에서는 두 기존 owner 내부의 callback 계산을 각각 하나의 작은 shared helper로
추출해야 한다. 일반 vector 함수의 argument/default evaluation, pair/clamp/value 검산 순서,
missing/unknown getter 접근 시점, degenerate-domain 분기를 그대로 둔다. Prepared factory만
동일 helper에 이미 검산한 숫자/immutable pair/transform parameter를 넘긴다. 수식을 animation에
복사하거나 일반 vector를 새 prepared factory로 우회시키지 않는다.

`mapping.js`의 private `prepareContinuousScaleScalar`는 accessor/추가 필드/지원 밖 type을
거부하는 closed record 및 ordinary dense pair 검산 뒤 기존 owner validator를 호출한다.
Input/core-owned/frozen/copied 상태가 implicit proof가 되지 않는다. 새 frozen empty token만
private WeakMap의 scalar closure에 접근할 수 있다. Closure는 numeric endpoint/span/clamp,
복사·동결한 pair, 정규 transform parameter만 사용하며 program/plan/frame/row를 저장하지 않는다.
이 token을 package export나 저장 구조에 노출하지 않는다.

Position b′ exact from→to pair의 기존 한 progress slot을 `{progress, scale, mapper}`로 바꾼다.
동일 progress에서 mapper를 재사용하지만 모든 row value를 매번 검산·계산하고 finite를 검사한다.
첫 mapping이 성공하고 finite임을 확인한 뒤에만 slot을 publish한다. Progress가 바뀌면 slot을
교체한다. Context max4, endpoint normalization, exact shared scale 조건, native/offline 권한,
원 work 과금, source/current policy 검산은 그대로다. 실패/collapse는 slot을 만들지 않는다.

## 별도 position record 후보

Root가 제안한 두 return의 `cloneAndFreeze`→`freezeOwned`를 독립 variant로 실행했다.
Endpoint return은 기존 normalize/prepare가 발급한 exact owned `scale`과 primitive value,
기존 vector mapping 결과의 primitive position만 담는 새 closed record다. Interior return도
새 local primitive record와 방금 동결했거나 정확 pair slot에서 가져온 owned scale만 담는다.
따라서 최상위 record를 그대로 core-owned로 등록해도 이전 입력을 stamp하거나 mutable child를
보유하지 않는다. Caller copy/freeze/forgery는 기존 full normalize 경로를 계속 거친다.

이 variant는 객체 구조 복사를 제거하지만 **core-owned 결과를 유지**한다. 일반 shallow-freeze로
바꾸거나 core registry/provenance authority를 완화하지 않는다. Scalar closure와 record 두 변경은
같은 위치 샘플 결과 구성 경계에 있으므로 한 개념 checkpoint로 구현할 수 있으나, 아래 수치와
검증은 각각 분리했다.

## 검증과 한계

[oracle.mjs](scalar-mapper-prototype-evidence/oracle.mjs)는 six types의 domain/range reversal,
clamp, ±0, finite extremos, underflow/overflow, collapse, transform defaults/parameters,
invalid value의 결과 또는 error class/message를 unchanged vector와 `Object.is`를 포함한
`deepStrictEqual`로 비교한다. 별도 literal 기대값도 검사한다. Unknown/missing은 기존 vector
경로에 남기고 prepared closed scale은 unknown 필드를 거부한다. Getter는 실행하지 않는다.

기존 positions + prepared-position-scales owner의 14개 테스트를 두 variant에서 실행했다.
Native prepared, structured copy, shallow frozen, mutable copied child, forged version/context,
getter0, progress 교체/재방문, 실패/collapse publication0 및 finite 성공 후 publication을 포함한다.
추가 90개 native/copy/frozen 샘플에서 반환 record·scale·두 pair의 core ownership, 입력 stamp0 및 변경한 copy 재검산을 확인했다. 이것은 retained-heap 100 cycle 검증을 대신하지 않는다.

실제 1k public point workload는 six types 각각 x scale을 사용하고 y는 linear다.
Native v3/v4, 6개 times, 전체 frame과 position meaning, offline replay/재직렬화, batch,
sampled rebase와 timeline rebase, geometry/color timeline, shape fallback, mixed GeoText composition을
현재 제품과 비교한다. Native/rebase/timeline bytes와 work도 동일성을 검산한다. Linear 좌표는
추가 literal oracle로 1k 모든 row와 모든 time을 검사했다. Other five types의 독립 수학 oracle은
앞의 scalar 및 기존 positions tests가 담당하며 통합 fullframe은 unchanged product와 비교한다.

Linear/time의 실제 1k 단일 sample counter는 다음과 같다. 시간/SLO 측정이 아니다.

| 경로 | core clone | owned add | 전체 WeakSet.add | WeakSet.has |
| --- | ---: | ---: | ---: | ---: |
| 현재 제품 | 6,035 | 10,048 | 16,084 | 39,151 |
| scalar만 | 4,035 | 8,048 | 12,084 | 29,155 |
| scalar + local record | 2,035 | 8,048 | 10,084 | 23,155 |

Log/pow/sqrt/symlog의 기존 transform 반복 검산도 제거된다. Exact 숫자는 type별 집계에 있다.

[결과 집계](scalar-mapper-prototype-evidence/summary.json)가 정확 수치와 source hash를 소유한다.
원100k, source-free archive/browser, owner critical coverage, pure sampler timing/P95, 50ms SLO는
이 읽기 전용 단계에서 실행하거나 달성하지 않았다. 제품 채택 후 필요한 검증으로 남는다.

재현은 repo root에서 Node22.23.1을 사용한다. `SCALAR_PROTOTYPE=1 node --import <loader>
--test test/unit/animation/positions.test.js test/unit/animation/prepared-position-scales.test.js`와
`SCALAR_PROTOTYPE=1 node <oracle>`를 실행한다. `SCALAR_TYPE=linear|time|log|pow|sqrt|symlog
node <product-compare>`는 부모가 unchanged/prepared child를 각각 실행한다.
`POSITION_RECORD_FREEZE=1`을 추가하면 scalar+record variant다. Loader는 source tree만 검사하여
제품 파일을 쓰지 않는다. 최초 time fixture의 temporal fieldType 누락 실패는 별도 raw log로 보존했다.

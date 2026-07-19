# STEP 5 — Scale Consumers and Materialization Policies

## 진행 상태

- [x] Mark completeness와 policy registry 책임 분리
- [x] Scale consumer common reader와 mark-family resolver 분리
- [x] Canvas/scale/data dependency plan의 hardcoded dispatch 정리
- [x] Ordering, deduplication과 incomplete-mark behavior 유지
- [x] Scale, rematerialization와 order-independence tests 통과

Materialization은 계속 wrapped action plan으로 실행되며 implicit semantic compiler를 추가하지 않는다.

## 결과

- Mark completeness는 capability owner, operation/order/defer 결정은 immutable policy registry가 소유한다.
- Scale consumer는 common field reader, mark-family aggregate resolver와 series-layout resolver로 분리했다.
- Categorical appearance/offset 채널이 aggregate mark-family dispatch보다 먼저 해석되는 기존 우선순위를 명시적으로 유지한다.
- Canvas가 연결 scale과 guide를 새로 고치는 규칙은 Cartesian/Polar axis와 grid descriptor가 소유한다.
- Materialization은 기존 wrapped action plan, stage ordering과 deduplication을 그대로 사용하며 normal suite 1,543개가 통과했다.

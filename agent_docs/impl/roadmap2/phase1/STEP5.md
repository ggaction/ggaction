# Roadmap 2 — Phase 1 Step 5: Encoding Reassignment Actions

## 목표

Gate B primitive를 재현하도록 X/Y/color/size/shape encoding의 atomic reassignment를 구현한다.

## 진행 상태

- [x] Shared reassignment selector와 current-binding resolution
- [x] `encodeX` reassignment와 x guide/grid rematerialization
- [x] `encodeY` reassignment와 y guide/grid rematerialization
- [x] `encodeColor` reassignment와 categorical legend rematerialization
- [x] `encodeSize` reassignment와 size legend consumer handling
- [x] `encodeShape` reassignment와 heterogeneous children/legend rematerialization
- [x] Current scale reuse와 explicit new-scale rebind
- [x] Inferred/custom guide title rules
- [x] Shared scale incompatibility와 atomic failure coverage
- [x] Canvas resize와 deterministic materialization order
- [x] Approved user-facing program과 PNG pair
- [x] Public declarations/docs와 conceptual commits/push

## Reassignment 규칙

- Same target/channel의 existing encoding이 있으면 새 assignment가 교체한다.
- Position은 기존 fieldType, aggregate/bin/stack mode와 coordinate를 유지한다. Incompatible mode나 coordinate
  전환은 오류다.
- Omitted scale ID는 current ID를 재사용한다. Explicit new ID는 새 scale을 만들고 consumer를 rebind한다.
- Same scale의 policy 변경은 wrapped `editScale`을 사용한다.
- Color/size/shape는 obsolete named scale을 자동 삭제하지 않는다.
- Inferred guide title은 새 field로 갱신하고 explicit custom title/style/layout은 보존한다.

## Action hierarchy 검증

각 action은 semantic binding을 직접 교체하되 scale 생성/편집과 consumer rematerialization을 의미 있는
wrapped action으로 호출한다. High-level action이 child validation이나 graphical calculation을 복제하지
않는다.

## 완료 조건

- STEP4 primitive와 public `encoding-reassignment`가 exact concrete equivalence를 가진다.
- 각 channel은 단독 reassignment, combined reassignment와 invalid shared-consumer case를 통과한다.
- Constant radius와 field size conflict 같은 기존 contract가 reassignment에서도 유지된다.

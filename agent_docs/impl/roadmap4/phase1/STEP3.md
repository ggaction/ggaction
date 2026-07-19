# Step 3 — B-001 layered datum rule

## 목표

Layer inheritance와 datum full-span rule이 결합될 때 빈 graphic collection을 성공으로 반환하지
않게 한다.

## 진행 상태

- [x] x/y 양축과 field/datum 조합 재현
- [x] explicit data와 inferred data 조합 재현
- [x] inherited endpoint provenance 확인
- [x] datum full-span일 때 inherited opposite endpoint만 cleanup하도록 구현
- [x] shared position semantics와 rule config 연결
- [x] field interval과 direct endpoint 호환 회귀
- [x] Browser Canvas와 Node PNG 검증
- [x] 최소 재현 기반 회귀와 전체 1553 tests 실행
- [x] P1-B 사용자 승인

## Gate

자동 cleanup은 직접 작성된 bounded endpoint를 지우지 않아야 한다. 이를 구조적으로 구분할 수
없다면 명시 오류가 우선이다.

현재 구현은 `markConfigs[rule].inheritedPosition`에 source와 아직 상속 상태인 channels를 저장한다.
직접 encoding된 channel은 이 집합에서 제거한다. Datum full-span cleanup은 반대 channel이 이 집합에
있을 때만 수행하므로 explicit-data rule과 direct endpoint를 건드리지 않는다. Field assignment는
반대 상속 channel을 유지해 이후 `encodeX2` 또는 `encodeY2`가 interval을 완성할 수 있다.

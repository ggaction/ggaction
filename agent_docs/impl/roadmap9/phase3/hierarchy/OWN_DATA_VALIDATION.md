# Hierarchy own-data 경계 감사

## 진행 상태

- [x] Required model/options의 inherited getter 수락 반례 확인
- [x] Required-own guard와 optional own reads로 차단
- [x] 큰 차원 배열의 arity 및 누적 model work preflight 검증
- [x] 독립 literal·immutability·기존 hierarchy 수치·critical floor 검증
- [ ] Public facade·resource registry 검토안 승인 및 구현
- [ ] STEP-020·STEP-077 전체 완료

Public H 검토안 승인 대기 중 이미 승인된 pure hierarchy 계약의 입력 경계만 보수했다.
기존 [inclusive 수정](INCLUSIVE_VALIDATION.md)과 그 증거는 보존한다.
공통 ownData owner의 동작, persisted model shape, public API를 바꾸지 않는다.

## 실제 반례

Object.prototype.nodeSize getter가 있을 때 필수 nodeSize를 생략한 tree options를 기존 kernel은 수락하며
getter를5회 실행했다. Model의 필수 valueMode를 생략한 경우도 inherited getter를3회 읽고 수락했다.
OwnRecord는 plain object의 own accessor를 검사하지만 누락된 속성의 이후 prototype read를 막지는 않는다.

Model/node/diagnostics/ignored-value의 required-own fields를 직접 확인한다. Tree/treemap/order의
필수 옵션도 own 여부를 먼저 검사한다. Optional maxNodes/synthetic은 존재한 own 값만 읽거나 반영한다.
Source adapter와 normalizer의 기존 own read는 이미 같은 원칙을 따르므로 변경하지 않았다.

Tree nodeSize와 treemap size는 정확히2개여야 한다는 기존 계약을 array descriptor 검사 전에 확인한다.
정상 own-data 입력의 좌표·순서·weight·lineage·output shape는 달라지지 않는다.

## 검증

새 `test/unit/grammar/hierarchy-validation.test.js`는 상속 getter를 finally에서 복구하고 읽기0회를 확인한다.
유효한 default 입력은 tree[[0,0],[0,3]], partition[[0,1],[0,1]], treemap child[0,0,90,30]의
독립 literal을 유지한다. 10M 길이 sparse/accessor 배열은 필수 차원 arity 또는 누적 model work 경계에서
상세 검사 전에 거부하며 caller 배열과 모델은 그대로다. Arbitrary Proxy 실행을 sandbox한다는 주장은 하지 않는다.

`.artifacts/validation/hierarchy-own-data/`가 실행 로그를 소유한다.

| 검사 | 결과 |
| --- | --- |
| 모든 hierarchy unit test, Node source coverage | 65 passed |
| Canonical hierarchy7owner floor95/90/100 | 전부 passed; model/order/tree/input/normalize100/100/100, partition100/94.44/100, treemap100/97.53/100 |
| discovery/source/package boundaries 및 artifact40개 | 최초39 passed, unpacked cap만 실패 |
| Package artifact7개 재실행 | 최소 cap 갱신 후 passed |
| Package manifest | 710 entries; packed1,057,281bytes; unpacked4,909,964bytes; 기존4,909,000 실패를 보존하고4,910,000으로만 갱신 |

새 private 모듈 또는 public import edge가 없으므로 entry710, packed1,061,000 및 browser ceilings는 유지한다.
승인 이미지의 정상 입력/수치/graphics는 그대로이며 새로운 시각 target을 만들지 않았다.
H 제안의 pending 옵션·저장 구조·registry를 이 변경으로 승인되었다고 취급하지 않는다.

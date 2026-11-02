# Partition 그룹 동일성 비교 중복 제거

## 진행 상태

- [x] exact-owned 그룹 쌍의 반복 비교 비용 관찰 및 root의 작은 구현 채택
- [x] private 준비 캐시 구현과 equal/unequal/nested/caller-owned 회귀
- [x] animation owning 712/712, focused 44/44, source-free 소비자 검증
- [x] 최종 검증 기록과 commit/push

기준 `def731fe2`. Root가 2026-11-01 기존
[remainingApproval](../AUTHORIZATION.json#remainingApproval) 범위로 동일 그룹 쌍의
반복 `sameConcreteValue` 제거를 먼저 구현하도록 명시했다. 대용량 capacity 및
version4 정책 채택은 이 checkpoint와 별개다.

`partitionTrackPreparation`은 기존 준비 pair를 키로 한 closure의 `WeakMap`에
최초 동일성 결과를 저장한다. `isOwned`로 증명된 두 immutable 그룹의 정확한
객체 참조가 다시 등장할 때만 true와 false를 재사용한다. group 참조가 바뀌거나
caller-owned/shallow frozen이면 다시 비교한다. hash, key, freeze만으로 권한을
추정하지 않는다. 최종 pair/plan/transport에 캐시 필드를 추가하지 않으며 준비가
끝나면 캐시가 해제된다.

공개 API, kernel/version3, 트랙 순서와 진단, 수식, 좌표, work 부과량은 동일하다.
현재 계약과 선언은 관측 가능한 정책 변화가 없어 그대로 두고 provenance만 갱신했다.
`positions.js`는 수정하지 않았다.

## 검증과 한계

[증거 요약](partition-equality-evidence/summary.json),
[owning 712개](partition-equality-evidence/owning.json),
[focused 44개](partition-equality-evidence/focused.json),
[coverage](partition-equality-evidence/coverage.log),
[source-free 소비자](partition-equality-evidence/packed-consumer.json).

- equal/unequal의 5개 항목은 그룹 직렬화 정확히 두 번, nested 두 그룹 10개 항목은
  정확히 네 번이다. caller-owned/shallow freeze와 그룹 참조 교체는 재비교한다.
- native/offline의 모든 작은 nested 항목과 양방향 sampled rebase를 검산했다.
  설치된 tar만 사용하는 소비자는 native 1000셀×4시점의 모든 모서리 4000셀과
  offline 동일 프레임, rebase 9000셀을 검산하고 기본 10000셀 거부를 확인했다.
- focused coverage의 `partitionTracks.js`는 lines 100%, branches 93.94%, functions 100%다.
- 동일 원 10000셀 진단에서 준비는 약116959ms에서3799ms로 감소했다. Animation과
  Partition animation label만 임시로 완화한 별도 진단 번들이므로 성능 SLO 증거가 아니다.
  원 입력 SHA와 모든 guard 호출/최댓값, 10000셀 좌표 검산은 같았다.
  `Partition animation track work` 16950544 및 guide/endpoint 한도는 그대로라
  제품은 10000셀 animation을 여전히 거부한다.
- package unpacked 실측 8026132B에 맞춰 기존8025800B cap을 최소100B 단위인
  8026200B로만 조정했다. entry/packed 및 모든 browser gzip cap은 그대로다.
  animation 설치 번들 gzip332660B는 기존333800B 안이다.
- 기존 offline/rebase 계약의 partition 없는 point 복원 경로가
  `emptyAnimationPartitions`를 검증한다. 해당 owning 계약을 coverage 선택에 포함하여
  critical function floor100을 만족했다.
- 기존 0f38bed7 pinned tar와 새 532c21c8 tar를 동일 source-free 소비자로 검증했다.
  전송 결과 2131841B와 SHA-256 `fe00fae84c405a0e75c48c737cfb755dcd6ab654811bed9b016aea59f25d9342`가 같다.
  [이전 소비자](partition-equality-evidence/baseline-consumer.json)와
  [package/type/discovery 31개](partition-equality-evidence/contracts.json)를 보존했다.

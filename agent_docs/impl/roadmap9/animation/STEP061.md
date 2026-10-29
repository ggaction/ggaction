# STEP-061 애니메이션 준비

## 진행 상태

- [x] 기존 승인 재사용: [remainingApproval](../AUTHORIZATION.json)
- [x] 순수 수치 커널과 변경 경로의 독립 수치 검증
- [ ] item identity·primitive role별 transition planner
- [ ] 정확한 두 endpoint와 typed scene 연결
- [ ] 의미 좌표 및 곡선·partition·graph·Geo 통합
- [ ] 공개 API·타입·Current 계약·소비자 검증

공개 승인 범위 안에서 먼저 내부 수치 커널을 구현했다. `src/grammar/animation/values.js`는 ChartProgram·trace·렌더러·clock을 읽거나 변경하지 않는다. 시간 정규화, linear/cubic-in-out easing, 유한 convex 수치 보간, 양수 scale의 log 보간, 최단 회전(정확한 반바퀴는 양의 방향), 정규화 RGBA의 premultiplied linear-light 보간을 소유한다. 색 커널 버전은 `premultiplied-linear-srgb@1`이다. 끝점은 정확히 반환하며 RGBA 배열은 소유 복사 후 동결한다. 입력 accessor는 실행하지 않고 거절한다.

수치 검증은 구현 함수를 기대값 계산에 재사용하지 않는다. 고정된 중간값과 극단값, 회전 경계, 감마·투명도, 16,128개 색 경계 조합의 유한성·범위를 확인했다. Node 20/22/24 각각 9개, discovery 16개를 통과했다. Node 22에서 커널의 line/branch/function coverage는 모두 100%다. [정확한 로그·측정](numeric-evidence/summary.json)을 보존한다.

패키지에는 내부 모듈 한 개가 추가된다. dry pack은 1,060 entries, 1,509,975 packed bytes, 6,889,438 unpacked bytes였다. packed 상한은 그대로 두고 entries 1개와 unpacked 최소 4KB만 보정했다. 공개 export·타입·ChartProgram 저장 구조·브라우저 진입점은 이 체크포인트에서 바뀌지 않는다. 소스 식별용 생성 문서는 소스 커밋 뒤에 다시 고정한다.

이 체크포인트는 STEP-061/062 완료가 아니다. typed planner·의미 좌표·clock/player·offline payload와 4개 출력 경로·selection/hit/session 연결은 계속 구현한다. 원본 요구는 [animation 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)에 유지한다.

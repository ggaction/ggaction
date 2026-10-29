# STEP-061 애니메이션 준비

## 진행 상태

- [x] 기존 승인 재사용: [remainingApproval](../AUTHORIZATION.json)
- [x] 순수 수치 커널과 변경 경로의 독립 수치 검증
- [x] item key·primitive role 기반 순수 대응과 실제 keyed 데이터 revision 검증
- [x] 실제 graphic-only endpoint의 scene·identity·lineage 투영과 중복 검증
- [x] [그래프 경로의 arc-length 대응·현재 node anchor 보정](routes.md)
- [x] [연속 semantic value·scale 기반 순수 위치 커널](positions.md)
- [ ] item identity·primitive role별 transition planner
- [ ] 정확한 두 endpoint와 typed scene 연결
- [ ] 의미 좌표 및 곡선·partition·graph·Geo 통합
- [ ] 공개 API·타입·Current 계약·소비자 검증

공개 승인 범위 안에서 먼저 내부 수치 커널을 구현했다. `src/grammar/animation/values.js`는 ChartProgram·trace·렌더러·clock을 읽거나 변경하지 않는다. 시간 정규화, linear/cubic-in-out easing, 유한 convex 수치 보간, 양수 scale의 log 보간, 최단 회전(정확한 반바퀴는 양의 방향), 정규화 RGBA의 premultiplied linear-light 보간을 소유한다. 색 커널 버전은 `premultiplied-linear-srgb@1`이다. 끝점은 정확히 반환하며 RGBA 배열은 소유 복사 후 동결한다. 입력 accessor는 실행하지 않고 거절한다.

수치 검증은 구현 함수를 기대값 계산에 재사용하지 않는다. 고정된 중간값과 극단값, 회전 경계, 감마·투명도, 16,128개 색 경계 조합의 유한성·범위를 확인했다. Node 20/22/24 각각 9개, discovery 16개를 통과했다. Node 22에서 커널의 line/branch/function coverage는 모두 100%다. [정확한 로그·측정](numeric-evidence/summary.json)을 보존한다.

패키지에는 내부 모듈 한 개가 추가된다. dry pack은 1,060 entries, 1,509,975 packed bytes, 6,889,438 unpacked bytes였다. packed 상한은 그대로 두고 entries 1개와 unpacked 최소 4KB만 보정했다. 공개 export·타입·ChartProgram 저장 구조·브라우저 진입점은 이 체크포인트에서 바뀌지 않는다. 소스 식별용 생성 문서는 소스 커밋 뒤에 다시 고정한다.

이 체크포인트는 STEP-061/062 완료가 아니다. typed planner·의미 좌표·clock/player·offline payload와 4개 출력 경로·selection/hit/session 연결은 계속 구현한다. 원본 요구는 [animation 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)에 유지한다.

## Stable identity 대응 체크포인트

`src/grammar/animation/matching.js`는 planner가 한 번 투영한 `{key, role}`만 대응시킨다. 배열 위치나 path 문자열을 같은 항목의 증거로 쓰지 않는다. 반환하는 index는 이미 key로 결정한 두 endpoint의 위치를 가리킬 뿐이다. target 순서의 대응·enter 목록과 source 순서의 exit 목록을 불변 데이터로 반환한다. anonymous primitive는 항상 enter/exit이며, 같은 endpoint의 중복 key·role은 오류다. child namespace를 포함한 전체 key를 보존한다. topology·coordinate compatibility와 kernel 결정은 후속 planner의 의무다.

실제 `reviseData`로 값·순서를 변경하고 항목을 추가·삭제한 point chart에서도 같은 item key가 대응된다. 복합 primitive role, namespace, delimiter 충돌, prototype 형태 문자열, 2,003개 역순 대응, accessor·중복·불변성 경계를 확인했다. 숫자·대응 커널 합계 Node 20/22/24 각각 16개와 discovery 16개가 통과했고, 두 커널의 line/branch/function coverage는 모두 100%다. [정확한 로그와 측정](matching-evidence/summary.json)을 보존한다.

## 실제 endpoint 투영

`animation/endpoints.js`는 native ChartProgram 또는 graphic codec이 이미 소유한
graphicSpec만 받는다. 기존 scene 순회에서 얻은 정확한 node·offset·clip·원 graphic ID를
저장된 item identity와 연결한다. semanticSpec·trace·scale/config를 읽지 않으며 별도
materialization도 실행하지 않는다. 같은 item key라도 stem/body 등 primitive role은 구분한다.
anonymous scene key는 항목 대응 근거로 사용하지 않고, 중복 graphic ID 또는 key·role은
오류다. 실제 topology와 lineage는 그대로 보존하며 typed planner의 호환성 판단으로 남긴다.

추가 8개 검사는 keyed revision·중첩 composition namespace·OHLC role·typed key·graphic codec과
caller ownership 경계를 검증한다. 중첩 장면은 DPR1/2에서 native Canvas와 exact pixels를
비교했다. 숫자·controller·endpoint 합계 Node20/22/24 각각54개와 scene/package/discovery32개가
통과했으며 endpoint coverage는100/100/100이다. 이는 공개 planner 또는 offline animation
완료가 아니며, source-pinned [증거](endpoint-evidence/summary.json)는 같은 checkpoint에 고정한다.

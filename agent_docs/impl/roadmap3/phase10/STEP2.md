# STEP 2 — Shared Temporal Position Reference Contract

## 진행 상태

- [x] Cars 연도별 mean Acceleration grain 확정
- [x] One temporal domain과 shared center mapping 확정
- [x] Bar bandwidth와 scale identity 분리
- [x] Independent numeric oracle 작성
- [x] Missing 1981 temporal gap 보존

Reference contract는 source row를 연도별로 aggregate한 뒤 timestamp 순서로 정렬한다. Temporal scale은 실제
시간 간격을 보존하므로 Cars data에 없는 1981 구간은 두 배 간격으로 나타난다. Bar와 line은 같은 resolved
center를 읽고 bar만 해당 center 주변의 bandwidth를 사용한다. Oracle은 production scale/materializer를 import하지
않는다.

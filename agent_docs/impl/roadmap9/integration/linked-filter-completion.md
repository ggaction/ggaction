# 연결 필터 통합

## 진행 상태

- [x] 전체 승인과 incoming `beb751bf9`의 source/declaration11개 그대로 보존
- [x] source `e1fec372f`에 기존 영역 선택·responsive routes·private 값 kernel 통합
- [x] 집중 coverage381·계약34·패키지7·실제데이터16·browser20
- [x] 같은 tar Node20·22·24 각각 kernel8·runtime23·strict TS/optional peers/5bundles
- [x] source pin 문서192·built170pages/1454LLM·전체320/390/768px browser
- [ ] 검증한 동일 source와 기록의 main 반영
- [ ] STEP060 나머지 기능과 STEP074·077 인수

현재 selection projection/DAG와 native filterMarks/removeMarkFilter를 사용한다. 생성 시 기존 target
필터는 보존하고 다음 관련 source transaction에서 binding이 소유하는 필터로 교체한다. 후보의
unfiltered item 조회→완성 filter→target selection→downstream closure를 외부 중간 상태 없이 한 번
commit한다. origin·cycle·one-writer·cancel·late error 및 숨김/drop을 기존 transaction 경계로 처리한다.
정확한 공개 계약은 Current INTERACTION과 [원 STEP060](../interaction/STEP060.md)에 있다.

native empty final-item filter에서 aggregate Bar/Line selection을 다시 계산하던 결함도 포함한다.
빈 filtered source만 공통 policy에서 빈 items로 처리하고 실제 grain 검증은 먼저 수행한다. Bar의
stack grain 검증은 기존 owner를 공유하며 미완성/미지원 요청의 오류를 숨기지 않는다.

네 interaction owner line/function100%, branch 최저94.25%이며 나머지 owner의 실제 수치와
기존 native89개의 재사용 범위는 [증거](linked-filter-completion-evidence/summary.json)에 구분한다.
Archive SHA256 `8fa1fb2bf03d60448fe24311a1a16f7edf6c6434293f6ff8602ef7100b144df5`는
983entries/1408387packed/6418594unpacked이고 source pin 후에도 byte-identical이다.
Node20/24 Full688226·Basic377519·interaction109145gzip에 측정 최소 상한을 적용했다.
전체 source coverage와 공통 corpus를 다시 실행했다고 주장하지 않으며074·077의 누적 의무를 유지한다.

# Roadmap 8 구현자 인계 — 개정 2

이 문서는 구현을 재현하거나 후속 수정하는 작업자를 위한 상세 인계다. **현재 구현과 통합 검증은 완료됐다.**
2026-09-15 사용자 요청으로 flatten을 제외했다. 유효 기능 ID는
`F01,F02,F03,F04,F05,F07,F08,F09,F10,F11,F12`다. F06/D08/V23–V25를 다시 구현하지 않는다.
기존 fold의 회귀 검사는 계속 필요하지만 이것을 제외 기능의 구현으로 확대하지 않는다.

## 반드시 읽을 순서

1. 저장소 root → `agent_docs/AGENTS.md` → `agent_docs/impl/AGENTS.md` 및 실제 수정 파일의 scope.
2. [ROADMAP.md](ROADMAP.md): 11개 기능, Phase 0–7, 앱/라이브러리 경계.
3. [BASELINE.md](BASELINE.md): 0.0.16에서 확인한 사실. 이 파일의 실패를 현재 구현의 성공 사례로 읽지 않는다.
4. [IMPLEMENTATION_SPEC.md](IMPLEMENTATION_SPEC.md): source/schema/empty/statistics/filter/regression/sort의 정확한 제안.
5. [INSPECTION_SPEC.md](INSPECTION_SPEC.md): 조회·변경 비교·graphic 검사와 성능 구현.
6. [PROPOSED_TYPES.d.ts](PROPOSED_TYPES.d.ts): 계획 시점 타입 스냅샷. 현재 권위는 `types/`다.
7. [IMPLEMENTATION_MAP.json](IMPLEMENTATION_MAP.json): 기존 파일·새 파일·작업 순서·선행·테스트 위치.
8. [ACCEPTANCE_CASES.json](ACCEPTANCE_CASES.json): 43개 인수 사례, fixture와 수치 기대값.
9. [EXECUTION_RUNBOOK.md](EXECUTION_RUNBOOK.md): 실행 명령·체크포인트·재개 규칙.

## 문서의 권위

실제 API의 진실은 현재 source/types/current contract다. 이 폴더는 구현 이유와 재현 절차를 보존한다.
이 폴더 내부에서 상세 의미는 IMPLEMENTATION_SPEC/INSPECTION_SPEC가 소유하고,
FEATURES는 설명용 요약, ROADMAP은 순서, DECISIONS는 승인·호환성을 소유한다.
타입과 동작 문장이 충돌하면 구현자가 임의 선택하지 말고 문서 오류를 먼저 정정한다.
계획 시점 타입과 현재 선언이 다르면 `types/`를 따른다.

## 이번 개정에서 해소한 모호함

| 항목 | 상세 제안의 선택 |
| --- | --- |
| 필드 ID | 기존 name binding 유지; 앱 stable ID는 adapter 책임 |
| schema 모름/0 fields | completeness unknown과 known+fields[]로 구별 |
| 빈 source의 새 차트 | explicit domain 없으면 명확한 진단으로 거절; 임의 범위 생성 없음 |
| 빈 통계 count | null 2행 그룹은 count2,valid0; sum만 identity에서0 |
| report 소유 | `materializationConfigs.calculations`의 typed owner; 원본 행 복제 없음 |
| filter edit | 같은 field/mode의 range만 부분 merge, field/mode 변경은 replace |
| 범주 전체 제외 | 빈 배열로 표현하지 않음; 독립 match-all/none DSL은 이번 범위 아님 |
| regression interval false | band visibility와 별개, explicit CI 옵션 동시 입력 거절 |
| source-follow | 기존 회귀 source point owner에 관계 기록; x/y/data만 추적, group recipe 고정 |
| 정렬 | stable multi-key, code-unit string order, temporal은 명시 timestamp/year 정규화 |
| 조회 | 새로운 browser-safe read-only entry; 프로파일러·추천기·실행기 아님 |
| 미검사 | unknown/unverified 또는 check.not_run; 임의 성공값 금지 |

## 재현 또는 후속 작업의 시작 순서

- git 상태와 기준 revision을 읽고 사용자 변경을 보존한다.
- MAP의 WP01부터 시작한다. Phase 1에 Phase 5 공개 API를 선행 구현할 필요는 없다.
  schema reader는 Phase 1에서 private helper로 작성하고 Phase 5에 동일 helper를 export한다.
- 각 WP의 등록 경로와 negative case를 먼저 적는다. 공통 helper 수정이 Full/Basic 어느 경로에
  닿는지 명시한다. 새로운 authoring action은 Full 우선이며 Basic 표면을 자동 확장하지 않는다.
- D01–D14의 승인·구현 기록을 확인하고 이미 완료된 결정을 반복해서 묻지 않는다. 제외된 D08에는
  구현 작업이나 Gate를 만들지 않는다.

## 완료를 오인하기 쉬운 사례

- `createSortedData`만 만들고 edit/revise/facet/persistence를 빠뜨림 → 미완료.
- inspector가 객체 개수만 세고 guides까지 data item으로 셈 → 미완료.
- describeAction이 모든 기능에 unverified만 반환 → inventory는 있어도 F09 미완료.
- old snapshot을 읽지만 그 뒤 edit가 실패함 → migration 미완료.
- source가 비었을 때 오래된 곡선을 그대로 남김 → empty/follow 미완료.
- baseline 실패를 새 expected error로 복사하여 테스트만 통과함 → 의미 구현 미완료.
- 11개 계획 문서가 존재함 → 계획 완료일 뿐 제품 구현 완료가 아님.

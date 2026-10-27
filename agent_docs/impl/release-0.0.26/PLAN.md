# 0.0.26 최종 통합 릴리스

## 진행 상태

- [x] 사용자의 새 push 포함 통합 및 릴리스 요청을 승인 근거로 기록했다.
- [x] `4b3722767b9ad6a706d118a76b88665342e42a96`까지 병합했다.
- [x] 추가 렌더링/캐시 집중 테스트 27개와 SVG/stroke/discovery까지 확장한 58개 검사가 통과했고 새 파일의 capability 등록을 보완했다.
- [x] 최종 source와 공개 문서/LLM provenance를 동기화했다.
- [ ] 전체 PR 및 main CI와 exact-tag candidate 검증을 통과한다.
- [ ] 검증한 동일 candidate를 npm/GitHub/Pages로 게시하고 공개 해시를 확인한다.
- [ ] 병합이 확인된 원격/로컬 브랜치를 정리한다.

## 후보 교체와 범위

기존 0.0.25 통합 PR #276과 main CI 20개는 모두 통과했다. npm 게시 전에 추가 push `b7ba0856`, `4b372276`을 확인하여 보호 환경에서 대기 중이던 release run 40417272092를 취소했다. 0.0.25는 npm 또는 GitHub Release로 게시하지 않았으며 기존 annotated tag는 변경하지 않는다. 최종 사용자 릴리스는 그 변경 전체를 포함하는 0.0.26이다.

추가 push는 immutable fitting signature와 공통 stroke 결과의 재사용, 필요할 때만 생성하는 SVG resource namespace, 완료된 빈 Canvas isolation preflight의 중복 방지를 포함한다. 기존 immutable 상태, caller-owned 입력 재검증, SVG ID, Canvas 파괴적 작업 전 검증을 유지한다. 새로운 공개 API 또는 영속 schema 결정은 없다.

기존 기능 및 테스트 보강 기록은 [0.0.25 통합 계획](../release-0.0.25/PLAN.md)에 있다. 외부 원본 family 검증이 남은 이슈 #258은 계속 추적한다. Coverage/pixel/diversity 기준을 낮추지 않고 최종 source 기준 필수 검사를 다시 수행한다.

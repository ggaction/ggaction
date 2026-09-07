# 감사 기준선

관측 기준 commit: c0e47da6e213852213bcb04eb19031a1a6a63cd7 (package 0.0.13).

- [action-inventory.json](action-inventory.json): 당시 direct methods 244개와 선언·option metadata.
- [probe-results.json](probe-results.json): 당시 관측 20개, 거부 경계 15개와 지원 대조군 5개. pass=true는 예상한 지원·거부 상태와 일치했다는 뜻이며, 새 기능이 이미 구현됐다는 뜻이 아니다.
- 원래 감사 50개에서 선택한 25개만 현재 PROPOSALS/feature 명세의 범위다. JSON 안의 source replacement 등 미선택 항목은 과거 관측을 보존한 것이며 구현 목표를 추가한 것이 아니다.

이 snapshot은 문서를 작성하면서 새로 실행한 테스트가 아니다. 이후 source가 바뀌면 재현 fixture를 capability tests에 작성하고 현재 결과를 별도로 기록한다. ignored .artifacts의 원본 경로를 향후 테스트의 dependency로 사용하지 않는다.

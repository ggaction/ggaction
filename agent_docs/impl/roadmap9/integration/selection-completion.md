# 선택과 테마 통합 검증

## 진행 상태

- [x] 기존 전체 승인 `../AUTHORIZATION.json` 재사용
- [x] `ff1ff820a` 테마·resource 기반과 `98c3791a6` 논리 항목·범위·수식 선택 통합
- [x] 집중415개·계약41개·inventory7개·문서181개 통과
- [x] 동일 배포 파일 Node20/22/24에서 테마90개·resource/interaction/selection10개, 타입, 선택 peer, browser4entry 검증
- [x] built-site browser 전체 페이지320/390/768px·desktop search 통과

선택 action의 테마 pattern 적용 import와 selection set 규칙 import를 함께 보존했다.
공개 inventory의 actual canonical 측정값을 다시 계산하고 기존 ownership assertion은 유지했다.
새 네 private owner와 수식 선택 선언이 패키지에 포함되며 Basic은 기존 선택 범위만 보존한다.
최종 tar/각 runtime/실측 bundle은 [증거](selection-completion-evidence/summary.json)에 기록한다.
초기 통합 Node20 실측 Full653506/Basic368264gzip bytes를 근거로 ceiling654000/369000을 적용했다.
이 통합은 linked selection·transaction controller·STEP077 완료를 주장하지 않는다.

# Calendar 통합 검증

## 진행 상태

- [x] 기존 전체 승인 `../AUTHORIZATION.json` 재사용
- [x] `e21e40cca` 선택·테마와 `c96637495` Calendar 및 source-resource union 통합
- [x] 집중354/355 후 discovery 기대값 수정16/16, 추가 resource AST 회귀20/20
- [x] 공통 source/package/type/discovery 계약41/41, inventory7/7
- [x] 동일 tar Node20/22/24의 테마90개·resource/interaction/selection/calendar14개, 타입·선택 peer·browser4entry 검증
- [ ] 공통 실제 데이터 생성·격리·factor effect 통합
- [ ] source commit 이후 문서 provenance·built-site·browser 최종 검증

Calendar의 하나의 source-resource revision plan을 유지하고 B2의 unconsumed AST 선택 검증은
최종 native/resource mark union 뒤로 연결했다. Calendar의 최종 cell field가 boolean에서 string으로
바뀌면 소비자가 없는 선택도 revision을 원자 거부하는 독립 회귀를 추가했다. Theme의 emptyFill과
기존 spacing owner, inspection의 appearance와 calendar item grain을 함께 유지했다.

현재 source 검증을 통과했으며 최종 docs 및 common realistic checkpoint는 열려 있다.
초기 문서181/182의 실패는 신규 example이 아직 source commit에 없는 provenance 검사였다.
추가 AST 회귀 최초19/20의 실패는 나눗셈0을 error로 가정한 시험 입력이었다. 기존 표현식은 그 값을
missing으로 처리하므로 실제 boolean-to-string cell field 오류로 교체했고20/20 통과했다.

Node20 실측 Full662620/Basic370736gzip bytes를 근거로 ceiling663000/371000을 적용했다.
같은 tar의 정확 bytes 및 Node별 실행은 `calendar-completion-evidence/`에 보존한다.
STEP057 linked selection, STEP077, 전체 roadmap 완료를 뜻하지 않는다.

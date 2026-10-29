# Resource·guide·inspection 통합

## 진행 상태

- [x] main bf576300b 위에 Contour2a7549a0b, guide geometrye3abd57d9, public inspection121acb6c6 병합
- [x] runtime 집중417·smoke53·회귀수리12, browser5, docs179 검증
- [x] Node20 공개runtime234·tutorial83·types·MCP, 고정 archive Node20/22/24 집중8·types·4bundles 검증
- [x] built docs164페이지·1410LLM 산출물 검증
- [ ] 공통 realistic3파일 최종 검증
- [ ] 수정 inventory 및 built browser 최종 검증
- [ ] 최종 main 반영

[승인](../AUTHORIZATION.json)을 재사용한다. 첫 Contour smoke의 생성 inspection 목록 누락은
공통 generator로 해결했다. Native removeTheme 회귀2개는 light theme와 native default를 혼동한
기대값을 고쳤다. 실제 Flow ribbon은 채워진 면이므로 테두리0이 합법적이다. 독립 analytic oracle에
flow-link 면적 검사를 추가하고 유효·collapsed·nonfinite literal 경계를 검사했다.
최초 realistic 실행의 같은 오류를 보존하며, 이미 로드된 이전 oracle로 진행하던 실행을 종료하고
수정 상태의 세 파일 전체를 다시 실행한다. 미완료 검증을 성공으로 표시하지 않는다.

정확한 command 선택, 고정 tar hash, 최초 실패와 이후 설치 증거는
[summary.json](resource-session-evidence/summary.json)에 기록한다. 초기 archive와 최종 archive는
README의 측정 한도 문자열만 다르고 runtime/type/knowledge 전체 bytes는 동일하다.
초기 Node20 전체 소비자 결과를 그대로 보존하고 최종 archive는 세 Node 버전에서 별도 검증했다.
이 작업은 공개 inspection의 현재 inspect/frame 동작을 통합하며 향후 gesture/selection/history,
STEP050 정책 및 전체077의 완료를 뜻하지 않는다.

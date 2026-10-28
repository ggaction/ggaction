# STEP8 — STEP-013·014·015 통합 종료

## 진행 상태

- [x] 구현 commit 72855612447cf391defdbf6a121a26cc503bb9ce의 clean 전체 필수 검사
- [x] 원격 coverage artifact의 ZIP digest·job·commit·원시 보고서 인증
- [x] AST30함수/49사례와 통계18개 original/revision 독립 기대값 비교
- [x] 새 DATA→parameter→computed→pivot/calendar/LOESS 소비자 회귀
- [x] 개별 completion receipt·consumer cells·승인 근거·후행 의무 분리
- [ ] STEP-016 조건부 인코딩의 source/parameter closure 통합
- [ ] 이후 모든 카드와 STEP-077 최종 검증

이 checkpoint로 **STEP-013·014·015를 완료**한다. 전체 Roadmap9의 완료가 아니다.
Phase0–2/STEP001–012 결과를 보존하며 다음 의존 카드 STEP016을 계속 구현한다.
모든 원시 실행은 구현 commit에서 tracked/untracked 변경 없이 시작하고 끝났다.

## 실행 근거

| 검사 | 결과 |
| --- | --- |
| 전체 unit | 5024/5024, skip0 |
| 전체 contracts | 684/684, skip0 |
| AST acceptance | 49개 case와 standard@1의30함수, expected/actual 일치 |
| Statistics acceptance | 독립18개 original/revision 수치·lineage 비교 |
| Browser | 299/299 |
| Render와 gallery | 272/272 및 gallery216 |
| Installed package | Node consumer196, tutorial68, qualification7 |
| Docs | source164/164, built150pages, LLM1218, desktop 및320/390/768px |
| Metadata·package | 생성물 일치, package 크기/entry 한도 통과 |
| 인증한 CI coverage | 6686tests, fail0, skip1; source96.03/93.68/98.82% |

CI run40723472877의 coverage job122940358960가 성공했다.
Artifact12833201683의 서버 SHA256은
`28ebcff15aaa6a1036868b629cb887477d2618bbb55eb6b471a14ff846d49f83`이며
다운로드한 ZIP과 일치한다. ZIP 안의 receipt/metrics/report는 보관한 원본과 바이트 단위로 같다.
전체 source coverage와 critical-file floors는 기존 policy 그대로 통과했다.
CI Linux에서 한글 fallback font가 없어 해당1개 test를 건너뛴 사실은 유지한다.
같은 commit의 로컬 전체 unit에서는 해당 test가 실행되어 통과했고 skip은0이다.
Verifier는 이 test의 실제 성공 line, discovery와 log hash까지 확인한다.

전체 원격 workflow [40723472877](https://github.com/ggaction/ggaction/actions/runs/40723472877)의
20개 job이 모두 성공했다. [원격 실행 기록](integration-closeout/ci-run.json)은 정확한 구현 commit,
각 job과 step의 완료 상태를 보존한다. realistic (1–7), Node20/22/24 package, Windows/macOS,
Firefox/WebKit, documentation와 coverage를 포함한다.
앞선 ade3dd16 CI의 realistic (6) 실패는 누락된 pivot 직접 호출·옵션 inventory 문제였다.
[수리 근거](statistics/REALISTIC_REPAIR.md)에 최초 실패와 수정 후 검증을 보존했다.
앞선 실패한 DATA CI나2810a8e2 계약 실행은 역사 evidence로 남기며 이번 성공 receipt에 섞지 않는다.

## 원시 evidence와 재현

[files.json](integration-closeout/files.json)이 원시 receipts·logs·수치 JSON·CI artifact의
SHA256과 크기를 나열한다. 각 [progress record](progress/STEP-013.json)는 정확한 실행
command/receipt/log hash와 소비자 근거를 포함한다. 같은 구조의
[STEP-014](progress/STEP-014.json), [STEP-015](progress/STEP-015.json)를 completion validator로 검사한다.

검사는 `execution-plan.json`의 requiredChecks를 사용한다. 재실행은 명시한 구현 commit의
clean checkout에서 receipt의 command를 실행한다. CI verifier source는 이 evidence 안에
보존했으며 첫 인자는 추출한 coverage directory, 둘째 인자는 local clean receipts directory다.
원격 artifact 원본과 모든 추출 파일을 함께 보관했으므로 서버 보존 기한과 무관하게 확인할 수 있다.

STEP-016은 filter·ordered condition·parameter/selection closure를, STEP-024는 calendar의
새 graphical cell/month target을, STEP-074 이후는 최종 qualification을 담당한다.
이 후행 요구를 없애거나 이번 카드의 구현으로 대체하지 않는다.

# 명시적 bootstrap 구간 정밀도 수정 — #229

## 진행 상태

- [x] 공개 0.0.20 / c219b993에서 finite 양수 구간이 0폭으로 변하는 독립 재현
- [x] 원인: 새 bootstrap 결과에도 기존 stableDecimal 12자리 반올림 적용
- [x] 승인된 #219의 정확한 Number/R7 계산을 유지하는 최소 수정
- [x] API·transform 저장 형태·RNG·추출 순서·한도는 변경하지 않음
- [x] 정상/t/오차/표준편차/중앙값 IQR의 기존 출력 경계는 유지
- [x] 독립 literal 및 summary 대조·binary scaling·그룹 순서·singleton·edit/revise/persistence·IntervalPlot/ErrorBand 소비자 35개 집중 검증
- [ ] 전체 단위·계약·문서·차트·패키지·브라우저·실제 corpus 검증
- [ ] 원격 PR 검증·통합·새 버전 배포와 실제 registry 확인
- [ ] 번역 runtime/문서 전환 및 기존 출력 호환성 검증

승인 범위는 [기존 #219 승인 기록](../bootstrap-mean-ci/approval-evidence.json)의
정확한 shared stream / JavaScript Number / R7 수치 계약이다. 새 API나 미결정
설계를 도입하지 않고, 새 bootstrap 소비자에 남아 있던 기존 반올림으로 인한
정밀도 손실을 수정한다. 원래 구현과 현재 문서의 ‘bootstrap에도 기존 반올림’
설명은 이 수치 오류와 함께 바로잡는다. 다른 통계 방식의 과거 출력을 바꾸지 않는다.

## 재현과 근거

공개 0.0.20의 관측값 1, 1.0000000000001, 1.0000000000002,
1.0000000000003, 1.0000000000004 / seed1 / 1000 samples / level0.95에서
summary의 mean/lower/upper는 각각 1.0000000000002 / 1.00000000000008 /
1.0000000000003397이다. interval은 세 값 모두 1로 반올림했다.
새 회귀 검사는 이 literal을 정확히 고정하고 양수 폭과 두 소비자의 정밀값을 검사한다.

번역 작업공간의 `tmp/total1500-bootstrap-interval-precision-published20.test.mjs`는
동일 회귀 4개를 실제 설치된 공개 패키지로 실행한다. 최종 올바른 harness에서
4개 모두 수치 차이로 실패했다. 라이브러리 수정 뒤 집중 35개는 모두 통과했다.
초기 harness의 guides 옵션/x 문자열/단일 면적점 오류는 별도 로그로 보존하고,
최종 재현 결과와 혼동하지 않는다. 차트 픽셀/VLM은 검사하지 않았다.

현재 번역은 공개 0.0.20 / 고정 문서로 수행한 1,212개까지 보존한다.
진행 중 chart1264는 반올림 없는 Summary 경로로 완료했으며, 수정된 미배포 checkout을
번역 runtime으로 소급 사용하지 않는다. 새 버전 전환은 실제 registry와 호환성
확인 후 별도 checkpoint에서만 한다.

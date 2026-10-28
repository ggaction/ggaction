# 그래프와 공통 리소스 갱신 경계 통합

## 진행 상태

- [x] `dc31450c` 그래프 kernel과 `d6263c2e` 공통 리소스 owner 통합
- [x] focused unit 144, boundary 24, 최종 문서·package·navigation 계약 10 통과
- [x] Node 20/22/24 package 측정과 최소 1,000-byte 경계 갱신

런타임 충돌은 없었다. Package cap 충돌은 합산된 실제 artifact 762개, unpacked
5,205,281 bytes, 최대 packed 1,131,413 bytes에 따라 해결했다. Basic cap 326,000의
현재 README·architecture 표를 동일하게 맞추고 Phase 4 카드 번호(017 paint, 018 image)를
정정했다. 이전 수치·실패 로그는 보존한다.

[원시 증거와 해시](prepared-evidence/manifest.json)는 현재 통합의 focused 검사다.
Graph 및 공통 helper의 기존 coverage는 런타임 파일 변경 없이 재사용했으며 새 전체
source coverage나 설치 소비자 전체 검사를 실행한 것으로 주장하지 않는다.

공개 graph 리소스, layout의 graph/hierarchy dispatch, 데이터 revision 재계산과
plot 소비자는 이후 구현 의무다. 이 통합은 STEP-021/032 완료가 아니다.

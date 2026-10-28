# 구조화 paint 통합

## 진행 상태

- [x] 공유 리소스 revision·private graph 기반과 P1 통합
- [x] focused 43, 최종 계약 28 및 Node 22 설치 소비자 검사 통과
- [x] Node 20/22/24 package·browser 크기 재측정

[통합 원시 증거](integration-evidence/manifest.json)는 같은 canonical tar의 Node 22 설치 검사와 세 런타임 크기 측정을 구분한다. Node 20/24 전체 설치 검사는 paint 단독 체크포인트에 있으며 이번 통합에서 반복한 것으로 주장하지 않는다. 첫 설치 명령은 상대 경로로 실패하여 절대 경로로 재실행했고 실패 로그도 보존했다.

런타임 충돌 없이 통합했으며 기존 paint coverage는 변경되지 않은 소스에만 재사용한다. 최종 package cap은 실제 최대 packed 1,145,569 bytes, unpacked 5,256,918 bytes, 770개 항목에 맞췄다. Full/Basic bundle cap은 557,000/333,000 bytes다.

P2 outline·blend·shadow 및 STEP-017 전체 소비자 행렬은 계속 구현 중이다. 이 체크포인트는 전체 paint 카드나 Roadmap 9 완료가 아니다.

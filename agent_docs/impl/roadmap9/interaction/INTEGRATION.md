# Graph view와 private hit 통합

## 진행 상태

- [x] main b3330b70f와 private frame63af304de 통합
- [x] hit/frame/scene/graph filter66개, source/package/discovery33개 통과
- [x] canonical docs 전체 재생성
- [x] Node22/20 package 실측:871entries,5,845,729unpacked;packed1,269,937/1,272,840bytes
- [ ] 실제 mark adapter 및 public session 후속 통합

전체077의 완료 기록이 아니다. 두 branch의 critical coverage families를 모두 보존했다.
Public import graph가 변하지 않아 기존b333 browser 및 설치 증거를 재사용하며, 새 hit owner의
Node3×47/coverage/실제Canvas pixels 증거는 STEP049가 소유한다. 결합 package cap은
871/1,273,000/5,846,000으로 측정값의 최소 단위에 맞췄다.

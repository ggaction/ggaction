# Graph source revision의 좌표 유지

## 진행 상태

- [x] [전체 설계 승인](../AUTHORIZATION.json)의 graph filter/recompute 소비자 범위 재사용
- [x] 구체 정책 기록
- [x] fixed/force coordinates 및 pins의 source revision·restore·edit 연결
- [x] focused regression과 current/types/docs 동기화

## 결정

Graph node를 줄이는 명시 source/recompute revision은 이미 저작한 positions/initialPositions/pinned
배열을 그대로 저장한다. Pure kernel에는 현재 node key에 해당하는 항목만 넘긴다. 사라진 key의
좌표는 dormant authoring intent이며 같은 typed key가 돌아오면 재사용한다. Fixed/initial positions가
현재 node를 빠짐없이 덮어야 한다는 규칙과 모든 저장 좌표의 unique/finite 검증은 유지한다.
새 layout 또는 editLayout에서 좌표 배열을 명시하면 현재 node만 허용하는 기존 검증을 적용한다.
Edit에서 생략한 배열은 기존 intent를 유지한다. Circular와 Flow 계산은 바뀌지 않는다.

별도 history, renderer state, 자동 semantic compiler를 도입하지 않는다. Graph domain의 명시
resource 갱신이 기존 layout materializer를 호출하고 저장 복원은 계산을 실행하지 않는다.
이 선행 변경은 recompute:true 자체의 구현 또는 STEP032 완료를 뜻하지 않는다.

## 검증

집중 Node20/22/24 각24개, 최종 영향 owner81개, source/package/discovery/types34개, docs177개 통과.
변경4파일의 line/function은100%, branch최소90%로 기존95/90/100 floor를 지킨다. 초기 좁은
coverage 대상의 미실행 경로는 기존 graph plot/candidate DAG/Flow 회귀를 함께 실행해 닫았다.
새 restore 검증에서 이미 active key로 제한한 좌표에 중복 membership 검사를 하지 않는다.

같은 고정 archive를 Node20/22/24에 따로 설치해 observed/inferred graph lifecycle2개씩 실행했다.
그 inferred case는 fixed/force source 축소·codec·복귀를 포함한다. 새 source를 사용하는 runtime
fixture는 repository src import 없이 package exports만 읽는다.

실측 Node20 packed1,278,559 및 finalNode22 1,276,206, finalunpacked5,869,633에
기존 packed cap1,279,000은 유지하고 unpacked만5,870,000으로 조정했다.
Full638,151gzip에639,000 cap, Basic362,086gzip에기존363,000 cap을 사용한다.
전체 suite/coverage 및 built browser를 다시 실행한 것으로 주장하지 않는다.
정확 archive/hash와 검사 범위는 [evidence](graph-coordinate-evidence/summary.json)가 소유한다.

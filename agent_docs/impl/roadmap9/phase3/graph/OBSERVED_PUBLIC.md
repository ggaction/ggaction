# 관측 그래프 공개 연결

## 진행 상태

- [x] createGraphData/editGraphData의 명시 node/edge table 역할, typed identity, parallel-edge occurrence identity
- [x] 데이터 revision과 hierarchy/graph의 공통 갱신, immutable 실패, codec 복원 및 Full/Basic 경계
- [x] current 계약·타입·카드·실행 예제·설치 패키지·문서 동기화
- [ ] STEP-021의 공개 graph layout와 node/edge/label plot 연결

[전체 승인](../../AUTHORIZATION.json)을 재사용한다. runtime 기준은 e103977bc, 검증·비교 oracle 수정 기준은 d5e6272f0다. 정확 공개 행동은 [GRAPHS.md](../../../../contract/current/GRAPHS.md)가 소유한다. 기존 private kernel 증거는 보존한다.

## 검증

고정된 runtime에서 전체7294/7294, 관측 graph focused coverage26/26 및 신규4파일 line/branch/function100%, Node20/24의 graph+deep-input14/14를 통과했다. 실데이터3파일15/15에는 실제5개 데이터셋의 관측 record→category 관계와 전체 공개 action lifecycle을 포함한다.

독립 생성 프로그램의 occurrence key에 포함된 allocation namespace는 실제 input dataset과 source row로 증명된 경우만 비교 oracle에서 정규화한다. Graph edge key와 adjacency reference만 바꾸며 user attribute·고아 key·stale provenance를 가리지 않는다. 비교 oracle5/5를 별도로 실행했다. 이 테스트 지원 수정 뒤 전체7294를 재실행했다고 주장하지 않는다.

문서169/169, 빌드153페이지/1293개 selective artifact, 전체320/390/768px·검색 검사가 통과했다. 동일 canonical tar를 Node20/22/24 각각 설치해69개 named check를 통과했으며 문서 생성 후 재포장 SHA-256도 동일하다. archive SHA-256은 `2bb09a3684da1df37794d2d1a4e67d09456b5c977562409968effedd67e6e7ee`다. 실제 package는796entries, 최대1178331packed/5415030unpacked다. Full/Basic/SVG gzip 최대585091/342108/18070bytes로 현재 한도 내다.

원시 로그·환경별 bundle 결과·해시는 [manifest](observed-public-evidence/manifest.json)에 기록한다. 이 기록은 관측 resource checkpoint이며 추론 graph, 공개 layout/plot, STEP-077 전체 완료가 아니다.

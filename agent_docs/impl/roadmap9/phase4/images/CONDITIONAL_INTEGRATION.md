# 이미지·폰트 준비와 조건부 데이터 통합

## 진행 상태

- [x] a9ecf107 조건부 데이터와990315b7 이미지·폰트·grapheme 병합
- [x] 원 시각6종의4renderer 재현과 source/doc/package 검증
- [x] 생성 문서·coverage family·실측 크기 한도 동기화
- [ ] I1–I4 새 공개 설계 응답과 image domain 연결
- [ ] STEP-018·019와후행77개 카드 종료

Runtime/source 충돌 없이 합쳤다. 생성 문서 충돌은 각 canonical source에서 다시 생성했고
critical coverage family는 두 계열을 모두 보존했다. 새 공개 image API를 선행 구현하지 않았다.
집중unit46/46,contract40/40,docs166/166,image renderer1/1(6종과4경로),metadatacheck가 통과했다.
Installed node 198개와 qualification7개 모두 성공했다. 같은 artifact SHA는
`4c67f504a3d9957265f93fa74f8ec87906fe3dbbceaa18cfb563e7c3d27ed4b2`다.

Combined package717entries, unpacked4,948,831, Node22 packed1,065,171,
Node20/24 packed1,067,584bytes로 caps717/1,068,000/4,949,000을 고정했다.
Full/Basic gzip534,627/312,463은 기존 한도 안이다. 처음 entry limit 실패는
[원시 evidence](evidence/conditional-integration/manifest.json)에 보존했다.
Base a9ecf107 원격 CI의 realistic7 inventory 실패는 별도 수리 중이므로 전체CI성공을 주장하지 않는다.

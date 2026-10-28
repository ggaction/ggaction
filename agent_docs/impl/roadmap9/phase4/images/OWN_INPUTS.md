# Asset preparation own-data 보수

## 진행 상태

- [x] Image/font request·host·response·decode·measurement inherited field 반례
- [x] 검사한 own-data snapshot만 읽도록 shared exact record owner 보수
- [x] Node20/22/24·집중coverage·package/boundary 검증
- [ ] 공개 I1–I4 설계 응답·domain 통합

`exactAssetRecord`는 기존 own descriptor/unknown field 검사를 유지하고 null-prototype의 얕은
snapshot을 반환한다. 각 image/font host와 결과 소비자는 이 snapshot만 읽는다. Font identity는
모든 필드를 own으로 요구하고, 없는 license/attribution은 상속값을 보지 않고 생략한다.
호출자가 직접 준 callback은 기존대로 호출하며 Async stage의 abort/hash/MIME/CORS 정책은 유지한다.
더 큰 public data contract나 저장 schema를 도입하지 않는다.

`b1544b7c`에서 검증한 공통 immutable2파일 patch를 그대로 재사용했다. 전체unit5063/5063은
그 commit의 원시 evidence이며 이 branch에서 다시 실행했다고 주장하지 않는다. 이번 private
asset 집중34/34는 Node20.20.2/22.23.1/24.22.1에서 통과했다. Source3owner coverage는
100/98.72/100,100/100/100,100/100/100으로 기존95/90/100floor를 만족한다.
경계40개 중 첫 package1개만 unpacked cap을63bytes 초과했고 해당package7개는 최소cap수정후
전부통과했다. 최초실패는 [manifest](evidence/own-inputs/manifest.json)에 보존했다.

Package706entries, Node20/24 packed1,052,695, unpacked4,881,063bytes이며 unpackedcap만
4,882,000으로 조정했다. Full/Basic gzip527,106/304,934는 기존한도안이다.

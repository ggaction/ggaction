# 깊은 원본 데이터의 불변 복사

## 진행 상태

- [x] 5,000단계 중첩 원본의 createData 재현과 반복 순회 복사
- [x] 순환·함수 오류, sparse array, getter 방문 순서와 caller 소유권 보존
- [x] 전체 unit 5,461, focused 24, boundary 20, 계약 26, 문서 166 통과
- [x] Node 20/22/24 패키지 크기와 Node 22 canonical tar 설치 소비자 검증

구현 commit 6dba81f61은 recursive call-stack에 의존하던 복사를 명시적 stack으로 바꾼다. 변경 경로의 caller 값은 독립 복사하고 이미 library-owned인 값은 재사용한다. 이 수정은 원본 복사만 다루며 저장 codec의 무제한 깊이 또는 계층 계산의 작업 한도를 바꾸지 않는다.

[원시 결과와 해시](depth-evidence/manifest.json)에 실패 후 수정된 검사도 함께 보존했다. Focused coverage 90.38/91.07/100은 기존 critical floor를 통과했다. 패키지는 770개 entry, unpacked 5,257,384 bytes이며 Node 20/24 packed 1,145,772 bytes, Basic gzip 333,124 bytes의 실측에 맞춰 최소 budget을 조정했다.

## 계층 통합

Source 3f7fa8619에서 hierarchy/image 기반과 통합한 focused 39, 계약 17 및 Node20 package 검사가 통과했다. Basic gzip 342,096 bytes에 맞춰 현재 ceiling은 343,000 bytes다. Full 580,287 bytes는 581,000 안에 있다. 기존 full-unit 및 installed 검증은 위 depth 증거를 재사용하며, 새 통합에서는 변경 경로를 집중 검사했다. [통합 증거](depth-evidence/integration.json)를 별도로 보존한다.

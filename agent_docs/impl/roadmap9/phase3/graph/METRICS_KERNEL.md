# Graph metric private checkpoint

## 진행 상태

- [x] 다섯 metric의 bounded finite 계산과 독립 수치 oracle
- [x] none/standardize/minmax, 결측 error/omit-node와 cosine zero-vector 정책
- [x] typed endpoint와 명시 ruleId의 stable inferred edge identity
- [x] source/coverage/package 경계와 Node 20·22·24 검사
- [ ] source field 추출과 revision provenance, 공개 graph resource/정의 저장
- [ ] kNN/threshold/similarity topology, 해당 mark·selection·renderer 소비자
- [ ] STEP-029 전체 통합 검증

전체 실행 승인은 [AUTHORIZATION](../../AUTHORIZATION.json)에 따른다. 이 변경은 공개 API,
저장 schema 또는 시각 출력을 추가하지 않는 pure 계산 준비다. 현재 계약이나 STEP 상태를
완료로 승격하지 않는다. Base는 `ade3dd16`이며 검증 입력 hash와 원시 로그는
[manifest](metrics-evidence/manifest.json)에 보존한다.

## 계산 경계

`metricPolicy`가 euclidean/manhattan/cosine/jaccard/great-circle과 dense 입력을 검증한다.
`metrics`는 scaled/compensated norm과 dot product를 사용하며 표현 가능한 유한 결과를
보존하고 실제 overflow를 거부한다. 대권 거리는 경위도 순서, mean radius 6371008.8m와
haversine이다. 자카드는 typed scalar 집합을 비교하며 빈 집합끼리 유사도1이다.

`preprocess`는 전체 유효 node로 population standardization 또는 minmax를 계산한다.
통계는 overflow를 피하는 scale/center/spread 형태로 보존하고 상수 열은0이다. 생략한 node의
원본 index/최초 결측 feature/reason을 남긴다. 다른 invalid 값은 결측 omission으로 숨기지 않는다.
대권·자카드는 numeric preprocessing을 거부한다. Cosine zero policy는 전처리 후 다시 검사한다.
결과와 caller 입력을 공유하지 않고 frozen copy를 반환한다.

`inferredGraphEdgeIdentity`는 raw typed endpoint를 한 번 정규화하며 undirected pair는 공통
순서 정책으로 정렬한다. Key는 rule/direction/endpoints로 결정되어 weight나 threshold 변화가
남아 있는 edge identity를 바꾸지 않는다. Self edge와 모호한 direction은 거부한다.
명시 raw/opaque 경계는 후행 graph model adapter가 지켜야 한다.

## 검증과 한도

독립 moderate seeded formula100사례, literal5개 metric, 극대·극소 유한값, 날짜/boolean/tuple
identity, immutable input, invalid descriptor와 work bounds를17개 focused test로 검증했다.
Node20/22/24 모두17/17이고 source4개는 각각 line/branch/function100/100/100%다.
공통 graph critical floor95/90/100을 등록하며 기존 global floor는 그대로다. 경계40/40 통과했다.
최초3실패는 floating point oracle의 exact equality였으며 1e-12 비교로 교정했다.
Runtime을 바꾸거나 tolerance를 roadmap1e-9보다 느슨하게 하지 않았다. 실패 로그도 보존했다.

Package는705entries, unpacked4,867,348bytes, Node22 packed1,046,058bytes다.
Node20/24는 PATH까지 해당 runtime으로 고정하여 각각1,048,251bytes였다. 이전1,047,000
packed ceiling 실패를 보존하고 관측 최대의 최소1,000byte 올림인1,049,000으로 조정했다.
4개 private owner에 맞춘 entry705와 unpacked4,868,000도 적용했다. 최초 absolute-node만 사용한
wrapper 측정은 npm child가 Node22였으므로 cross-runtime 증거로 쓰지 않는다.
설치 Full/Basic gzip526,996/304,841bytes는 base와 같고 기존 browser 한도를 유지한다.

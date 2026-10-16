# Empty retained-schema text binding correction

## 진행 상태

- [x] 기존 filter 결과0행의 알려진 text field가 거부되는 원인 확인
- [x] Empty effective dataset의 known schema field만 기존 schema owner로 확인
- [x] Unknown/removed field, unknown empty schema 및 nonempty format 오류 유지
- [x] 두 encoding 순서, source revision replay, resize/style, save/import, 부모 불변성 검증
- [x] Focused23, unit3048, contracts533, docs120 및 package/installed consumer 통과
- [ ] Stable checkpoint 통합 및 영향 chart 재검증

## 범위와 승인

2026-10-16 부모 작업이 empty derived schema의 기존 계약 확인 후1178 text binding 결함의
isolated fix를 요청했다. 기존 schema 보존 의미와 공개 encodeText.field를 복원하는 수정이다.
새 공개 API, persisted schema 또는 renderer 동작을 추가하지 않는다. Stable7971은 그대로다.

## 변경과 증거

이전 validator는 row만 조사하여 filter 결과0행에서도 retained field를 찾지 못했다.
Effective rows가 비었을 때만 기존 schemaField를 통해 알려진 field를 확인한다. 실제 row가
있으면 기존 formatTextValue 검사와 missing-field 거부를 그대로 유지한다. Empty source의
unknown schema, 요약으로 사라진 field, 오타와 잘못된 format은 계속 거부한다.
Empty text layer 의미는 남고 concrete items는0개이며 placeholder를 만들지 않는다.
Source revision으로 일치 row가 생기면 기존 dependent replay가 실제 text를 materialize한다.

6개 새 회귀와 인접17개 회귀가 통과했다. Unit3048, contracts533, docs120,
package check 및 installed-package consumer가 통과했다. Package565 entries,
793,103 packed bytes / 3,894,904 unpacked bytes로 기존 예산 안이다. 기존 owning contract,
영어 Text Marks 문서, search index 및 LLM 문서를 동기화했다. 차트 픽셀은 보지 않았다.

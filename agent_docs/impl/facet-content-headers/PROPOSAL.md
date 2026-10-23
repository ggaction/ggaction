# Facet 마크 경계를 따르는 헤더

## 진행 상태

- [x] 기존 plot anchor로는 패널마다 다른 마크 돌출을 표현하지 못함을 독립 렌더로 확인.
- [x] 승인 재사용: 사용자가 2026-10-22에 기존·앞으로의 모든 작업 범위 내 질문을 승인했고, 번역에 필요한 ggaction 수정 지속을 요청했다. 이미지 수동 검토 대신 concrete geometry 검증을 요청한 지시도 유지한다.
- [x] 구현·타입·현재 계약·공개 문서·생성 문서 동기화.
- [x] 생성/편집 동일성, 방향/회전, 마크 변경·source/layout 재생, 저장 복원, 기존 출력 호환 검증. [EVIDENCE.json](EVIDENCE.json): normal5268, browser163, packed consumer69.
- [x] 검증된 checkpoint commit/push. 공개 배포는 사용자가 새로 지정한1350개 완료 기준까지 보류. 그때 관련 branch/fix/PR/issue를 통합·정리하고 viewer도 갱신한다.

## 결정

기존 `headers` 및 `editFacetHeaders`에 `anchor: "plot" | "content"`를 추가한다.
생략과 명시적 plot은 기존 배치 그대로다. content는 **plot spacing에서만** 허용하며,
해당 패널의 plot과 semantic mark concrete geometry 합집합을 바깥 방향 anchor로 쓴다.
마크 geometry에는 stroke, collection, 이동, clip이 포함된다. 투명도 변경으로 헤더가
출렁이지 않도록 opacity와 무관한 geometry 기준이다. 축·grid·범례·제목·extension-only
graphics는 제외한다. edge를 따라 정렬하는 기준은 기존 plot span으로 유지한다.

common/role 우선순위, 4방향, 회전, 빈 헤더, immutable 편집을 기존 규칙대로 지원한다.
필드 제목은 기존 plot anchor를 유지하며 이 옵션을 상속하지 않는다. 필요한 마크
돌출량은 기존 header 예약 계산에 포함한다. Canvas를 임의 확대하거나 clip을 제거하지
않고, 공간 부족·겹침은 기존 방식으로 원자 거부한다. canvas spacing과 content 조합은
명시적 오류다. 기존 구성에는 새 default 필드를 삽입하지 않는다.

저장 의도는 기존 `materializationConfigs.facets[id].headers` 한 곳에만 저장하며,
derived bounds는 materialization 중 계산한다. 새로운 액션/primitive/상태 소유자나
renderer 변경은 없다. 이 변경은 독립 full-bounds wrap layout 기능까지 구현하지 않는다.

최소 사용 흐름(이미 plot spacing인 facet에 적용하는 fragment):

```js
program.editFacetHeaders({ anchor: "content" });
```

검증 목표: 상단 점 반지름이 3인 패널만 헤더가 3px 바깥으로 이동하고, 내부 점만 있는
패널은 그대로다. 방향/회전별 가까운 헤더 경계와 content 경계의 간격은 기존 offset과
일치한다. 재생과 저장 복원 결과는 같은 concrete 그래픽을 만들어야 한다.

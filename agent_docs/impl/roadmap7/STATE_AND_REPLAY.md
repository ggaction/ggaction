# 상태·소유권·재실행의 구현 계약

상태: Proposed. 현재 planner stage 이름이나 public schema가 이미 바뀌었다는 기록이 아니다. 아래는 Roadmap7에서 확장할 owner와  필수 순서다.

## 권장 owner map

| 의미 | 보존할 requested state | 계산된 결과 | owner |
| --- | --- | --- | --- |
| Derived definition | source, canonical transform, logical owner/current | values, resolved bandwidth/thresholds, revision ID | data domain |
| Atomic encoding | final layer channels, scale requests | resolved domains/ranges, mark items | encoding + scale domain |
| Aspect/Polar frame | aspect/polarFrame | effective local bounds/center/radius | coordinate |
| Selected labels | source, inline/named membership, placement/layout | selected identities, text anchors/leaders | label owner |
| Statistical reference | source/axis/statistic/population/field mode | scalar/band datum | reference owner |
| Legends/headers | values/block overrides/labelMap/header roles | text/symbols/occupied bounds | guide/composition |
| Theme | base+tokens, propagation scope, explicit overrides | resolved styles/text metrics | theme/composition |
| Corner/cap/join | mark style request | normalized path/stroke attrs/bounds | mark → graphic |

현재 data owner config의 family 경로를 사용한다. 새 범용 `program.state`나 redundant giant cache를 만들지 않는다. 내부 helper 파일 위치는 책임별로 결정하되 public/schema diff는 phase gate에 명시한다.

## 변경 실행기 의사코드

```text
1 resolve public target and stable owner; reject ambiguity/internal-owner misuse
2 normalize requested patch; validate option shape, types, field roles
3 collect current live dependency graph and planned final resource bindings
4 topologically compute affected derived values into immutable working program
5 validate final encoding/scale/coordinate/guide compatibility as a whole
6 materialize effective scale domains + aspect/frame + ranges
7 materialize source mark final items
8 evaluate named/inline selection predicates required by labels
9 materialize dynamic references and source-owned label membership/anchors
10 materialize guides (including exact samples/maps/block styles)
11 run occupied layout / existing text-collision policies and dependent transforms
12 draw selection highlights using latest geometry; reconcile references/context
13 release only unreferenced retired data/resources; return new frozen program
```

Step4는 R02 data editor의 명시적 실행이며 일반 editCanvas가 모든 통계를 재계산하는 compiler가 아니다. Step6의 aspect가 scale domains를 읽고 range에만 영향을 주므로 domain/range 단계를 분리한다. Step9 reference domainContribution=false는 순환 방지다. 기존 planner의 marks/guides/layout/highlights stage 안에서 내부 action ordering을 표현하고 임의 재귀 retry 루프를 만들지 않는다. 기존 layout이 coordinate bounds를 수정하는 경우 requested aspect/frame로 effective bounds만 다시 계산하는 제한된 재실행을 정의하고 같은 input fingerprint 반복은 cycle 오류로 처리한다.

## R02 revision transaction

1. 대상 current dataset의 definition을 읽고 resolved 제거. target이 logical owner/current snapshot인지 검증한다.
2. 직접 bound mark와 하위 derived DAG를 수집한다. default reject이면 하위 derived가 하나라도 존재할 때 실패한다. recompute이면 모든 downstream policy의 replay 가능성을 preflight한다.
3. owner별 fresh revision plan을 배정한다. 원본 source input은 변경하지 않는다. source edge는 편집된 upstream의 새 revision으로 연결하고, 영향 없는 source edge는 그대로 둔다.
4. 각 하위 requested transform을 새 source rows에 실행한다. output role migration은 명시 일대일 role mapping에만 적용. AST 필드 문자열 임의 rewrite 금지.
5. direct marks, guide references, selection/label configs, retained facet/repeat source가 새 current owner를 가리키도록 변경한다. owner-private chart transform은 chart materializer가 자기 schema를 검증한 뒤 replay한다.
6. late error면 새 program을 반환하지 않는다. 이전 program은 건드리지 않았다. 성공이면 R25 reference collector로 retired resources를 해제한다.

Logical owner ID와 revision ID가 같았던 처음 create도 호환한다. stale revision을 public target으로 사용하면 'use current owner' 오류. R02 이전 snapshot은 source/transform/ownership을 확인한 lazy adoption만 가능하며 이름 prefix만 보고 internal owner라고 추론하지 않는다.

## Logical data ID의 후속 사용

독립 derived create가 만든 logical owner ID는 편집 후에도 사용자에게 유효해야 한다. `source`/mark `data`를 받는 공통 data resolver는 먼저 현재 program의 standalone owner registry에서 해당 ID의 current snapshot을 찾고, owner가 아니면 실제 dataset ID를 찾는다. 실제 semantic dataset.source/layer.data에는 해석된 snapshot ID를 저장한다. 다른 program의 registry를 참조하지 않는다.

예: twice owner의 current가 twiceComputedDataRevision1인 after program에서 createSummaryData({source:"twice",...})는 새 snapshot을 사용한다. before program의 같은 호출은 이전 snapshot을 사용한다. 명시적인 snapshot ID가 아직 존재하면 source로 사용할 수 있지만, stale revision을 edit target으로 쓰는 것은 거부한다. owner ID와 다른 사용자의 dataset ID가 충돌하는 생성은 사전 오류다.

R25 removeData({id:logicalOwner})는 standalone owner의 current leaf를 외부에서 참조하지 않을 때 owner registry와 해당 dataset을 함께 제거한다. owner.current 자기 참조는 외부 consumer로 세지 않는다. chart-owned internal data는 이 예외 대상이 아니다. 원본 source나 다른 retained snapshot을 함께 삭제하지 않는다.

## selection/labels의 순환 방지

선택 predicate는 source mark의 final items를 읽는다. labels는 그 selection을 읽지만 source marks의 값/scale domain에 기여하지 않는다. highlights는 label 배치를 바꾸는 predicate input이 아니다. graphic-property selector는 highlight 이전 source geometry를 읽는다. selection이 label을 target하고 source label 생성이 그 selection을 참조하는 순환은 사전 거부한다.

## reference registry의 최소 경로 표

| resource | 직접 경로 | 숨기 쉬운 추가 경로 |
| --- | --- | --- |
| data | layer.data, dataset.source | data owner current, chart-owned data, retained composition source, statistical population |
| scale | ordinary encoding.scale | parallel.dimensions[].scale, x/yOffset, legend binding/recipe, source-bound references |
| coordinate | layer.coordinate | annotation space, guide placement, retained source, local child coordinate recipe |
| mark | label.source, selection.target | statistical source, highlights, chart facade ownership |
| selection | highlight.selection | R32 named label membership |

각 owner가 구조화된 ref를 반환하는 작은 collector를 제공한다. semanticSpec 전체 문자열 검색은 field와ID가 우연히 같은 것을 오인한다. historical trace와 현재 retained source를 구별한다. 새 feature PR마다 registry tests를 추가하고 마지막 R25에서 전수 일치 검증한다.

## 복합 동작 인수 흐름

- complete → impute → computed → normalize → window → summary → mark: downstream edits의 reject/recompute 양쪽, 빈 group/nullable intermediate, current revision 누출 검사.
- atomic encode x/y/color/stroke → combined legend values/block map → selection labels → dynamic mean → theme: 마지막 상태만 시각화, source selection을 statistic filter로 오해하지 않기.
- Polar frame/aspect → facet → source replay → theme → Canvas resize: local center/radius/child IDs/label leaders/header override 일치.
- Parallel dimension scale → repeat field substitution → facet shared domains → resource removal: 모든 nested scale reference 수집.

후속 기능이 아직 없으면 기존 기능 단위 tests를 작성하고 해당 통합 case를 추적 원장에 pending으로 남긴다. 미래 함수 stub으로 테스트를 통과시키지 않는다.

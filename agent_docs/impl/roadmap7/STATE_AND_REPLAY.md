# 상태·소유권·재실행의 구현 계약

상태: Current. R02 logical data owner와 revision transaction은 `d29287c9`, Phase 7
label/reference owner는 `5832228c`, Polar/Parallel composition replay는 `ebf3562a`,
cross-domain reference registry와 안전 삭제는 `c29f496c`에서 통합 검증됐다. 아래 순서는
Roadmap 7의 현재 state와 replay 계약이다.

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

## 구체적인 저장 경로 제안 — 2026-09-13

다음은 Phase A에서 검토할 exact schema delta다. 기존 데이터 구조를 읽어 정한 **Proposed** 경로이며 현재 프로그램에 이미 존재한다고 가정하지 않는다. aliases인 markConfigs/guideConfigs를 별도 serialized state로 만들지 않는다.

| 요청 | 저장 경로 | payload | 제거/재생성 |
| --- | --- | --- | --- |
| R02 logical current | materializationConfigs.data[family][owner] | {current:snapshotId} | owner 제거 때 해당 entry 제거 |
| R21 offset 간격 | semanticSpec.scales의 해당 scale | paddingInner,paddingOuter,align | 기존 mark padding은 이관 후 중복 제거 |
| R27 aspect | semanticSpec.coordinates의 해당 coordinate | aspect object | auto는 property 제거 |
| R29 frame | 같은 coordinate | polarFrame object | auto는 property 제거 |
| R32 선택/R33 배치 | materializationConfigs.marks[labelId].labelAuthoring | {selection,placement?} | source는 기존 semantic layer.source만 사용 |
| 기존 label collision | materializationConfigs.labelLayouts[labelId] | 기존 policy,leaderId | 새 semantic placement와 역할 분리 |
| R36 통계 요청 | materializationConfigs.marks[referenceId].statisticalReference | 아래 shape | source 제거 closure에 포함 |
| R37 exact samples | materializationConfigs.guides.legend[kind].sampling | {mode,values?,count?} | generated symbols와 별개 |
| R38 block override | materializationConfigs.guides.legend[kind].blockOverrides[key] | R38 {title?,text?,symbol?,gap?}; R39 뒤 labelMap? 추가 | config가 target/kind를 소유하며 key는 descriptor의 channel-set identity |
| R39 axis mapping | 기존 해당 axis labels config.labelMap | typed mapping array | auto는 property 제거 |
| R39 headers | materializationConfigs.facets[compositionId].headers | 기존 common style+아래 추가 fields | source/child 재생성에서 보존 |
| R47 theme | materializationConfigs.theme | frames,descendantFrames?,localOrder,overrides | legacy name/overrides를 accessor에서 lazy-adopt |
| R49 stroke style | 기존 mark config의 appearance owner | cornerRadius,lineCap,lineJoin,miterLimit | Bar는 기존 barAppearance owner 재사용 |

R37과 R38이 같은 sampled content를 수정할 때 sampling이 유일한 요청 owner다. blockOverrides에는 해당 block의 sampling을 중복 저장하지 않고, editLegendBlock 입력의 values/count는 descriptor를 통해 실제 kind.sampling으로 전달한다. blockOverrides가 values/count를 별도 장기 저장하는 구현은 금지한다. categorical order도 현재 semantic guide order owner에 적용하고 style override map에 복제하지 않는다.

### label과 reference

~~~js
// label.source는 기존 semantic layer[L].source="bars"에만 저장한다.
materializationConfigs.marks.L.labelAuthoring = {
  selection: { kind: "named", id: "top" },
  placement: { anchor: "outsideEnd", gap: 4, overflow: "hide", leader: false }
};

// R36: runtime 값4를 요청 mean과 함께 별도 cache에 중복 저장하지 않는다.
materializationConfigs.marks.meanLine.statisticalReference = {
  source: "points",
  axis: "y",
  population: "boundData",
  field: { kind: "axis" },
  statistic: { op: "mean" }
};
// band는 statistic 대신 statistics:[lower,upper] 정확히 하나.
// computed datum은 기존 semantic layer encoding의 datum에 기록,
// graphicSpec에는 최종 좌표만 기록.
~~~

named selection을 all로 바꾸면 selection object를 통째로 {kind:"all"}로 교체한다. placement:"auto"는 labelAuthoring.placement를 제거한다. selection entry까지 삭제해 source labels를 다시 전부 생성하는 부작용을 만들지 않는다.

statisticalReference의 source/field는 pure request다. recompute마다 source/data/scale을 현재 program에서 resolve하고, 이전 값에서 encodeY literal만 재사용하지 않는다. dynamic marker가 있으면 auto domain contribution을 제외한다. 별도의 persisted false boolean으로 같은 사실을 중복하지 않는다.

### legend/header

sampled legend는 legacy count만 있으면 읽기에서 {mode:"auto",count:legacyCount}로 normalize한다. 신규 sampling을 저장한 후 old count duplicate를 제거하고 기존 readers가 한 accessor를 사용하게 한다. override key는 JSON.stringify(sortedChannels)이며 kind 변경은 descriptor의 old/new key transition으로 처리한다.

header schema의 추가 fields는 mode:"cell"|"roles", roles:{row?:{...override},column?:{...override}}다. legacy config에 mode가 없으면 cell. role/side의 명시 요청은 mode:"roles"로 전환한다. 기존 fontSize/fontFamily/fontWeight/color/offset은 common owner 그대로, common labelMap/align은 같은 level에 둔다. rowValue/columnValue identity는 compositionSpec의 기존 typed metadata가 소유한다.

### theme 전파

각 theme frame은 owner,scope,base 이름,이번 custom partial만 저장한다. resolved 전체 tokens는 저장하지 않는다. 같은 owner를 재적용하면 이전 frame을 list 어디에서든 제거한 뒤 newest 위치에 한 번 추가하고, 다른 composition owner와 child local frame은 원래 순서로 보존한다. 그러므로 theme끼리의 우선순위는 local/inherited 종류가 아니라 실제 호출 순서다. parent removeTheme는 자기 owner frame만 root/descendants/retained source에서 제거해 아래 child local 또는 다른 parent frame을 복원한다. parent root와 descendants layout은 postorder로 재계산한다. exact state와 remove 순서는 [R47 canonical spec](features/47-custom-theme.md)을 따른다.

이 경로를 구현하면서 schema가 실제 기존 owner와 충돌하면 코드에 임시 parallel registry를 만들지 않는다. 변경된 구체안을 Phase A 자료에 기록하고 기존 승인 범위와 비교한다. 단순 helper 파일 분할은 이 persisted schema를 바꾸지 않는다.

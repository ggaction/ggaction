# R31 — 원본 마크를 보존하는 붙임 라벨 삭제

원래 감사 번호: **31**. Primary owner: **Phase 7**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

라벨은 원본 mark의 선택적 표현이다. 라벨을 끄기 위해 mark 전체를 삭제해야 하는 lifecycle 공백을 해소한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/text/index.js`
- `src/actions/marks/remove.js`
- `src/actions/marks/text/layout.js`
- `src/materialization/planner.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
removeMarkLabels({target: string}) // attached Text label layer의 ID
removeMarkLabels({source: string}) // 해당 source 소유의 모든 attached labels
// target/source 정확히 하나; 둘 다 생략한 추론 없음
```

## 값·기본값·오류 계약

- target은 createMarkLabels로 생성되었거나 같은 attached-label ownership을 갖는 Text만 허용. 독립 Text/Annotation은 기존 removeMark를 사용한다.
- source는 정확한 source mark ID이며 source 자체를 지우지 않는다. 여러 label layer가 있으면 모두 삭제한다. 존재하는 source에 라벨0개는 성공 no-op; unknown source/target은 오류.
- 제거 closure는 label Text, layout-generated leader lines, label-owned helper datasets/coordinates/scales 중 독점 소유이며 미참조인 것, label target selection/highlight configs다. source selection/filter/highlight는 보존한다.
- 현재 active context가 삭제 label이면 source로 돌아가고, source context는 유지. generic removeMark가 source-owned 자식을 막는 기존 규칙은 변경하지 않는다.
- 외부 independent object가 label resource를 참조한다면 안전하게 사전 거부한다. 다른 owner를 함께 지우는 cascade를 추가하지 않는다.

## 저장 결과와 생명주기

source ownership record에서 optional label child만 제거한다. stale layout config나 saved facet/repeat template에 라벨 recipe가 남아서 editCanvas/source replay 때 부활하면 실패다. remove action은 semantic tree/config registry/graphic closure/context를 한 번에 정리한다.

## 구현 순서와 action 계층

1. 현재 removeMark closure를 재사용할 수 있는 내부 label-only closure collector를 작성.
2. target/source 해석과 external reference preflight.
3. semantic/config/graphic 삭제 및 context 복구를 기존 wrapped primitive로 실행.
4. source rematerialization/Canvas/facet replay로 부활이 없는지 검증.

## 독립 oracle와 인수 테스트

- Bar B + labels L1, L2 + leaders: target L1 제거 후 B/L2 동일, source B 제거 방식으로 L2도 제거하되 B 유지.
- layout config, highlights targeting L1, selected-label entries는 사라지고 source B selection은 보존.
- remove → editBar/encodeY → editCanvas → facet replay에도 label0.
- unknown target, independent annotation target, target+source 중복, externally referenced resource는 atomic error.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — label-only removal closure

RemoveMarkLabelsOptions는 {target:string,source?:never}|{source:string,target?:never}. 추가 key, both/neither, empty ID는 오류다. action target 추론은 없다. target unknown은 Error; source가 존재하나 labels0이면 no-op 성공이다.

### closure 계획

1. mark-label config/semantic source ownership으로 attached Text만 수집한다. Text.mark.type이라는 이유만으로 independent annotation을 삭제하지 않는다.
2. source를 지정하면 모든 attached labels를 동시에 closure에 넣고 preflight한다. 하나에 external reference가 있으면 일부만 삭제하지 않는다.
3. closure={labelLayers,labelGraphics,leaderGraphics,labelRecipes,labelOwnedResources,labelTargetSelections,labelTargetHighlights}. source를 target하는 selection/highlight는 포함하지 않는다.
4. label-target selection을 다른 label이 named membership으로 참조하거나 external reference가 closure 밖이면 거부한다. closure 안의 owned references는 함께 제거할 수 있다.
5. retained recipe에서 source-label attachment를 없앤다. 기존 saved source program은 새 immutable snapshot으로 교체하며 사용자에게 반환됐던 원래 program을 수정하지 않는다.
6. currentMark가 삭제 label이면 source로 복귀, unrelated currentMark는 유지. 다른 transient pointers가 삭제 resource를 가리키면 unset, 임의 replacement 금지.

### 재생성 검증

삭제 직후 한 프레임만 확인하지 않는다. source edit, encode, editCanvas, applyTheme, facet/repeat replay를 순서대로 호출한다. label-owned configs/graphics/helper refs가 모두 없어야 하며 자동 createMarkLabels를 replay해 부활하면 실패다. source 자체가 없어졌다는 이유로 통과시키지 않도록 source graphic fingerprint도 확인한다.

### 고정 인수 사례

- R31-N01: B labels[L1,L2]에서 target:L1 → L2와 B 유지.
- R31-N02: source:B → 모든 labels/leaders 제거,B 유지.
- R31-N03: 같은 source:B 재호출 → 정상 no-op.
- R31-E01: target independent Text 또는 target+source → 오류.
- R31-L01: removed L1을 target한 highlight만 정리, B의 selection은 동일.
- R31-L02: remove→source reencode→Canvas→theme→facet replay 후 label count0.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.

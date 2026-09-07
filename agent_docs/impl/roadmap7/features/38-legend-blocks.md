# R38 — 결합 범례의 channel block별 편집

원래 감사 번호: **38**. Primary owner: **Phase 8**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

하나의 legend 안에서 색·크기 설명을 각각 편집한다. semantic block identity를 도입하되 raw graphic selector나 전체 복수 guide API로 확장하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/guides/legends/edit.js`
- `src/actions/guides/legends/target.js`
- `src/actions/guides/legends/transition.js`
- `src/materialization/legends.js`

관련 항목: R37. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editLegendBlock({target: string, channel: LegendChannel,
  title?:string, values?:readonly number[]|"auto", count?:number,
  order?:readonly Scalar[], gap?:number,
  text?:LegendTextPatch, symbol?:LegendSymbolPatch})
// target은 기존 legend owner target; channel은 현재 block identity.
// 전체 block 집합/위치 변경은 기존 editLegend channels/layout을 사용.
```

## 값·기본값·오류 계약

- channel은 현재 존재하는 logical block을 정확히 선택. 없는 block을 자동 생성하지 않는다. graphic child ID나 index로 select 금지.
- title은 빈 문자열 허용(제목 숨김), values/count는 R37 지원 channel만. order는 categorical block만, symbol/text는 현재 channel에서 지원하는 속성만.
- 여러 channel이 하나의 merged categorical symbol block이면 channel 하나의 edit를 해당 merged block 전체에 적용한다. channel별로 서로 다른 title/content를 요청하려면 먼저 기존 channels recipe로 별도 block을 만들 수 있는지 확인; 현재 분리 불가능하면 conflicting patch를 거부하고 block membership을 알려준다.
- gap은 block 내부 요소 간격, root legend 위치/방향을 바꾸지 않는다. blocks 자유 x/y 배치와 general guide identity(#30)는 제외.
- 기존 editLegend({channels})는 최종 content 집합 변경이다. block이 제거되면 해당 overrides 삭제. reorder는 channel identity로 보존. type migration으로 option이 불가능해지면 사전 오류; 조용히 다른 block에 적용 금지.

## 저장 결과와 생명주기

requested legend recipe에 stable channel-set identity와 block override map을 저장한다. key는 canonical sorted channel membership으로 만들고 display index와 분리. renderer child IDs를 public binding으로 저장하지 않는다. 재생성 시 base recipe → root common appearance → block override → computed geometry 순으로 적용한다.

## 구현 순서와 action 계층

1. 현재 combined legend merger가 산출하는 logical block descriptors를 분리해 expose-to-internals.
2. selector resolver와 channel-specific patch validator 작성.
3. override 저장/transition migration/cleanup 정책 구현.
4. materialization text metrics와 occupied layout이 변경 block bounds를 포함하도록 갱신.

## 독립 oracle와 인수 테스트

- color+size legend에서 size title="규모", values[10,50,100], color title="분류": 독립 결과.
- root legend move/resize/theme 후 override 유지. channels reorder 후 title가 다른 block으로 이동하지 않음.
- size block 제거 후 재추가 시 stale title/value 부활 없음.
- merged color+shape block에서 color title 편집은 단일 block title 변경; shape를 다른 title로 독립 지정 시 명시 오류/분리 절차 검증.
- categorical에 values, absent channel, symbol unsupported property, oversized label occupied bounds 오류/검증.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.

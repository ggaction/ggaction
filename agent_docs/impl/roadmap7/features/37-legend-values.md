# R37 — 연속 범례의 명시적인 표본값

원래 감사 번호: **37**. Primary owner: **Phase 8**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

사용자가 설명하려는 수치 기준을 범례에서 정확히 선택한다. guide sample을 바꾸기 위해 실제 data scale domain을 왜곡하는 우회를 없앤다.

현재 파일(저장소 root 상대 경로):
- `src/actions/guides/legends/size.js`
- `src/actions/guides/legends/strokeWidth.js`
- `src/actions/guides/legends/continuous/opacity.js`
- `src/actions/guides/legends/edit.js`

관련 항목: R22, R23. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
createLegend({...ExistingOptions,values?:readonly number[]})
editLegend({...ExistingOptions,values?:readonly number[]|"auto"})
// size/opacity/strokeWidth sampled continuous blocks에만 values 제공.
// combined blocks는 R38 selector로 개별 지정한다.
```

## 값·기본값·오류 계약

- 생략은 기존 자동 count. values는 finite, unique, nonempty(최대100), 오름차순. caller 순서를 자동 정렬해 실수를 숨기지 않는다.
- explicit count와 values 동시 지정은 오류. edit values:auto는 explicit values를 해제하고 저장된/default count로 복귀한다. explicit values 모드에서 count만 edit하면 충돌 오류, values:auto+count는 허용.
- 모든 값은 effective scale domain 안에 있어야 한다. out-of-domain은 clamp로 sample을 겹치게 만들지 말고 오류. log size는 positive. scale edit 후 기존 samples가 invalid면 전체 scale edit 실패하며 user가 먼저 values:auto/새 값으로 바꾼다.
- 실제 mark mapper로 size/opacity/width를 계산한다. explicit symbol size0/opacity0/width0을 보기 좋게 보정하지 않는다. label formatting은 기존 formatter.
- categorical/discrete size/quantitative gradient color의 tick values는 이 옵션 대상이 아니다. combined의 여러 sampled channels에 root values를 뿌리지 않고 R38 block 선택을 요구한다.

## 저장 결과와 생명주기

legend requested content recipe에 values 또는 auto mode를 저장. generated ticks/symbols는 결과다. theme/layout edits 때 다시 auto sampling하지 않는다. shared facet legend는 shared effective domain으로 값 검증, independent legends는 각 domain에서 모두 valid여야 한다.

## 구현 순서와 action 계층

1. continuous sampled legend content normalize에 explicit values union 추가.
2. 각 sample generator에 count 대신 explicit ordered array route.
3. scale edit preflight에 bound legend samples 검증 연결.
4. content edit/layout/style persistence와 R38 block override를 통합.

## 독립 oracle와 인수 테스트

- domain0..100, values[10,50,100] → 정확히3 labels/symbols; requested domain/mark size는 변하지 않음.
- opacity sample0은 invisible symbol+label 유지, scale reverse는 sample values 순서 유지하고 mapped style만 역전.
- values:auto 후 count5 자동 mode; count와values 충돌/duplicates/NaN/descending/outside-domain 오류.
- domain 축소100 → 40 while values100은 scale edit 원자적 실패.
- legend text style/theme/move/Canvas edits 후 samples 그대로.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.

# R37 — 연속 범례의 명시적인 표본값

원래 감사 번호: **37**. Primary owner: **Phase 8**. 상태: **Implemented-primary**.
제품 구현은 `8760111d`, 같은 실행의 primitive/public decoded-PNG 동등성 보강은 `547eae1b`에 있다. R38 block selector와 R47 theme 소비는 각 owner checkpoint에서 완료됐고, shared Polar facet의 exact sampled legend 승격과 요청 상태 보존은 R43 checkpoint `ebf3562a`에서 검증됐다.

## 목적과 현재 연결점

사용자가 설명하려는 수치 기준을 범례에서 정확히 선택한다. guide sample을 바꾸기 위해 실제 data scale domain을 왜곡하는 우회를 없앤다.

현재 파일(저장소 root 상대 경로):
- `src/actions/guides/legends/sampling.js`
- `src/actions/guides/legends/size.js`
- `src/actions/guides/legends/strokeWidth.js`
- `src/actions/guides/legends/continuous/opacity.js`
- `src/actions/guides/legends/edit.js`
- `src/actions/guides/legends/creation.js`
- `src/actions/scales/edit.js`

관련 항목: R22, R23. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 현재 TypeScript 계약의 요약이다. 정확한 export는 `types/program.d.ts`의 `LegendOptions`와 `EditLegendOptions`가 소유한다.

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

## 구현 고정 명세 — exact legend values state machine

### mode 정규화

legend sampled content의 요청은 {mode:"auto",count?} 또는 {mode:"values",values,count?}로 표현할 수 있다. count는 values-mode에서 비활성인 이전 auto 설정이며 사용자에게 동시에 explicit count+values를 입력받지 않는다. 현재 legend config owner 안에 저장하고 graphic child attrs를 다시 읽어 복원하지 않는다.

| 현재 | patch | 다음 |
| --- | --- | --- |
| auto | values:[…] | values mode; 이전 auto count 보존 |
| values | values:[…] | 배열 전체 교체 |
| values | count:N만 | 충돌 오류 |
| values | values:"auto" | auto,저장된 count 사용 |
| any | values:"auto",count:N | auto,N |
| any | values:[…],count:N | 충돌 오류 |

create에서 values:"auto"는 허용하지 않는다. create 생략이 auto다. values 길이1..100,finite,strictly increasing. -0과0은 numeric identity상 중복이다. effective domain[min,max] 내부 판정은 reverse와 별개다.

### mapper와 layout

size/opacity/strokeWidth continuous sampled blocks만 지원한다. R23 discrete size와 gradient color/stroke tick sampling에는 적용하지 않는다. existing count sample 알고리즘을 바꾸지 않고 values mode는 정확한 array를 그대로 mapper에 넣는다.

symbol area0/opacity0/width0은 보이지 않아도 text label과 item gap을 유지한다. reverse는 값 순서를 뒤집지 않는다. mapper가 log/sqrt인 경우 domain/type-specific validation을 다시 적용한다. 후속 scale edit/data edit로 sample이 invalid면 상위 연산 전체가 실패한다.

### 고정 인수 사례

- R37-N01: domain[0,100],values[10,50,100] → labels3,symbols3,domain unchanged.
- R37-N02: auto count5→values3→values:auto → 이전 count5 복구.
- R37-E01: [50,10],duplicates,[],length101,outside-domain,count+values → 오류.
- R37-L01: domain100→40 while values100 → editScale/상위 data-edit 전체 실패.
- R37-L02: theme/legend move/Canvas 후 exact values와 invisible0 symbol 정책 유지.

## 완료 조건

- [x] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [x] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [x] 미지원 cell은 이유를 적었다. combined/multi-block 대상은 R38 selector가 생기기 전 root `values`를 명시 오류로 거부한다.
- [x] 해당 Phase의 승인/검증 근거를 기록했다. `test/contracts/legend-values.test.js`, Phase 8 STEP1, `8760111d`, `547eae1b`가 증거다.

# STEP068 접근성 항목과 키보드 수명

## 진행 상태

- [x] A: `format: "items"`의 구체 계약·기존 승인 재사용
- [x] A: native final items, scoped identity, authored selection membership, logical visibility 구현
- [x] A: source/type/package/docs qualification과 원격 checkpoint
- [ ] B: exact current-frame clip/opacity를 사용하는 keyboard focus/restore
- [ ] C: native activation·hierarchy navigation·tooltip/touch 접근 경로
- [ ] D: public animation/reduced-motion 합산 및 AT53 전체 matrix
- [ ] STEP074–077 최종 통합

[기존 포괄 승인](../AUTHORIZATION.json)의 remainingApproval과 root의 2026-10-29 구체 지시를 재사용한다.
기반 `e4571d277`의 session 수명 검증을 보존한다. 이번 A는 새 visual target, persisted schema,
renderer 또는 자동 DOM authoring을 추가하지 않는다. 정확한 공개 계약은
[ACCESSIBILITY](../../../contract/current/ACCESSIBILITY.md), 공개 예는
[Rendering](../../../../docs/api/rendering.md#native-item-alternatives)이 소유한다.

## A: native logical snapshot

기존 `exportAccessibleData`의 table default/결과 shape는 유지한다. `format:'items'`만
flat leaf-owner views와 명시 `childPath`를 반환한다. native selection policy의 final grain을 읽고,
기존 fixed Full resolver로 named membership를 평가한다. sourceSelection이 있는 composite
assignment는 원 authored ID로 표현하며, 단순 owner 관계만으로 미저장 selection을 추정하지 않는다.

opaque item/representation key는 `namespaceItemKey`와 inspection의 ancestor 순서를 그대로 사용한다.
Hierarchy navigation은 원 node key이므로 graphic key로 재해석하지 않고 component/childPath와 함께
반환한다. visible은 native logical 값이며 filtered item은 사라지고 focused hidden node는 false로
남는다. opacity/clip/current frame은 후행 exact frame 후보의 책임으로 분리한다.

전체 export 100,000 items, 10M work units 상한을 둔다. ownership scan·nested path copy·namespace·
selection membership 비용을 누적한다. readonly helper는 action registration/Node/node_modules를
import하지 않는다. renderer·semantic resource 계산을 복제하지 않고 기존 immutable snapshot만 읽는다.

검증은 aggregate literal, 모든 named selection, composite projection, nested repeated scope,
Basic/standalone Text, Partition hidden/focus, Geo typed LOD aliases, graph roles, filtered/opacity 구분,
codec fresh process, callback0 옵션검증, 누적 item/work 제한을 포함한다.
이 목록은 A의 범위이며 keyboard/tooltip/touch/animation 전체가 끝났다는 뜻이 아니다.

## A 검증 메모

- 새 adapter coverage: lines 100%, branches 95.92%, functions 100%; 기존 entry 98.93/94.29/100.
- 정상 접근성 21개, Node20/24 신규+타입 각11개, source/discovery/package/type 41개 통과.
- pinned 실제 데이터 5종×3 recipes+집계 16개, 실제 Chromium의 공개 문서→host table/Canvas/SVG 1개 통과.
- 고정 tar `5787d20f4b885ce0e799742ee804e5d2648cdcbb5868bfa8b0df284b4c164b65`를
  Node20/22/24에서 각3 runtime+strict types+문서 snippet+5 기존 entry bundle로 확인했다.
- 새 entry import graph는 actions/Node/node_modules를 금지한 기존 browser bundle 검사를 통과한다.
- Node20 canonical staging 실측은1062 entries/1507408 packed/6853746 unpacked bytes.
  새 adapter 한 파일과 선언 증가에 맞춰1062/1507500/6854000으로 최소 올림했다.
  1062>1061 최초실패를 보존하며 측정용 inspector 자체를 검증 성공으로 세지 않는다.
- source 없는 동일 archive의 기존5 entry bundle은 이전 한도를 통과했다. 접근성 entry 자체는
  금지 dependency 검사로 확인했으며 별도 임의 size floor를 만들지 않았다.
- 문서 source49개와 등록된 runnable 예제1개 통과. search payload1038771 bytes를 기준으로
  한도1038800으로 올렸다. 초기 snippet 미등록/search 한도/Ruby PATH 오류를 보존했다.
- 최초 테스트 fixture의 잘못된 editScale/encodeX/layoutGraph/반복 filter 호출, 미연결 composite
  selection 추정, concrete 좌표 없는 Text 가정을 native 계약에 맞게 수리했다. runtime 결함으로
  보고하지 않는다. 전체 repository/전체 renderer/전체 installed suite를 새로 실행했다고 주장하지 않는다.

최종 source `147a49b388eb89ee0c6ffbe1290d0b815927046e`; [machine evidence](accessible-items-evidence/qualification.json)에 명령·원본 실패·tar·설치·커버리지·화면 증거를 보존했다. Source pin 후49 docs,172 pages/1535 LLM hashes,320/390/768/1440 overflow0/Axe0을 통과했고320/1440 화면을 확인했다. B 이후와 전체077은 미완료다.

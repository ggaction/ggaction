# 권장 설계 결정과 변경 통제

모든 행은 **Proposed**다. 사용자가 25개 항목을 선택한 사실과 여기의 세부 API 승인은 구별한다. 후속 구현자는 새로 발명하지 말고 아래 권장안을 gate review에 제시한다. 승인으로 바뀌면 date, 정확한 사용자 발언, commit, 승인 범위를 해당 phase GATES.md에 기록한다.

| ID | 권장 결정 | 이유와 버린 대안 | owner |
| --- | --- | --- | --- |
| D01 | 새로운 method는 Full 우선, 기존 basic surface 유지 | 확장 기능이 lightweight API를 무단 확장하는 문제 방지 | C08 |
| D02 | standalone data는 stable logical owner+immutable revision, default descendants reject, 명시 recompute | 기존 snapshot/Bin2D 호환과 고급 pipeline 편집 양립; silent refresh 제외 | R02 |
| D03 | user input original source replacement 제외 | 선택되지 않은 R01을 dependency로 몰래 추가하지 않음 | R02 |
| D04 | complete는 observed group tuples×명시/관측 key domain | groupBy 각 field의 전면 Cartesian product 폭발 방지 | R05 |
| D05 | missing은 null/undefined, invalid numeric은 오류 | NaN을 missing으로 숨기지 않음 | R05/06/09 |
| D06 | condition/boolean은 lazy evaluation, 구조/field 존재는 전체 AST preflight | 안전한 log/nullable branch와 typo 검출을 함께 제공 | R06 |
| D07 | percentChange는 fraction, index만100 기준 | share scale과 일관, 퍼센트 표시와 수치 계산 분리 | R07 |
| D08 | week Monday 기본, timezone UTC 기본, weekday nominal0..6 | 기존 UTC 호환, 지역 calendar 선택 명시 | R08 |
| D09 | duration day=24h, 월/년 elapsed window 제외 | 지역 calendar의 가변 길이와 혼동 방지 | R09 |
| D10 | frequency/reliability 별도 variance/quantile/SE 수식 | 가중치 의미에 따라 달라지는 추론을 숨기지 않음 | R10 |
| D11 | 단일 mark final channels를 atomic 계획, arbitrary transaction 아님 | 중간 충돌 해소와 작은 public contract | R19 |
| D12 | parallel scale selector=field, offset는 parent bandwidth 의존 | reorder/resize에도 의미 유지 | R20/21 |
| D13 | stroke는 독립 semantic channel | fill과 outline의 다른 변수 표시 | R22 |
| D14 | size range는 모든 타입 면적px² | 현재 equal-area 의미 유지 | R23 |
| D15 | aspect는 frame ratio/data-unit ratio 구분, domain 변경 없음 | 도형 비율과 분석적 거리 의미를 분리 | R27 |
| D16 | polar center는 local bounds 비율, 반지름은 완전 원이 fit하는 최대거리 기준 | backend와 facet resize에서 결정적, overflow 별도 scope | R29 |
| D17 | label membership=source final items, 명시 named selection은 live dependency | raw index stale 방지, mark filter와 표현 분리 | R32 |
| D18 | semantic anchors는 family whitelist+명시 overflow | 임의 자동 최적화/불안정 heuristics 제외 | R33 |
| D19 | statistical reference의 population 명시, domain contribution 없음 | 무엇의 평균인지 명확, scale feedback cycle 방지 | R36 |
| D20 | legend samples는 domain 안 finite ascending unique values | clamp 중복·샘플 순서 혼란 제거 | R37 |
| D21 | merged legend block은 canonical channel-set identity | graphic index보다 replay/reorder 안정 | R38 |
| D22 | 표시명은 typed map, raw category 보존 | 문자열화로1과"1"이 충돌하는 문제 방지 | R39 |
| D23 | non-Cartesian facets local axes, compatible shared legends 지원 | Cartesian outer guide를 잘못 적용하지 않음 | R43 |
| D24 | custom tokens closed list, 새 theme가 이전 custom을 대체 | typo 검출과 예측 가능한 상태 | R47 |
| D25 | rounded rect common path; cap/join graphic attrs | backend-neutral 출력과 code 재사용 | R49 |
| D26 | resources delete referenced → reject, context-only ref는 clear | 안전 삭제와 장기 저작 정리 양립 | R25 |

## Gate A에서 결과물이 반드시 필요한 내부 결정

설계 방향은 위 표로 고정하여 검토하되 아래 항목은 현재 코드에 대입한 concrete diff/prototype를 gate package에 넣어야 한다. '추후 결정' 한 줄로 넘어가지 않는다.

1. **시간대 구현:** 기본 권장안은 기존 Date+Intl의 zone-aware parts를 pure adapter로 감싸는 방식. 입력 parser는 현재 것을 사용한다. bucket local components → UTC instant 역변환은 offset 후보 검증과 earliest-valid boundary를 처리해야 한다. Phase 2 primitive numerical prototype에서 NY DST, Seoul,30분 offset/30분 DST, skipped day, early years를 검증한다. native Intl만으로 지원 환경에서 동일 oracle를 충족하지 못하면 의존성의 package/browser/size 영향을 명시한 대체안을 승인받기 전 public 구현을 진행하지 않는다. UTC를 local timezone으로 fallback하지 않는다.
2. **Revision schema:** 현재 data.<family>.<owner>.current를 그대로 유지하는 registry와 old standalone snapshot lazy adoption의 exact JSON before/after를 Phase 4 A에 첨부. 기존 Bin2D behavior 변경이 없는 테스트 결과 포함.
3. **Encoding atomicity:** intermediate validation을 분리한 normalize/plan 함수 signature와 final draft shape를 Phase 5 A에 첨부. 기존 single encode가 새 public encodeChannels를 역호출하는 순환 금지.
4. **Label selection stage:** 현재 planner stage를 바꾸지 않는 predicate evaluation/labels ordering diff를 Phase 7 A에 첨부. stage union 변경이 필요하면 대안 비교와 migration을 명시.
5. **Graphic style schema:** rounded rect를 common concrete path로 만들 때 existing rect semantic ownership/graphic ID/bounds/hit tests가 유지되는지 Phase 9 A/V primitive로 검증. cap/join attrs는 Canvas/SVG/PDF validator 모두 포함.

## 승인 범위와 추적

선택 항목을 축소하거나 새 unrelated feature를 추가하려면 사용자 결정이 필요하다. tiny internal naming/file split은 현재 scope에서 구현자가 정해도 된다. 이미 승인된 gate 범위에 대해서는 반복 승인을 요청하지 않는다. 단, appearance가 달라지는 별도 variant는 저장소의 visual gate 규칙을 적용한다. 모든 gate 패키지는 검증된 commit+push 이후 제공한다.

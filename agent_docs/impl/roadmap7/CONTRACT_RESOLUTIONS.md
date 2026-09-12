# 상세화 과정에서 정정·확정한 제안

2026-09-13. 모두 **Proposed**이며 기존 user-selected25개 범위를 유지한다. 제품 구현을 완료하거나 세부 설계 승인을 기록한 문서가 아니다. 이 기록은 기존 초안의 빈칸/충돌을 찾은 이유를 남기며 정확한 목표 동작은 각 feature의 구현 고정 명세가 소유한다.

| ID | 발견한 문제와 근거 | 구체안 / canonical owner |
| --- | --- | --- |
| S01 | src/actions/coordinates/actions.js/types에 editCoordinate 없음 | R27 신규 Full action으로 등록,aspect와R29 polarFrame만;type/layers 교체 제외 |
| S02 | R05 maxGap 초과 시 edges 적용 문구가 API_DETAILS와 충돌 | maxGap 우선: 초과 run 유지,그 외 anchor 없는 run에만 edges;R05 |
| S03 | R06 code-point 순서는 JS 문자열 비교와 다름 | Unicode code points 사전순+astral fixture;lazy branch field 존재는 전체 preflight;R06 |
| S04 | R07 "기본 음수 거부"가 선택적 허용처럼 읽힘 | share 음수 항상 거부,새 옵션 없음;sample n<2와zero denominator 구별;R07 |
| S05 | R08 fold/hour,30분 DST의 구체 기대값 부족 | NY 반복 hour 첫 경계,Lord_Howe gap 최초02:30,Apia skipped-date oracle;R08 |
| S06 | R10 quantile spelling이 existing aggregate와 혼동 | summary op:{op:"quantile",probability};reference Statistic.p만adapter 변환;R10/R36 |
| S07 | R19 "내부 id 금지"가 scale.id까지 금지하는지 모호 | channel payload id/target/coordinate 금지,nested scale.id 허용;shared request 충돌 오류;R19 |
| S08 | offsets padding은 src/materialization/scales/policies/offset.js에서 mark config로 읽음 | semantic scale 단일 owner로 migration;기존 point/binned parent 지원 보존;R21 |
| S09 | encodeStroke baseline은 Rule constant-only | R22 explicit family×grain표로constant+field 확장;Text 제외;value/field전환 cleanup |
| S10 | R23 type 교체의 domain/sample/cutpoint 의미 유지 불명확 | type-family 전환에 domain/range 명시,nonzero domain pow/sqrt oracle;R23 |
| S11 | R29 fraction "0..1"과positive radius 목적 충돌 | fraction은0초과1이하,object 교체 semantics 명시;R29 |
| S12 | R33 gap이text center인지edge인지 불명확,Arc corner-only fit은hole침범 가능 | bbox edge gap,ray support distance,sector-edge 교차검사;R33 |
| S13 | filterMarks는 markFilter derived layer.data로 rebind 가능 | boundData는 transparent markFilter 앞 authoring dataset,visibleItems는filter 이후;R36 |
| S14 | R38 merged channel로두번편집할때정상patch와충돌요청구별불가 | 같은block을선택한순차edit는전체교체,merge transition에서만불일치거부;R38 |
| S15 | src/materialization/facets.js는cell별위쪽header만지원 | legacy top-cell 유지,explicit role/side부터row/column strips;R39 |
| S16 | custom theme/removeTheme와child provenance 미정 | name+tokens+overrides,descendant origin기록,독립child explicit theme보존;R47 |
| S17 | R49 "common path 권장"만으로backend분기가능 | rounded rect는M/L/C/Z cubic path,cap/join은sharedattrs;R49 |
| S18 | "현재 계층유지"만으로code/decl/MCP 작업누락가능 | IMPLEMENTATION_MAP+상세타입+고정case 인덱스와surface별완료행렬 |

가중치의 계층별 위치와 edit 전용 weight:false 해제 규칙도 R10에 구체화했다. 생성/인코딩에는 StatisticalWeight만, Violin에는 density.weight를 사용하며 미선택 Gradient API로 타입이 새지 않게 한다. R33의 길이0인 막대는 quantitative axis의 증가 방향을 사용하고 fit/overflow 정책을 적용한다.

## 권한과 범위에 미치는 영향

이 제안들은 구현 계약을 구체화한다. 에이전트의 외부 쓰기·릴리즈·승인 권한을 넓히지 않는다. 신규 public API/schema 변경과 새 시각 target은 기존 저장소 Gate 규칙을 그대로 적용하고, 이미 정확히 승인된 범위는 재승인 요청 없이 근거를 재사용한다.

새 helper를 위해25개 밖의 public action을 추가하지 않는다. editCoordinate는 R27/R29의 전달 표면이며새독립 기능 선택이 아니다. R47 removeTheme는새theme 상태의기존제거생명주기완성이고style reset이아니다. 문서가 구체화됐다는 이유로 feature를 Current로 승격하지 않는다.

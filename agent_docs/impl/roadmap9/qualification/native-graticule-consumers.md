# Graticule 원값과 명시 분석 차트 소비자

## 진행 상태

- [x] `AUTHORIZATION.json`의 전체 잔여 승인 재사용. 기존 `getMarkItems`·Point·composition·`reviseData`만 사용한다.
- [x] Graticule의 encodings/scales/guides 3셀에 실제 positive 소비자 owner를 배정한다.
- [x] 원 axis/value/key, 수정 격리, 명시 snapshot 갱신, codec 및 실제 Canvas/SVG를 확인한다.
- [ ] 합산 후보 전체 qualification와 결과 확정은 root 후속이다. owner 배정은 STEP077 전체 완료가 아니다.

## 의미와 경계

`examples/geographic-marks/comparison.js`가 공개 `getMarkItems`에서 raw `axis`·`value`·item key를 읽는다. 별도 `analysis` child의 명시 dataset은 이 값으로 X/Y·color·scale·axis·legend를 만든다. 이는 projection geometry의 Cartesian encoding이나 자동 live link가 아니다. 새 dataset의 row lineage와 native geographic resource lineage를 구분한다.

독립 literal은 longitude −40/0/40, latitude −20/0/20의 6행이며 step `[20,20]` 뒤 longitude −20/+20이 추가된다. 기존 값의 native key는 그대로다. X domain `[−40,40]`→`[−80,80]`에 따른 point/tick 좌표도 별도 literal로 검증한다. 분석 child의 field/scale 편집은 grid program/graphics/resources의 정확한 참조를 보존한다. projection/step 수정은 분석 snapshot을 보존하고, 명시 refresh의 `reviseData`만 8행과 revision1을 만든다. serialize/restore 후 전체 graphics·native items·analysis items를 확인한다.

DPR1/2의 실제 Canvas/SVG 각각에서 분석 수정, grid 수정, 명시 refresh, codec 네 구간의 양 child pixel 차이를 검증한다. 같은 backend 안에서 수정하지 않은 child는 exact 0이며 수정한 영역은 실제 ink 변화가 있어야 한다. 새 수학·렌더러·애니메이션 정책을 추가하지 않는다.

## 실행 문서와 설치

`tutorials/geographic-marks.md`의 `graticule-analytical-comparison`은 같은 정본 example을 실행한다. 최초 실행은 support copier가 `src/index.js`만 공개 package로 바꾸어 inspection entry를 거부했다. `scripts/doc-snippets.js`에 `src/inspection.js`→`ggaction/inspection`의 좁은 매핑을 추가했다. 다른 private source import 거부는 유지하며 복사 내용 exact 회귀도 있다. 최초 실패는 evidence에 보존한다.

런타임·types·packed 입력은 edge source `56640916a`에서 바뀌지 않았다. 따라서 그 exact archive `c1b9fb3bd8a9be11eeba13288072ecbfdcf00b024fd29959da20663f0b3265a4`를 다시 사용해 새 문서 하나를 실제 source-free package에서 실행한다. 기존 3Node 전체 qualification를 새로 수행했다고 집계하지 않는다. 신규 source/support 검사는 Node20/22/24에서 실행한다.

검증 명령·수치·실패/재시도·고정 archive 및 최종 source pin은 [evidence summary](native-graticule-evidence/summary.json)에 기록한다. 다른 29개 native 행, 79개 AT group, 577개 target, package30, Image3 N/A 및 결과 상태는 보존한다.

## 최종 검증

소스 `8c0b2e979`를 정본으로 pin했다. 관련62검사, Node20/24 각4검사, 실제브라우저1검사(Canvas/SVG 각각DPR1/2), source-free 새문서1개, 문서51개, built186페이지/1603 LLM파일 및320/390/768/1280 화면의 overflow·Axe·console 모두0을 확인했다. 390px 새 절을 직접 확인했다. 기존 이미지manifest도fresh이다. 최초문서50/51의 검색크기 실패는1,090,602byte 실측으로 기존1,089,900→최소1,090,700 한도를 조정해 해결했으며 원본로그를 보존한다. 패키지 입력과bundle은 변경되지 않았다.

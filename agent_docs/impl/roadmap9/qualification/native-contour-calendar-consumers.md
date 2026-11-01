# Contour와 Calendar 소비자 근거

## 진행 상태

- [x] `contour-line`, `contour-filled`, `calendar`의 Current와 실제 family 시험 대조
- [x] 선/채움 hit, density 원행, 윤일·누락값·중복행의 선택/접근성 회귀
- [x] Contour mixed scale 편집의 기존 계약 위반 수리
- [x] 명시 concrete fallback, authentic frame rebase, offline frame 동등성
- [x] 새 source의 동일 archive Node20/22/24 설치
- [x] source pin 생성과 최종 증거 마감
- [ ] 발견 가능한 실제 package runtime owner와 최종 native candidate 검증

기존 [전체 승인](../AUTHORIZATION.json)을 재사용한다. API·저장 schema·수치 정책·shared animation
4개 owner는 변경하지 않는다. 새 시각 target은 없으며 기존 독립 primitive를 그대로 검증한다.

## 실제 결함과 최소 수리

`createContourMark().editContourMark({x:{reverse:true},color:{id:"new-color",type:"quantize",range:["red","blue"]}})`가
`Unknown scale "new-color"`로 실패했다. Color 변경만으로는 실패하지 않는다. 기존 x scale을
편집하면 mark materializer가 실행되는데, facade가 이미 새 color binding을 쓴 반면 해당 scale은
아직 만들지 않았기 때문이다. Highlight는 필수 조건이 아니며 조합 시 같은 오류를 드러냈다.

[CONTOURS](../../../contract/current/CONTOURS.md)의 position/color patch, legend reassignment,
highlight replay 계약을 복구하도록 이미 preflight한 새 scale부터 기존 `createScale`로 생성한 뒤
기존 scale 편집을 적용한다. 일반 scale·highlight·renderer owner는 변경하지 않는다.
Line/filled 각각 새 y/color 생성이 기존 x `editScale`보다 앞서는 trace, stable item identity,
legend, highlight, codec, 잘못된 range의 원자 실패와 이전 program/trace 불변을 검증한다.

## 소비자별 실제 근거

- Contour의 선형 scalar plane에서 level .5/1.5의 선은 x=70/170에서만 hit되며 채움 band는
  [.5,1.5), [1.5,2]의 각 내부를 hit한다. 마지막 band만 upperInclusive다. 별도 donut의
  실제 M 두 개 compound path는 중앙 hole을 제외하고 경계/채움 차이를 유지한다.
- Density는 숫자 1과 문자열 "1" row key를 구분한다. 역순 source revise의 literal grid
  [3,0,0,4], revision 1, 기여행 순서, 이름 있는 선택, 색상 scale/legend와 역방향 x를 확인한다.
  hconcat 양쪽 key와 selectedBy는 구분되며 codec 후에도 같다. 일반 row encoding 거부는
  intrinsic x/y/color mapping의 계약 근거이고 임의 N/A가 아니다.
- Calendar는 2024년 366일/2월 29일, 관측 0/중복합 5/빈 null을 구분한다. 중복 key 1/"1"은
  두 원행으로 유지되고 역순 revise 후 합 7이 된다. 실제 날짜 셀의 hit는 layout ref를 반환하며,
  기여행은 반환 item key로 native inspection에서 읽는다. Hit의 resource rowKeys=[]와
  accessible items에 원행 배열이 없다는 기존 공개 schema를 바꾸지 않는다.
  누락 omit은 관측 두 날짜만 남긴다. hconcat 접근성은 732개의 scoped key와 각 선택을 보존한다.
- Calendar intrinsic quantitative color의 명시 domain 편집은 cell geometry를 바꾸지 않고
  값 5의 quantize 색을 red→blue로 바꾼다. 기존 legend binding과 빈 날의 emptyFill은 유지된다.
  임의 x/y/row-color encoding은 거부한다. 기존 layout 시험의 독립 Gregorian·DST·월 경계
  oracle와 원문 날짜/중복/누락 정책을 함께 owner로 유지한다.

각 행의 scene-animation은 **typed family 보간이 아닌 명시 fallback**이다. Contour는
primitive-role/topology, Calendar는 unsupported-family를 검증한다. 40ms의 weighted source
weights .6/.4, Contour 선의 사라지는 세 island opacity .6, 최초 계획 0/40/100ms와
중단 후 계획 0/30/60ms의 전체 offline frame 동등성을 검증한다. 중단 시 첫 sample은 원
frame과 동일 객체다. 정적 scene 실행만으로 owner를 등록하지 않는다.

기존 다섯 Contour와 세 Calendar public/primitive pair의 Canvas calls, SVG, decoded PDF,
PNG 및 Chromium Canvas/SVG DPR1/2를 그대로 사용한다. 새 renderer나 pixel normalization은 없다.

## 매핑과 남은 의무

세 행 각각 기존 5개 owner를 보존하고 13개씩 추가하여 **18/19**다. Package는 명시 installed
fixture가 있더라도 발견 가능한 package runtime test owner가 없으므로 pending이다. 이번
Contour 새 archive 설치는 버그 수리 검증이며 manifest package 셀을 대신 채우지 않는다.

세 행의 owner/assignedOwners만 되돌리면 전체 manifest가 이전과 deep-equal이다. 요구 30,
group 79, target 577과 결과는 유지한다. Root 합산의 574 required+Image N/A 3은 root가
이 세 행 delta만 합쳐 보존한다. Assigned는 candidate pass가 아니며 q pass를 생성하지 않는다.

## 검증과 한계

Source `3f1355feba5da64c40f9fb9173b83ddd27a6b2f7`에서 owning 138, changed-owner coverage 30,
renderer 16, browser 8, 문서 2+2 및 package 계약 13을 통과했다. 동일 archive
`5bb29c9cb31ad342d3f9a7bd0c45b513ad39f18963a39fac3f528464c924bc3e`의 Node20/22/24
각 Contour runtime 3개·strict types·optional peers·6 entry bundle이 통과했다.
Provenance→machine→LLM 생성 후 source pin 문서 18개도 통과했다.

정확 명령·해시·원본 실패·최종 결과는 [증거](native-contour-calendar-consumer-evidence/summary.json)에 둔다.
Current 공개 의미를 복구하여 선언/공개 설명은 유지한다. Source pin은 새 runtime commit에
맞춰 생성한다. 소스 변경 owner의 기존 95/90/100 coverage floor를 낮추지 않는다.

최초 실패는 실제 mixed-scale 오류와 시험 작성 중 공개 metadata 위치/role, color highlight
별칭, background/exit 구분, 설치 fixture의 legend 여백 부족을 구분해 보존한다. 새 runtime은
scale 순서만 수정했으며 시험 기대를 기존 schema에 맞춘 것은 런타임 수리로 세지 않는다.

이 기록은 소비자 근거 checkpoint다. 전체 native candidate, 큰 route SLO, STEP077 또는 release
완료를 뜻하지 않는다.

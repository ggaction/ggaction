# 승인된 blend 수식의 private 공통 owner

`grammar/compositing.js`는 이미 승인된 blend target `90f5f67e`의 Float64 premultiplied 수식을
순수 계산 owner로 옮긴다. 새로운 public API/graphic schema/renderer dispatch를 등록하지 않는다.
검토 fixture source와 기존 output은 변경하지 않았으며, 공개 연결은 [PUBLIC.md](PUBLIC.md)의 미정 선택과 별개다.

`compositeRGBA(source,backdrop,{mode?,opacity?})`는 straight RGBA unit-range 배열 두 개를 받아 frozen 배열을 반환한다.
Mode는 기존 공개 명칭에 맞춘 normal(default)/multiply/screen/difference이고 opacity 기본1이다.
각 입력은 finite [0,1] 네 값이며 accessor/symbol/sparse 배열과 unknown option/explicit undefined를 거부한다.
입력 배열을 변경하지 않고 backend state·색상 문자열·surface는 받지 않는다.

Premultiplied s=Cs·As, b=Cb·Ab, A=As+Ab−As·Ab를 만들고 다음 식을 적용한다:

- normal: s+b(1−As)
- multiply: s·b+s(1−Ab)+b(1−As)
- screen: s+b−s·b
- difference: s+b−2min(s·Ab,b·As)

A=0이면 transparent black이다. 나머지 RGB는 결과/A, alpha는 A×groupOpacity다.
입력 범위 검사를 완료한 후 결과 RGB의 부동소수점 경계 오차만 [0,1]에 clamp한다.
Group opacity0은 straight RGB를 그대로 두고 alpha0을 반환하며 합성 결과에는 영향을 주지 않는다.
`quantizeRGBA`는 마지막에 각 channel×255를 한 번 round한다. Native premultiply roundtrip을 끼우지 않는다.

Normal4/4와 independent straight-alpha oracle의2,000개 seeded 입력을 비교했다.
Literal half-alpha red/blue, transparent/opaque endpoints, 순서 민감도 및 commutative blend의 교환 성질,
source/backdrop 불변성, alpha0·group opacity0, 양자화 half-byte bound가 통과했다.
신규 모듈 coverage100/100/100이며 자동 critical family95/90/100을 추가하고 동일 정책으로 focused 검증했다.
전체 source coverage를 새로 통과했다고 주장하지 않는다.

Source/discovery/package contracts40/40과 package check를 실행했다. Main+기존 paint+새 모듈 실측은
705 entries/1,047,741 packed/4,872,991 unpacked bytes다. 이전704 entry/1,047,000packed 한도 실패는 보존했다.
공식 staging에서 신규 module의2,042bytes를 확인하고 최소1,000byte 경계로 한도를705/1,048,000/4,873,000으로 맞췄다.
Parent가 병렬 branch를 최종 통합할 때 다시 측정하며 이 branch 한도가 main 측정을 대신하지 않는다.

재현 명령과 source/log hashes는 [COMPOSITING-EVIDENCE.json](COMPOSITING-EVIDENCE.json)에 보존한다.
공개 renderer의 isolated group·shadow compositing은 후속 integration에서 이 owner를 소비해야 하며,
기존 fixture나 native 경로를 이 checkpoint에서 교체한 것으로 기록하지 않는다.

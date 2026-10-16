# 제곱근 연속 색상 척도

## 진행 상태

- [x] 현재 동작과 공개 타입의 미지원 경계를 재현했다.
- [x] 기존 공개 액션·저장·범례·호환성·검증 범위를 구체화했다.
- [ ] 사용자 승인 후 구현한다.

## Gate

상태: ready-for-review. 기준 구현: 9c32a273db0bb79191a5e2bb718148d3e7ab963f. 이 문서와 REPRO.json을 포함한 원격 커밋이 검토 대상이다. 현재 구현은 없다. 새로운 마크나 렌더링 primitive는 만들지 않고 기존 연속 색상과 기존 범례의 수치 변환만 확장한다.

## 제안하는 공개 호출

기존 encodeColor/encodeStroke의 정량 색상 척도와 editColorScale/editStrokeScale에 type:"sqrt"를 허용한다. 새로운 액션이나 별도 옵션은 만들지 않는다. 일반 연속 색상 소비자들이 공유하는 척도 정책으로 구현하고, 기존 소비자별 제약은 그대로 검사한다.

```js
chart().createCanvas({width:300,height:260,margin:40})
 .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:25},{x:2,y:2,v:100}]})
 .createScatterPlot({x:"x",y:"y",guides:false})
 .encodeColor({field:"v",fieldType:"quantitative",scale:{type:"sqrt",domain:[0,100]}});
```

값을 f(v)=sign(v)*sqrt(abs(v))로 변환하고 변환된 양 끝의 구간에서 정규화한다. [0,100]의 0/25/100은 t=0/0.5/1이다. 음수·0을 가로지르는 구간과 역방향 구간도 같은 부호 보존 정의를 사용한다. exponent, base, constant 같은 다른 타입 전용 옵션은 허용하지 않는다. 기본값은 종전 sequential이다. domain/range/palette/interpolate/reverse/clamp/nice/zero의 기존 호환 규칙과 비유한 값·퇴화 구간 오류를 재사용한다. midpoint는 현재 sequential 전용 정책을 유지한다.

## 저장과 범례

semanticSpec에는 type:"sqrt"와 원래 수치 domain을 저장한다. 값 자체나 원본 데이터를 sqrt로 덮어쓰지 않는다. materialization이 동일한 수치 척도로 실제 마크와 범례를 계산한다. 렌더러는 기존 graphicSpec만 읽는다. 연속 그라데이션은 비선형 정규화에 맞게 값 위치를 놓으며, representation:"symbols"도 원래 샘플 값의 색을 같은 척도로 구한다. 척도 편집·색상/선색 전환·범례 갱신·저장/복원·facet/repeat에서도 같은 정책을 유지한다.

## 구현 후 검증

0/25/100 중간색, 음수/0 통과/역방향/경계 밖/clamp/퇴화 domain, 색상과 선색, 명시·추론 domain, 기존 보간 모드·팔레트, 그라데이션 및 샘플 원 범례, 편집 후 재구체화·제거·복원·저장/재실행·부모 자식 공유, 실패 원자성·이전 프로그램 불변성을 검사한다. Full/Basic의 지원 범위를 일치시키고 공개 타입·계약·문서·생성 참조를 동기화한다. 기존 sequential/log/symlog 결과는 회귀 검사로 보존한다.

## 승인 범위 밖

임의 exponent를 쓰는 pow 색상, 새 색공간/보간 whitepoint 변경, 새 마크, 패키지 배포·PR·문서 배포는 포함하지 않는다. 사용자 승인 전에는 이 공개 타입 확장을 구현하지 않으며 다른 차트는 계속 진행한다.

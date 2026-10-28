# Object-bounds radial 타원 추가 검토

상태: **approved**. revision `06e9eba8`에 대한 “추가 시각 대상 모두 승인, 구현 계속”을
[승인 정본](../../PUBLIC_APPROVALS_20261028.json)에 기록했다. 기존 원형/offset/focal/alpha6종은 `57f70fbc`에서 승인되었다.
이 문서는 [공개 제안 P1](../paints/PUBLIC.md)의 비정사각 object-bounds 의미에 해당하는 새 표본 하나만 다룬다.
기존 시각 승인을 타원 목표의 승인으로 확대하지 않는다.

## 정확한 실행 source와 의미

`test/gates/radial-gradient/ellipse.manifest.js`의 `ellipseFixture()`가 크기·값을 단독 소유한다.
기존 `primitive.program.js`의 `drawRadialPrimitive`와 `radialPrimitiveSVG`를 그대로 호출하며,
unitBounds 분기에서 Canvas/PDF는 object bounds에 translate/scale하고 SVG는 objectBoundingBox를 사용한다.

```js
drawRadialPrimitive(context, ellipseFixture(), {lowerOpacity:true, clipCone:true});
```

공개 제안의 authored paint는 center(0.5,0.5), focal 생략=center, radius0.5,
stops0=`#fef3c7`/1=`#0f766e`다. Bounds는(20,40)에서220×140 logical px다.
따라서 화면 중심은(130,110), 수평 반지름110, 수직 반지름70인 타원이 된다.
반지름을 짧은 변의70px 원으로 강제하는 안과 모습이 다르다.
표본의 구체적인 public 제안 호출은 다음과 같다. 아직 이 호출을 Current로 등록하지 않았다.

```js
program.editBarMark({target:"bars",fill:{type:"radial-gradient",center:{x:.5,y:.5},radius:.5,
  stops:[{offset:0,color:"#fef3c7"},{offset:1,color:"#0f766e"}]}});
```

## 검증

- 독립 oracle의 offset은 `hypot((x−130)/110,(y−110)/70)`이다.
- Center는 시작 색, x=240/y=180의 끝점은 마지막 색. (185,110)/(130,145)는 같은0.5 offset이다.
- Normal radial suite9/9, render2/2(기존6종+새1종), source/discovery/package 경계33/33.
- 새 표본의9개 sample×4경로=36/36 통과. Native/Browser Canvas·SVG는 pixel center RGB±1/alpha exact,
  PDF는 앞서 고정한 analytic pixel footprint+RGB1byte 정책이다. 임의 tolerance 확대 없음.
- Native PDF는 radial ShadingType3이며 Image0개로 vector다. Browser readiness/label/dimensions/errors도 검사했다.
- 기존6개 표본의 PNG/SVG/Browser Canvas/Browser SVG/PDF raster30개 SHA256이 변경 전과 전부 같다.
  새 optional 분기가 기존 승인 대상의 출력을 바꾸지 않았음을 확인했다.
- Product src/entry/type/schema는 이 checkpoint에서 변경하지 않았다. Package 증거는 동일 package inputs의
  직전 compositing checkpoint705entries/1,047,741packed/4,872,991unpacked bytes를 재사용한다.

```sh
node scripts/run-tests.js all capability:radial-gradient
node scripts/run-tests.js render gates/radial-gradient
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js
```

새 이미지: `.artifacts/test/png/review/radial-gradient/object-bounds-ellipse/primitive.png`.
동일 폴더에 SVG/PDF·각 raster·variant.json·evidence.json을 보존한다.
정확한 source revision과 hashes는 [ELLIPSE-EVIDENCE.json](ELLIPSE-EVIDENCE.json)에 기록한다.

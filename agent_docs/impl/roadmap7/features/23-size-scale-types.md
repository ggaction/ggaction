# R23 — 크기 scale의 비선형·단계형 mapping

원래 감사 번호: **23**. Primary owner: **Phase 5**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

큰 값 범위와 단계별 중요도를 크기로 표현한다. '비선형 크기'를 도입해 기존 지각적 면적 의미가 무너지는 것이 가장 큰 위험이므로 geometry formula를 인수 조건으로 둔다.

현재 파일(저장소 root 상대 경로):
- `src/actions/scales/definitions.js`
- `src/actions/scales/edit.js`
- `src/actions/guides/legends/size.js`
- `src/actions/encodings/index.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// 기존 SizeScaleOptions의 linear 호환 유지
SizeScaleOptions = LinearSize | LogSize | SqrtSize | PowSize
 | QuantizeSize | QuantileSize | ThresholdSize;
// type:"pow"는 exponent>0 필수; log는 base 기본10, base>0 && base!=1
// threshold: domain은 strictly increasing cut points,
// range는 비감소 nonnegative 면적(px²) 값 n+1개.
// quantize: domain=[min,max], range=[area...]; quantile: domain=sample[]
```

## 값·기본값·오류 계약

- 기존 size range는 반지름이 아니라 면적(px²)이다. 새 continuous mapper는 A=A0+t*(A1-A0)를 반환하고 circle radius=sqrt(A/π), 다른 symbol은 면적 A의 기존 shape geometry로 변환한다. range를 radius로 재해석하거나 area에 sqrt를 두 번 적용하지 않는다.
- log는 positive data/domain만, sqrt/pow는 nonnegative만. 기존 numeric data의 negative를 abs로 바꾸지 않는다. domain 외 입력은 기존 clamp policy, mapping 결과가 nonfinite/negative이면 오류.
- threshold cut에서 value>=cut은 오른쪽 bucket. quantize는 마지막 upper endpoint를 마지막 bucket에 포함. quantile은 기존 quantile algorithm과 category ordering을 재사용; threshold가 중복돼도 결정적이다.
- discrete range는 최소2개, finite nonnegative, 비감소. explicit equal sizes는 허용하되 동일 symbol이라도 legend labels는 별개. quantile domain의 의미는 samples이며 [min, max]로 재해석하지 않는다.
- continuous legend는 실제 mapper를 호출; discrete legend는 구간 label+symbol로 완성한다. R37 values는 discrete size legend에는 적용하지 않으며 explicit error.
- type 변경 시 이전 타입 전용 옵션을 무조건 보존하지 않는다. 새 type의 완전한 필수 옵션을 preflight하고 호환되는 style/range만 유지한다.

## 저장 결과와 생명주기

scale type은 semantic scale이 소유한다. size → symbol geometry 변환은 한 곳이며 mark/legend/highlight가 같은 함수를 호출한다. resolved quantile thresholds는 derived이며 data edit/facet에서 requested domain과 구분해 다시 계산한다.

## 구현 순서와 action 계층

1. 현재 linear size 면적 의미를 numeric tests로 고정.
2. continuous t 및 discrete bucket mapper를 추가하고 shared scale validator 확장.
3. mark/legend/selection symbol 모두 동일 area conversion 사용.
4. editSizeScale type migration, R19 batch, explicit legends R37, weighted 데이터 소비까지 검증.

## 독립 oracle와 인수 테스트

- range=[4π,100π]이면 endpoint circle radius2,10. normalized t=.5에서 area52π, radius=sqrt52≈7.2111025509이며 6이면 실패. log domain1..100의 value10은 이 midpoint.
- threshold[10,20], range[2,4,8]: values9,10,19,20 → 면적2,4,4,8. circle radius는 각각sqrt(area/π). zero area는 실제 invisible 유지.
- pow exponent2 domain0..10에서 value5 t=.25; sqrt는 t=sqrt(.5). quantitative mapper domain transforms를 independent formula로 검증.
- negative log/sqrt, unsorted threshold, range count mismatch, invalid exponent, discrete values legend 요청 오류.
- 기존 linear snapshots, circle/다른 size symbol/legend rendered 면적, domain edit와 quantile recompute.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.

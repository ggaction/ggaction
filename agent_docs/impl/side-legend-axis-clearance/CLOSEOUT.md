# Side legend axis clearance 검증

## 결과

명시 offset을 생략한 left/right 외부 범례가 실제 같은 edge axis의 line·tick·label·title occupied bounds 뒤로 배치된다. Categorical gap8, standalone continuous/size/opacity gap30과 plot-top alignment는 유지한다. Border/stroke를 포함한 전체 occupied 범례를 배치하며 stored offset과 inferredOffset은 변경하지 않는다. 명시 offset0/8의 기존 collision rejection, free/corner/legacy와 무관한 edge는 유지한다.

기존 resource resolver·side lane·guide transaction만 확장했다. 새 public action/옵션/type/schema/cache 또는 renderer 변경은 없다. Axis-first/legend-first, title/label 편집과 제거, Canvas/data/scale/persistence replay가 같은 concrete output으로 수렴한다.

## 증거

- 새 회귀23개와 기존 horizontal 회귀7개 및 package scope4개 통과. 최종 전체 normal suite는 **4,806/4,806 pass**, 128.157초다.
- Left/right × categorical/bordered/gradient6쌍에서 독립 explicit-offset 대조군과 전체 graph·SVG 문자열·1×/2×decoded PNG RGBA·decoded PDF streams가 exact다. 모든 실제 plot에서 nonwhite ink를 확인했다. 이미지는 열어 보지 않았다.
- 최종 tarball SHA-256 `3efd314b0da5287042df8c82fdd0f41b558dfb9958cba95659dca3e24a35006b`:602entries/851546packed/4126122unpackedbytes. 새 실제 설치 consumer62항목과 공개 Full/Basic12case가 통과했다. Basic의 기존 type-transition 제한은 별도 color scale ID로 준수하며 Full만 공개 축 제거 검사를 실행한다.
- 최종 browser gzip은 Full421454/Basic208003/SVG7567bytes다. 실제 실패 뒤 unpacked cap4125000→4127000, Basic gzip208000→209000만 다음1000byte 단위로 조정했다. 계산을 단순화해 Basic208009→208003으로 줄였지만 여전히 이전 한도를3bytes 초과했다. 다른 크기·source/data/numeric/visual/coverage 기준은 바꾸지 않았다. README·architecture 표도 동기화했다.
- Current contract, categorical/editing 문서, changelog, provenance/LLM 생성물을 동기화했다. 이전 실패는 VERIFICATION.json에 구분해 보존했다.

## 재현

```sh
node scripts/run-tests.js all unit/actions/guides/default-side-legend-offset.test.js unit/actions/guides/default-horizontal-legend-offset.test.js contracts/package-artifact.test.js
npm test
npm run test:package
```

실제 축의 occupied 경계와 기존 literal family gap을 expected 값으로 사용한다. 대표 단일 source1000×800/margins250·250·200·200에서 unbordered categorical explicit offset48.5, padding12/lineWidth4 bordered62.5, gradient70.5가 omitted-offset 결과와 같다. 정확한 axis/data/options는 새 회귀 파일과 PROPOSAL.md에 있다.

## 남은 통합

이는 검증·보관된 미배포 후보다. 공개0.0.21, 번역 설치/runtime과 사이트는 유지한다. 다음 정규 **1413 successful-family** checkpoint에서 다른 후보와 함께 Node24/release artifact/전체 corpus 호환성/registry 설치/tag/docs/dataset/viewer를 검증·배포한다. 이슈235는 통합 전까지 열어 둔다.

원인 차트0167은 후보에서 원본576×364/471raw rows로 렌더 가능함만 확인했다. 아직 source별 ISO temporal/signed-two-group baseline/full glyph 증거와 공개 수정 런타임이 필요하므로 unadmitted 상태이며 School 호출0이다. 이 수정 검증을 차트 번역 완료로 세지 않는다.

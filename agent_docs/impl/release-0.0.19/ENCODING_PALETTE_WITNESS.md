# 직접 인코딩의 복원된 range palette 증언

## 원인

PR217 CI39034674598의 realistic7은 이전 inventory fingerprint에서 중단됐다.
`32f4c629`의 object/array union 순회 교정이 숨겨졌던
`encodeColor.scale.range.palette`와 그 `.count`/`.extent`/`.name`을 복원했다.
기존294개와 현재298개 required path를 집합 비교했으며 추가4개/삭제0개다.
`palette`와 `palette.name`의 family-values 다양성 조건2개도 복원돼9→11이며,
296개 path literal과 그 digest는 그대로다. 공개 선언·parser·admission 정책을 바꾸지 않는다.

기존 직접 인코딩 recipe는 `range.palette` 객체의 `viridis`만 직접 encodeColor로 호출했다.
`magma`는 editColorScale 호출이어서 직접 인코딩의 문자열·객체 이름 다양성을 증언하지 못했다.
따라서 fingerprint만 동기화하면 실제 strict assertion에서 실패한다.

## 실제 보완

기존 모든 profile/call/159개 기능 요구와 closed9 color-type 정책을 유지한 채,
기존 quantitative source row의 세 point consumer를 추가했다:

- `range: { palette: 'viridis' }`
- `range: { palette: 'magma' }`
- `range: { palette: { name: 'magma', count: 7, extent: [0.08, 0.92] } }`

원래 객체 `viridis` 소비자와 합쳐 문자열2개·객체 이름2개가 각각 직접 실행된다.
15개 composite program/5개 pinned TidyTuesday dataset 구조를 유지한다.
새 회귀는 복원4path 모두의 실제 호출5회/3dataset과5dataset 도달,
각 문자열 및 객체 이름의 viridis/magma도 각각5회/3dataset·5dataset을 검사한다.
기존 전체298paths/296literals/11diversity strict 검사 및 analytic/graphic/SVG integrity를 유지한다.

## 검증

Node22.23.1/macOS:

```sh
node --max-old-space-size=512 --test test/contracts/realistic-encoding-coverage-recipes.test.js
```

- 실제3/3PASS,14,091.808875ms. 로그 `/tmp/ggaction-217-encoding-restored-actual.log`.
- fingerprint를 그대로 둔 채 새3consumer만 임시 제거한 반증 실행은 예상대로 실패했다.
  전체 strict 검사에서 정확히 새 palette/name 다양성2개가 누락됐고,
  새 회귀도 실제 `palette viridis` 증언 부재를 검출했다.
  로그 `/tmp/ggaction-217-encoding-no-new-calls.log`.
- 반증 뒤 실제 fixture bytes를 정확히 복원했다(SHA256
  `88725b2ff2acb9442aabdd15ed93a36d367a9c99795aed13ca3cb266feafd6de`).
- source/runtime/types/global threshold·minimum·literal admission 변경0.
  chart-datasets의 공개0.0.18 증거와 importer patch는 건드리지 않았다.

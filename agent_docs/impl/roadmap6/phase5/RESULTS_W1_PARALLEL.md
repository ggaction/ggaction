# Phase 5 W1 A3 — Parallel field 축 lifecycle 결과

[W1 A3 계약](CONTRACT_W1.md#a3--parallel-field-축-lifecycle)을 구현했다. 기준 commit은 `0ecb462db937e7bceea07303ba9b644790d368e7`, 결과는 이 문서를 추가한 commit이다. 전체 실행 승인을 적용한다. Phase 5 W2–W5, 후속 Phase와 0.0.13 릴리즈는 남아 있다.

## 공개 계층과 의미

Full에 `createParallelAxes`, `createParallelAxis`, `editParallelAxis`, `removeParallelAxis`, `removeParallelAxes` 다섯 entry를 제공한다. 첫 액션은 internal에서 공개 승격했다. 전체 chart → 전체 axes → field axis → line/ticks/labels/title 옵션의 계층이며 내부 graphic ID를 요구하지 않는다. Basic에는 노출하지 않는다.

Field는 encoded data name이다. 점·공백·`__proto__`도 name으로 처리한다. Target은 stored guide owner를 우선하고 없으면 unique encoded Parallel line을 사용한다. 명시적인 null·unknown·다른 owner는 오류다.

Create는 missing component를 만들며 false는 생략한다. Edit는 existing component를 바꾸며 false는 제거한다. Ticks/labels는 독립 복원이 가능하므로 sibling style을 버릴 필요가 없다. Group과 개별 지시, count와 values는 배타적이다. Ordinal은 domain values를 사용하고 explicit count는 quantitative에서만 허용한다. 마지막 component를 제거하면 전체 owner를 정리하며 mark·scale은 유지한다.

Explicit title text는 semantic `guide.axis.parallel.titles`의 field/text 배열이 소유한다. Style·tick mode·visibility·all/selected 생성 범위는 guide config의 ordered field recipe가 소유한다. Field 유지·재배치 때 recipe/title을 보존하고 삭제된 field는 정리한다. 전체 생성으로 시작하면 새로운 dimension도 기본 축을 만들고, 개별 생성으로 시작하면 선택 field만 유지한다. 명시적으로 숨긴 field는 replay로 복원되지 않는다.

Reencoding 시 마지막 선택 field가 없어지는 경우를 시험하면서 mark 내부의 scale/guide 갱신과 planner의 guide stage가 중복되는 문제를 발견했다. 모든 소비 scale을 먼저 해결한 plan에서 line의 기존 `scales:false` 경로를 재사용하여 scales → marks → guides를 한 번씩 실행한다. 직접 line 편집과 일부 scale만 포함한 shared consumer는 자신의 scale 해결을 유지한다. Runtime planner는 concrete mark name 대신 소유 policy를 사용한다.

## 시각 증거

API 구현 전에 `test/charts/cars-parallel-coordinates/axis-style.primitive.js`를 작성하고 primitive를 render했다. 기존 Cars chart의 첫 field에 보라색/width3 baseline과 `Fuel economy`/weight700 title을 적용했다. Public chain은 `examples/cars-parallel-coordinates/program.js`의 `createStyledCarsParallelCoordinates`이며 다음 edit를 추가한다.

```javascript
program.editParallelAxis({
  field: "Miles_per_Gallon",
  line: { color: "#7c3aed", lineWidth: 3 },
  title: { text: "Fuel economy", fontWeight: 700 }
});
```

기본/새 variant의 same-run decoded pixels가 같고 새 variant의 graphicSpec·drawing order·mock renderer calls도 같다. Stable manifest가 primitive/public/exact target call chain을 함께 소유한다. Approved artifact 경로는 `.artifacts/test/png/charts/chart-variants/cars-parallel-coordinates/axis-style/`다. Review subtree를 제거했다.

## 검증

로그 prefix는 `.artifacts/roadmap6-authoring/phase5-parallel-lifecycle-`다. Repository 내부 tmp/npm/browser cache를 사용했다.

| 검사 | 결과 |
| --- | --- |
| `npm test` | 2,801/2,801, 실패·skip 0 |
| `npm run test:coverage` | lines 95.32%, branches 92.02%, functions 98.91%; critical floors 77개 PASS |
| Field lifecycle | 10 tests: style/title, 모든 component 독립 제거·복원, all/selected replay, 마지막 owner 정리, ordinal/quantitative format, selector/atomicity, 특수 field, title schema, total item 한도 |
| 관련 집중 검사 | field lifecycle + 재배치 + pure resolution + chart public + strict type, 모두 normal suite에 포함 |
| PNG | 2/2: 기본/새 variant의 primitive/public exact pixels |
| Realistic guide recipes | Parallel 대상 2/2; 최종 source의 field selector 교정은 null 입력 검증만 추가 |
| 설치 패키지 | Node/renderers, root strict types, MCP, installed tutorials, Full/Basic/SVG bundles PASS |
| 같은 tarball Chromium | 1/1: field edit/remove/restore와 Canvas/SVG |
| Public docs | generation·preflight·build·125-page static PASS; desktop search/keyboard/Axe/no-JS·전 page 320/390/768px PASS |
| Inventory | direct 194, user-facing 188, Planned 0; 5개 모두 executable direct-root recipe에 포함 |

총 public option paths 5,695(필수 4,914, 제외 781), path literal requirements 2,690, family literal requirements 174다. 전체 realistic corpus의 신규 option 분포 완료는 주장하지 않으며 Phase 5 통합에서 별도로 확인한다.

패키지 증거는 [package-parallel-lifecycle-results.json](package-parallel-lifecycle-results.json)이다. SHA-256 `e799a5fdb197707c841a7ad537b6adce47598044d7b006695d9ad9f684065d9a`. Entries 447, packed 502,338, unpacked 2,405,709 bytes. Full/Basic/SVG gzip 249,616 / 137,476 / 6,437 bytes.

새 모듈 3개와 5개 public contract 추가로 entries 444→447, packed ceiling 500,000→510,000, Full gzip ceiling 249,000→251,000으로 조정했다. Unpacked 2,500,000과 Basic/SVG ceiling은 유지한다. Raw npm dry-run과 release staging의 JSON/JS compaction은 다르므로 최종 staged tarball 수치를 근거로 삼았다. 이 artifact는 0.0.12 개발 검증용이며 최종 0.0.13 릴리즈가 아니다.

처음 누적 검사에서 internal inventory의 승격 잔여 행, direct named lookup, package ceiling, 이후 architecture의 ceiling 표 동기화 누락을 발견해 수정했다. Count/values와 grouped/individual restore의 draft를 그대로 완료로 처리하지 않았고, 마지막 null target 수정 후 source/consumer 검증을 다시 실행했다. 새 Parallel policy family와 title schema를 포함한 critical coverage floor를 낮추지 않았다.

## 남은 범위

W1 A1/A2/A3를 합친 축 생성·편집·제거·복원 범위가 이번 checkpoint다. D07/F17 전체 closeout, 범례 W2, 라벨·reference W3, theme W4, fitting W5와 Phase 5 전체 통합을 혼동하지 않는다. 다음은 legend kind × edge × content lifecycle과 combined legend 일부 제거 후 recipe 정렬이다.

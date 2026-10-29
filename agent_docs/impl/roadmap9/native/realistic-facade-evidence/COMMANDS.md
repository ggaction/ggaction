# 실제 데이터 façade 증거 복원

기준 source는 `0e41afeb5`이다. `../../AUTHORIZATION.json`의 `remainingApproval`과 root의 CI repair 분담을 재사용했다. 라이브러리 runtime·types·package·renderer 입력은 변경하지 않았다. 새 공개 API나 외부 adapter 의존성을 추가하지 않았다.

## 수정 범위

- Cartesian: 원 880개 witness와 모든 원 데이터·옵션을 보존하고 Bar의 pattern 7종 및 radial 1종을 5회씩 추가하여 920개로 확장했다. 추가 style profile은 기존 literal-paint profile의 위치·data·aggregate를 재사용한다. 8px pitch의 최초 시도는 큰 plot에서 기존 30,000 command budget을 초과하여 실패했고 로그를 보존했다. budget을 올리지 않고 명시 64px pitch·8px strokeWidth profile로 검증했다.
- 공통 current façade helper: 실제 guide label에 `responsive:false`를 작성하여 새 옵션 path와 false literal을 실행한다. 통계 540개 기존 schedule도 그대로 이 helper를 소비한다.
- Hierarchical: composition의 각 child program root를 `directProgramTrace`로 읽는다. nested wrapped child를 direct로 승격하지 않는다. 원 33개 profile을 유지하고 Area wiggle 1개와 6개 fill role의 pattern 7종·radial 1종·linear 1종, 합계 55개 direct profile을 추가했다. 원 8개 authentic dataset과 최소 5회/3dataset 규칙을 유지한다. 원 trace 집계 수정 후 확인된 178개 누락은 첫 실패 로그에 남겼다.
- Facet raster: 기존 25 guide 사례 및 13 lifecycle 사례의 ID·factors·원행을 유지한다. guide recipe의 measured/count/nominal Y가 분리된 세 facet panel임을 정확히 따라간다. 25개 전체 concat은 구조와 SVG를 확인하고, 모든 88개 panel은 원 크기로 Canvas/SVG/PNG/PDF를 확인한다. 거대한 concat 전체의 raster 성공으로 집계하지 않는다. 픽셀 16,777,216 및 child RSS 512MiB 상한은 유지했다.

## canonical 실행

```sh
node scripts/run-tests.js realistic contracts/realistic-cartesian-facade-coverage-recipes.test.js
node scripts/run-tests.js realistic contracts/realistic-statistical-facade-coverage-recipes.test.js
node scripts/run-tests.js realistic contracts/realistic-hierarchical-facade-matrix.test.js
node scripts/run-tests.js realistic contracts/realistic-facet-raster-bounds.test.js
```

분리된 전체 coverage·package install·전역 corpus sweep은 반복하지 않았다. 원 CI 로그의 경로·SHA 및 정확 실패 block은 `facade-original-ci-failures.json.gz`, 최종 target ID/digest는 `facade-inventory-targets.json.gz`, panel별 4format 결과·dimensions·RSS는 `facet-raster-receipts.json.gz`에 보존한다. 최초 facet 실행은 실제 88 panel 출력은 통과했지만 마지막 최대 pixel 기대값만 이전 구조의 16,120,420으로 남아 실패했다. 현재 literal 15,351,680은 같은 사례를 모두 실행한 결과이며 cell Canvas·plot range 독립 assertions도 통과한다.

이 evidence는 새 source/패키지 qualification이나 STEP074/077 전체 완료를 뜻하지 않는다. root의 최종 합산 체크포인트에 전달하는 owning evidence이다.

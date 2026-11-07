# Geo sample admission 합산 검증

Sampler의 presentation/group 전체 검사를 완료한 뒤 같은 동기 호출 안에서만 검증된 geometry closure를 소비한다. Generic resolver와 offline admission은 기존 전체 검사를 수행한다. Native stream·refinement·출력 및 aggregate work, 오류 순서, caller isolation, 최종 concrete validation과 deep-owned 반환을 유지한다. Public API/schema, global cache, ownership registry는 변경하지 않았다.

[합산 증거](geo-admission-merged-evidence/qualification.json)는 세 runtime source가 upstream e4182d027과 byte-identical임을 검산한다. Owning 135개 및 codec/package/discovery 105개가 통과했다. 동일 canonical archive의 Node20/22/24 runtime·strict types·실행 문서·6bundles와 source-free minified Chromium DPR1/2도 통과했다. Critical owner coverage와 정확한 package/bundle 실측값은 증거 JSON에 보존한다.

Archive SHA256 `50705bf2ba2e6b3729a506e7c803967164cff7bcedd6b32997b939e8a65503be`는 1268entries/1827390packed/8230130unpacked bytes다. Node24 측정값에 맞춰 artifact ceiling만 정합했으며 원 runtime work/guard·fixture·SLO는 유지한다.

Upstream archive `52ae6397eacbab02df8f7cae8978c426667cdd1b69dbddc683d6aac71be93d85`의 원100k native/current/rebase 각199999commands 및 전체footprint/scalar질의, offline 권한 거부를 재사용한다. 동일 source의 증거이지만 합산 archive에서 새 원100k를 실행했다는 뜻은 아니다. 상세 내용은 [upstream 구현 기록](GEO_SAMPLE_ADMISSION_IMPLEMENTATION.md)이 소유한다.

최종 합산본의 원 workload, 단독 CPU canonical5+30/DPR1·2 성능, 원 canonical100cycle lifetime은 후속 검증이다. Small sampler100cycle을 원 lifetime 자격으로 대체하지 않는다. STEP057–070/077은 미완료다.

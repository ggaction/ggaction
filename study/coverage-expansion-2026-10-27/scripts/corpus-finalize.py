#!/usr/bin/env python3
import pathlib,json,csv,collections,urllib.parse,hashlib,re
BASE=pathlib.Path(__file__).resolve().parents[1];E=BASE/'evidence'
def read(f):return json.loads((E/f).read_text())
def save(f,o):(E/f).write_text(json.dumps(o,ensure_ascii=False,indent=2))
a=read('corpus-originals.json');schemas={x['path']:x for x in read('corpus-schema-validation.json')};probes={x['id']:x for x in read('translations-runtime-probes.json')['results']}
for x in a:
 x['candidateGapFamilies']=[('general-pivot-semantic-qualification' if f=='pivot-transform' else f) for f in x['candidateGapFamilies'] if f!='loess-statistics']
 x['assessment']['declarationScreening']='missing-capability-candidate' if x['candidateGapFamilies'] else 'static-supported-candidate-not-qualified'
 x['assessment']['declaredSchema']=schemas[x['path']]['status']
 if x['id'] in probes:
  r=probes[x['id']];x['assessment']['currentRuntime']='executed-0.0.26-all-stages-frozen-svg-exact' if r.get('allFrozenSame') else 'executed-0.0.26-all-stages-equal-frozen-svg-diff' if r.get('allStagesSame') else 'probe-failed'
  x['currentRuntimeProbe']=r
 if x['id'] in ['vl_0522','vl_0628','vl_0944']:x['externalFidelityBlocker']={'issue':258,'status':'open-at-audit-time','qualification':'absent from published 1387; static candidate does not settle facet layout or header residual'}
save('corpus-originals.json',a)
s=read('corpus-summary.json');s['schemaValidation']='Executed separately: corpus-schema-summary.json. Structural candidate count remains distinct from JSON Schema valid count.';s['translations']['staticGapCandidates']=dict(collections.Counter(f for x in a for f in x['candidateGapFamilies']));s['canonicalAssessmentCounts']=dict(collections.Counter(x['assessment']['declarationScreening']for x in a));save('corpus-summary.json',s)
with(E/'corpus-original-crosswalk.csv').open('w',newline='')as f:
 w=csv.writer(f);w.writerow(['id','source_path','source_sha256','schema_status','translation_status','stages','source_identity','candidate_gap_families','declaration_screening','current_runtime_status','source_fidelity','external_blocker','source_url'])
 for x in a:w.writerow([x['id'],x['path'],x['sha256'],x['assessment']['declaredSchema'],x['assessment']['translationArtifact'],x['translation']['stageCount']if x['translation']else 0,x['sourceIdentity'],'|'.join(x['candidateGapFamilies']),x['assessment']['declarationScreening'],x['assessment']['currentRuntime'],x['assessment']['sourceFidelity'],x.get('externalFidelityBlocker',{}).get('issue',''),x['sourceUrl']])
resources=[dict(id=x['id'],source_path=x['path'],**r)for x in a for r in x['resources']]
save('corpus-data-dependencies.json',resources)
save('corpus-data-summary.json',{'references':len(resources),'kinds':dict(collections.Counter(r['kind']for r in resources)),'unresolvedNamedDatasetCharts':sum(bool(x['unresolvedNamedDatasets'])for x in a),'note':'Named resolution is a root datasets membership screen, not full lexical-scope resolution; remote resources are inventoried but not fetched or HTTP-qualified.'})
animation=[]
for x in a:
 def animation_walk(o,pointer=''):
  if isinstance(o,dict):
   for k,v in o.items():
    p=pointer+'/'+k.replace('~','~0').replace('/','~1')
    if k in ['animation','animate','transition','transitions','timer','duration','easing']:animation.append({'id':x['id'],'pointer':p,'value':v})
    if k in ['on','events'] and isinstance(v,str) and re.search(r'\btimer\b',v):animation.append({'id':x['id'],'pointer':p,'value':v})
    if k not in ['values','datasets']:animation_walk(v,p)
  elif isinstance(o,list):
   for i,v in enumerate(o):animation_walk(v,pointer+'/'+str(i))
 animation_walk(json.loads((BASE/'sources/chart-llm'/x['path']).read_text()))
save('corpus-animation-declarations.json',{'method':'Search declaration keys animation/animate/transition/transitions/timer/duration/easing and timer event streams recursively, excluding raw values/datasets. This does not detect animation implemented outside JSON or implicit external app behavior.','matches':animation})
embedded=read('corpus-embedded-specs.json');roots=read('corpus-files.json');byhash={}
for r in roots:
 if r.get('canonicalJsonSha256'):byhash.setdefault(r['canonicalJsonSha256'],[]).append(r['path'])
for r in embedded:
 h=hashlib.sha256(json.dumps(r['spec'],sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()).hexdigest();r['canonicalJsonSha256']=h;r['rootCandidateAliases']=byhash.get(h,[])
save('corpus-embedded-specs.json',embedded)
es=read('corpus-embedded-summary.json');es['rootCandidateAliasCount']=sum(bool(r['rootCandidateAliases'])for r in embedded);es['allCandidateOccurrences']=len(schemas)+len(embedded);es['allCandidateUniqueJson']=len(set(r['canonicalJsonSha256']for r in roots if r['classification']=='chart-spec-candidate')|set(r['canonicalJsonSha256']for r in embedded));save('corpus-embedded-summary.json',es)
with(E/'corpus-all-files-qualified.csv').open('w',newline='')as f:
 w=csv.writer(f);w.writerow(['path','group','classification','schema_status','sha256'])
 for x in read('corpus-files.json'):w.writerow([x['path'],x['group'],x['classification'],schemas.get(x['path'],{}).get('status','not-a-root-chart-candidate'),x['sha256']])
print(json.dumps({'assessments':s['canonicalAssessmentCounts'],'schema':read('corpus-schema-summary.json')['counts'],'probeFamilies':len(probes)},ensure_ascii=False))

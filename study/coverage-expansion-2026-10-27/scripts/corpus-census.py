#!/usr/bin/env python3
"""Reproducible static inventory. Declaration presence is not native runtime qualification."""
import collections, csv, hashlib, json, re, subprocess, sys
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
SRC=BASE/'sources/chart-llm'; TRANS=BASE/'sources/chart-datasets'; OUT=BASE/'evidence'
OUT.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda o:json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
commit=lambda p:subprocess.check_output(['git','rev-parse','HEAD'],cwd=p,text=True).strip()
commits={'chartLlm':commit(SRC),'chartDatasets':commit(TRANS),'ggaction':commit(BASE.parent.parent/'ggaction')}
files=subprocess.check_output(['git','ls-files','-z'],cwd=SRC).decode().split('\0')
files=[x for x in files if x]
NEST=['layer','concat','hconcat','vconcat','spec']
TRANSFORMS={'aggregate','bin','calculate','density','extent','filter','flatten','fold','impute','joinaggregate','loess','lookup','pivot','quantile','regression','sample','stack','timeUnit','window'}
PROPERTY_OWNERS={'axis','legend','header','scale','config','projection','mark','title','resolve','autosize'}
def dump(name,v): (OUT/name).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def group(path):
 if path.startswith('docs/data/chart/'):return 'canonical-1981'
 if path.startswith('docs/data/chart_48/'):return 'chart-48-subset'
 if path.startswith('docs/data/chart_48_in/'):return 'chart-48-in-subset'
 if path.startswith('benchmark/'):
  return '/'.join(path.split('/')[:2])
 return path.split('/')[0]
def looks_chart(x):
 return isinstance(x,dict) and (('mark' in x and ('encoding' in x or 'data' in x or 'transform' in x)) or any(isinstance(x.get(k),list) for k in NEST[:-1]) or ('spec' in x and ('facet' in x or 'repeat' in x)) or (isinstance(x.get('$schema'),str) and 'vega-lite/' in x['$schema']))
def classify(x):
 if looks_chart(x):return 'chart-spec-candidate'
 if isinstance(x,dict) and ('$schema' in x and '/vega/' in str(x['$schema']) or 'marks' in x and 'scales' in x):return 'lower-level-vega-specification'
 if isinstance(x,list):return 'array-data-or-metadata'
 if isinstance(x,dict):return 'object-data-or-metadata'
 return 'scalar-data-or-metadata'
def pointer(parts):return '/'+('/'.join(str(s).replace('~','~0').replace('/','~1') for s in parts)) if parts else ''
def analyze(spec):
 feats=set(); occurrences=[]; expressions=[]; resources=[]; nodes=[]; vocab=collections.defaultdict(set)
 def add(kind,value,path):
  feature=f'{kind}:{value}'; feats.add(feature); occurrences.append({'feature':feature,'pointer':pointer(path)})
 def leaves(obj,prefix,path):
  if isinstance(obj,dict):
   for k,v in obj.items():
    add(prefix,k,path+[k])
    if isinstance(v,dict): leaves(v,prefix+'.'+k,path+[k])
    elif isinstance(v,list):
     for i,n in enumerate(v):
      if isinstance(n,dict):leaves(n,prefix+'.'+k,path+[k,i])
 def expr(text,path,kind):
  if isinstance(text,str):
   scrub=re.sub(r'''"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*' ''', ' ', text, flags=re.X)
   functions=sorted(set(re.findall(r'(?<![\w.])([A-Za-z_]\w*)\s*\(',scrub)))
   expressions.append({'kind':kind,'pointer':pointer(path),'source':text,'lexicalFunctionCandidates':functions})
   add('expression',kind,path)
   for f in functions:add('expressionFunctionCandidate',f,path)
 def expression_walk(x,path):
  if isinstance(x,dict):
   for k,v in x.items():
    if k in ('expr','calculate','test') or k=='filter' and isinstance(v,str):expr(v,path+[k],k)
    elif k not in ('values','datasets'):expression_walk(v,path+[k])
  elif isinstance(x,list):
   for i,v in enumerate(x):expression_walk(v,path+[i])
 def data(x,path):
  if not isinstance(x,dict):return
  if 'url' in x:
   url=x['url']; kind='remote' if isinstance(url,str) and re.match(r'https?://',url) else 'relative-or-expression'
   add('data',kind,path+['url']);resources.append({'kind':kind,'url':url,'pointer':pointer(path+['url']),'format':x.get('format')})
  if 'name' in x:add('data','named',path+['name']);resources.append({'kind':'named','name':x['name'],'pointer':pointer(path+['name'])})
  if 'values' in x:add('data','inline',path+['values'])
  if isinstance(x.get('format'),dict):
   for k,v in x['format'].items():
    add('data.format',k,path+['format',k])
    if k=='type':add('dataFormat',v,path+['format',k])
    if k in ('feature','mesh'):add('geo','topology-'+k,path+['format',k])
  if 'sphere' in x:add('geo','sphere',path+['sphere'])
  if 'graticule' in x:add('geo','graticule',path+['graticule'])
 def encoding_def(x,path,channel):
  if isinstance(x,list):
   for i,v in enumerate(x):encoding_def(v,path+[i],channel)
   return
  if not isinstance(x,dict):return
  for k,v in x.items():
   add('encodingProperty',k,path+[k])
   if k=='type':add('fieldType',v,path+[k])
   if k=='aggregate':add('aggregate',v if isinstance(v,str) else json.dumps(v,sort_keys=True),path+[k])
   if k=='timeUnit':add('timeUnit',v if isinstance(v,str) else json.dumps(v,sort_keys=True),path+[k])
   if k=='bin':add('encoding','bin',path+[k]);leaves(v,'bin',path+[k])
   if k=='condition':
    add('interaction','conditional-encoding',path+[k]);encoding_def(v,path+[k],channel)
   if k in ('selection','param'):add('interaction','selection-reference',path+[k])
   if k in ('axis','legend','header','scale'):
    if v is None:add(k,'disabled',path+[k])
    elif isinstance(v,dict):
     leaves(v,k,path+[k])
     if k=='scale' and 'type' in v:add('scaleType',v['type'],path+[k,'type'])
   if k=='field' and isinstance(v,dict) and 'repeat' in v:add('layout','repeat-field',path+[k])
   if k=='sort' and isinstance(v,dict):leaves(v,'sort',path+[k])
 def selection(x,path,legacy):
  if not isinstance(x,dict):return
  add('interaction','selection',path)
  typ=x.get('type','unspecified');add('selectionType',typ,path+['type'])
  if typ=='interval':add('interaction','brush',path)
  for k,v in x.items():
   add('selectionProperty',k,path+[k])
   if k=='bind' and v=='scales':add('interaction','pan-zoom',path+[k])
   elif k=='bind':add('interaction','input-binding',path+[k])
   if k in ('on','clear','translate','zoom') and isinstance(v,str):add('eventStream',v,path+[k])
   if k in ('translate','zoom') and v is not False:add('interaction','pan-zoom',path+[k])
   if k=='nearest' and v is True:add('interaction','nearest',path+[k])
 def walk(n,path):
  if not isinstance(n,dict):return
  kind='unit' if 'mark' in n else next((k for k in NEST[:-1] if k in n), 'facet' if 'facet' in n and 'spec' in n else 'repeat' if 'repeat' in n and 'spec' in n else 'wrapper')
  nodes.append({'pointer':pointer(path),'kind':kind,'mark':n.get('mark') if isinstance(n.get('mark'),str) else n.get('mark',{}).get('type') if isinstance(n.get('mark'),dict) else None})
  add('composition',kind,path)
  for k,v in n.items():
   if k=='mark':
    typ=v if isinstance(v,str) else v.get('type','unspecified') if isinstance(v,dict) else 'invalid';add('mark',typ,path+[k]);leaves(v,'markProperty',path+[k])
    if typ=='geoshape':add('geo','geoshape',path+[k])
    if typ=='image':add('assets','image-mark',path+[k])
    if isinstance(v,dict) and v.get('tooltip') not in (None,False):add('interaction','tooltip',path+[k,'tooltip'])
    if isinstance(v,dict) and v.get('href') is not None:add('interaction','hyperlink',path+[k,'href'])
   elif k=='encoding' and isinstance(v,dict):
    for ch,val in v.items():
     add('channel',ch,path+[k,ch]);encoding_def(val,path+[k,ch],ch)
     if ch in ('longitude','longitude2','latitude','latitude2'):add('geo','coordinate',path+[k,ch])
     if ch=='tooltip' and val not in (None,False):add('interaction','tooltip',path+[k,ch])
     if ch=='href':add('interaction','hyperlink',path+[k,ch])
     if ch=='url':add('assets','image-url-channel',path+[k,ch])
   elif k=='transform' and isinstance(v,list):
    for i,t in enumerate(v):
     if isinstance(t,dict):
      for key in t:
       if key in TRANSFORMS:add('transform',key,path+[k,i,key])
      if isinstance(t.get('from'),dict):data(t['from'].get('data'),path+[k,i,'from','data'])
      for ak in ('aggregate','joinaggregate','window'):
       if isinstance(t.get(ak),list):
        for j,op in enumerate(t[ak]):
         if isinstance(op,dict) and 'op' in op:add('transformOp',op['op'],path+[k,i,ak,j,'op'])
      leaves(t,'transformProperty',path+[k,i])
   elif k=='selection' and isinstance(v,dict):
    add('syntax','legacy-selection',path+[k])
    for name,s in v.items():selection(s,path+[k,name],True)
   elif k=='params' and isinstance(v,list):
    for i,p in enumerate(v):
     if not isinstance(p,dict):continue
     add('syntax','params',path+[k,i])
     if 'select' in p:
      s=p['select'] if isinstance(p['select'],dict) else {'type':p['select']};selection(s,path+[k,i,'select'],False)
     else:add('interaction','variable-parameter',path+[k,i])
     if 'bind' in p:
      add('interaction','pan-zoom' if p['bind']=='scales' else 'input-binding',path+[k,i,'bind'])
      if isinstance(p['bind'],dict):leaves(p['bind'],'bind',path+[k,i,'bind'])
   elif k=='projection':
    add('geo','projection',path+[k]);leaves(v,'projectionProperty',path+[k]);
    if isinstance(v,dict) and 'type' in v:add('projectionType',v['type'] if isinstance(v['type'],str) else 'expression',path+[k,'type'])
   elif k=='data':data(v,path+[k])
   elif k=='datasets':add('data','embedded-datasets',path+[k])
   elif k in ('width','height'):
    add('layout',k+'-'+('container' if v=='container' else 'step' if isinstance(v,dict) and 'step' in v else 'literal'),path+[k])
   elif k in ('autosize','bounds','align','spacing','center','columns','padding','resolve','title','config','facet','repeat'):
    add('layout' if k not in ('config','title') else k,k,path+[k]);leaves(v,k,path+[k])
  for k in NEST:
   v=n.get(k)
   if isinstance(v,list):
    for i,z in enumerate(v):walk(z,path+[k,i])
   elif isinstance(v,dict):walk(v,path+[k])
 walk(spec,[]);expression_walk(spec,[])
 if 'interaction:selection-reference' in feats and len(nodes)>1:add('interaction','cross-view-selection-reference',[])
 if any('mouseover' in s or 'mousemove' in s or 'pointermove' in s for s in feats):add('interaction','hover-event',[])
 return {'features':sorted(feats),'occurrences':occurrences,'specNodes':nodes,'expressions':expressions,'resources':resources,'declaredMarkUnits':sum(1 for n in nodes if n['mark']),'specNodeCount':len(nodes)}

records=[]; all_features=collections.defaultdict(lambda:collections.defaultdict(set)); core=[]; canonical_groups=collections.defaultdict(list); duplicate_keys=[]
for rel in sorted(files):
 if not rel.endswith('.json'):continue
 raw=(SRC/rel).read_bytes(); rec={'path':rel,'group':group(rel),'bytes':len(raw),'sha256':sha(raw)}
 try:
  dup=[]
  def hook(pairs):
   d={}
   for k,v in pairs:
    if k in d:dup.append(k)
    d[k]=v
   return d
  obj=json.loads(raw,object_pairs_hook=hook,parse_constant=lambda v: (_ for _ in ()).throw(ValueError('non-JSON constant '+v)))
  rec['classification']=classify(obj); rec['duplicateJsonKeys']=sorted(set(dup));rec['canonicalJsonSha256']=sha(canonical(obj))
  if dup:duplicate_keys.append({'path':rel,'keys':rec['duplicateJsonKeys']})
  if rec['classification']=='chart-spec-candidate':
   a=analyze(obj);rec.update({k:v for k,v in a.items() if k not in ('occurrences','specNodes','expressions','resources')});rec['schema']=obj.get('$schema');rec['hasDataDeclaration']=any(f.startswith('data:') for f in a['features'])
   canonical_groups[rec['canonicalJsonSha256']].append(rel)
   for f in a['features']:all_features[rec['group']][f].add(rel)
   if rec['group']=='canonical-1981':
    rec['id']=Path(rel).name.replace('.vl.json','');rec['sourceUrl']=f'https://github.com/hyungkwonko/chart-llm/blob/{commits["chartLlm"]}/{rel}'
    core.append({**rec,**a})
  elif rec['classification'] in ('object-data-or-metadata','array-data-or-metadata'):
   # Detect embedded top-level chart records without counting child views twice.
   embedded=[]
   def visit(v,path):
    if looks_chart(v):embedded.append(pointer(path));return
    if isinstance(v,dict):
     for k,z in v.items():
      if k not in ('values','datasets','data'):visit(z,path+[k])
    elif isinstance(v,list):
     for i,z in enumerate(v):visit(z,path+[i])
   visit(obj,[])
   if embedded:rec['classification']='embedded-chart-container';rec['embeddedCharts']=embedded
 except Exception as e:rec.update(classification='invalid-json',error=str(e))
 records.append(rec)

# Translation artifact integrity, source crosswalk and accepted-stage metadata.
manifest=json.loads((TRANS/'manifest.json').read_text());runtime=json.loads((TRANS/'runtime-lock.json').read_text());sync=json.loads((TRANS/'reports/runtime-sync.json').read_text())
sync_map={x['id']:x for x in sync.get('results',[])}; translated={}; integrity_failures=[]
for folder in sorted((TRANS/'charts').iterdir()):
 if not folder.is_dir():continue
 meta=json.loads((folder/'metadata.json').read_text());rid=folder.name
 original=(folder/'source.vl.json').read_bytes(); stages=meta.get('stages',[])
 issues=[]
 for name,details in meta.get('files',{}).items():
  p=folder/name
  if not p.is_file():issues.append({'file':name,'failure':'missing'})
  else:
   raw=p.read_bytes()
   if sha(raw)!=details.get('sha256'):issues.append({'file':name,'failure':'hash-mismatch'})
   if 'bytes' in details and len(raw)!=details['bytes']:issues.append({'file':name,'failure':'byte-length-mismatch'})
 for stage in stages:
  p=folder/stage['code']
  if not p.is_file() or sha(p.read_bytes())!=stage.get('sha256'):issues.append({'file':stage['code'],'failure':'stage-hash-mismatch'})
 actual_stages=sorted(p.name for p in folder.glob('G*.gg.mjs'))
 declared_stages=sorted(s['code'] for s in stages)
 if actual_stages!=declared_stages:issues.append({'failure':'stage-file-set-mismatch'})
 if issues:integrity_failures.append({'id':rid,'issues':issues})
 notes=meta.get('notes',{})
 translated[rid]={'id':rid,'status':meta.get('status'),'stageCount':len(stages),'stages':stages,'sourceSha256':sha(original),'sourceCanonicalSha256':sha(canonical(json.loads(original))),'declaredFeatures':analyze(json.loads(original))['features'],'sourceUrls':meta.get('sourceUrls',[]),'notes':notes,'noteFlags':sorted(set(re.findall(r'(?i)approxim\w*|toleran\w*|waiv\w*|static|tooltip|interactiv\w*|correct\w*|skip\w*',json.dumps(notes)))),'historicalRuntimeCommit':meta.get('historicalRuntimeCommit'),'rawInputs':(folder/'raw-inputs.json').exists(),'sourceEpoch':(folder/'source-epoch.json').exists(),'integrityVerified':not issues,'recordedRuntimeReplayStatus':sync_map.get(rid,{}).get('status'),'recordedRuntimeReplayStageCount':len(sync_map.get(rid,{}).get('stages',[])),'sourceUrl':f'https://github.com/ggaction/chart-datasets/blob/{commits["chartDatasets"]}/charts/{rid}/metadata.json'}

missing_features={'mark:geoshape':'geographic-rendering','mark:trail':'variable-width-trails','mark:image':'image-marks','channel:longitude':'geographic-encoding','channel:latitude':'geographic-encoding','channel:longitude2':'geographic-encoding','channel:latitude2':'geographic-encoding','geo:projection':'geographic-projection','geo:graticule':'geographic-primitives','geo:sphere':'geographic-primitives','interaction:selection':'event-driven-selection','interaction:input-binding':'input-controls','interaction:pan-zoom':'viewport-interaction','interaction:tooltip':'tooltip-runtime','interaction:hyperlink':'link-interaction','interaction:variable-parameter':'reactive-parameters','transform:quantile':'quantile-transform','transform:pivot':'general-pivot-semantic-qualification','transform:sample':'sample-transform'}
for rec in core:
 tr=translated.get(rec['id']);rec['translation']=tr
 rec['sourceIdentity']='not-translated' if not tr else 'byte-exact' if tr['sourceSha256']==rec['sha256'] else 'json-equivalent' if tr['sourceCanonicalSha256']==rec['canonicalJsonSha256'] else 'mismatch'
 gaps=sorted(set(missing_features[f] for f in rec['features'] if f in missing_features))
 # Static screening identifies follow-up requirements; exact domains and options require execution.
 rec['candidateGapFamilies']=gaps
 rec['assessment']={'declarationScreening':'missing-capability-candidate' if gaps else 'static-supported-candidate-not-qualified','translationArtifact':'accepted-on-0.0.24' if tr and tr['status']=='completed' else 'absent','currentRuntime':'not-replayed-on-0.0.26','sourceFidelity':'not-qualified-by-this-census','dataResolution':'frozen-translation-inputs-available' if tr else 'requires-resolution' if any(r['kind']!='named' for r in rec['resources']) else 'inline-or-named-inspection-required'}
 rec['unresolvedNamedDatasets']=[]
 obj=json.loads((SRC/rec['path']).read_text());named=obj.get('datasets',{})
 for resource in rec['resources']:
  if resource['kind']=='named' and resource['name'] not in named:rec['unresolvedNamedDatasets'].append(resource['name'])

specs=[r for r in records if r['classification']=='chart-spec-candidate']; group_summary={}
for g in sorted(set(r['group'] for r in records)):
 rs=[r for r in records if r['group']==g];ss=[r for r in rs if r['classification']=='chart-spec-candidate']
 group_summary[g]={'jsonFiles':len(rs),'classifications':dict(collections.Counter(r['classification'] for r in rs)),'uniqueCanonicalChartSpecs':len(set(r['canonicalJsonSha256'] for r in ss)),'chartsWithoutDataDeclaration':sum(not r['hasDataDeclaration'] for r in ss),'features':{f:len(ids) for f,ids in sorted(all_features[g].items())}}
summary={'method':'Static schema-aware declaration census; feature presence does not prove runtime or visual fidelity. Schema-free legacy/abstract specs retained. No original or runtime modified.','commits':commits,'schemaValidation':'not executed: chart-spec-candidate means root structural screening only','trackedFiles':len(files),'jsonFiles':len(records),'classifications':dict(collections.Counter(r['classification'] for r in records)),'chartSpecificationFiles':len(specs),'uniqueCanonicalChartSpecifications':len(canonical_groups),'canonicalOriginalCharts':len(core),'canonicalUniqueJsonSpecs':len(set(r['canonicalJsonSha256'] for r in core)),'duplicateKeyFiles':len(duplicate_keys),'groups':group_summary,'translations':{'manifestChartCount':manifest['chartCount'],'actualChartFolders':len(translated),'manifestProgramCount':manifest['programCount'],'actualDeclaredPrograms':sum(x['stageCount'] for x in translated.values()),'canonicalMatched':sum(r['translation'] is not None for r in core),'missingCanonicalFamilies':[r['id'] for r in core if r['translation'] is None],'translationOnlyIds':sorted(set(translated)-set(r['id'] for r in core)),'sourceIdentity':dict(collections.Counter(r['sourceIdentity'] for r in core)),'artifactIntegrityFailures':len(integrity_failures),'pinnedRuntime':runtime,'recordedRuntimeSync':{k:sync.get(k) for k in ['charts','programs','passed','backend','browserVersions']},'recordedReplayStatuses':dict(collections.Counter(x['recordedRuntimeReplayStatus'] for x in translated.values())),'staticGapCandidates':dict(collections.Counter(g for r in core for g in r['candidateGapFamilies'])),'acceptedWithInteractiveDeclarations':sum(x['translation'] is not None and any(f.startswith('interaction:') for f in x['features']) for x in core),'acceptedWithNonTooltipInteractiveDeclarations':sum(x['translation'] is not None and any(f.startswith('interaction:') and f!='interaction:tooltip' for f in x['features']) for x in core),'notesFlaggedForApproximation':sum(any(s.lower().startswith('approxim') for s in x['noteFlags']) for x in translated.values())}}
dump('corpus-summary.json',summary);dump('corpus-files.json',records);dump('corpus-originals.json',core);dump('corpus-features.json',{g:{f:{'chartCount':len(ids),'paths':sorted(ids)} for f,ids in sorted(d.items())} for g,d in all_features.items()});dump('corpus-duplicate-specs.json',[{'canonicalJsonSha256':h,'paths':p} for h,p in canonical_groups.items() if len(p)>1]);dump('corpus-duplicate-json-keys.json',duplicate_keys);dump('translations-artifact-inventory.json',list(translated.values()));dump('translations-integrity-failures.json',integrity_failures)
with (OUT/'corpus-original-crosswalk.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['id','source_path','source_sha256','translation_status','stages','source_identity','candidate_gap_families','declaration_screening','current_runtime_status','source_fidelity','source_url'])
 for r in core:w.writerow([r['id'],r['path'],r['sha256'],r['assessment']['translationArtifact'],r['translation']['stageCount'] if r['translation'] else 0,r['sourceIdentity'],'|'.join(r['candidateGapFamilies']),r['assessment']['declarationScreening'],r['assessment']['currentRuntime'],r['assessment']['sourceFidelity'],r['sourceUrl']])
with (OUT/'corpus-all-files.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['path','group','classification','bytes','sha256','canonical_json_sha256','schema','chart_units','has_data','features','error'])
 for r in records:w.writerow([r['path'],r['group'],r['classification'],r['bytes'],r['sha256'],r.get('canonicalJsonSha256'),r.get('schema'),r.get('declaredMarkUnits'),r.get('hasDataDeclaration'),'|'.join(r.get('features',[])),r.get('error')])
print(json.dumps({k:v for k,v in summary.items() if k not in ('groups','translations')},indent=2)); print('translation',len(translated),'programs',summary['translations']['actualDeclaredPrograms'],'identities',summary['translations']['sourceIdentity'],'integrity failures',len(integrity_failures))

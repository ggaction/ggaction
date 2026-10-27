#!/usr/bin/env python3
import collections,hashlib,json,re,zipfile,xml.etree.ElementTree as E
from pathlib import Path
BASE=Path(__file__).resolve().parents[1];OUT=BASE/'evidence';SRC=BASE/'sources/chart-llm';DST=BASE/'sources/chart-datasets'
orig=json.loads((OUT/'corpus-originals.json').read_text());MISSING={'$auditMissing':True}
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def brief(v):
 s=json.dumps(v,ensure_ascii=False,sort_keys=True)
 return v if len(s)<=320 else {'$excerpt':s[:280],'$characters':len(s),'$sha256':digest(v)}
def diff(a,b,path=[]):
 if type(a)!=type(b):return [(path,a,b)]
 if isinstance(a,dict):
  out=[]
  for k in sorted(set(a)|set(b)):
   if k not in a or k not in b:out.append((path+[k],a.get(k,MISSING),b.get(k,MISSING)))
   else:out+=diff(a[k],b[k],path+[k])
  return out
 if isinstance(a,list):
  out=[(path+['$length'],len(a),len(b))] if len(a)!=len(b) else []
  for i,(x,y) in enumerate(zip(a,b)):out+=diff(x,y,path+[i])
  for i in range(len(b),len(a)):out.append((path+[i],a[i],MISSING))
  for i in range(len(a),len(b)):out.append((path+[i],MISSING,b[i]))
  return out
 return [] if a==b else [(path,a,b)]
def pointer(path):return '/'+('/'.join(str(z).replace('~','~0').replace('/','~1') for z in path)) if path else ''
def change_record(path,before,after):
 is_length=bool(path and path[-1]=='$length')
 return {'pointer':pointer(path[:-1] if is_length else path),'kind':'array-length' if is_length else 'value','before':brief(before),'after':brief(after),'categories':classes(path,before,after)}
def classes(path,a,b):
 p=set(str(x) for x in path);f=[]
 if p&{'selection','params','bind','condition','tooltip','href','on','clear','toggle','nearest'}:f.append('interaction-or-conditional-declaration')
 if p&{'data','datasets'}:f.append('data-source-or-values')
 if p&{'width','height','autosize','bounds','align','center','spacing','padding','columns'}:f.append('layout-or-responsiveness')
 if p&{'axis','legend','header','title'}:f.append('guide-or-text')
 if p&{'transform','aggregate','bin','timeUnit','stack','sort'}:f.append('transform-or-statistical-semantics')
 if p&{'mark','type','color','fill','stroke','opacity','size','shape','text','angle','x','y','x2','y2'}:f.append('mark-or-encoding-appearance')
 if p&{'$schema','description','usermeta','name'}:f.append('schema-or-descriptive-metadata')
 if path and ((path[-1]=='aggregate' and ((a is None and b==MISSING) or (b is None and a==MISSING))) or (path[-1]=='transform' and ((a==[] and b==MISSING) or (b==[] and a==MISSING)))):f.append('candidate-empty-transform-or-null-aggregate-normalization')
 return f or ['other-declaration']
rows=[]
for r in orig:
 if r['sourceIdentity']!='mismatch':continue
 a=json.loads((SRC/r['path']).read_text());b=json.loads((DST/'charts'/r['id']/'source.vl.json').read_text())
 ds=diff(a,b);cats=sorted(set(c for p,x,y in ds for c in classes(p,x,y)))
 before=set(r['features']);after=set(r['translation']['declaredFeatures'])
 rows.append({'id':r['id'],'originalSha256':r['sha256'],'translationSourceSha256':r['translation']['sourceSha256'],'changeCount':len(ds),'categories':cats,'featureRemoved':sorted(before-after),'featureAdded':sorted(after-before),'changes':[change_record(p,x,y) for p,x,y in ds]})
summary={'method':'Positional recursive JSON diff. Unequal arrays retain a separate array-length record at the array pointer, compare all common indices, and record every added/deleted index. Value records use escaped RFC 6901 pointers. Array-length before/after values are lengths, not the referenced array values. Long values have source-bound excerpts and SHA-256 digests.','mismatchedOriginalArtifacts':len(rows),'categoriesOverlap':dict(collections.Counter(c for r in rows for c in r['categories'])),'removedFeaturesOverlap':dict(collections.Counter(f for r in rows for f in r['featureRemoved'])),'onlyCandidateEmptyOrNullNormalization':[r['id'] for r in rows if all('candidate-empty-transform-or-null-aggregate-normalization' in c['categories'] for c in r['changes'])],'onlySchemaOrDescriptiveMetadata':[r['id'] for r in rows if all('schema-or-descriptive-metadata' in c['categories'] for c in r['changes'])],'assessment':'Structural differences are not all semantic losses. Removed selections and responsive settings are concrete behavior changes; null/empty normalization requires dialect-specific proof.'}
# Metadata sheet3 explicitly maps index_7 to original vl IDs, unlike translation repo source URLs.
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'};metadata=[]
with zipfile.ZipFile(SRC/'docs/data/metadata.xlsx') as z:
 shared=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
 xml=E.fromstring(z.read('xl/worksheets/sheet3.xml'));raw=[]
 for row in xml.findall('m:sheetData/m:row',ns):
  cells={}
  for c in row.findall('m:c',ns):
   val=c.find('m:v',ns);v=val.text if val is not None else ''
   if c.get('t')=='s':v=shared[int(v)]
   cells[re.sub(r'\d','',c.get('r'))]=v
  raw.append(cells)
 headers=raw[0]
 for row in raw[1:]:
  d={headers[k]:v for k,v in row.items() if k in headers};d['id']='vl_'+str(int(float(d['index_7']))).zfill(4);metadata.append(d)
licenses=collections.Counter(m.get('license_key','') for m in metadata)
metadata_summary={'source':'docs/data/metadata.xlsx sheet3','records':len(metadata),'licenseKeys':dict(licenses),'recordedInteraction':dict(collections.Counter(m.get('interaction') for m in metadata)),'recordedComplexity':dict(collections.Counter(m.get('level') for m in metadata)),'missingCanonicalIds':sorted(set(r['id'] for r in orig)-set(m['id'] for m in metadata)),'assessment':'Recorded licensing metadata is provenance, not independently verified permissions; license URLs may be mutable or point to another repository.'}
for name,value in [('corpus-source-deltas.json',rows),('corpus-source-delta-summary.json',summary),('corpus-original-metadata.json',metadata),('corpus-metadata-summary.json',metadata_summary)]: (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(metadata_summary,ensure_ascii=False,indent=2))

from pathlib import Path
import gzip, hashlib, json, tarfile, re
root=Path.cwd(); prefix=root/'.artifacts/strict-value-cursor'; out=root/'agent_docs/impl/roadmap9/chart/strict-value-cursor-evidence'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
archive=json.loads((prefix/'frozen.json').read_text());assert sha(Path(archive['file']).read_bytes())==archive['sha256']
sources=[]
paths=['src/core/jsonText.js','src/core/valueEncoding.js','src/core/encodedValueCursor.js','scripts/coverage-policy.js','scripts/package-artifact.js','scripts/browser-bundle-size.js','test/unit/core/encoded-value-cursor.test.js','README.md']
paths += ['agent_docs/impl/roadmap9/chart/strict-value-cursor-evidence/'+name for name in ['native-audit.mjs','browser.mjs','record.py','verify.mjs']]
with tarfile.open(archive['file']) as packed:
 for path in paths:
  raw=(root/path).read_bytes();entry={'path':path,'sha256':sha(raw)}
  if path.startswith('src/'):
   assert packed.extractfile('package/'+path).read()==raw,path
   entry['exactArchiveBytes']=True
  sources.append(entry)
for major in [20,22,24]:
 d=json.loads((prefix/f'installed-{major}.json').read_text());assert d['status']=='passed' and d['sha256']==archive['sha256'];assert len(d['checks'])==12
for name,count in [('owning-final.log',14),('compatibility.log',56),('inference.log',13),('boundaries.log',34),('record-contracts-final.log',3)]:
 text=(prefix/name).read_text();assert f'# tests {count}\n' in text and '# fail 0\n' in text,name
browser=json.loads((prefix/'browser.json').read_text());assert browser['sha256']==archive['sha256'] and browser['bytesEqual']
files={}
for p in sorted(prefix.iterdir()):
 if p.is_file():
  raw=p.read_bytes();(out/(p.name+'.gz')).write_bytes(gzip.compress(raw,mtime=0));files[p.name]={'sha256':sha(raw),'bytes':len(raw)}
q={'status':'verified-private-product-checkpoint','basis':'09c8f5c34','authorization':'../AUTHORIZATION.json#remainingApproval','adoption':'../strict-value-cursor.md','archive':archive,'sources':sources,'publicContractChanges':0,'latencyQualification':False,'largeFixtureRun':False,'coreCoverage':{'jsonText':'100/100/100','valueEncoding':'100/100/100','encodedValueCursor':'100/100/100'},'checks':{'owning':14,'compatibility':56,'inference':13,'boundaries':34,'recordContracts':3,'installedPerNode':{'private':14,'public':12,'type':True,'documentation':1,'entries':6},'nodes':[20,22,24],'browser':'same archive, minified, exact bytes/WebCrypto SHA and actual timer aborts'},'unresolved':['route v2 connection','public host cancellation across all stages','BigInt decimal conversion','wide record enumeration','snapshot and transport','final materialization','100ms qualification'],'evidenceFiles':files}
(out/'qualification.json').write_text(json.dumps(q,indent=2)+'\n')
print(archive['sha256'],len(sources),len(files))

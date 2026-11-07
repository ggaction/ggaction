"""Pin private native continuation source and qualification from repository root."""
import gzip,hashlib,json,subprocess,tarfile
from pathlib import Path
out=Path('agent_docs/impl/roadmap9/chart/route-screen-stages-evidence');artifacts=Path('.artifacts/route-screen-stages')
sha=lambda data:hashlib.sha256(data).hexdigest()
receipts=[]
for p in sorted(artifacts.iterdir()):
 if p.is_file():
  target=out/'receipts'/(p.name+'.gz');target.parent.mkdir(exist_ok=True);target.write_bytes(gzip.compress(p.read_bytes(),mtime=0))
  receipts.append({'path':str(target),'sha256':sha(target.read_bytes()),'uncompressedSha256':sha(p.read_bytes())})
previous=json.loads(Path('agent_docs/impl/roadmap9/chart/route-native-stages-evidence/qualification.json').read_text())
paths={entry['path'] for entry in previous['sources']}
paths.update(subprocess.check_output(['git','diff','--name-only','75d3e8eb6','--','src','types','scripts','test','agent_docs/SECOND_ARCHITECTURE.md']).decode().splitlines())
paths.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard','--','src','types','test']).decode().splitlines())
paths.update(str(p) for p in out.iterdir() if p.suffix in ('.mjs','.py') or p.name=='audit.json')
paths.update(str(Path('agent_docs/impl/roadmap9/chart/route-v2-native-evidence')/name) for name in ['consumer.mjs','installed.mjs','browser.mjs'])
sources=[{'path':p,'sha256':sha(Path(p).read_bytes())} for p in sorted(paths)]
frozen=json.loads((artifacts/'frozen.json').read_text());assert sha(Path(frozen['file']).read_bytes())==frozen['sha256']
packed=[]
with tarfile.open(frozen['file']) as archive:
 for p in sorted(paths):
  if p.startswith(('src/','types/')):
   data=archive.extractfile('package/'+p).read();expected=Path(p).read_bytes()
   if p=='src/materialization/guides/layout.js':
    expected=subprocess.check_output(['node','--input-type=module','-e',"import{readFileSync}from'node:fs';import{compactPackageJavaScript}from'./scripts/package-artifact.js';process.stdout.write(compactPackageJavaScript(readFileSync(process.argv[1],'utf8'),{keepNames:false}));",p])
   assert data==expected,p;packed.append({'path':p,'sha256':sha(data),'compacted':p=='src/materialization/guides/layout.js'})
q={'status':'verified-private-screen-canvas-continuation-checkpoint','base':'75d3e8eb6','archive':frozen,'sources':sources,'packedSources':packed,'files':receipts,'claims':{'v1SynchronousBehavior':True,'privateNativeRouteSourceContinuation':True,'privateScreenCanvasContinuation':True,'publicBUpdate':False,'fullBUnion':False,'latency100ms':False,'largeCapacity':False,'publication':False},'remaining':['Fit native wrapped actions, data identity and composition continuations.','Aggregate heterogeneous policy admission and held-result sample lifetime.','Exact closed native action union with per-family positive and failure evidence.','Original large fixtures and full synchronous-stage latency.']}
(out/'qualification.json').write_text(json.dumps(q,indent=2)+'\n');print(f'Recorded {len(sources)} sources and {len(receipts)} receipts.')

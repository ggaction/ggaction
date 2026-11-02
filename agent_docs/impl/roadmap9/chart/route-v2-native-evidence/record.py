"""Freeze local route-v2 receipts; run from repository root after qualification."""
import gzip, hashlib, json, subprocess, tarfile
from pathlib import Path
root=Path.cwd(); target=Path('agent_docs/impl/roadmap9/chart/route-v2-native-evidence'); source=Path('.artifacts/route-v2-native')
sha=lambda data:hashlib.sha256(data).hexdigest()
files=[]
for p in sorted(source.iterdir()):
    if p.is_file():
        output=target/'receipts'/(p.name+'.gz');output.parent.mkdir(exist_ok=True)
        output.write_bytes(gzip.compress(p.read_bytes(),mtime=0))
        files.append({'path':str(output),'sha256':sha(output.read_bytes()),'uncompressedSha256':sha(p.read_bytes())})
changed=set(subprocess.check_output(['git','diff','--name-only','af936021b','--','src','types','test','scripts','docs/api','docs/compatibility.md','agent_docs/SECOND_ARCHITECTURE.md','agent_docs/contract/current/EDGE_ROUTES.md']).decode().splitlines())
changed.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard','--','src','types','test']).decode().splitlines())
changed.update(['src/core/encodedValueCursor.js','src/core/jsonText.js','src/core/valueEncoding.js','src/core/sha256.js'])
sources=[{'path':p,'sha256':sha(Path(p).read_bytes())} for p in sorted(changed) if Path(p).is_file()]
frozen=json.loads((source/'frozen.json').read_text()); archive=Path(frozen['file']);assert sha(archive.read_bytes())==frozen['sha256']
packed=[]
with tarfile.open(archive) as package:
    for p in sorted(changed):
        if p.startswith(('src/','types/')):
            data=package.extractfile('package/'+p).read();assert data==Path(p).read_bytes(),p
            packed.append({'path':p,'sha256':sha(data)})
q={'status':'verified-native-create-edit-checkpoint','base':'af936021b','proposal':'f9aa772b60a1de6d96652468b48c10868ba648fc','adoption':['012ecf039','a3f385c69'],'archive':frozen,'sources':sources,'packedSources':packed,'files':files,'coverageLogs':{'20':'coverage20-pinned.log','22':'coverage22-complete.log','24':'coverage24-pinned.log'},'claims':{'nativeCreateEdit':True,'fullBUpdateUnion':False,'wholePipeline100ms':False,'density1k10kCapacity':False,'publicationOrDeployment':False},'remaining':['Complete original B native update union without wildcard or reduced scope.','Measure synchronous snapshot, wide keys, BigInt decimal, structured clone/postMessage, geometry validation and final materialization.','Run original large density fixtures only with root CPU slot.']}
(target/'qualification.json').write_text(json.dumps(q,indent=2)+'\n')
print(f'Recorded {len(sources)} source hashes, {len(packed)} exact archive sources and {len(files)} compressed receipts.')

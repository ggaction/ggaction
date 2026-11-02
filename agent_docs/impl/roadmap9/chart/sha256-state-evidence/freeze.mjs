import {createPackageArtifact} from '../../../../../scripts/package-artifact.js';
import path from 'node:path';
import {copyFile,writeFile,mkdir} from 'node:fs/promises';
const artifact=await createPackageArtifact();
const frozenFile=path.resolve(`.artifacts/sha256-state/ggaction-${artifact.sha256}.tgz`);
await mkdir(path.dirname(frozenFile),{recursive:true});
await copyFile(artifact.file,frozenFile);
await writeFile('.artifacts/sha256-state/fixed.json',JSON.stringify({...artifact,frozenFile},null,2)+'\n');
console.log(JSON.stringify({frozenFile,sha256:artifact.sha256,entries:artifact.entryCount,size:artifact.size,unpacked:artifact.unpackedSize}));

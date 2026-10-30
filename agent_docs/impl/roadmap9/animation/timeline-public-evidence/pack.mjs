import { createPackageArtifact } from '../../../../../scripts/package-artifact.js';
const result=await createPackageArtifact({outputDirectory:process.argv[2]});
console.log(JSON.stringify({name:result.name,version:result.version,filename:result.filename,entryCount:result.entryCount,packedBytes:result.size,unpackedBytes:result.unpackedSize,file:result.file,sha256:result.sha256},null,2));

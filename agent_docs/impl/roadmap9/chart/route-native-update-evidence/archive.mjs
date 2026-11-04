import {realpath,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createPackageArtifact} from '../../../../../scripts/package-artifact.js';
// npm_execpath may be supplied by npm or the caller on other hosts.
if (!process.env.npm_execpath) process.env.npm_execpath=await realpath('/opt/homebrew/bin/npm');
const artifact=await createPackageArtifact({outputDirectory:path.resolve('.artifacts/route-native-update/package')});
await writeFile('.artifacts/route-native-update/frozen.json',JSON.stringify({file:artifact.file,sha256:artifact.sha256,entryCount:artifact.entryCount,size:artifact.size,unpackedSize:artifact.unpackedSize},null,2)+'\n');
console.log(JSON.stringify({file:artifact.file,sha256:artifact.sha256,entryCount:artifact.entryCount,size:artifact.size,unpackedSize:artifact.unpackedSize}));

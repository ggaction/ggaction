import fs from 'node:fs/promises';
import path from 'node:path';
import { createPackageArtifact } from '../../scripts/package-artifact.js';
const artifact = await createPackageArtifact({ outputDirectory: path.resolve('.artifacts/geo/labels') });
await fs.writeFile('.artifacts/geo/labels/package.json', JSON.stringify(artifact, null, 2));
console.log({ sha256: artifact.sha256, file: artifact.file, entries: artifact.entryCount, packed: artifact.size, unpacked: artifact.unpackedSize });

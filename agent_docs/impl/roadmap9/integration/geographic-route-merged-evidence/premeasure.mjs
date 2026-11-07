import {readFile,writeFile} from 'node:fs/promises';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {measureMinimalBrowserBundle} from '../../../../../scripts/browser-bundle-size.js';
const artifact=JSON.parse(await readFile(process.argv[2]));
const consumer=await preparePackageConsumer({packageSpec:artifact.file});
const result={node:process.version,archive:artifact.sha256,bundles:{}};
try{for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/graph','ggaction/animation','ggaction/interaction'])result.bundles[specifier]=(await measureMinimalBrowserBundle(consumer.directory,{specifier})).gzipBytes;}
finally{await writeFile(process.argv[3],JSON.stringify(result,null,2)+'\n');await consumer.cleanup();}
console.log(JSON.stringify(result));

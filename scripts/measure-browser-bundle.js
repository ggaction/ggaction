import { measureMinimalBrowserBundle } from "./browser-bundle-size.js";
import { preparePackageConsumer } from "./package-consumer.js";

const consumer = await preparePackageConsumer();
try {
  const full = await measureMinimalBrowserBundle(consumer.directory);
  const basic = await measureMinimalBrowserBundle(consumer.directory, {
    specifier: "ggaction/basic"
  });
  process.stdout.write(`${JSON.stringify({
    package: `${consumer.installedManifest.name}@${consumer.installedManifest.version}`,
    source: consumer.artifact?.filename ?? consumer.packageSpec,
    full,
    basic
  }, null, 2)}\n`);
} finally {
  await consumer.cleanup();
}

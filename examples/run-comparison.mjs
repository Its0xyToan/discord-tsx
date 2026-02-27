import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

function importFresh(filePath) {
  const url = pathToFileURL(path.resolve(filePath)).href;
  return import(`${url}?v=${Date.now()}`);
}

const runtime = await importFresh("./examples/dist/runtime-vs-postbuild.js");
const raw = await importFresh("./examples/dist/raw-json.js");

const report = {
  runtimeVsRaw: {
    embed: isDeepStrictEqual(runtime.runtimeEmbed, raw.rawEmbed),
    legacyComponents: isDeepStrictEqual(runtime.runtimeLegacyComponents, raw.rawLegacyComponents),
    v2Components: isDeepStrictEqual(runtime.runtimeV2Components, raw.rawV2Components)
  },
  runtimePreview: {
    embed: runtime.runtimeEmbed,
    legacyComponents: runtime.runtimeLegacyComponents,
    v2Components: runtime.runtimeV2Components
  }
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

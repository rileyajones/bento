import { JS_BUNDLES } from "../../compile/bundles.config";
import type { BuildOptions } from "../types";
import { buildBundle } from "./build-bundle";
import { compileCss } from "./build-css";
import { buildComponents } from "./build-components";
import { generateRuntimeEntrypoint } from "./generate";
import { patchPreact } from "../../common/update-packages";
import { argv } from "../../common/argv";

async function buildCoreRuntime(options: BuildOptions) {
  patchPreact();
  const bundle = JS_BUNDLES['bento.js'];
  await generateRuntimeEntrypoint(bundle, options);
  return buildBundle(bundle, options);
}

export async function build(): Promise<void> {
  process.env.NODE_ENV = 'development';
  const options: BuildOptions = {
    fortesting: argv.fortesting,
    localDev: true,
    minify: false,
    watch: argv.watch,
  };
  // Prebuild Steps
  await compileCss(options);
  // TODO do we need to generate frames.html?

  // TODO build these in parallel based on parameters.
  await buildCoreRuntime(options);
  await buildComponents(options);
}

build().catch((e) => {
  throw  e;
});

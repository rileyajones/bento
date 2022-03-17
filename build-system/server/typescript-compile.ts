import { cyan, green } from "kleur/colors";
import fastGlob = require('fast-glob');
import path from "path";
import { log } from "../common/logging";
import { endBuildStep } from "../tasks/helpers";
import esbuild = require('esbuild');

export const SERVER_TRANSFORM_PATH = 'build-system/server/new-server/transforms';
const CONFIG_PATH = `${SERVER_TRANSFORM_PATH}/tsconfig.json`;

const outdir = path.join(SERVER_TRANSFORM_PATH, 'dist');
const esbuildOptions: esbuild.BuildOptions = {
  bundle: false,
  banner: {js: '// @ts-nocheck'},
  tsconfig: CONFIG_PATH,
  format: 'cjs',
};

/**
 * Builds the new server by converting typescript transforms to JS. This JS
 * output is not type-checked as part of `amp check-build-system`.
 * @return {Promise<void>}
 */
 export async function buildNewServer() {
  log(
    green('Building'),
    cyan('AMP Server'),
    green('at'),
    cyan(outdir) + green('...')
  );
  const entryPoints = await fastGlob(`${SERVER_TRANSFORM_PATH}/**/*.ts`);
  const startTime = Date.now();
  await esbuild.build({
    ...esbuildOptions,
    entryPoints,
    outdir,
  });
  endBuildStep('Built', 'AMP Server', startTime);
}

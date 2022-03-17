import minimist = require('minimist');

export type ArgvType = {
  cache: boolean;
  cdn: boolean;
  chrome_canary: boolean;
  chrome_flags: string;
  components: string;
  core_runtime_only: boolean;
  coverage: string;
  debug: boolean;
  edge: boolean;
  esm: boolean;
  files: string|string[];
  filelist: string;
  firefox: boolean;
  fortesting: boolean;
  full_sourcemaps: boolean;
  grep: string;
  headless: boolean;
  host: string;
  https: boolean;
  local_changes: boolean;
  minified: boolean;
  nocomponents: boolean;
  nomanglecache: boolean;
  nohelp: boolean;
  port: string;
  pretty_print: boolean;
  quiet: boolean;
  report: boolean;
  safari: boolean;
  sourcemap_url: string;
  sxg: boolean;
  testnames: string;
  verbose: boolean;
  watch: boolean;
  _: string;
}

export const argv = (minimist(process.argv.slice(2)) as unknown) as ArgvType;

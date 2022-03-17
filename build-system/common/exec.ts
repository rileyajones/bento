import { spawn, SpawnSyncOptions, SpawnOptions } from "child_process";
import { shellCmd, spawnProcess } from "./process";

/**
 * Executes the provided shell script in an asynchronous process. Special-cases
 * the AMP task runner so that it is correctly spawned on all platforms (node
 * shebangs do not work on Windows).
 */
 export function execScriptAsync(script: string, options: SpawnOptions) {
  const scriptToSpawn = script.startsWith('amp ') ? `node ${script}` : script;
  return spawn(scriptToSpawn, {shell: shellCmd, ...options});
}

/**
 * Executes the provided command with the given options, returning the process
 * object.
 */
export function exec(cmd: string, options: SpawnSyncOptions = {'stdio': 'inherit'}) {
  return spawnProcess(cmd, options);
}

/**
 * Executes the provided command, and terminates the program in case of failure.
 */
 export function execOrDie(cmd: string, options?: SpawnSyncOptions) {
  const p = exec(cmd, options);
  if (p.status && p.status != 0) {
    process.exit(p.status);
  }
}

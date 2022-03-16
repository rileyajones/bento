import { cyan, red } from 'kleur/colors';
import { log } from '../../common/logging';
import { argv } from '../../common/argv';
import { ComponentBundle } from '../types';

/**
 * Used to debounce file edits during watch to prevent races.
 */
export const watchDebounceDelay = 1000;

/**
 * The set of entrypoints currently watched by compileJs.
 */
 export const watchedEntryPoints: Set<string> = new Set();

export function maybeToEsmName(name: string): string {
  // Npm esm names occur at an earlier stage.
  if (name.includes('.module')) {
    return name;
  }
  return argv.esm ? name.replace(/\.js$/, '.mjs') : name;
}

export function maybeToNpmEsmName(name: string): string {
  return argv.esm ? name.replace(/\.js$/, '.module.js') : name;
}

export function getComponentDir({ name, version }: ComponentBundle<string>) {
  return `src/components/${name}/${version}`;
}


/**
 * Handles a bundling error
 */
export function handleBundleError(err: Error, continueOnError: boolean, destFilename: string) {
  let message = err.toString();
  if (err.stack) {
    // Drop the node_modules call stack, which begins with '    at'.
    message = err.stack.replace(/ {4}at[^]*/, '').trim();
  }
  log(red('ERROR:'), message, '\n');
  const reasonMessage = `Could not compile ${cyan(destFilename)}`;
  if (continueOnError) {
    log(red('ERROR:'), reasonMessage);
  } else {
    throw new Error(reasonMessage);
  }
}

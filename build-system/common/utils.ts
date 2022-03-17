import * as fastGlob from 'fast-glob';
import { cyan, red } from 'kleur/colors';
import { log } from './logging';
import fs from 'fs';
import { argv } from './argv';

/**
 * Extracts the list of files from argv.files. Throws an error if no matching
 * files were found.
 */
 export function getFilesFromArgv(): string[] {
  if (!argv.files) {
    return [];
  }
  const toPosix = (str: string) => str.replace(/\\\\?/g, '/');
  const globs = Array.isArray(argv.files) ? argv.files : argv.files.split(',');
  const allFiles: string[] = [];
  for (const glob of globs) {
    const files = fastGlob.sync(toPosix(glob.trim()));
    if (files.length == 0) {
      log(red('ERROR:'), 'Argument', cyan(glob), 'matched zero files.');
      throw new Error('Argument matched zero files.');
    }
    allFiles.push(...files);
  }
  return allFiles;
}

/**
 * Returns list of files in the comma-separated file named at --filelist.
 */
 export function getFilesFromFileList(): string[] {
  if (!argv.filelist) {
    return [];
  }
  return fs.readFileSync(argv.filelist, 'utf8').trim().split(',');
}

import * as fastGlob from 'fast-glob';
import listImportsExports, { ListImportsExports } from 'list-imports-exports';
import minimatch = require('minimatch');
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, extname, relative, resolve, posix } from 'path';
import { cyan, green } from "kleur/colors";
import { isCiBuild } from "../../common/ci";
import { gitDiffNameOnlyMain } from "../../common/git";
import { log, logLocalDev } from "../../common/logging";
import { getInitializedComponents } from '../build/components-cache';
import { unitTestPaths } from '../../test-configs/config';
import { CreateOptions } from 'ts-node';
import { execOrDie } from '../../common/exec';
import { getComponentDir } from '../build/helpers';



const tsConfig = JSON.parse(readFileSync(posix.join(__dirname, '..', '..', '..', 'tsconfig.base.json'), 'utf8').toString()) as unknown as CreateOptions;
const LARGE_REFACTOR_THRESHOLD = 50;
const TEST_FILE_COUNT_THRESHOLD = 20;
const ROOT_DIR = resolve(__dirname, '../../../');

/**
 * Returns true if the PR is a large refactor.
 * (Used to skip testing local changes.)
 * @return {boolean}
 */
function isLargeRefactor() {
  const filesChanged = gitDiffNameOnlyMain();
  return filesChanged.length >= LARGE_REFACTOR_THRESHOLD;
}


/**
 * Returns the list of files imported by a JS file
 */
function getImports(jsFile: string): string[] {
  const jsFileContents = readFileSync(jsFile, 'utf8');
  const parsePlugins = ['importAssertions'];
  const { imports } = (listImportsExports as unknown as ListImportsExports).parse(jsFileContents, parsePlugins);
  return imports.map((file: string) => {
    const fullPath = resolveImportAliases(jsFile, file);
    return relative(ROOT_DIR, fullPath);
  });
}

/**
 * Returns the full path of an import after resolving aliases if necessary.
 * During prefix matching, wildcard characters if any are dropped.
 */
function resolveImportAliases(jsFile: string, file: string): string {
  const { paths } = (tsConfig.compilerOptions as { paths: Record<string, string[]> });
  const importAliases = Object.keys(paths);
  for (const alias of importAliases) {
    const aliasPrefix = alias.replace('*', '');
    const actualPrefix = paths[alias][0].replace('*', '');
    if (file.startsWith(aliasPrefix)) {
      return file.replace(aliasPrefix, actualPrefix).replace('./', '');
    }
  }
  const jsFileDir = dirname(jsFile);
  return resolve(jsFileDir, file);
}

/**
 * Extracts extension info and creates a mapping from CSS files in different
 * source directories to their equivalent JS files in the 'build/' directory.
 */
function extractCssJsFileMap(): Record<string, string> {
  execOrDie('amp css', { 'stdio': 'ignore' });
  const components = getInitializedComponents();

  return Object.values(components)
    .filter((component) => component.options.hasCss)
    .reduce((cssJsFileMap, component) => {
      const dir = getComponentDir(component);
      const cssFilePath = `${dir}/${component.name}.css`;
      const jsFilePath = `build/${component.name}-${component.version}.css.js`;

      cssJsFileMap[cssFilePath] = jsFilePath;

      return cssJsFileMap;
    }, {} as Record<string, string>);
}


/**
 * Computes the list of unit tests to run under difference scenarios
 * @return {Array<string>|void}
 */
export function getUnitTestsToRun() {
  log(green('INFO:'), 'Determining which unit tests to run...');

  if (isLargeRefactor()) {
    log(
      green('INFO:'),
      'Skipping tests on local changes because this is a large refactor.'
    );
    return;
  }

  const tests = unitTestsToRun();
  if (tests.length == 0) {
    log(
      green('INFO:'),
      'No unit tests were directly affected by local changes.'
    );
    return;
  }
  if (isCiBuild() && tests.length > TEST_FILE_COUNT_THRESHOLD) {
    log(
      green('INFO:'),
      'Several tests were affected by local changes. Running all tests below.'
    );
    return;
  }

  log(green('INFO:'), 'Running the following unit tests:');
  tests.forEach((test) => {
    log(cyan(test));
  });

  return tests;
}


let testsToRun: string[] | null = null;

/**
 * Extracts the list of unit tests to run based on the changes in the local
 * branch. Return value is cached to optimize for multiple calls.
 */
export function unitTestsToRun(): string[] {
  if (testsToRun) {
    return testsToRun;
  }
  const cssJsFileMap = extractCssJsFileMap();
  const filesChanged = gitDiffNameOnlyMain();
  testsToRun = [];
  let srcFiles: string[] = [];

  filesChanged.forEach((file) => {
    if (!existsSync(file)) {
      logLocalDev(
        green('INFO:'),
        'Skipping',
        cyan(file),
        'because it was deleted'
      );
    } else if (isUnitTest(file)) {
      testsToRun?.push(file);
    } else if (extname(file) === '.js' || extname(file) === '.ts') {
      srcFiles.push(file);
    } else if (extname(file) === '.css') {
      srcFiles = srcFiles.concat(getJsFilesFor(file, cssJsFileMap));
    }
  });

  if (srcFiles.length) {
    const moreTestsToRun = getTestsFor(srcFiles);
    moreTestsToRun.forEach((test) => {
      if (!testsToRun?.includes(test)) {
        testsToRun?.push(test);
      }
    });
  }
  return testsToRun;

  function isUnitTest(file: string): boolean {
    return unitTestPaths.some((pattern) => {
      return minimatch(file, pattern);
    });
  }

  function shouldRunTest(testFile: string, srcFiles: string[]): boolean {
    const filesImported = getImports(testFile);
    return (
      filesImported.filter(function (file) {
        return srcFiles.some((srcFile) => srcFile.includes(file));
      }).length > 0
    );
  }

  /**
   * Retrieves the set of JS source files that import the given CSS file.
   */
  function getJsFilesFor(cssFile: string, cssJsFileMap: Record<string, string>): string[] {
    const jsFiles: string[] = [];
    if (cssJsFileMap.cssFile) {
      const cssFileDir = dirname(cssFile);
      const jsFilesInDir = readdirSync(cssFileDir).filter((file) => {
        const fileExt = extname(file);
        return fileExt === '.js' || fileExt === '.ts';
      });
      jsFilesInDir.forEach((jsFile) => {
        const jsFilePath = `${cssFileDir}/${jsFile}`;
        const jsImports = getImports(jsFilePath);
        if (
          jsImports.some((jsImport) => jsImport.includes(cssJsFileMap[cssFile]))
        ) {
          jsFiles.push(jsFilePath);
        }
      });
    }
    return jsFiles;
  }

  /**
   * Retrieves the set of unit tests that should be run
   * for a set of source files.
   */
  function getTestsFor(srcFiles: string[]): string[] {
    const allUnitTests = fastGlob.sync(unitTestPaths);
    return allUnitTests.filter((testFile) => {
      return shouldRunTest(testFile, srcFiles);
    });
  }
}

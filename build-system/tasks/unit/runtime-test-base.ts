/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SERVER_TRANSFORM_PATH } from "../../server/typescript-compile";
import karmaConfig from "../../test-configs/karma.config";
import { startServer, stopServer } from "../serve";
import { commonUnitTestPaths, karmaHtmlFixturesPath, karmaJsPaths, TestPath, unitTestPaths } from "../../test-configs/config";
import { isCiBuild, isCircleciBuild } from "../../common/ci";
import { getEsbuildBabelPlugin } from "../../common/esbuild-babel";
import { getFilesFromArgv, getFilesFromFileList } from "../../common/utils";
import { argv } from "../../common/argv";
import { dotWrappingWidth, log } from "../../common/logging";
import { cyan, green, red, yellow } from "kleur/colors";
import { customLaunchers } from "../helpers/testing";
import { unitTestsToRun } from "./helpers";
import {app} from '../../server/test-server';
import type {BuildOptions, Plugin, PluginBuild} from 'esbuild';
import { createKarmaServer } from "../helpers/karma";
import { createCtrlcHandler, exitCtrlcHandler } from "../../common/ctrlcHandler";
import { Config } from "karma";

type TransformType = (content: string) =>  string;;

type ClientType = {
  mocha: {
    grep: boolean;
    timeout: number;
  };
  verboseLogging: boolean;
  captureConsole: boolean;
  testServerPort: number;
  amp: {
    useMinifiedJs: boolean;
    mochaTimeout: number;
    testServerPort: number;
    isModuleBuild: boolean;
  };
};

type ReporterConfig = {
  dir?: string;
  outputFile?: string;
  reports?: string[];
  'report-config'?: {
    lcovonly: {
      file: string;
    }
  };
  useBrowserName?: boolean;
};

/**
 * Used to print dots during esbuild + babel transforms
 */
 let wrapCounter = 0;

/**
 * Used to lazy-require the HTML transformer function after the server is built.
 */
let transform: TransformType | null;

export class RuntimeTestConfig {
  beforeMiddleware: string[];
  client: ClientType;
  coverageIstanbulReporter?: ReporterConfig;
  esbuild: BuildOptions;
  files: Array<string | TestPath> = [];
  junitReporter?: ReporterConfig;
  jsonResultReporter?: ReporterConfig;
  plugins: Array<string | Record<string, [string, unknown]>> = [];
  preprocessors: Record<string, string | string[]> = {};
  reporters: string[] = [];
  singleRun: boolean;
  testType: string;

  constructor(testType: string) {
    this.testType = testType;
    /**
     * TypeScript is used for typechecking here and is unable to infer the type
     * after using Object.assign. This results in errors relating properties of
     * which can never be `null` being treated as though they could be.
     */
    Object.assign(this, karmaConfig);
    this.updateBrowsers();
    this.updateReporters();
    this.updateFiles();
    this.updatePreprocessors();
    this.updateEsbuildConfig();
    this.updateClient();
    this.updateMiddleware();
    this.updateCoverageSettings();
  }

  /**
   * Updates the set of preprocessors to run on HTML and JS files before testing.
   * Notes:
   * - The HTML transform is lazy-required because the server is built at startup.
   * - We must use babel on windows until esbuild can natively downconvert to ES5.
   */
  updatePreprocessors() {
    const createHtmlTransformer = function () {
      return function (content: string, _file: string, done: TransformType) {
        if (!transform) {
          const outputDir = `../../../${SERVER_TRANSFORM_PATH}/dist/transform`;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          transform = require(outputDir).transformSync as TransformType;
        }
        done(transform(content));
      };
    };
    createHtmlTransformer.$inject = [];
    this.plugins.push({
      'preprocessor:htmlTransformer': ['factory', createHtmlTransformer],
    });
    this.preprocessors[karmaHtmlFixturesPath] = ['htmlTransformer', 'html2js'];
    for (const karmaJsPath of karmaJsPaths) {
      this.preprocessors[karmaJsPath] = ['esbuild'];
    }
  }

  /**
   * Picks a browser config based on the the test type and command line flags.
   * Defaults to Chrome.
   */
  updateBrowsers() {
    const browser = argv.edge
      ? 'EdgeCustom'
      : argv.firefox
        ? 'FirefoxCustom'
        : argv.safari
          ? 'SafariCustom'
          : 'ChromeCustom';
    Object.assign(this, { browsers: [browser], customLaunchers });
  }

  /**
   * Adds reporters to the default karma spec per test settings.
   * Overrides default reporters for verbose settings.
   */
  updateReporters() {
    if (
      (argv.testnames || argv.local_changes || argv.files || argv.verbose) &&
      !isCiBuild()
    ) {
      this.reporters = ['mocha'];
    }

    if (isCircleciBuild()) {
      this.reporters.push('junit');
      this.junitReporter = {
        outputFile: `result-reports/${this.testType}.xml`,
        useBrowserName: false,
      };
    }

    if (argv.coverage) {
      this.reporters.push('coverage-istanbul');
    }

    if (argv.report) {
      this.reporters.push('json-result');
      this.jsonResultReporter = {
        outputFile: `result-reports/${this.testType}.json`,
      };
    }
  }

  /**
   * Computes the set of files for Karma to load based on factors like test type,
   * target browser, and flags.
   */
  updateFiles() {
    switch (this.testType) {
      case 'unit':
        if (argv.files || argv.filelist) {
          this.files = commonUnitTestPaths
            .concat(getFilesFromArgv())
            .concat(getFilesFromFileList());
          return;
        }
        if (argv.local_changes) {
          this.files = commonUnitTestPaths.concat(unitTestsToRun());
          return;
        }
        this.files = commonUnitTestPaths.concat(unitTestPaths);
        return;

      case 'integration':
        // TODO(rileyajones) implement this.
        throw new Error('Not Yet Implemented');

      default:
        throw new Error(`Test type ${this.testType} was not recognized`);
    }
  }

  /**
   * Logs a message indicating the start of babel transforms.
   */
  logBabelStart() {
    wrapCounter = 0;
    log(
      green('Transforming tests with'),
      cyan('esbuild'),
      green('and'),
      cyan('babel') + green('...')
    );
  }

  /**
   * Prints a dot for every babel transform, with wrapping if needed.
   */
  printBabelDot() {
    process.stdout.write('.');
    if (++wrapCounter >= dotWrappingWidth) {
      wrapCounter = 0;
      process.stdout.write('\n');
    }
  }

  /**
   * Updates the esbuild config in the karma spec so esbuild can run with it.
   */
  updateEsbuildConfig() {
    const importPathPlugin: Plugin = {
      name: 'import-path',
      setup(build: PluginBuild) {
        build.onResolve({ filter: /^[\w-]+$/ }, (file) => {
          if (file.path === 'stream') {
            return { path: require.resolve('stream-browserify'), namespace: '' };
          }
        });
      },
    };
    const babelPlugin = getEsbuildBabelPlugin(
      /* callerName */ 'test',
      /* enableCache */ true,
      {
        preSetup: () => this.logBabelStart(),
        postLoad: () => this.printBabelDot(),
      }
    );
    this.esbuild = {
      target: 'esnext', // We use babel for transpilation.
      define: {
        'process.env.NODE_DEBUG': 'false',
        'process.env.NODE_ENV': '"test"',
      },
      plugins: [importPathPlugin, babelPlugin],
      mainFields: ['module', 'browser', 'main'],
      sourcemap: 'inline',
    };
  }

  /**
   * Updates the client so that tests can access karma state. This is available in
   * the browser via window.parent.karma.config.
   */
  updateClient() {
    this.singleRun = !argv.watch;
    this.client.mocha.grep = !!argv.grep;
    this.client.verboseLogging = !!argv.verbose;
    this.client.captureConsole = !!argv.verbose || !!argv.files;
    this.client.amp = {
      useMinifiedJs: !!argv.minified,
      mochaTimeout: this.client.mocha.timeout,
      testServerPort: this.client.testServerPort,
      isModuleBuild: !!argv.esm, // Used by skip matchers in testing/test-config.js
    };
  }

  /**
   * Inserts the AMP dev server into the middleware used by the Karma server.
   */
  updateMiddleware() {
    const createDevServerMiddleware = function () {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return require(require.resolve('../../server/app.js'));
    };
    this.plugins.push({
      'middleware:devServer': ['factory', createDevServerMiddleware],
    });
    this.beforeMiddleware = ['devServer'];
  }

  /**
   * Updates the Karma config to gather coverage info if coverage is enabled.
   */
  updateCoverageSettings() {
    if (argv.coverage) {
      this.plugins.push('karma-coverage-istanbul-reporter');
      this.coverageIstanbulReporter = {
        dir: 'test/coverage',
        reports: isCiBuild() ? ['lcovonly'] : ['html', 'text', 'text-summary'],
        'report-config': { lcovonly: { file: `lcov-${this.testType}.info` } },
      };
    }
  }
}

export class RuntimeTestRunner {
  config: RuntimeTestConfig;
  env: Map<string, number> | null;
  exitCode: number;

  constructor(config: RuntimeTestConfig) {
    this.config = config;
    this.env = null;
    this.exitCode = 0;
  }

  maybeBuild(): Promise<void> {
    throw new Error('maybeBuild method must be overridden');
  }

  async setup(): Promise<void> {
    await this.maybeBuild();
    await startServer({
      name: 'AMP Test Server',
      host: 'localhost',
      port: this.config.client.testServerPort,
      middleware: () => [app],
    });
    const handlerProcess = createCtrlcHandler(`amp ${this.config.testType}`);
    this.env = new Map().set('handlerProcess', handlerProcess);
  }

  /**
   * @return {Promise<void>}
   */
  async run() {
    // TODO(rileyajones) This type genuinly seems wrong... is there an issue here?
    this.exitCode = await createKarmaServer(this.config as unknown as Config);
  }

  teardown() {
    stopServer();
    exitCtrlcHandler(this.env?.get('handlerProcess'));
    if (this.exitCode != 0) {
      const message = `Karma test failed with exit code ${this.exitCode}`;
      log(red('ERROR:'), yellow(message));
      throw new Error(message);
    }
  }
}

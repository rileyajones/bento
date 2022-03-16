import { compileCss } from '../build/build-css';
import { getUnitTestsToRun } from './helpers';
import { RuntimeTestConfig, RuntimeTestRunner } from './runtime-test-base';
import { maybePrintArgvMessages } from '../helpers/testing';
import { argv } from '../../common/argv';

class Runner extends RuntimeTestRunner {
  constructor(config: RuntimeTestConfig) {
    super(config);
  }

  /** @override */
  async maybeBuild() {
    await compileCss();
  }
}

async function unit() {
  maybePrintArgvMessages();
  if (argv.local_changes && !getUnitTestsToRun()) {
    return;
  }

  const config = new RuntimeTestConfig('unit');
  const runner = new Runner(config);

  await runner.setup();
  await runner.run();
  await runner.teardown();
}

unit.description = 'Run unit tests';
unit.flags = {
  'chrome_canary': 'Run tests on Chrome Canary',
  'chrome_flags': 'Use the given flags to launch Chrome',
  'coverage': 'Run tests in code coverage mode',
  'edge': 'Run tests on Edge',
  'firefox': 'Run tests on Firefox',
  'files': 'Run tests for specific files',
  'grep': 'Run tests that match the pattern',
  'headless': 'Run tests in a headless Chrome window',
  'local_changes':
    'Run unit tests directly affected by the files changed in the local branch',
  'nohelp': 'Silence help messages that are printed prior to test run',
  'report': 'Write test result report to a local file',
  'safari': 'Run tests on Safari',
  'testnames': 'List the name of each test being run',
  'verbose': 'Enable logging',
  'watch': 'Watch for changes in files, runs corresponding test(s)',
  'filelist': 'Run tests specified in this comma-separated list of test files',
};

unit().catch((e) => {
  throw e;
});

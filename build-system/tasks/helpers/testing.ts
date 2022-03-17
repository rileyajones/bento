import { cyan, green, yellow } from "kleur/colors";
import open from 'open';
import path from "path";
import { argv } from "../../common/argv";
import { isCiBuild } from "../../common/ci";
import { log } from "../../common/logging";

const CHROMEBASE = argv.chrome_canary ? 'ChromeCanary' : 'Chrome';
const chromeFlags: string[] = [];

/**
 * Prints help messages for args if tests are being run for local development.
 */
export function maybePrintArgvMessages() {
  if (argv.nohelp || isCiBuild()) {
    return;
  }

  const argvMessages = {
    safari: 'Running tests on Safari.',
    firefox: 'Running tests on Firefox.',
    ie: 'Running tests on IE.',
    edge: 'Running tests on Edge.',
    // eslint-disable-next-line
    chrome_canary: 'Running tests on Chrome Canary.',
    nobuild: 'Skipping build.',
    watch:
      'Enabling watch mode. Editing and saving a file will cause the' +
      ' tests for that file to be re-run in the same browser instance.',
    verbose: 'Enabling verbose mode. Expect lots of output!',
    testnames: 'Listing the names of all tests being run.',
    files: `Running tests in the file(s): ${cyan(JSON.stringify(argv.files))}`,
    grep:
      `Only running tests that match the pattern "${cyan(argv.grep)}".`,
    coverage: 'Running tests in code coverage mode.',
    headless: 'Running tests in a headless Chrome window.',
    // eslint-disable-next-line
    local_changes:
      'Running unit tests directly affected by the files' +
      ' changed in the local branch.',
    minified: 'Running tests in minified mode.',
    stable: 'Running tests only on stable browsers.',
    beta: 'Running tests only on beta browsers.',
  };
  if (argv.chrome_flags) {
    log(
      green('Launching'),
      cyan(CHROMEBASE),
      green('with flags'),
      cyan(`${JSON.stringify(chromeFlags)}`)
    );
  }

  log(
    green('Run'),
    cyan('amp --tasks'),
    green('to see a list of all test flags.')
  );
  log(green('⤷ Use'), cyan('--nohelp'), green('to silence these messages.'));
  log(
    green('⤷ Use'),
    cyan('--local_changes'),
    green('to run unit tests from files commited to the local branch.')
  );
  if (!argv.testnames && !argv.files && !argv.local_changes) {
    log(
      green('⤷ Use'),
      cyan('--testnames'),
      green('to see the names of all tests being run.')
    );
  }
  if (!argv.headless) {
    log(
      green('⤷ Use'),
      cyan('--headless'),
      green('to run tests in a headless Chrome window.')
    );
  }
  if (argv.minified) {
    log(green('Running tests against minified code.'));
  } else {
    log(green('Running tests against unminified code.'));
  }
  Object.keys(argv).forEach((arg) => {
    /** @type {string} */
    const message = argvMessages[arg as keyof typeof argvMessages];
    if (message) {
      log(yellow(`--${arg}:`), green(message));
    }
  });
}

const DEFAULT_CHROME_FLAGS = [
  // Dramatically speeds up iframe creation.
  '--disable-extensions',
  // Allows simulating user actions (e.g unmute) which will otherwise be denied.
  '--autoplay-policy=no-user-gesture-required',
  // Makes debugging easy by auto-opening devtools.
  argv.debug ? '--auto-open-devtools-for-tabs' : null,
  // There's no guarantee of a browser UI during CI.
  // https://developers.google.com/web/updates/2017/04/headless-chrome#frontend
  isCiBuild() ? '--no-sandbox' : null,
  // These flags are equired in headless mode.
  // https://github.com/karma-runner/karma-chrome-launcher/issues/175
  argv.headless ? '--remote-debugging-port=9222' : null,
  argv.headless ? "--proxy-server='direct://'" : null,
  argv.headless ? '--proxy-bypass-list=*' : null,
].filter(Boolean);

export const customLaunchers = {
  ChromeCustom: {
    base: argv.headless
      ? 'ChromeHeadless'
      : argv.chrome_canary
        ? 'ChromeCanary'
        : 'Chrome',
    flags: argv.chrome_flags
      ? argv.chrome_flags.split(',').map((flag) => `--${flag}`)
      : DEFAULT_CHROME_FLAGS,
  },
  SafariCustom: {
    base: 'SafariNative',
  },
  FirefoxCustom: {
    base: 'Firefox',
    flags: argv.headless ? ['-headless'] : [],
  },
  EdgeCustom: {
    // TODO(rsimha): Switch from Beta to Stable once it's available.
    base: argv.headless ? 'EdgeBetaHeadless' : 'EdgeBeta',
    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  },
};

export async function maybePrintCoverageMessage(covPath = ''): Promise<void> {
  if (!argv.coverage || isCiBuild()) {
    return;
  }

  const url = `file://${path.resolve(covPath)}`;
  log(green('INFO:'), 'Generated code coverage report at', cyan(url));
  await open(url, { wait: false });
}


import { log } from "console";
import { Server, Config } from "karma";
import { green } from "kleur";
import { cyan, red } from "kleur/colors";
import { logWithoutTimestamp } from "../../common/logging";
import { maybePrintCoverageMessage } from "./testing";

type BrowserResult = {
  lastResult: {
    success: number;
    failed: number;
    skipped: number;
    total?: number;
  };
}

function karmaBrowserComplete(browser: BrowserResult) {
  const result = browser.lastResult;
  result.total = result.success + result.failed + result.skipped;
  // This used to be a warning with karma-browserify. See #16851 and #24957.
  // Now, with karma-esbuild, this is a fatal error. See #34040.
  if (result.total == 0) {
    log(
      red('ERROR:'),
      'Karma returned a result with zero tests.',
      'This usually indicates a transformation error. See logs above.'
    );
    log(cyan(JSON.stringify(result)));
    process.exit(1);
  }
}

function karmaBrowserStart_() {
  logWithoutTimestamp('\n');
  log(green('Done. Running tests...'));
}

/**
 * Creates and starts karma server
 */
export async function createKarmaServer(config: Config): Promise<number> {
  let resolver: (value: number) => void;
  const deferred = new Promise((resolverIn: (value: number) => void) => {
    resolver = resolverIn;
  });

  const karmaServer = new Server(config, (exitCode: number) => {
    maybePrintCoverageMessage('test/coverage/index.html').finally(() => {
      resolver(exitCode);
    });
  });

  karmaServer
    .on('browser_start', karmaBrowserStart_)
    .on('browser_complete', karmaBrowserComplete);

  karmaServer.start().catch((e) => {
    throw e;
  });

  return deferred;
}

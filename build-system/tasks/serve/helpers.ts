import { cyan, green } from 'kleur/colors';
import header = require('connect-header');
import morgan = require('morgan');
import { log } from '../../common/logging';
import { argv } from '../../common/argv';
import { ConnectRouteHandler } from 'gulp-connect';
import { HandleFunction } from 'connect';
import { lazyBuildExtensions, lazyBuildJs } from '../../server/lazy-build';

let serveMode = 'default';

export const servingConfig = {
  quiet: !!argv.quiet, // Used for logging.
  lazyBuild: false //  Used to enable / disable lazy building.
}

/**
 * Returns a string representation of the server's mode.
 * @return {string}
 */
function getServeMode() {
  return serveMode;
}

export type ServeModeOptions = {
  minified?: boolean;
  esm?: boolean;
  cdn?: boolean;
};

/**
 * Sets the server's mode. Uses command line arguments by default, but can be
 * overridden by passing in a modeOptions object.
 */
export function setServeMode(modeOptions: ServeModeOptions) {
  if (Object.keys(modeOptions).length == 0) {
    modeOptions = argv;
  }

  if (modeOptions.minified) {
    serveMode = 'minified';
  } else if (modeOptions.esm) {
    serveMode = 'esm';
  } else if (modeOptions.cdn) {
    serveMode = 'cdn';
  }
}

/**
 * Returns a list of middleware handler functions to use while serving
 */
 export function getMiddleware(): Array<HandleFunction | ConnectRouteHandler> {
   // Lazy-required to enable live-reload
  const middleware = [require('../server/app')] as Array<HandleFunction | ConnectRouteHandler>;
  if (!servingConfig.quiet) {
    middleware.push(morgan('dev') as HandleFunction);
  }
  if (argv.cache) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    middleware.push(header({'cache-control': 'max-age=600'}) as HandleFunction);
  }
  if (servingConfig.lazyBuild) {
    middleware.push(lazyBuildExtensions as unknown as HandleFunction);
    middleware.push(lazyBuildJs  as unknown as HandleFunction);
  }
  return middleware;
}

/**
 * Logs the server's mode.
 */
export function logServeMode() {
  const serveMode = getServeMode();
  if (serveMode == 'minified') {
    log(green('Serving'), cyan('minified'), green('JS'));
  } else if (serveMode == 'esm') {
    log(green('Serving'), cyan('ESM'), green('JS'));
  } else if (serveMode == 'cdn') {
    log(green('Serving'), cyan('current prod'), green('JS'));
  } else {
    log(green('Serving'), cyan('unminified'), green('JS'));
  }
}

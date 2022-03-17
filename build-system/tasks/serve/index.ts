import connect, { ConnectAppOptions } from 'gulp-connect';
import { buildNewServer } from "../../server/typescript-compile";
import { cyan, green } from "kleur/colors";
import { log } from "../../common/logging";
import { networkInterfaces } from "os";
import { getMiddleware, logServeMode, ServeModeOptions, servingConfig, setServeMode } from "./helpers";
import { argv } from "../../common/argv";

export const HOST = argv.host || '0.0.0.0';
export const PORT = argv.port || '8000';

type ServerOptions = {
  host?: string;
  lazyBuild?: boolean;
  port?: string;
  quiet?: boolean;
}

let url: string|null = null;

function startGulpConnect(options: ConnectAppOptions) {
  return new Promise((resolve) => {
    connect.server(options, resolve as () => void);
  })
}

/**
 * Stops the currently running server
 */
export function stopServer() {
  if (url) {
    connect.serverClose();
    log(green('Stopped server at'), cyan(url));
    url = null;
  }
}

export async function startServer(
  connectOptions = {},
  serverOptions: ServerOptions = {},
  modeOptions: ServeModeOptions = {}
) {
  await buildNewServer();
  if (serverOptions.lazyBuild) {
    servingConfig.lazyBuild = serverOptions.lazyBuild;
  }
  if (serverOptions.quiet) {
    servingConfig.quiet = serverOptions.quiet;
  }

  setServeMode(modeOptions);

  const options = {
    name: 'AMP Dev Server',
    root: process.cwd(),
    host: HOST,
    port: parseInt(PORT, 10),
    https: argv.https,
    preferHttp1: true,
    silent: true,
    middleware: getMiddleware,
    ...connectOptions,
  };

  await startGulpConnect(options);

  function makeUrl(host: string): string {
    return `http${options.https ? 's' : ''}://${host}:${options.port}`;
  }

  url = makeUrl(options.host);
  log(green('Started'), cyan(options.name), green('at:'));
  log('\t', cyan(url));
  for (const device of Object.entries(networkInterfaces())) {
    for (const detail of device[1] ?? []) {
      if (detail.family === 'IPv4') {
        log('\t', cyan(makeUrl(detail.address)));
      }
    }
  }
  if (argv.coverage == 'live') {
    const covUrl = `${url}/coverage`;
    log(green('Collecting live code coverage at'), cyan(covUrl));
    await Promise.all([open(covUrl), open(url)]);
  }
  logServeMode();
}

import { NextFunction, Request, Response } from "express";
import { argv } from "../common/argv";
import { JS_BUNDLES } from "../compile/bundles.config";
import { buildBundle } from "../tasks/build/build-bundle";
import { buildComponent } from "../tasks/build/build-component";
import { getInitializedComponents } from "../tasks/build/components-cache";
import { BaseBundle, ComponentBuildOptions, ComponentBundle, JsBundle } from "../tasks/types";

type BuildBundleFn<T> = (bundle: T, options: ComponentBuildOptions) => Promise<void>;

/**
 * Normalizes bento extension names and gets the unminified name of the bundle
 * if it can be lazily built.
 */
 function maybeGetUnminifiedName(bundles: Record<string, BaseBundle>, name: string): string {
  if (argv.minified) {
    if (bundles[name]) {
      return name;
    }
    return Object.keys(bundles)
      .filter((key) => bundles[key].options)
      .find((key) => bundles[key].options?.minifiedName === name) as string;
  }
  return name;
}

/**
 * Actually build a JS file or extension. Only will allow one build per
 * bundle at a time.
 *
 * @param {!Object} bundles
 * @param {function(!Object, string, ?Object):Promise} buildFunc
 */
async function build<T extends BaseBundle>(bundles: Record<string, T>, name: string, buildFunc: BuildBundleFn<T>): Promise<void> {
  const bundle = bundles[name];
  if (bundle.pendingBuild) {
    await bundle.pendingBuild;
    return;
  }
  if (bundle.watched) {
    return;
  }

  const options = {
    watch: true,
    minify: argv.minified,
    localDev: true,
    onWatchBuild: async (bundlePromise: Promise<void>) => {
      bundle.pendingBuild = bundlePromise;
      await bundlePromise;
      bundle.pendingBuild = undefined;
    },
  } as ComponentBuildOptions;
  bundle.watched = true;
  bundle.pendingBuild = buildFunc(bundles[name], options);
  await bundle.pendingBuild;
  bundle.pendingBuild = undefined;
}

/**
 * Checks for a previously triggered build for a bundle, and triggers one if
 * required.
 *
 * @param {string} url
 * @param {string|RegExp} matcher
 * @param {!Object} bundles
 * @param {function(!Object, string, ?Object):Promise} buildFunc
 * @return {Promise<void>}
 */
async function lazyBuild<T extends BaseBundle>(url: string, matcher: string | RegExp, bundles: Record<string, T>, buildFunc: BuildBundleFn<T>, next: NextFunction): Promise<void> {
  const match = url.match(matcher);
  if (match && match.length == 2) {
    const name = maybeGetUnminifiedName(bundles, match[1]);
    const bundle = bundles[name];
    if (bundle) {
      await build(bundles, name, buildFunc);
    }
  }
  next();
}

/**
 * Lazy builds the correct version of an extension when requested.
 */
export async function lazyBuildExtensions(req: Request, _res: Response, next: NextFunction) {
  const matcher = argv.minified
    ? argv.esm
    // eslint-disable-next-line no-useless-escape
      ? /\/dist\/v0\/([^\/]*)\.mjs/ // '/dist/v0/*.mjs'
      // eslint-disable-next-line no-useless-escape
      : /\/dist\/v0\/([^\/]*)\.js/ // '/dist/v0/*.js'
      // eslint-disable-next-line no-useless-escape
    : /\/dist\/v0\/([^\/]*)\.max\.js/; // '/dist/v0/*.max.js'
  await lazyBuild<ComponentBundle<string>>(req.url, matcher, getInitializedComponents(), buildComponent, next);
}

/**
 * Lazy builds a non-extension JS file when requested.
 */
export async function lazyBuildJs(req: Request, _res: Response, next: NextFunction) {
  // eslint-disable-next-line no-useless-escape
  const matcher = argv.esm ? /\/.*\/([^\/]*\.mjs)/ : /\/.*\/([^\/]*\.js)/;
  await lazyBuild<JsBundle>(req.url, matcher, JS_BUNDLES, (bundle, options) => {
    return buildBundle(bundle, options);
  }, next);
}

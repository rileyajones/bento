import { transformCssString } from "./jsify-css";

/**
 * Synchronously transforms a css string using postcss.

 * @param {string} cssStr the css text to transform
 * @param {!Object=} opt_filename the filename of the file being transformed. Used for sourcemaps generation.
 * @return {Object} The transformation result
 */
export function transformCssSync(cssStr: string, opt_filename?: string): any {
  return transformCssString(cssStr, opt_filename);
}

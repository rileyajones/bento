// @ts-nocheck
import {BUILD_CONSTANTS} from '../compile/build-constants';

/**
 * Computes options for minify-replace and returns the plugin object.
 */
 export function getReplacePlugin(): Array<string|object> {
  /**
   * @param {string} identifierName the identifier name to replace
   * @param {boolean|string} value the value to replace with
   * @return {!Object} replacement options used by minify-replace plugin
   */
  function createReplacement(identifierName: string, value: boolean | string) {
    const replacement =
      typeof value === 'boolean'
        ? {type: 'booleanLiteral', value}
        : {type: 'stringLiteral', value};
    return {identifierName, replacement};
  }

  const replacements = Object.entries(BUILD_CONSTANTS).map(([ident, val]) =>
    createReplacement(ident, val)
  );


  return ['minify-replace', {replacements}];
}

/**
 * Returns a Babel plugin that replaces the global identifier with the correct
 * alternative. Used before transforming test code with esbuild.
 */
export function getReplaceGlobalsPlugin(): Array<string|object> {
  return [
    (babel) => {
      const {types: t} = babel;
      return {
        visitor: {
          ReferencedIdentifier(path) {
            const {node, scope} = path;
            if (node.name !== 'global') {
              return;
            }
            if (scope.getBinding('global')) {
              return;
            }
            const possibleNames = ['globalThis', 'self'];
            const name = possibleNames.find((name) => !scope.getBinding(name));
            if (!name) {
              throw path.buildCodeFrameError(
                'Could not replace `global` with globalThis identifier'
              );
            }
            path.replaceWith(t.identifier(name));
          },
        },
      };
    },
  ];
}

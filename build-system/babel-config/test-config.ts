import {getImportResolverPlugin} from './import-resolver';
import {getReplaceGlobalsPlugin, getReplacePlugin} from './helpers';
import { argv } from '../common/argv';

/**
 * Gets the config for babel transforms run during `amp [unit|integration|e2e]`.
 *
 * @return {!Object}
 */
export function getTestConfig() {
  const instanbulPlugin = [
    'istanbul',
    {
      exclude: [
        'ads/**/*.js',
        'build-system/**/*.js',
        'extensions/**/test/**/*.js',
        'src/bento/components/**/test/**/*.js',
        'third_party/**/*.js',
        'test/**/*.js',
        'testing/**/*.js',
      ],
    },
  ];
  const reactJsxPlugin = [
    '@babel/plugin-transform-react-jsx',
    {
      pragma: 'Preact.createElement',
      pragmaFrag: 'Preact.Fragment',
      useSpread: true,
    },
  ];
  const presetEnv = [
    '@babel/preset-env',
    {
      bugfixes: true,
      modules: 'commonjs',
      loose: true,
      targets: {'browsers': ['Last 2 versions']},
      shippedProposals: true,
    },
  ];
  const presetTypescript = [
    '@babel/preset-typescript',
    {jsxPragma: 'Preact', jsxPragmaFrag: 'Preact.Fragment'},
  ];
  const replacePlugin = getReplacePlugin();
  const replaceGlobalsPlugin = getReplaceGlobalsPlugin();
  const testPlugins = [
    getImportResolverPlugin(),
    argv.coverage ? instanbulPlugin : null,
    replacePlugin,
    replaceGlobalsPlugin,
    './build-system/babel-plugins/babel-plugin-jsx-style-object',
    './build-system/babel-plugins/babel-plugin-mangle-object-values',
    './build-system/babel-plugins/babel-plugin-imported-helpers',
    './build-system/babel-plugins/babel-plugin-transform-json-import',
    './build-system/babel-plugins/babel-plugin-transform-json-configuration',
    './build-system/babel-plugins/babel-plugin-transform-jss',
    './build-system/babel-plugins/babel-plugin-transform-promise-resolve',
    './build-system/babel-plugins/babel-plugin-dom-jsx-svg-namespace',
    reactJsxPlugin,
  ].filter(Boolean);
  const testPresets = [presetTypescript, presetEnv];
  return {
    compact: false,
    plugins: testPlugins,
    presets: testPresets,
    sourceMaps: 'inline',
    assumptions: {
      constantSuper: true,
      noClassCalls: true,
      setClassMethods: true,
      setPublicClassFields: true,
    },
  };
}

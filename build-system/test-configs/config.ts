export type TestPath = {
  pattern: string;
  included: boolean;
  nocache: boolean;
  watched: boolean;
};

const initTestsPath: Array<string|TestPath> = ['testing/init-tests.js'];

export const karmaHtmlFixturesPath = 'test/fixtures/*.html';

const fixturesExamplesPaths = [
  karmaHtmlFixturesPath,
  {
    pattern: 'test/fixtures/served/*.html',
    included: false,
    nocache: false,
    watched: true,
  },
  {
    pattern: 'examples/**/*',
    included: false,
    nocache: false,
    watched: true,
  },
];

export const karmaJsPaths = [
  'test/**/*.js',
  'ads/**/test/test-*.js',
  'extensions/**/test/**/*.js',
  'src/bento/components/**/test/*.js',
  'testing/**/*.js',
];

export const commonUnitTestPaths = initTestsPath.concat(fixturesExamplesPaths);

export const unitTestPaths = [
  'src/components/**/test/*.js',
  'src/components/**/test/unit/*.js',
];


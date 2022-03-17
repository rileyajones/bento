declare module 'css-imports' {
  type CssImport = {
    path: string;
  };
  const cssImport: (contents: string|Buffer) => CssImport[];
  export default cssImport;
}

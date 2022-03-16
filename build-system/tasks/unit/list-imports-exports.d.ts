declare module 'list-imports-exports' {
  export type ListImportsExports = {
    parse: (contents: string, plugins: string[]) => {
      imports: string[];
    }
  };
}

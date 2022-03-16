import type { Format } from 'esbuild';

export type BuildOptions = {
  babelCaller?: string;
  continueOnError?: boolean;
  fortesting?: boolean;
  localDev?: boolean;
  minify?: boolean;
  watch?: boolean;
  wrapper?: CompileWrapper;
};

export type ComponentBuildOptions = BuildOptions & {
  binaries?: ExtensionBinary[];
  isRebuild?: boolean;
}

export type ExtensionBinary = {
  entryPoint: string;
  outfile: string;
  external: string[];
  remap?: Record<string, string>;
  wrapper?: CompileWrapper;
  babelCaller?: string;
}

type BaseBundleOptions = {
  minifiedName?: string;
}

export type ComponentBundleOptions = BaseBundleOptions & {
  hasCss: boolean;
};

export type BaseBundle<T extends BaseBundleOptions = BaseBundleOptions> = {
  pendingBuild?: Promise<void>;
  watched?: boolean;
  options?: T;
}

// TODO (rileyajones) update bundles to a seperate attribute if multiple versions are needed.
export type ComponentBundle<T extends string | string[] = string | string[]> = BaseBundle<ComponentBundleOptions>  & {
  name: string;
  version: T;
  options: ComponentBundleOptions;
};

export type JsBundleOptions = BaseBundleOptions & {
  includePolyfills?: boolean;
  toName: string;
  aliasName?: string;
};

export type JsBundle = BaseBundle<JsBundleOptions> & {
  srcDir: string;
  srcFilename: string;
  destDir: string;
  minifiedDestDir: string;
  options: JsBundleOptions;
}

export type EsbuildCompileOptions = BuildOptions & JsBundleOptions & {
  externalDependencies?: string[];
  remapDependencies?: Record<string, string>;
  name?: string;
  onWatchBuild?: (result: Promise<void>) => void;
  outputFormat?: Format;
};

export type CompileWrapper = 'bento' | 'none';

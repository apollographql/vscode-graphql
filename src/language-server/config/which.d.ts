declare module "which" {
  interface Options {
    /**  Use instead of the PATH environment variable. */
    path?: string;
    /** Use instead of the PATHEXT environment variable. */
    pathExt?: string;
    /**  Return all matches, instead of just the first one. Note that this means the function returns an array of strings instead of a single string. */
    all?: boolean;
  }

  function which(cmd: string, options?: Options): number;
  namespace which {
    function sync(
      cmd: string,
      options?: Options & { nothrow?: boolean },
    ): string | null;
  }
  export = which;
}

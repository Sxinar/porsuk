declare module "minimatch" {
  interface IOptions {
    [key: string]: unknown;
  }

  function minimatch(target: string, pattern: string, options?: IOptions): boolean;

  namespace minimatch {
    function filter(pattern: string, options?: IOptions): (value: string) => boolean;
  }

  export = minimatch;
}

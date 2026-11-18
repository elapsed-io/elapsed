/** Design tokens generated at build time from the config module (build/plugins.ts). */
declare module 'virtual:tokens.css' {}
declare module 'virtual:tokens/*' {}

/** A built-in recipe's projected starfield, its skies drawn at build time (build/sky.ts): each slot's data by its built-in key. */
declare module 'virtual:sky/*' {
  const sky: Readonly<Record<string, unknown>>;
  export default sky;
}

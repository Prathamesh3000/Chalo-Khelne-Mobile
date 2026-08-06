// env.d.ts — Ambient types for Expo build-time env vars.
//
// Expo inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time, so the
// values exist at runtime. TypeScript only needs to know the `process` global is
// there. We declare it narrowly here instead of adding @types/node to the
// `types` field — pulling Node's globals (Buffer, __dirname, timers, …) into a
// React Native app causes more problems than it solves.
declare const process: {
  readonly env: {
    /** "production" | "staging" | "development" */
    readonly EXPO_PUBLIC_ENV?: string;
    /** Explicit server URL override (wins if set) */
    readonly EXPO_PUBLIC_SERVER_URL?: string;
    readonly [key: string]: string | undefined;
  };
};

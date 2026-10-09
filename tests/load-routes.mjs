import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import ts from "typescript";
const require = createRequire(import.meta.url);
export const jars = new AsyncLocalStorage();
// Run the actual route/auth code with real Postgres in an isolated schema.
// Only the connection and Next's request cookie context are substituted.
export function loadRoutes(sql, mailFetch = globalThis.fetch) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", "fetch", code)(
      (id) => {
        if (id === "next/headers")
          return { cookies: async () => jars.getStore() };
        if (id === "@/lib/db" || id === "./db") return { db: () => sql };
        if (id.startsWith("@/lib/")) return load(`src/lib/${id.slice(6)}.ts`);
        if (id === "./admin" || id === "./auth" || id === "./sheet")
          return load(`src/lib/${id.slice(2)}.ts`);
        return require(id);
      },
      loadedModule,
      loadedModule.exports,
      mailFetch,
    );
    return loadedModule.exports;
  }
  return Object.fromEntries(
    ["auth", "admin", "heroes", "campaigns", "presence", "recovery"].map(
      (name) => [name, load(`src/app/api/${name}/route.ts`)],
    ),
  );
}

export function cookieJar(token) {
  const values = new Map(token ? [["root-session", token]] : []);
  return {
    get: (key) => (values.has(key) ? { value: values.get(key) } : undefined),
    set: (key, value) => values.set(key, value),
    delete: (key) => values.delete(key),
  };
}

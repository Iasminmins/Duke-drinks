import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  const aliased = specifier.startsWith("@/");
  if (!aliased && (!specifier.startsWith(".") || /\.[a-z]+$/i.test(specifier))) {
    try { return await nextResolve(specifier, context); }
    catch (error) {
      if (!specifier.startsWith("next/")) throw error;
      return nextResolve(`${specifier}.js`, context);
    }
  }
  const base = aliased
    ? pathToFileURL(resolvePath("src", specifier.slice(2))).href
    : new URL(specifier, context.parentURL).href;
  try {
    return await nextResolve(base, context);
  } catch {
    return nextResolve(`${base}.ts`, context);
  }
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith(".ts")) return nextLoad(url, context);
  const source = await readFile(new URL(url), "utf8");
  const transformed = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: new URL(url).pathname,
  });
  return { format: "module", source: transformed.outputText, shortCircuit: true };
}

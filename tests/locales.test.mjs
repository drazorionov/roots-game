import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
const ru = JSON.parse(readFileSync("src/lib/locales/ru.json", "utf8"));
const de = JSON.parse(readFileSync("src/lib/locales/de.json", "utf8"));
test("Russian and German cover all declared messages and interpolation values", () => {
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(de).sort());
  for (const [key, value] of Object.entries(ru)) {
    assert.ok(value.trim(), key);
    assert.ok(de[key].trim(), key);
    const tokens = (s) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
    assert.deepEqual(tokens(value), tokens(key), `RU placeholders: ${key}`);
    assert.deepEqual(tokens(de[key]), tokens(key), `DE placeholders: ${key}`);
  }
  function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
  }
  for (const file of walk("src").filter((f) => /\.tsx?$/.test(f))) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function check(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "t" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        assert.ok(
          ru[node.arguments[0].text],
          `Missing translation in ${file}: ${node.arguments[0].text}`,
        );
      if (
        file.includes("/api/") &&
        ts.isPropertyAssignment(node) &&
        node.name.getText(source) === "error" &&
        ts.isStringLiteral(node.initializer)
      )
        assert.ok(
          ru[node.initializer.text],
          `Missing API error translation: ${node.initializer.text}`,
        );
      ts.forEachChild(node, check);
    }
    check(source);
  }
});

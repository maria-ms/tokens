import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

const sorted = (values) => [...values].sort();
const collectExportTargets = (value) =>
  typeof value === "string"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(collectExportTargets)
      : [];

const publicExports = [
  "./css/light",
  "./css/dark",
  "./json/light",
  "./json/dark",
  "./js/light",
  "./js/dark",
  "./react-native/light",
  "./react-native/dark",
  "./package.json",
];

describe("Published token package", () => {
  test("exposes only the generated consumer contract", () => {
    assert.deepEqual(sorted(packageJson.files), ["README.md", "dist"]);
    assert.deepEqual(
      sorted(Object.keys(packageJson.exports)),
      sorted(publicExports),
    );
    assert.equal(packageJson.exports["."], undefined);
    assert.deepEqual(packageJson.sideEffects, ["./dist/css/*.css"]);
    assert.deepEqual(packageJson.publishConfig, {
      access: "public",
      provenance: true,
    });
    assert.deepEqual(packageJson.scripts, {
      dev: "node --watch --watch-path=sources --watch-path=src src/build.mjs",
      build: "node src/build.mjs",
      test: 'node --test "src/**/*.test.mjs" "test/**/*.test.mjs"',
      check: "npm run build && npm run test",
      prepack: "npm run build",
    });

    for (const target of collectExportTargets(packageJson.exports)) {
      assert.match(target, new RegExp("^\\./(?:dist/|package\\.json$)"));
      assert.doesNotMatch(target, new RegExp("(?:^|/)(?:src|sources)/"));
    }

    for (const name of [
      "./js/light",
      "./js/dark",
      "./react-native/light",
      "./react-native/dark",
    ]) {
      assert.equal(
        packageJson.exports[name].import,
        packageJson.exports[name].default,
      );
      assert.match(
        packageJson.exports[name].import,
        new RegExp("^\\./dist/.+\\.mjs$"),
      );
    }
  });
});

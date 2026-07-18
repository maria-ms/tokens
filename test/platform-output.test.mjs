import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const outputUrl = (path) => new URL("../dist/" + path, import.meta.url);
const readOutput = (path) => readFile(outputUrl(path), "utf8");

const brokenCssValue =
  /\[object Object\]|undefined|NaN|\{(?:primitive|semantic|component)\./;
const color =
  /^(?:#[0-9a-f]{6}(?:[0-9a-f]{2})?|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0?\.\d+)\))$/i;

const tokenAt = (tokens, path) => {
  const token = path.reduce((node, key) => node?.[key], tokens);
  assert.ok(token, "Missing generated token path " + path.join("."));
  return token;
};

const cssCustomProperties = (css) =>
  [...css.matchAll(/^\s*(--[a-z0-9-]+):/gim)].map((match) => match[1]);

describe("Generated platform outputs", () => {
  test("publish collision-free CSS and resolved JSON for web consumers and tooling", async () => {
    const [lightCss, darkCss, lightJson, darkJson] = await Promise.all([
      readOutput("css/light.css"),
      readOutput("css/dark.css"),
      readOutput("json/light.json").then(JSON.parse),
      readOutput("json/dark.json").then(JSON.parse),
    ]);

    assert.match(lightCss, /:root,\r?\n\[data-theme="light"\] \{/);
    assert.match(darkCss, /^\[data-theme="dark"\] \{/m);
    for (const css of [lightCss, darkCss]) {
      assert.match(
        css,
        /--ds-semantic-color-background-default:\s*var\(--ds-primitive-[^)]+\);/,
      );
      assert.match(
        css,
        /--ds-component-input-color-background-default:\s*var\(--ds-semantic-[^)]+\);/,
      );
      assert.doesNotMatch(css, brokenCssValue);
      const properties = cssCustomProperties(css);
      assert.equal(
        new Set(properties).size,
        properties.length,
        "CSS output must not contain duplicate custom property names.",
      );
    }
    assert.match(
      lightCss,
      /--ds-semantic-border-focus-primary-color:\s*var\(--ds-primitive-shadow-focused-4px-primary-color\);/,
    );
    assert.match(
      lightCss,
      /--ds-semantic-border-focus-primary-spread:\s*var\(--ds-primitive-shadow-focused-4px-primary-spread\);/,
    );
    assert.match(
      tokenAt(lightJson, ["primitive", "color", "solid", "brand", "500"]),
      color,
    );
    assert.match(
      tokenAt(lightJson, ["semantic", "color", "background", "default"]),
      color,
    );
    assert.match(
      tokenAt(darkJson, ["semantic", "color", "background", "default"]),
      color,
    );
    assert.match(
      tokenAt(lightJson, ["semantic", "border", "focus", "primary", "color"]),
      color,
    );
    assert.match(
      tokenAt(lightJson, ["component", "input", "color", "background", "default"]),
      color,
    );
    assert.notEqual(
      tokenAt(lightJson, ["semantic", "color", "background", "default"]),
      tokenAt(darkJson, ["semantic", "color", "background", "default"]),
      "Light and Dark should remain distinct theme outputs.",
    );
  });
});

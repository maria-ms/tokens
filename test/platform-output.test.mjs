import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const outputUrl = (path) => new URL("../dist/" + path, import.meta.url);
const readOutput = (path) => readFile(outputUrl(path), "utf8");
const importOutput = async (path) =>
  (await import(outputUrl(path).href)).default;

const brokenCssValue =
  /\[object Object\]|undefined|NaN|\{(?:primitive|semantic|component)\./;
const color =
  /^(?:#[0-9a-f]{6}(?:[0-9a-f]{2})?|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0?\.\d+)\))$/i;
const pxDimension = /^-?\d+(?:\.\d+)?px$/;
const emDimension = /^-?\d+(?:\.\d+)?em$/;
const nativeReferenceLeak = /var\(|--ds-|\{[^}]+\}/;

const tokenAt = (tokens, path) => {
  const token = path.reduce((node, key) => node?.[key], tokens);
  assert.ok(token, "Missing generated token path " + path.join("."));
  return token;
};

const tokenValue = (tokens, path) => tokenAt(tokens, path).$value;

const flatTokens = (node) => {
  if (!node || typeof node !== "object") return [];
  if ("$value" in node && Array.isArray(node.path)) return [node];
  return Object.entries(node).flatMap(([key, value]) =>
    key.startsWith("$") || key === "attributes" || key === "original"
      ? []
      : flatTokens(value),
  );
};

const assertNativeDimension = (value, label) => {
  if (typeof value === "number") return;
  assert.equal(
    typeof value?.number,
    "number",
    label + ".number should be numeric",
  );
  assert.equal(
    typeof value?.decimal,
    "number",
    label + ".decimal should be numeric",
  );
  assert.equal(
    typeof value?.scale,
    "number",
    label + ".scale should be numeric",
  );
  assert.ok(
    ["px", "em"].includes(value?.original?.unit),
    label + ".original.unit should preserve px or em",
  );
};

describe("Generated platform outputs", () => {
  test("publish usable CSS, JavaScript, and React Native token files", async () => {
    const [lightCss, darkCss, lightJs, darkJs, lightNative, darkNative] =
      await Promise.all([
        readOutput("css/light.css"),
        readOutput("css/dark.css"),
        importOutput("js/light/tokens.mjs"),
        importOutput("js/dark/tokens.mjs"),
        importOutput("react-native/light/tokens.mjs"),
        importOutput("react-native/dark/tokens.mjs"),
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
    }
    assert.match(
      lightCss,
      /--ds-semantic-shadow-focused-4px-color:\s*var\(--ds-primitive-color-alpha-[^)]+\);/,
    );
    assert.match(
      lightCss,
      /--ds-primitive-shadow-focused-4px-spread:\s*-?\d+(?:\.\d+)?px;/,
    );
    assert.match(
      lightCss,
      /--ds-semantic-shadow-focused-4px-spread:\s*var\(--ds-primitive-shadow-focused-4px-spread\);/,
    );
    assert.match(
      lightCss,
      /--ds-primitive-font-letter-spacing-tight:\s*0\.02em;/,
    );
    assert.match(
      lightCss,
      /--ds-semantic-typography-label-default-letter-spacing:\s*var\(--ds-primitive-font-letter-spacing-wide\);/,
    );
    assert.match(lightCss, /--ds-primitive-font-weight-medium:\s*500;/);
    assert.equal(
      tokenValue(lightJs, ["primitive", "font", "weight", "medium"]),
      500,
    );

    for (const [tokens, path, pattern] of [
      [lightJs, ["primitive", "color", "solid", "brand", "500"], color],
      [lightJs, ["semantic", "color", "background", "default"], color],
      [darkJs, ["semantic", "color", "background", "default"], color],
      [
        lightJs,
        ["component", "input", "color", "background", "default"],
        color,
      ],
      [lightJs, ["primitive", "space", "02"], pxDimension],
      [lightJs, ["semantic", "shadow", "focused-4px", "spread"], pxDimension],
      [
        lightJs,
        ["primitive", "font", "letter-spacing", "tight"],
        emDimension,
      ],
      [
        lightJs,
        ["semantic", "typography", "label", "default", "letter-spacing"],
        emDimension,
      ],
    ]) {
      assert.match(
        tokenValue(tokens, path),
        pattern,
        path.join(".") + " should be usable",
      );
    }
    assert.notEqual(
      tokenValue(lightJs, ["semantic", "color", "background", "default"]),
      tokenValue(darkJs, ["semantic", "color", "background", "default"]),
      "Light and Dark should remain distinct theme outputs.",
    );

    for (const tokens of [lightNative, darkNative]) {
      assert.match(
        tokenValue(tokens, ["semantic", "color", "background", "default"]),
        color,
      );
      assertNativeDimension(
        tokenValue(tokens, ["semantic", "shadow", "focused-4px", "spread"]),
        "semantic.shadow.focused-4px.spread",
      );
      for (const token of flatTokens(tokens)) {
        if (token.$type === "color")
          assert.match(token.$value, color, token.key);
        if (token.$type === "dimension")
          assertNativeDimension(token.$value, token.key);
        if (typeof token.$value === "string")
          assert.doesNotMatch(token.$value, nativeReferenceLeak, token.key);
      }
    }
  });
});

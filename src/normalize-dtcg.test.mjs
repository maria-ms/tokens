import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeDtcg } from "./normalize-dtcg.mjs";

const recipe = {
  source: { type: "figma-export-modes" },
  base: { id: "primitive", collection: "primitive", prefix: ["primitive"] },
  themeCollection: "tokens",
  numberDimensions: {
    figmaScopes: ["GAP"],
    pathPrefixes: ["space"],
    pathMatchers: [{ includes: "shadow", endsWith: "spread" }],
  },
  themes: [{ id: "light" }],
};

const figmaToken = ({
  path,
  type = "color",
  value = { hex: "#112233" },
  alias,
  description,
}) => ({
  path,
  type,
  value,
  description,
  extensions: {
    "com.figma.variableId": "VariableID:" + path.join("/"),
    ...(alias ? { "com.figma.aliasData": alias } : {}),
  },
  alias,
});

const primitiveAlias = (targetVariableName = "color/brand/500") => ({
  targetVariableSetName: "primitive",
  targetVariableName,
});

const semanticAlias = (targetVariableName) => ({
  targetVariableSetName: "tokens",
  targetVariableName,
});

const normalize = (figmaTokens) => normalizeDtcg({ recipe, figmaTokens }).dtcg;

const tokenAt = (tree, path) => path.reduce((node, key) => node?.[key], tree);

describe("DTCG translation", () => {
  test("preserves the token contract needed by Style Dictionary and package consumers", () => {
    const dtcg = normalize({
      primitive: [
        figmaToken({
          path: ["color", "brand", "500"],
          value: { hex: "#6633ff" },
          description: "Brand 500",
        }),
        figmaToken({
          path: ["color", "overlay", "50"],
          value: { hex: "#112233", alpha: 0.5 },
        }),
        figmaToken({ path: ["space", "2"], type: "number", value: 8 }),
        figmaToken({ path: ["opacity", "50"], type: "number", value: 0.5 }),
      ],
      light: [
        figmaToken({
          path: ["semantic", "color", "background", "default"],
          alias: primitiveAlias(),
        }),
        figmaToken({
          path: ["semantic", "color", "foreground", "primary", "$root"],
          alias: primitiveAlias(),
        }),
        figmaToken({
          path: ["component", "button", "background"],
          alias: semanticAlias("semantic/color/background/default"),
        }),
        figmaToken({
          path: ["component", "button", "foreground", "primary"],
          value: "{semantic.color.foreground.primary.$root}",
        }),
        figmaToken({
          path: ["semantic", "shadow", "focused-4px", "spread"],
          type: "number",
          value: 4,
        }),
      ],
    });

    const brand = tokenAt(dtcg.base, ["primitive", "color", "brand", "500"]);
    assert.deepEqual(brand, {
      $type: "color",
      $value: "#6633FF",
      $description: "Brand 500",
      $extensions: {
        ds: { source: "figma-export-modes", sourcePath: "color/brand/500" },
      },
    });

    assert.equal(
      tokenAt(dtcg.base, ["primitive", "color", "overlay", "50"]).$value,
      "#11223380",
    );
    assert.deepEqual(tokenAt(dtcg.base, ["primitive", "space", "2"]).$value, {
      value: 8,
      unit: "px",
    });
    assert.equal(
      tokenAt(dtcg.base, ["primitive", "opacity", "50"]).$value,
      0.5,
    );
    assert.equal(
      tokenAt(dtcg.themes.light, ["semantic", "color", "background", "default"])
        .$value,
      "{primitive.color.brand.500}",
    );
    assert.equal(
      tokenAt(dtcg.themes.light, ["component", "button", "background"]).$value,
      "{semantic.color.background.default}",
    );
    assert.equal(
      tokenAt(dtcg.themes.light, [
        "semantic",
        "color",
        "foreground",
        "primary",
        "root",
      ]).$value,
      "{primitive.color.brand.500}",
    );
    assert.equal(
      tokenAt(dtcg.themes.light, [
        "component",
        "button",
        "foreground",
        "primary",
      ]).$value,
      "{semantic.color.foreground.primary.root}",
    );
    assert.deepEqual(
      tokenAt(dtcg.themes.light, [
        "semantic",
        "shadow",
        "focused-4px",
        "spread",
      ]).$value,
      { value: 4, unit: "px" },
    );

    for (const [label, run, message] of [
      [
        "unsupported token types",
        () =>
          normalize({
            primitive: [
              figmaToken({ path: ["broken"], type: "float", value: 1 }),
            ],
            light: [],
          }),
        /Unsupported token type float/,
      ],
      [
        "invalid Figma colors",
        () =>
          normalize({
            primitive: [
              figmaToken({ path: ["color", "broken"], value: { r: 1 } }),
            ],
            light: [],
          }),
        /Expected Figma color hex/,
      ],
      [
        "duplicate token paths",
        () =>
          normalize({
            primitive: [
              figmaToken({ path: ["space", "2"], type: "number", value: 8 }),
              figmaToken({ path: ["space", "2"], type: "number", value: 8 }),
            ],
            light: [],
          }),
        new RegExp("Duplicate token path primitive/space/2"),
      ],
      [
        "token and group name collisions",
        () =>
          normalize({
            primitive: [
              figmaToken({ path: ["space"], type: "number", value: 8 }),
              figmaToken({ path: ["space", "2"], type: "number", value: 8 }),
            ],
            light: [],
          }),
        new RegExp("Token/group collision at primitive/space/2"),
      ],
    ]) {
      assert.throws(run, message, label + " should stop the build");
    }
  });
});

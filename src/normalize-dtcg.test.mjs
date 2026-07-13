import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeDtcg } from "./normalize-dtcg.mjs";

const recipe = {
  source: { type: "figma-export-modes" },
  base: { id: "primitive", collection: "primitive", prefix: ["primitive"] },
  themeCollection: "tokens",
  numberTransforms: [
    {
      unit: "px",
      figmaScopes: ["EFFECT_FLOAT", "GAP", "STROKE_FLOAT", "WIDTH_HEIGHT"],
    },
    {
      unit: "em",
      scale: 0.01,
      figmaScopes: ["LETTER_SPACING"],
    },
  ],
  themes: [{ id: "light" }],
};

const token = ({ path, value, type = "color", alias, description, scopes }) => ({
  path,
  type,
  value,
  alias,
  description,
  ...(scopes ? { figma: { scopes } } : {}),
});

const primitiveAlias = (targetVariableName = "color/brand/500") => ({
  targetVariableSetName: "primitive",
  targetVariableName,
});

const normalize = (figmaTokens) => normalizeDtcg({ recipe, figmaTokens }).dtcg;
const tokenAt = (tree, path) => path.reduce((node, key) => node?.[key], tree);

describe("DTCG translation", () => {
  test("normalizes Figma values, references, and number units", () => {
    const dtcg = normalize({
      primitive: [
        token({
          path: ["color", "brand", "500"],
          value: { hex: "#6633ff", components: [0.4, 0.2, 1] },
          description: "Brand 500",
        }),
        token({
          path: ["color", "overlay", "50"],
          value: { hex: "#112233", alpha: 0.5 },
        }),
        token({
          path: ["shadow", "focus", "color"],
          value: "{color.overlay.50}",
        }),
        token({
          path: ["space", "2"],
          type: "number",
          value: 8,
          scopes: ["GAP"],
        }),
        token({
          path: ["border-width", "2"],
          type: "number",
          value: 1.5,
          scopes: ["STROKE_FLOAT"],
        }),
        token({
          path: ["font", "letter-spacing", "tight"],
          type: "number",
          value: 2,
          scopes: ["LETTER_SPACING"],
        }),
        token({
          path: ["font", "weight", "medium"],
          type: "number",
          value: 500,
          scopes: ["FONT_WEIGHT"],
        }),
      ],
      light: [
        token({
          path: ["semantic", "color", "background", "default"],
          alias: primitiveAlias(),
        }),
        token({
          path: ["component", "button", "background"],
          value: "{semantic.color.background.default}",
        }),
        token({
          path: ["semantic", "shadow", "focus", "spread"],
          type: "number",
          value: 4,
          scopes: ["EFFECT_FLOAT"],
        }),
        token({
          path: ["component", "progress", "title-width", "sm"],
          type: "number",
          value: 80,
          scopes: ["WIDTH_HEIGHT"],
        }),
      ],
    });

    const values = [
      ["base", ["primitive", "color", "brand", "500"], "#6633FF"],
      ["base", ["primitive", "color", "overlay", "50"], "#11223380"],
      [
        "base",
        ["primitive", "shadow", "focus", "color"],
        "{primitive.color.overlay.50}",
      ],
      ["base", ["primitive", "space", "2"], { value: 8, unit: "px" }],
      [
        "base",
        ["primitive", "border-width", "2"],
        { value: 1.5, unit: "px" },
      ],
      [
        "base",
        ["primitive", "font", "letter-spacing", "tight"],
        { value: 0.02, unit: "em" },
      ],
      ["base", ["primitive", "font", "weight", "medium"], 500],
      [
        "light",
        ["semantic", "color", "background", "default"],
        "{primitive.color.brand.500}",
      ],
      [
        "light",
        ["component", "button", "background"],
        "{semantic.color.background.default}",
      ],
      [
        "light",
        ["semantic", "shadow", "focus", "spread"],
        { value: 4, unit: "px" },
      ],
      [
        "light",
        ["component", "progress", "title-width", "sm"],
        { value: 80, unit: "px" },
      ],
    ];

    const trees = { base: dtcg.base, light: dtcg.themes.light };
    for (const [tree, path, expected] of values) {
      assert.deepEqual(tokenAt(trees[tree], path).$value, expected, path.join("/"));
    }

    assert.deepEqual(
      tokenAt(dtcg.base, ["primitive", "color", "brand", "500"]),
      {
        $type: "color",
        $value: "#6633FF",
        $description: "Brand 500",
        $extensions: {
          ds: { source: "figma-export-modes", sourcePath: "color/brand/500" },
        },
      },
    );
  });

  test("rejects source values that cannot produce a valid token tree", () => {
    const cases = [
      [
        [token({ path: ["broken"], type: "float", value: 1 })],
        /Unsupported token type float/,
      ],
      [
        [token({ path: ["color", "broken"], value: { r: 1 } })],
        /Expected Figma color hex/,
      ],
      [
        [
          token({ path: ["space", "2"], type: "number", value: 8 }),
          token({ path: ["space", "2"], type: "number", value: 8 }),
        ],
        /Duplicate token path primitive\/space\/2/,
      ],
      [
        [
          token({ path: ["space"], type: "number", value: 8 }),
          token({ path: ["space", "2"], type: "number", value: 8 }),
        ],
        /Token\/group collision at primitive\/space\/2/,
      ],
    ];

    for (const [primitive, error] of cases) {
      assert.throws(() => normalize({ primitive, light: [] }), error);
    }
  });
});

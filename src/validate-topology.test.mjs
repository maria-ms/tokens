import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateTopology } from "./validate-topology.mjs";

const recipe = {
  base: { id: "primitive", collection: "primitive", prefix: ["primitive"] },
  themeCollection: "tokens",
  themes: [{ id: "light" }, { id: "dark" }],
};

const figmaToken = ({
  path,
  type = "color",
  value = { hex: "#112233" },
  alias,
  id,
  modeName = "Light",
}) => ({
  path,
  type,
  value,
  figma: {
    modeName,
    variableId: id ?? "VariableID:" + path.join("/"),
    ...(alias ? { alias } : {}),
  },
  alias,
});

const primitiveAlias = (targetVariableName = "color/brand/500") => ({
  targetVariableSetName: "primitive",
  targetVariableName,
});

const semanticAlias = (
  targetVariableName = "semantic/color/background/default",
) => ({
  targetVariableSetName: "tokens",
  targetVariableName,
});

const validContext = () => ({
  recipe,
  figmaModes: { primitive: "Light", light: "Light", dark: "Dark" },
  figmaTokens: {
    primitive: [
      figmaToken({ path: ["color", "brand", "500"] }),
      figmaToken({
        path: ["color", "alpha", "brand", "50"],
        value: "{color.brand.500}",
      }),
      figmaToken({
        path: ["shadow", "focused-4px", "color"],
        value: "{color.alpha.brand.50}",
      }),
      figmaToken({ path: ["space", "07"], type: "number", value: 40 }),
    ],
    light: [
      figmaToken({
        path: ["semantic", "color", "background", "default"],
        alias: primitiveAlias(),
      }),
      figmaToken({
        path: ["component", "button", "background"],
        alias: semanticAlias(),
      }),
      figmaToken({
        path: ["component", "button", "height", "md"],
        type: "number",
        value: 40,
        alias: primitiveAlias("space/07"),
      }),
    ],
    dark: [
      figmaToken({
        path: ["semantic", "color", "background", "default"],
        alias: primitiveAlias(),
        modeName: "Dark",
      }),
      figmaToken({
        path: ["component", "button", "background"],
        alias: semanticAlias(),
        modeName: "Dark",
      }),
      figmaToken({
        path: ["component", "button", "height", "md"],
        type: "number",
        value: 40,
        alias: primitiveAlias("space/07"),
        modeName: "Dark",
      }),
    ],
  },
});

const cases = [
  {
    name: "duplicated Figma variable IDs",
    edit: (context) =>
      context.figmaTokens.primitive.push(
        figmaToken({
          path: ["color", "brand", "600"],
          id: "VariableID:color/brand/500",
        }),
      ),
    error: /primitive: duplicate Figma variable id/,
  },
  {
    name: "names that are both a token and a group",
    edit: (context) =>
      context.figmaTokens.primitive.push(figmaToken({ path: ["color"] })),
    error: new RegExp("primitive: token/group collision"),
  },
  {
    name: "light and dark token path mismatches",
    edit: (context) => context.figmaTokens.dark.splice(1, 1),
    error: new RegExp("Only in light: component/button/background"),
  },
  {
    name: "light and dark type mismatches",
    edit: (context) => {
      context.figmaTokens.dark[0] = figmaToken({
        path: ["semantic", "color", "background", "default"],
        type: "number",
        value: 1,
        alias: primitiveAlias(),
        modeName: "Dark",
      });
    },
    error: new RegExp("light/dark type mismatch"),
  },
  {
    name: "component color aliases that skip semantic tokens",
    edit: (context) => {
      context.figmaTokens.light[1] = figmaToken({
        path: ["component", "button", "background"],
        alias: primitiveAlias(),
      });
    },
    error: /component color aliases primitive directly/,
  },
  {
    name: "aliases pointing at missing tokens",
    edit: (context) => {
      context.figmaTokens.light[0] = figmaToken({
        path: ["semantic", "color", "background", "default"],
        alias: primitiveAlias("color/brand/missing"),
      });
    },
    error: new RegExp("missing primitive alias target color/brand/missing"),
  },
  {
    name: "primitive references that no longer resolve",
    edit: (context) => {
      context.figmaTokens.primitive[2] = figmaToken({
        path: ["shadow", "focused-4px", "color"],
        value: "{color.alpha.brand.missing}",
      });
    },
    error: new RegExp(
      "primitive: unresolved reference \\{color\\.alpha\\.brand\\.missing\\}",
    ),
  },
  {
    name: "explicit references that no longer resolve",
    edit: (context) => {
      context.figmaTokens.light[0] = figmaToken({
        path: ["semantic", "color", "background", "default"],
        value: "{primitive.color.brand.missing}",
      });
    },
    error: new RegExp(
      "unresolved reference \\{primitive\\.color\\.brand\\.missing\\}",
    ),
  },
];

describe("Figma variable topology", () => {
  test("accepts the intended structure and rejects source changes that would break consumers", () => {
    const accepted = validContext();
    assert.equal(validateTopology(accepted), accepted);

    for (const { name, edit, error } of cases) {
      const context = validContext();
      edit(context);
      assert.throws(
        () => validateTopology(context),
        error,
        name + " should stop the build",
      );
    }
  });
});

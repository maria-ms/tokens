import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeDtcg } from "../src/normalize-dtcg.mjs";
import { readFigmaExportModes } from "../src/read-figma-export-modes.mjs";
import { recipe } from "../src/recipe.mjs";
import { validateTopology } from "../src/validate-topology.mjs";

const tokenPathSet = (tokens) =>
  new Set(tokens.map((token) => token.path.join("/")));
const sorted = (values) => [...values].sort();
const colorHex = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;

const tokenAt = (tree, path) => {
  const token = path.reduce((node, key) => node?.[key], tree);
  assert.ok(token, "Missing normalized token " + path.join("."));
  return token;
};

describe("Figma source snapshot pipeline", () => {
  test("turns the committed Figma Export Modes snapshots into the DTCG contract", async () => {
    assert.equal(recipe.source.root, "sources/figma-export-modes");

    const source = await readFigmaExportModes(recipe);
    const result = normalizeDtcg(validateTopology(source));

    for (const [group, path] of [
      ["primitive", "color/solid/brand/500"],
      ["primitive", "font/weight/medium"],
      ["primitive", "space/02"],
      ["primitive", "radius/04"],
      ["light", "semantic/color/background/default"],
      ["light", "component/input/color/background/default"],
      ["light", "semantic/border/focus/primary/spread"],
    ]) {
      assert.ok(
        tokenPathSet(result.figmaTokens[group]).has(path),
        group + " should include " + path,
      );
    }

    assert.deepEqual(
      sorted(tokenPathSet(result.figmaTokens.light)),
      sorted(tokenPathSet(result.figmaTokens.dark)),
      "Light and Dark should expose the same token paths.",
    );

    const brand500 = tokenAt(result.dtcg.base, [
      "primitive",
      "color",
      "solid",
      "brand",
      "500",
    ]);
    assert.match(brand500.$value, colorHex);
    assert.equal(brand500.$extensions.figma.modeName, "Light");
    assert.match(brand500.$extensions.figma.variableId, /^VariableID:/);
    const space02 = tokenAt(result.dtcg.base, ["primitive", "space", "02"]);
    assert.ok(space02.$extensions.figma.scopes.includes("GAP"));
    const weightMedium = tokenAt(result.dtcg.base, [
      "primitive",
      "font",
      "weight",
      "medium",
    ]);
    assert.equal(weightMedium.$type, "number");
    assert.equal(weightMedium.$value, 500);
    assert.deepEqual(weightMedium.$extensions.figma.scopes, ["FONT_WEIGHT"]);

    for (const [themeId, theme] of Object.entries(result.dtcg.themes)) {
      const background = tokenAt(theme, [
        "semantic",
        "color",
        "background",
        "default",
      ]);
      assert.match(
        background.$value,
        /^\{primitive\./,
        themeId + " background should stay aliased to primitive color.",
      );
      assert.equal(
        background.$extensions.figma.alias.targetVariableSetName,
        "primitive",
      );
      assert.match(
        background.$extensions.figma.alias.targetVariableId,
        /^VariableID:/,
      );
    }

    assert.match(
      tokenAt(result.dtcg.themes.light, [
        "semantic",
        "border",
        "focus",
        "primary",
        "color",
      ]).$value,
      /^\{primitive\.shadow\.focused-4px-primary\.color\}/,
    );
    assert.match(
      tokenAt(result.dtcg.base, [
        "primitive",
        "shadow",
        "focused-4px-primary",
        "color",
      ]).$value,
      /^\{primitive\.color\.alpha\./,
    );
    assert.equal(
      tokenAt(result.dtcg.base, [
        "primitive",
        "shadow",
        "focused-4px-primary",
        "spread",
      ]).$value.unit,
      "px",
    );
    assert.equal(
      tokenAt(result.dtcg.themes.light, [
        "semantic",
        "border",
        "focus",
        "primary",
        "spread",
      ]).$value,
      "{primitive.shadow.focused-4px-primary.spread}",
    );
  });
});

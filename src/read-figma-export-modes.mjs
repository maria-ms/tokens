import { readFile } from "node:fs/promises";
import { isObject } from "./token-utils.mjs";

const packageRoot = new URL("../", import.meta.url);

const readJson = async (file) =>
  JSON.parse(await readFile(new URL(file, packageRoot), "utf8"));

const string = (value) => (typeof value === "string" ? value : undefined);
const stringArray = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

// Export Modes serializes numeric font weights as FONT_STYLE even when the
// Figma Plugin API reports FONT_WEIGHT for the same variables.
const normalizeScopes = (type, path, scopes) =>
  type === "number" &&
  (path.slice(0, 2).join("/") === "font/weight" ||
    path.includes("font-weight"))
    ? [
        ...new Set(
          scopes.map((scope) =>
            scope === "FONT_STYLE" ? "FONT_WEIGHT" : scope,
          ),
        ),
      ]
    : scopes;

const figmaAlias = (extensions) => {
  const alias = extensions["com.figma.aliasData"];
  if (
    !isObject(alias) ||
    typeof alias.targetVariableName !== "string" ||
    typeof alias.targetVariableSetName !== "string"
  ) {
    return undefined;
  }

  return {
    ...(string(alias.targetVariableId)
      ? { targetVariableId: alias.targetVariableId }
      : {}),
    targetVariableName: alias.targetVariableName,
    ...(string(alias.targetVariableSetId)
      ? { targetVariableSetId: alias.targetVariableSetId }
      : {}),
    targetVariableSetName: alias.targetVariableSetName,
  };
};

const figmaMetadata = (extensions, modeName, type, path) => {
  const alias = figmaAlias(extensions);
  const scopes = normalizeScopes(
    type,
    path,
    stringArray(extensions["com.figma.scopes"]),
  );

  return {
    ...(modeName ? { modeName } : {}),
    ...(string(extensions["com.figma.variableId"])
      ? { variableId: extensions["com.figma.variableId"] }
      : {}),
    ...(scopes.length ? { scopes } : {}),
    ...(string(extensions["com.figma.type"])
      ? { type: extensions["com.figma.type"] }
      : {}),
    ...(alias ? { alias } : {}),
  };
};

const collectTokens = (node, modeName, parts = []) => {
  if (!isObject(node)) return [];
  if (!("$value" in node)) {
    return Object.entries(node).flatMap(([key, value]) =>
      key === "$extensions"
        ? []
        : collectTokens(value, modeName, [...parts, key]),
    );
  }

  const extensions = isObject(node.$extensions) ? node.$extensions : {};
  const type = String(node.$type);
  const figma = figmaMetadata(extensions, modeName, type, parts);

  return [
    {
      path: parts,
      type,
      value: node.$value,
      description:
        typeof node.$description === "string" ? node.$description : undefined,
      figma,
      alias: figma.alias,
    },
  ];
};

const readSource = async (recipeSource, { id, file }) => {
  const json = await readJson(recipeSource.root + "/" + file);
  const rootExtensions = isObject(json.$extensions) ? json.$extensions : {};
  const modeName = string(rootExtensions["com.figma.modeName"]);

  return [id, { modeName, tokens: collectTokens(json, modeName) }];
};

/** Read Figma's native Export Modes JSON and flatten it into source tokens. */
export const readFigmaExportModes = async (recipe) => {
  const sources = await Promise.all(
    [recipe.base, ...recipe.themes].map((source) =>
      readSource(recipe.source, source),
    ),
  );

  return {
    recipe,
    figmaModes: Object.fromEntries(
      sources.map(([id, source]) => [id, source.modeName]),
    ),
    figmaTokens: Object.fromEntries(
      sources.map(([id, source]) => [id, source.tokens]),
    ),
  };
};

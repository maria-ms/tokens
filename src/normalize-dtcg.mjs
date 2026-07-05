import { isObject, isReference, tokenName } from "./token-utils.mjs";

const hasDimensionScope = (token, recipe) => {
  const scopes = new Set(recipe.numberDimensions?.figmaScopes ?? []);
  return token.figma?.scopes?.some((scope) => scopes.has(scope));
};

const hasDimensionPath = (path, recipe) => {
  const pathName = path.join("/");
  return (
    recipe.numberDimensions?.pathPrefixes?.some((prefix) =>
      pathName.startsWith(prefix),
    ) ||
    recipe.numberDimensions?.pathMatchers?.some(
      (matcher) =>
        (!matcher.startsWith ||
          pathName === matcher.startsWith ||
          pathName.startsWith(matcher.startsWith + "/")) &&
        (!matcher.includes || path.includes(matcher.includes)) &&
        (!matcher.endsWith || path.at(-1) === matcher.endsWith),
    )
  );
};

const hasPercentagePath = (path, recipe) => {
  const pathName = path.join("/");
  return (
    recipe.numberPercentages?.pathPrefixes?.some((prefix) =>
      pathName.startsWith(prefix),
    ) ||
    recipe.numberPercentages?.pathMatchers?.some(
      (matcher) =>
        (!matcher.startsWith ||
          pathName === matcher.startsWith ||
          pathName.startsWith(matcher.startsWith + "/")) &&
        (!matcher.includes || path.includes(matcher.includes)) &&
        (!matcher.endsWith || path.at(-1) === matcher.endsWith),
    )
  );
};

const isPxNumber = (token, recipe) =>
  hasDimensionScope(token, recipe) || hasDimensionPath(token.path, recipe);
const isPercentageNumber = (token, recipe) =>
  token.type === "number" && hasPercentagePath(token.path, recipe);

const dtcgPath = (parts) =>
  parts.map((part) => (part === "$root" ? "root" : part));
const dtcgReference = (reference) =>
  "{" + dtcgPath(reference.slice(1, -1).split(".")).join(".") + "}";
const dtcgReferencePath = (path) => dtcgPath(path.split("/")).join(".");

const aliasReference = (alias, recipe) => {
  if (alias.targetVariableSetName === recipe.base.collection) {
    return "{primitive." + dtcgReferencePath(alias.targetVariableName) + "}";
  }
  if (alias.targetVariableSetName === recipe.themeCollection) {
    return "{" + dtcgReferencePath(alias.targetVariableName) + "}";
  }
  throw new Error(
    "Unsupported alias collection " + alias.targetVariableSetName,
  );
};

const rgbFromComponents = (components, name) => {
  if (
    !Array.isArray(components) ||
    components.length !== 3 ||
    components.some(
      (component) =>
        typeof component !== "number" || component < 0 || component > 1,
    )
  ) {
    throw new Error("Expected Figma RGB components at " + name);
  }

  return (
    "#" +
    components
      .map((component) =>
        Math.round(component * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  ).toUpperCase();
};

const colorHex = (value, name) => {
  if (
    !isObject(value) ||
    typeof value.hex !== "string" ||
    !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value.hex)
  ) {
    throw new Error("Expected Figma color hex at " + name);
  }
  if (
    "alpha" in value &&
    (typeof value.alpha !== "number" || value.alpha < 0 || value.alpha > 1)
  ) {
    throw new Error("Expected Figma color alpha from 0 to 1 at " + name);
  }
  if ("colorSpace" in value && typeof value.colorSpace !== "string") {
    throw new Error("Expected Figma color space at " + name);
  }
  if (
    "components" in value &&
    rgbFromComponents(value.components, name) !==
      value.hex.slice(0, 7).toUpperCase()
  ) {
    throw new Error("Figma color components do not match hex at " + name);
  }

  const alpha =
    typeof value.alpha === "number" && value.alpha < 1 && value.hex.length === 7
      ? Math.round(value.alpha * 255)
          .toString(16)
          .padStart(2, "0")
      : "";
  return (value.hex + alpha).toUpperCase();
};

const tokenType = (token, recipe) =>
  token.type === "number" &&
  (isPxNumber(token, recipe) || isPercentageNumber(token, recipe))
    ? "dimension"
    : token.type;

const tokenValue = (token, recipe, $type) => {
  if (token.alias) return aliasReference(token.alias, recipe);
  if (isReference(token.value)) return dtcgReference(token.value);
  if ($type === "color") return colorHex(token.value, tokenName(token));
  if (isPercentageNumber(token, recipe)) {
    return { value: token.value / 100, unit: "em" };
  }
  if ($type === "dimension") return { value: token.value, unit: "px" };
  return token.value;
};

const figmaExtension = (token) => {
  const figma = token.figma ?? {};
  const value = {
    ...(figma.modeName ? { modeName: figma.modeName } : {}),
    ...(figma.variableId ? { variableId: figma.variableId } : {}),
    ...(figma.scopes?.length ? { scopes: figma.scopes } : {}),
    ...(figma.type ? { type: figma.type } : {}),
    ...(figma.alias ? { alias: figma.alias } : {}),
  };

  return Object.keys(value).length ? value : undefined;
};

const toDtcg = (token, recipe) => {
  const name = tokenName(token);
  const $type = tokenType(token, recipe);
  const figma = figmaExtension(token);

  if (!["color", "number", "string", "boolean", "dimension"].includes($type)) {
    throw new Error("Unsupported token type " + token.type + " at " + name);
  }

  return {
    $type,
    $value: tokenValue(token, recipe, $type),
    ...(token.description ? { $description: token.description } : {}),
    $extensions: {
      ds: { source: recipe.source.type, sourcePath: name },
      ...(figma ? { figma } : {}),
    },
  };
};

const buildTree = (tokens, recipe, prefix = []) => {
  const root = {};

  for (const token of tokens) {
    const parts = [...prefix, ...dtcgPath(token.path)];
    let cursor = root;

    for (const group of parts.slice(0, -1)) {
      cursor[group] ??= {};
      if (!isObject(cursor[group]) || "$value" in cursor[group]) {
        throw new Error("Token/group collision at " + parts.join("/"));
      }
      cursor = cursor[group];
    }

    const name = parts.at(-1);
    if (!name || cursor[name] !== undefined) {
      throw new Error("Duplicate token path " + parts.join("/"));
    }
    cursor[name] = toDtcg(token, recipe);
  }

  return root;
};

/** Convert flattened Figma source tokens into DTCG-shaped token objects. */
export const normalizeDtcg = (context) => ({
  ...context,
  dtcg: {
    base: buildTree(
      context.figmaTokens[context.recipe.base.id],
      context.recipe,
      context.recipe.base.prefix,
    ),
    themes: Object.fromEntries(
      context.recipe.themes.map((theme) => [
        theme.id,
        buildTree(context.figmaTokens[theme.id], context.recipe),
      ]),
    ),
  },
});

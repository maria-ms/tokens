import { isReference, tokenName } from "./token-utils.mjs";

const sourceEntries = (recipe) => [recipe.base, ...recipe.themes];

const tokenModeName = (tokens) => {
  const names = new Set(
    tokens.map((token) => token.figma?.modeName).filter(Boolean),
  );
  return names.size === 1 ? [...names][0] : undefined;
};

const validateModeNames = (errors, context) => {
  for (const source of sourceEntries(context.recipe)) {
    const tokens = context.figmaTokens[source.id] ?? [];
    const names = new Set(
      tokens.map((token) => token.figma?.modeName).filter(Boolean),
    );
    const actual = context.figmaModes?.[source.id] ?? tokenModeName(tokens);

    if (names.size > 1) {
      errors.push(
        source.id + ": mixed Figma mode names " + [...names].join(", "),
      );
    }
    if (!actual) {
      errors.push(source.id + ": missing Figma mode name");
    }
    if (source.name && actual && actual !== source.name) {
      errors.push(
        source.id +
          ": expected Figma mode " +
          source.name +
          ", received " +
          actual,
      );
    }
  }
};

const validateTokenPaths = (errors, group, tokens) => {
  const paths = new Set(tokens.map(tokenName));
  const figmaIds = new Set();

  for (const token of tokens) {
    for (let i = 1; i < token.path.length; i += 1) {
      if (paths.has(token.path.slice(0, i).join("/"))) {
        errors.push(group + ": token/group collision at " + tokenName(token));
      }
    }

    const id = token.figma?.variableId;
    if (typeof id === "string" && figmaIds.has(id)) {
      errors.push(group + ": duplicate Figma variable id " + id);
    }
    if (typeof id === "string") figmaIds.add(id);
  }
};

const validateThemeParity = (errors, themeEntries) => {
  const [referenceTheme, ...themes] = themeEntries;
  const referencePaths = new Map(
    referenceTheme[1].map((token) => [tokenName(token), token]),
  );

  for (const [themeId, tokens] of themes) {
    const themePaths = new Map(
      tokens.map((token) => [tokenName(token), token]),
    );

    errors.push(
      ...[...referencePaths.keys()]
        .filter((name) => !themePaths.has(name))
        .map((name) => "Only in " + referenceTheme[0] + ": " + name),
      ...[...themePaths.keys()]
        .filter((name) => !referencePaths.has(name))
        .map((name) => "Only in " + themeId + ": " + name),
      ...[...referencePaths]
        .filter(
          ([name, token]) =>
            themePaths.has(name) && themePaths.get(name)?.type !== token.type,
        )
        .map(
          ([name]) =>
            referenceTheme[0] + "/" + themeId + " type mismatch: " + name,
        ),
    );
  }
};

const validateAliasIdentity = (errors, themeId, tokens) => {
  const targetIds = new Map();
  const targetSetIds = new Map();

  for (const token of tokens) {
    const alias = token.alias;
    if (!alias) continue;

    const target = alias.targetVariableSetName + "/" + alias.targetVariableName;
    if (
      alias.targetVariableId &&
      targetIds.has(target) &&
      targetIds.get(target) !== alias.targetVariableId
    ) {
      errors.push(
        themeId + ": inconsistent Figma alias target id for " + target,
      );
    }
    if (alias.targetVariableId) targetIds.set(target, alias.targetVariableId);

    if (
      alias.targetVariableSetId &&
      targetSetIds.has(alias.targetVariableSetName) &&
      targetSetIds.get(alias.targetVariableSetName) !==
        alias.targetVariableSetId
    ) {
      errors.push(
        themeId +
          ": inconsistent Figma alias collection id for " +
          alias.targetVariableSetName,
      );
    }
    if (alias.targetVariableSetId) {
      targetSetIds.set(alias.targetVariableSetName, alias.targetVariableSetId);
    }
  }
};

const validateThemeAliases = (
  errors,
  recipe,
  primitivePaths,
  themeId,
  tokens,
) => {
  const themePaths = new Set(tokens.map(tokenName));

  validateAliasIdentity(errors, themeId, tokens);

  for (const token of tokens) {
    const refPath = isReference(token.value)
      ? token.value.slice(1, -1).replaceAll(".", "/")
      : undefined;
    const alias = token.alias;

    if (
      alias &&
      alias.targetVariableSetName !== recipe.base.collection &&
      alias.targetVariableSetName !== recipe.themeCollection
    ) {
      errors.push(
        themeId +
          ": unsupported alias collection " +
          alias.targetVariableSetName +
          " from " +
          tokenName(token),
      );
    }
    if (
      token.path[0] === "component" &&
      token.type === "color" &&
      alias?.targetVariableSetName === recipe.base.collection
    ) {
      errors.push(
        themeId +
          ": component color aliases primitive directly: " +
          tokenName(token),
      );
    }
    if (
      alias?.targetVariableSetName === recipe.base.collection &&
      !primitivePaths.has(alias.targetVariableName)
    ) {
      errors.push(
        themeId +
          ": missing primitive alias target " +
          alias.targetVariableName,
      );
    }
    if (
      alias?.targetVariableSetName === recipe.themeCollection &&
      !themePaths.has(alias.targetVariableName)
    ) {
      errors.push(
        themeId + ": missing token alias target " + alias.targetVariableName,
      );
    }
    if (refPath && !themePaths.has(refPath) && !primitivePaths.has(refPath)) {
      errors.push(
        themeId +
          ": unresolved reference " +
          token.value +
          " from " +
          tokenName(token),
      );
    }
  }
};

/** Validate Figma token topology before generating platform files. */
export const validateTopology = (context) => {
  const errors = [];
  const baseTokens = context.figmaTokens[context.recipe.base.id] ?? [];
  const themeEntries = context.recipe.themes.map((theme) => [
    theme.id,
    context.figmaTokens[theme.id] ?? [],
  ]);
  const primitivePaths = new Set(baseTokens.map(tokenName));

  validateModeNames(errors, context);
  validateTokenPaths(errors, context.recipe.base.id, baseTokens);
  for (const [themeId, tokens] of themeEntries)
    validateTokenPaths(errors, themeId, tokens);
  validateThemeParity(errors, themeEntries);
  for (const [themeId, tokens] of themeEntries) {
    validateThemeAliases(
      errors,
      context.recipe,
      primitivePaths,
      themeId,
      tokens,
    );
  }

  if (errors.length)
    throw new Error("Cannot build tokens:\n" + errors.join("\n"));
  return context;
};

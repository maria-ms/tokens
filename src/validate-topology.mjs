import { isReference, tokenName } from "./token-utils.mjs";

const sourceEntries = (recipe) => [recipe.base, ...recipe.themes];

const matchesPathRule = (path, rule) => {
  const name = path.join("/");
  return (
    rule.pathPrefixes?.some(
      (prefix) => name === prefix || name.startsWith(prefix + "/"),
    ) ||
    rule.pathSegments?.some((segment) => path.includes(segment))
  );
};

const addTokenListError = (errors, source, message, tokens) => {
  if (tokens.length) {
    const names = tokens.slice(0, 5).map(tokenName);
    const remainder = tokens.length - names.length;
    errors.push(
      source +
        ": " +
        message +
        ": " +
        names.join(", ") +
        (remainder ? ` (+${remainder} more)` : ""),
    );
  }
};

const validateSourceScopes = (errors, context) => {
  const policy = context.recipe.validation ?? {};

  for (const source of sourceEntries(context.recipe)) {
    const tokens = context.figmaTokens[source.id] ?? [];

    if (policy.requireScopes) {
      addTokenListError(
        errors,
        source.id,
        "missing Figma scopes",
        tokens.filter((token) => !token.figma?.scopes?.length),
      );
    }

    for (const scope of policy.disallowedScopes ?? []) {
      addTokenListError(
        errors,
        source.id,
        "disallowed broad Figma scope " + scope,
        tokens.filter((token) => token.figma?.scopes?.includes(scope)),
      );
    }

    for (const rule of policy.requiredScopes ?? []) {
      addTokenListError(
        errors,
        source.id,
        "expected Figma scope " + rule.scope,
        tokens.filter(
          (token) =>
            matchesPathRule(token.path, rule) &&
            !token.figma?.scopes?.includes(rule.scope),
        ),
      );
    }
  }
};

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

const sourceIdentity = (token) =>
  token.alias
    ? token.alias.targetVariableSetName + "/" + token.alias.targetVariableName
    : JSON.stringify(token.value);

const validateThemeParity = (errors, recipe, themeEntries) => {
  const [referenceTheme, ...themes] = themeEntries;
  const invariantTypes = new Set(
    recipe.validation?.invariantThemeTypes ?? [],
  );
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
      ...[...referencePaths]
        .filter(
          ([name, token]) =>
            invariantTypes.has(token.type) &&
            themePaths.has(name) &&
            sourceIdentity(themePaths.get(name)) !== sourceIdentity(token),
        )
        .map(
          ([name]) =>
            referenceTheme[0] +
            "/" +
            themeId +
            " invariant token mismatch: " +
            name,
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

const referencePath = (value) =>
  isReference(value) ? value.slice(1, -1).replaceAll(".", "/") : undefined;

const withoutPrefix = (path, prefix) =>
  prefix.length && path.startsWith(prefix.join("/") + "/")
    ? path.slice(prefix.join("/").length + 1)
    : path;

const primitivePrefix = (recipe) => recipe.base.prefix ?? [recipe.base.id];

const resolvesReference = (refPath, recipe, primitivePaths, themePaths) =>
  themePaths.has(refPath) ||
  primitivePaths.has(refPath) ||
  primitivePaths.has(withoutPrefix(refPath, primitivePrefix(recipe)));

const validateBaseReferences = (errors, recipe, primitivePaths, tokens) => {
  validateAliasIdentity(errors, recipe.base.id, tokens);

  for (const token of tokens) {
    const refPath = referencePath(token.value);
    const alias = token.alias;

    if (alias && alias.targetVariableSetName !== recipe.base.collection) {
      errors.push(
        recipe.base.id +
          ": unsupported alias collection " +
          alias.targetVariableSetName +
          " from " +
          tokenName(token),
      );
    }
    if (
      alias?.targetVariableSetName === recipe.base.collection &&
      !primitivePaths.has(alias.targetVariableName)
    ) {
      errors.push(
        recipe.base.id +
          ": missing primitive alias target " +
          alias.targetVariableName,
      );
    }
    if (
      refPath &&
      !resolvesReference(refPath, recipe, primitivePaths, new Set())
    ) {
      errors.push(
        recipe.base.id +
          ": unresolved reference " +
          token.value +
          " from " +
          tokenName(token),
      );
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
    const refPath = referencePath(token.value);
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
    if (!refPath) continue;
    if (!resolvesReference(refPath, recipe, primitivePaths, themePaths)) {
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

  validateSourceScopes(errors, context);
  validateModeNames(errors, context);
  validateTokenPaths(errors, context.recipe.base.id, baseTokens);
  validateBaseReferences(errors, context.recipe, primitivePaths, baseTokens);
  for (const [themeId, tokens] of themeEntries)
    validateTokenPaths(errors, themeId, tokens);
  validateThemeParity(errors, context.recipe, themeEntries);
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

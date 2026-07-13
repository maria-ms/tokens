import { rm } from "node:fs/promises";
import StyleDictionary from "style-dictionary";
import { formats, transformGroups } from "style-dictionary/enums";

const mergeTokenTrees = (baseTokens, themeTokens, themeId) => {
  const collisions = Object.keys(baseTokens).filter(
    (key) => key in themeTokens,
  );
  if (collisions.length) {
    throw new Error(
      `Theme "${themeId}" collides with base token groups: ${collisions.join(", ")}`,
    );
  }
  return { ...baseTokens, ...themeTokens };
};

const configForTheme = (theme, tokens) => ({
  usesDtcg: true,
  tokens,
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      prefix: "ds",
      buildPath: "dist/css/",
      files: [
        {
          destination: `${theme.id}.css`,
          format: formats.cssVariables,
          options: {
            outputReferences: true,
            selector: theme.cssSelector,
          },
        },
      ],
    },
    js: {
      transformGroup: transformGroups.js,
      buildPath: `dist/js/${theme.id}/`,
      files: [
        { destination: "tokens.mjs", format: formats.javascriptEsm },
        {
          destination: "tokens.d.ts",
          format: formats.typescriptEs6Declarations,
        },
      ],
    },
    reactNative: {
      transformGroup: transformGroups.reactNative,
      buildPath: `dist/react-native/${theme.id}/`,
      files: [
        { destination: "tokens.mjs", format: formats.javascriptEsm },
        {
          destination: "tokens.d.ts",
          format: formats.typescriptEs6Declarations,
        },
      ],
    },
    json: {
      transformGroup: transformGroups.js,
      buildPath: "dist/json/",
      files: [{ destination: `${theme.id}.json`, format: formats.jsonNested }],
    },
  },
});

/** Build platform token artifacts from in-memory DTCG tokens. */
export const buildStyleDictionary = async (context) => {
  await rm("dist", { recursive: true, force: true });

  for (const theme of context.recipe.themes) {
    const tokens = mergeTokenTrees(
      context.dtcg.base,
      context.dtcg.themes[theme.id],
      theme.id,
    );
    await new StyleDictionary(
      configForTheme(theme, tokens),
    ).buildAllPlatforms();
  }

  return context;
};

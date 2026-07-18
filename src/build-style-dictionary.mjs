import { rename, rm } from "node:fs/promises";
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

const configForTheme = (theme, tokens, buildPath) => ({
  usesDtcg: true,
  tokens,
  log: { warnings: "error" },
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      prefix: "ds",
      buildPath: buildPath + "/css/",
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
    json: {
      transformGroup: transformGroups.js,
      buildPath: buildPath + "/json/",
      files: [{ destination: `${theme.id}.json`, format: formats.jsonNested }],
    },
  },
});

/** Build platform token artifacts from in-memory DTCG tokens. */
export const buildStyleDictionary = async (context) => {
  const stagingPath = ".dist-build";
  await rm(stagingPath, { recursive: true, force: true });

  try {
    for (const theme of context.recipe.themes) {
      const tokens = mergeTokenTrees(
        context.dtcg.base,
        context.dtcg.themes[theme.id],
        theme.id,
      );
      const dictionary = new StyleDictionary(
        configForTheme(theme, tokens, stagingPath),
      );
      await dictionary.buildPlatform("css");
      await dictionary.buildPlatform("json");
    }
    await rm("dist", { recursive: true, force: true });
    await rename(stagingPath, "dist");
  } catch (error) {
    await rm(stagingPath, { recursive: true, force: true });
    throw error;
  }

  return context;
};

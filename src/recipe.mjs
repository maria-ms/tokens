/**
 * The token package build recipe.
 *
 * Figma Export Modes are the source snapshot. The build normalizes one base
 * collection and each resolved theme mode into DTCG in memory, then passes that
 * token object directly to Style Dictionary.
 */
export const recipe = {
  source: {
    type: "figma-export-modes",
    name: "Figma Export Modes",
    root: "sources/figma-export-modes",
  },
  base: {
    id: "primitive",
    collection: "primitive",
    name: "Light",
    file: "primitive/Light.tokens.json",
    prefix: ["primitive"],
  },
  themeCollection: "tokens",
  numberDimensions: {
    figmaScopes: [
      "CORNER_RADIUS",
      "FONT_SIZE",
      "GAP",
      "LINE_HEIGHT",
      "WIDTH_HEIGHT",
    ],
    pathPrefixes: ["space", "radius", "font/size", "font/line-height"],
    pathMatchers: [
      { includes: "shadow", endsWith: "blur" },
      { includes: "shadow", endsWith: "spread" },
      { includes: "shadow", endsWith: "offset-x" },
      { includes: "shadow", endsWith: "offset-y" },
    ],
  },
  numberPercentages: {
    pathPrefixes: ["font/letter-spacing"],
    pathMatchers: [{ includes: "typography", endsWith: "letter-spacing" }],
  },
  themes: [
    {
      id: "light",
      name: "Light",
      file: "tokens/Light.tokens.json",
      cssSelector: ':root,\n[data-theme="light"]',
    },
    {
      id: "dark",
      name: "Dark",
      file: "tokens/Dark.tokens.json",
      cssSelector: '[data-theme="dark"]',
    },
  ],
};

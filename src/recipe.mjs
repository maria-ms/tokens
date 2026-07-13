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
  numberTransforms: [
    {
      unit: "px",
      figmaScopes: [
        "CORNER_RADIUS",
        "EFFECT_FLOAT",
        "FONT_SIZE",
        "GAP",
        "LINE_HEIGHT",
        "STROKE_FLOAT",
        "WIDTH_HEIGHT",
      ],
    },
    {
      unit: "em",
      scale: 0.01,
      figmaScopes: ["LETTER_SPACING"],
    },
  ],
  validation: {
    requireScopes: true,
    disallowedScopes: ["ALL_SCOPES"],
    requiredScopes: [
      {
        scope: "FONT_WEIGHT",
        pathPrefixes: ["font/weight"],
        pathSegments: ["font-weight"],
      },
    ],
    invariantThemeTypes: ["number", "string", "boolean"],
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

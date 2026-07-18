import { buildStyleDictionary } from "./build-style-dictionary.mjs";
import { normalizeDtcg } from "./normalize-dtcg.mjs";
import { readFigmaExportModes } from "./read-figma-export-modes.mjs";
import { recipe } from "./recipe.mjs";
import { validateTopology } from "./validate-topology.mjs";

const source = await readFigmaExportModes(recipe);
const validated = validateTopology(source);
const normalized = normalizeDtcg(validated);
const result = await buildStyleDictionary(normalized);

console.log(`Built platform tokens from ${result.recipe.source.name}`);
console.log(
  `${result.recipe.base.id} ${result.figmaTokens[result.recipe.base.id].length} -> in-memory DTCG base`,
);
for (const theme of result.recipe.themes) {
  console.log(
    `${theme.id} ${result.figmaTokens[theme.id].length} -> dist/*/${theme.id}`,
  );
}

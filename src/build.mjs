import { rm } from "node:fs/promises";
import { buildStyleDictionary } from "./build-style-dictionary.mjs";
import { normalizeDtcg } from "./normalize-dtcg.mjs";
import { readFigmaExportModes } from "./read-figma-export-modes.mjs";
import { recipe } from "./recipe.mjs";
import { runPipeline } from "./run-pipeline.mjs";
import { validateTopology } from "./validate-topology.mjs";

await rm("dist", { recursive: true, force: true });

const result = await runPipeline(
  readFigmaExportModes,
  validateTopology,
  normalizeDtcg,
  buildStyleDictionary,
)(recipe);

console.log(`Built platform tokens from ${result.recipe.source.name}`);
console.log(
  `${result.recipe.base.id} ${result.figmaTokens[result.recipe.base.id].length} -> in-memory DTCG base`,
);
for (const theme of result.recipe.themes) {
  console.log(
    `${theme.id} ${result.figmaTokens[theme.id].length} -> dist/*/${theme.id}`,
  );
}
